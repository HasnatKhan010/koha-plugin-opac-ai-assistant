package Koha::Plugin::OPACChatBot::Search;

# Catalogue search + result rendering for the OPAC AI Assistant.
#
# PORTABILITY IS THE POINT OF THIS MODULE.
#
# Primary path: Koha's own search stack. Koha::SearchEngine::Search->new
# dispatches on the site's SearchEngine syspref, so one code path serves both
# Zebra and Elasticsearch libraries with no conditional of our own.
#
# The trap: simple_search_compat returns DIFFERENT TYPES per backend -- Zebra
# hands back raw USMARC strings (via C4::Search::SimpleSearch), Elasticsearch
# hands back MARC::Record objects. So we never parse the returned records
# ourselves. Both backends implement extract_biblionumber, which normalises
# that difference; we call it and hydrate through Koha::Biblios.
#
# Fallback path: direct SQL via C4::Context->dbh, used only when no engine is
# reachable or the engine throws. It is deliberately index-friendly and never
# touches the MARCXML blob (see _sql_search).
#
# Anything newer than the 22.11 floor is reached through a runtime capability
# probe (->can / eval require) rather than a version comparison, because a
# distro backport can add a method without changing the version string.

use Modern::Perl;

use C4::Context;

use Exporter 'import';
our @EXPORT_OK = qw(
    search_catalog
    search_by_title
    books_for_llm
    render_books
    visible_biblio
);

use constant MAX_LIMIT => 30;

# ---------------------------------------------------------------------------
# Logging. Koha::Logger is loaded lazily so this module stays usable (and
# perl -c clean) outside a configured Koha.
# ---------------------------------------------------------------------------
sub _log_warn {
    my ($msg) = @_;
    eval {
        require Koha::Logger;
        Koha::Logger->get( { interface => 'opac' } )->warn("OPACChatBot: $msg");
        1;
    } or warn "OPACChatBot: $msg\n";
    return;
}

sub _pref {
    my ($name) = @_;
    my $v = eval { C4::Context->preference($name) };
    return defined $v ? $v : '';
}

# ---------------------------------------------------------------------------
# Query-string building.
#
# We emit index:"value" terms joined with AND. Both backends accept this:
#   * Zebra -- C4::Search::SimpleSearch rewrites ':' to '=', giving valid CCL
#              (title:"x" AND author:"y"  ->  title="x" AND author="y").
#   * ES    -- a non-ref query is pushed through
#              Koha::SearchEngine::QueryBuilder->build_query_compat to be
#              sanitised, and field:value is understood there too.
#
# Every character that carries meaning in CCL or in Lucene/ES query syntax is
# stripped from the value, including the double quote, so neither a patron nor
# the LLM can break out of the quoted term and inject query operators.
# ---------------------------------------------------------------------------
my %INDEX_FOR = (
    keyword => 'kw',
    title   => 'title',
    author  => 'author',
    subject => 'su',
);

sub _sanitize_term {
    my ($raw) = @_;
    return '' unless defined $raw && !ref $raw;

    my $v = "$raw";
    $v =~ s/[\x00-\x1f\x7f]/ /g;                    # control characters
    $v =~ s/["\\()\[\]{}:=\/?*~^!+<>|&#\$]/ /g;     # CCL + Lucene operators
    $v =~ s/\s+/ /g;
    $v =~ s/^\s+|\s+$//g;
    return substr( $v, 0, 100 );
}

sub _build_query_string {
    my ($filters) = @_;

    my @terms;
    for my $field (qw(keyword title author subject)) {
        my $val = _sanitize_term( $filters->{$field} );
        next if $val eq '';
        push @terms, qq{$INDEX_FOR{$field}:"$val"};
    }
    return join( ' AND ', @terms );
}

# ---------------------------------------------------------------------------
# Availability.
#
# The old code tested "onloan IS NULL" alone, which reported lost, withdrawn,
# damaged and not-for-loan copies as available.
# ---------------------------------------------------------------------------

# Koha stores these as integers defaulting to 0, but compare as strings so odd
# data ('-1', '') can never raise a numeric warning in the OPAC log.
sub _flagged {
    my ($v) = @_;
    return 0 unless defined $v;
    return 0 if $v eq '' || $v eq '0';
    return 1;
}

sub _item_is_available {
    my ($item) = @_;

    return 0 if eval { $item->onloan };
    return 0 if _flagged( scalar eval { $item->itemlost } );
    return 0 if _flagged( scalar eval { $item->withdrawn } );
    return 0 if _flagged( scalar eval { $item->damaged } );

    # effective_not_for_loan_status also accounts for the itemtype-level
    # notforloan value, which the plain column does not. Probed, not assumed.
    my $nfl;
    if ( $item->can('effective_not_for_loan_status') ) {
        $nfl = eval { $item->effective_not_for_loan_status };
    }
    $nfl = eval { $item->notforloan } unless defined $nfl;
    return 0 if _flagged($nfl);

    return 1;
}

# ---------------------------------------------------------------------------
# Branch codes -> human branch names.
#
# items.homebranch holds a branchcode ("CPL"), which means nothing to a patron.
# The OPAC everywhere else shows branches.branchname ("Central Library"), so the
# assistant must too.
#
# Memoised per process because a page of 20 results routinely repeats the same
# two or three branches, and this would otherwise be one query per copy per
# book. Koha's own branch list changes rarely and a Plack worker is recycled
# often enough that a stale name is not worth a cache-invalidation mechanism.
# ---------------------------------------------------------------------------
my %BRANCH_NAME_CACHE;

sub _branch_name {
    my ($code) = @_;
    return '' unless defined $code && $code ne '';
    return $BRANCH_NAME_CACHE{$code} if exists $BRANCH_NAME_CACHE{$code};

    my $name;
    eval {
        require Koha::Libraries;
        my $library = Koha::Libraries->find($code);
        $name = $library->branchname if $library;
        1;
    };

    # Falling back to the code is deliberate: a wrong-looking label beats an
    # empty one, and a library whose branches table is unreachable still gets
    # usable results.
    $name = $code unless defined $name && $name ne '';
    $BRANCH_NAME_CACHE{$code} = $name;
    return $name;
}

# ---------------------------------------------------------------------------
# Hidden items and suppressed records.
# ---------------------------------------------------------------------------
sub _visible_items {
    my ($biblio) = @_;

    my $items = eval { $biblio->items };
    return () unless $items;

    # Honours the library's own OpacHiddenItems / hidelostitems policy.
    # If Koha says filtering failed, do not expose the unfiltered items.
    if ( $items->can('filter_by_visible_in_opac') ) {
        my $filtered = eval { $items->filter_by_visible_in_opac };
        return () if $@ || !$filtered;
        $items = $filtered;
    }
    elsif ( _pref('OpacHiddenItems') ) {
        return ();
    }

    my @out = eval { $items->as_list };
    return @out;
}

# A record the library has suppressed from the OPAC must not surface here.
#
# Costs a MARCXML parse per hit, so it is skipped entirely unless the library
# actually enabled OpacSuppression -- which most have not.
sub _is_suppressed {
    my ($biblio) = @_;
    return 0 unless _pref('OpacSuppression');

    # Prefer a native accessor if this Koha has one.
    for my $method (qw(opac_suppressed is_suppressed)) {
        next unless $biblio->can($method);
        my $r = eval { $biblio->$method };
        return $r ? 1 : 0 unless $@;
    }

    # Portable fallback: 942$n is the flag OpacSuppression reads. 942 is
    # Koha's own field, so this holds across MARC flavours.
    my $record = eval { $biblio->metadata->record };
    return 1 unless $record;
    return _flagged( scalar eval { $record->subfield( '942', 'n' ) } );
}

# MARC 856$u and the item URI (MARC21 952$u in Koha) can point to an
# external e-book platform. A link is evidence of an online resource, not
# evidence that this patron has permission to read the full text.
sub _safe_online_url {
    my ($url) = @_;
    return '' unless defined $url && !ref $url;
    $url =~ s/^\s+|\s+$//g;
    return '' if length($url) > 2048;
    return '' unless $url =~ m{\Ahttps?://([^/?#]+)}i;
    return '' if $1 =~ /[@\s<>"'`\\\x00-\x1f\x7f]/;
    return '' if $url =~ /[\s<>"'`\\\x00-\x1f\x7f]/;
    return $url;
}

sub _online_links {
    my ( $biblio, $items ) = @_;
    my @links;
    my %seen;
    my $add = sub {
        my $url = _safe_online_url(shift);
        return unless $url && !$seen{$url}++;
        push @links, $url if @links < 3;
    };

    my $record = eval { $biblio->metadata->record };
    if ($record) {
        for my $field ( $record->field('856') ) {
            for my $pair ( $field->subfields ) {
                $add->( $pair->[1] ) if $pair->[0] eq 'u';
            }
        }
    }
    for my $item ( @{$items} ) {
        $add->( scalar eval { $item->uri } );
    }
    return \@links;
}

# ---------------------------------------------------------------------------
# Hydration: biblionumber -> the record shape this plugin passes around.
#
# Stable contract, consumed by render_books, books_for_llm and the
# Controller's JSON tool result:
#   {
#     biblionumber, title, author, isbn,
#     items => [ { barcode, homebranch, branchname, itemcallnumber, available } ],
#     total_items, available_items,
#     status => 'available' | 'checked_out' | 'online_link' | 'no_copies',
#     online_links => [ validated http(s) URLs ],
#   }
# ---------------------------------------------------------------------------
sub _hydrate {
    my ($biblionumber) = @_;
    return undef unless $biblionumber;

    require Koha::Biblios;
    my $biblio = eval { Koha::Biblios->find($biblionumber) };
    return undef unless $biblio;
    return undef if _is_suppressed($biblio);

    my @item_rows;
    my $available = 0;
    my @visible_items = _visible_items($biblio);
    for my $item (@visible_items) {
        my $is_avail = _item_is_available($item);
        my $branch   = scalar eval { $item->homebranch };
        $available += $is_avail;
        push @item_rows, {
            barcode        => scalar eval { $item->barcode },
            homebranch     => $branch,
            branchname     => _branch_name($branch),
            itemcallnumber => scalar eval { $item->itemcallnumber },
            available      => $is_avail,
        };
    }

    my $online_links = _online_links( $biblio, \@visible_items );

    # Koha can hide a whole OPAC record when all attached items are hidden.
    # This matters for direct ISBN lookups, which do not pass through the
    # search engine's OPAC result filtering before hydration.
    if ( _pref('OpacHiddenItemsHidesRecord') && !@item_rows ) {
        my $all_items = eval { $biblio->items };
        return undef if $all_items && eval { $all_items->count };
    }

    # Item-less e-resources and on-order titles remain discoverable. An 856
    # link gets its own status; neither kind is called physically available.
    my $status =
          $available     ? 'available'
        : @item_rows     ? 'checked_out'
        : @{$online_links} ? 'online_link'
        :                  'no_copies';

    my $isbn;
    if ( my $bi = eval { $biblio->biblioitem } ) {
        $isbn = eval { $bi->isbn };
    }

    # Checked here rather than at render time because we already hold $biblio;
    # asking again per result would be one extra query per book on the page.
    my $has_local_cover = 0;
    if ( _pref('LocalCoverImages') && $biblio->can('cover_images') ) {
        $has_local_cover = eval { $biblio->cover_images->count } ? 1 : 0;
    }

    return {
        biblionumber    => $biblionumber,
        title           => scalar eval { $biblio->title },
        author          => scalar eval { $biblio->author },
        isbn            => $isbn,
        items           => \@item_rows,
        total_items     => scalar @item_rows,
        available_items => $available,
        status          => $status,
        online_links    => $online_links,
        has_local_cover => $has_local_cover,
    };
}

# Read-only public lookup used by the batch comparison route. It deliberately
# goes through the same OPAC suppression and item-visibility checks as chat.
sub visible_biblio {
    my ($biblionumber) = @_;
    return _hydrate($biblionumber);
}

# Turn a list of biblionumbers into records, stopping at $limit.
sub _hydrate_all {
    my ( $biblionumbers, $limit ) = @_;

    my @records;
    my %seen;
    for my $bib ( @{ $biblionumbers || [] } ) {
        last if @records >= $limit;
        next if !$bib || $seen{$bib}++;
        my $row = _hydrate($bib);
        push @records, $row if $row;
    }
    return \@records;
}

# ---------------------------------------------------------------------------
# Primary path: the site's configured search engine.
# Returns an arrayref of records, or undef if the engine could not be used at
# all (the caller then falls back to SQL). An empty arrayref means the engine
# worked and genuinely found nothing.
# ---------------------------------------------------------------------------
sub _engine_search {
    my ( $query_string, $limit ) = @_;
    return undef unless defined $query_string && $query_string ne '';

    my $biblionumbers;
    my $ok = eval {
        require Koha::SearchEngine::Search;
        my $searcher = Koha::SearchEngine::Search->new( { index => 'biblios' } );

        # Over-fetch: hydration drops suppressed records, so some hits vanish.
        my ( $error, $results ) =
            $searcher->simple_search_compat( $query_string, 0, $limit * 4 );
        die "$error\n" if $error;

        # The portable seam -- each backend normalises its own record type
        # here, so we never touch MARC ourselves.
        $biblionumbers = [
            grep { $_ }
            map  { scalar eval { $searcher->extract_biblionumber($_) } }
            @{ $results || [] }
        ];
        1;
    };

    if ( !$ok ) {
        my $err = $@ || 'unknown error';
        $err =~ s/\s+$//;
        _log_warn("search engine unavailable ($err) -- falling back to SQL");
        return undef;
    }

    return _hydrate_all( $biblionumbers, $limit );
}

# ---------------------------------------------------------------------------
# Fallback path: direct SQL. Only reached when the search engine is unusable.
#
# Deliberately narrow, and deliberately different from the old query:
#
#  * No biblio_metadata join at all. The old code ran
#    "bm.metadata LIKE '%term%'" against a longtext column -- an unindexed
#    full table scan on every subject search. Its unfiltered join also
#    multiplied rows, because biblio_metadata is unique on
#    (biblionumber, format, schema), so several rows per biblio are legal,
#    which inflated the "Copies: X of Y" counts.
#  * Only distinct biblionumbers are selected; items are counted during
#    hydration instead, so no join here can inflate a count or mis-report
#    availability.
#  * Stated plainly: subject search is not possible in SQL, because subjects
#    live only in the MARC record. Subject degrades to a title/author match
#    and logs that it did, rather than reintroducing the table scan.
# ---------------------------------------------------------------------------
sub _sql_search {
    my ( $filters, $limit ) = @_;

    my @conditions;
    my @params;

    if ( my $t = _sanitize_term( $filters->{title} ) ) {
        push @conditions, 'b.title LIKE ?';
        push @params,     "%$t%";
    }
    if ( my $a = _sanitize_term( $filters->{author} ) ) {
        push @conditions, 'b.author LIKE ?';
        push @params,     "%$a%";
    }
    if ( my $s = _sanitize_term( $filters->{subject} ) ) {
        _log_warn(
            'subject search degraded to title/author: subjects live in the MARC '
          . 'record and are only searchable through the search engine'
        );
        push @conditions, '(b.title LIKE ? OR b.author LIKE ?)';
        push @params,     "%$s%", "%$s%";
    }
    if ( my $k = _sanitize_term( $filters->{keyword} ) ) {
        push @conditions,
            '(b.title LIKE ? OR b.author LIKE ? OR bi.isbn LIKE ? OR i.barcode = ?)';
        push @params, "%$k%", "%$k%", "%$k%", $k;
    }

    return [] unless @conditions;

    return _sql_fetch( join( ' AND ', @conditions ), \@params, $limit );
}

# Last-resort spelling tolerance for the SQL path.
#
# SOUNDEX is an English phonetic algorithm; on a non-Latin catalogue it
# produces noise rather than near-matches, so it is limited to MARC21 sites.
# Zebra and Elasticsearch already do their own stemming, so this only ever
# runs after the engine found nothing or was unreachable.
sub _soundex_search {
    my ( $filters, $limit ) = @_;

    return [] unless uc( _pref('marcflavour') ) eq 'MARC21';

    my $term = '';
    for my $field (qw(keyword title author subject)) {
        $term = _sanitize_term( $filters->{$field} );
        last if $term ne '';
    }
    return [] if $term eq '' || length($term) < 3;

    return _sql_fetch(
        '(SOUNDEX(b.title) = SOUNDEX(?) OR SOUNDEX(b.author) = SOUNDEX(?))',
        [ $term, $term ],
        $limit,
    );
}

sub _sql_fetch {
    my ( $where, $params, $limit ) = @_;

    # LEFT JOIN items: item-less records (e-books, subscriptions) must still be
    # findable. Availability is computed in _hydrate from the actual item rows,
    # never from this query, so the old NULL-onloan false "Available" cannot
    # recur. biblioitems is joined only to expose isbn to the keyword match.
    my $sql = qq{
        SELECT DISTINCT b.biblionumber
        FROM biblio b
        LEFT JOIN biblioitems bi ON bi.biblionumber = b.biblionumber
        LEFT JOIN items       i  ON i.biblionumber  = b.biblionumber
        WHERE $where
        ORDER BY b.title
        LIMIT ?
    };

    my $rows = eval {
        my $dbh = C4::Context->dbh;
        my $sth = $dbh->prepare($sql);
        $sth->execute( @{$params}, $limit * 4 );
        $sth->fetchall_arrayref( {} );
    };
    if ( !$rows ) {
        _log_warn( 'SQL search failed: ' . ( $@ || 'unknown error' ) );
        return [];
    }

    return _hydrate_all( [ map { $_->{biblionumber} } @{$rows} ], $limit );
}

# ---------------------------------------------------------------------------
# Public entry point.
#
#   search_catalog( { keyword => .., title => .., author => .., subject => .. },
#                   $limit )
#
# Returns an arrayref of records, possibly empty. Never dies.
# ---------------------------------------------------------------------------
sub search_catalog {
    my ( $filters, $limit ) = @_;
    $filters ||= {};

    $limit = 5 unless defined $limit && $limit =~ /^\d+$/ && $limit > 0;
    $limit = MAX_LIMIT if $limit > MAX_LIMIT;

    my $query_string = _build_query_string($filters);

    # Refuse to dump the whole catalogue when no usable term was supplied.
    return [] if $query_string eq '';

    my $results = _engine_search( $query_string, $limit );

    # undef means the engine itself was unusable, not that it found nothing.
    $results = _sql_search( $filters, $limit ) unless defined $results;

    # Nothing found either way: try phonetic matching for a misspelling.
    $results = _soundex_search( $filters, $limit ) unless @{$results};

    return $results;
}

# Title lookup behind the /suggestions route.
sub search_by_title {
    my ( $keyword, $limit ) = @_;
    return search_catalog( { title => $keyword }, $limit || 10 );
}

# ---------------------------------------------------------------------------
# books_for_llm — the compact view handed to the model as the tool result.
#
# Item-level detail is deliberately withheld: barcodes, branch codes and call
# numbers cost tokens on every turn and do not help the model write its reply.
# The cards the patron actually sees are rendered from the full records.
# status is a word rather than a boolean so the model cannot misread it.
# ---------------------------------------------------------------------------
sub books_for_llm {
    my ($books) = @_;
    return [] unless $books && @{$books};

    return [
        map {
            my $book = $_;
            my %seen;
            # Branch NAMES, not codes: the model repeats these verbatim to the
            # patron, and "CPL" is not an answer to "where can I find it".
            my @branches = grep { $_ && !$seen{$_}++ }
                map { $_->{branchname} || $_->{homebranch} }
                @{ $book->{items} || [] };
            {
                title            => $book->{title}  // 'Unknown title',
                author           => $book->{author} // 'Unknown author',
                status           => $book->{status} // 'no_copies',
                online_link_count => scalar @{ $book->{online_links} || [] },
                copies_total     => $book->{total_items}     // 0,
                copies_available => $book->{available_items} // 0,
                branches         => \@branches,
            }
        } @{$books}
    ];
}

# ---------------------------------------------------------------------------
# Rendering.
# ---------------------------------------------------------------------------

sub _escape {
    my ($s) = @_;
    $s = defined $s ? "$s" : '';
    $s =~ s/&/&amp;/g;
    $s =~ s/</&lt;/g;
    $s =~ s/>/&gt;/g;
    $s =~ s/"/&quot;/g;
    $s =~ s/'/&#39;/g;
    return $s;
}

# Cover image URL for a result, honouring the library's own cover-image
# preferences rather than imposing ours.
#
# A library that has set OpenLibraryCovers to "Don't add" has made a decision --
# usually privacy (every cover request tells Open Library which book that
# patron's IP is looking at), sometimes that the host is simply unreachable from
# their network. Emitting the URL anyway overrides that decision, and does it in
# the OPAC where patrons see it.
#
# Order of preference:
#   1. The library's own uploaded cover, served same-origin by opac-image.pl.
#      No third party involved at all.
#   2. Open Library, only if OpenLibraryCovers is on.
#   3. Nothing. The CSS shows a generic book graphic, which app.js already
#      handles as the no-image case.
sub _book_cover {
    my ($book) = @_;

    my $bib = $book->{biblionumber};
    if ( $book->{has_local_cover} && defined $bib && $bib =~ /^\d+$/ ) {
        return "/cgi-bin/koha/opac-image.pl?biblionumber=$bib&thumbnail=1";
    }

    return '' unless _pref('OpenLibraryCovers');

    my $isbn = $book->{isbn};
    return '' unless defined $isbn && $isbn ne '';

    # biblioitems.isbn can hold several ISBNs separated by "|" or spaces.
    ( my $first = $isbn ) =~ s/\|.*$//;
    $first =~ s/[-\s]//g;
    return '' unless $first =~ /^(\d{9,12}[\dxX])$/;
    return "https://covers.openlibrary.org/b/isbn/$1-M.jpg";
}

# Status label + the CSS class that carries its colour.
#
# The colour is NOT emitted inline any more. It used to be
# style="background:$color;color:white", and white on #10B981 is a 2.5:1
# contrast ratio -- well under the 4.5:1 WCAG 2.1 AA requires for normal text,
# so "Available" was genuinely hard to read. Handing the class to the stylesheet
# lets components.css use the accessible tinted-background pairs it already
# defines, and lets the dark-mode block override them.
my %STATUS_LABEL = (
    available   => [ 'Available',        'badge-available'   ],
    checked_out => [ 'All copies out',   'badge-checked-out' ],
    online_link => [ 'Online link',      'badge-online'      ],
    no_copies   => [ 'Ask at the desk',  'badge-enquire'     ],
);

# $opac_base lets a site whose OPAC lives on another host get absolute detail
# links. Empty (the default) yields relative links, which is correct on a
# normal single-host install and keeps the page same-origin under HTTPS.
sub render_books {
    my ( $books, $opac_base ) = @_;
    return '' unless $books && @{$books};

    $opac_base = defined $opac_base ? $opac_base : '';
    $opac_base =~ s{/+$}{};

    my $count = scalar @{$books};
    my $html  = "<h3>Search Results ($count)</h3><div class='books-container'>";

    for my $book ( @{$books} ) {
        my $items     = $book->{items} || [];
        my $total     = $book->{total_items}     // scalar @{$items};
        my $available = $book->{available_items} // 0;

        # Prefer the human branch name; fall back to the code for records
        # hydrated by an older cache that only carried homebranch.
        my ( %seen_branch, %seen_call );
        my @branches = grep { $_ && !$seen_branch{$_}++ }
            map { $_->{branchname} || $_->{homebranch} } @{$items};
        my @calls = grep { $_ && !$seen_call{$_}++ }
            map { $_->{itemcallnumber} } @{$items};

        my $safe_title  = _escape( $book->{title}  // 'Unknown Title' );
        my $safe_author = _escape( $book->{author} // 'Unknown Author' );

        my $label = $STATUS_LABEL{ $book->{status} // '' }
            || $STATUS_LABEL{no_copies};
        my ( $status, $badge_class ) = @{$label};

        # Only render a row we can actually fill. The old code printed
        # "BRANCH: N/A", "COPIES: 0 of 0" and "SHELF: N/A" for every e-book,
        # subscription and on-order title -- three rows of noise telling the
        # patron nothing. An absent row is the honest presentation.
        my $meta = '';
        if (@branches) {
            $meta .= qq{<div class="meta-row"><strong>Branch</strong> <span>}
                . _escape( join( ', ', @branches ) ) . qq{</span></div>};
        }
        if ($total) {
            my $copies = ( $total == 1 )
                ? ( $available ? '1 copy, available' : '1 copy, on loan' )
                : "$available of $total available";
            $meta .= qq{<div class="meta-row"><strong>Copies</strong> <span>}
                . _escape($copies) . qq{</span></div>};
        }
        if (@calls) {
            $meta .= qq{<div class="meta-row"><strong>Shelf</strong> <span>}
                . _escape( join( ', ', @calls ) ) . qq{</span></div>};
        }

        my $cover     = _book_cover($book);
        my $cover_img = $cover
            ? qq{<img src="} . _escape($cover) . qq{" loading="lazy" alt="">}
            : '';

        # data-biblionumber + data-action are what app.js reads to build the
        # opac-detail.pl redirect; changing them breaks the View Details button.
        my $bib   = $book->{biblionumber} // '';
        my $attrs = ( $bib ne '' )
            ? qq{ data-biblionumber="} . _escape($bib) . qq{" data-action="view"}
            : '';
        my $href = ( $bib ne '' )
            ? _escape("$opac_base/cgi-bin/koha/opac-detail.pl?biblionumber=$bib")
            : '';

        my $button = ( $href ne '' )
            ? qq{<a class="result-btn secondary" href="$href"$attrs tabindex="0">View Details</a>}
            : qq{<button class="result-btn secondary" disabled tabindex="-1">No details</button>};

        my $online_buttons = '';
        for my $url ( @{ $book->{online_links} || [] } ) {
            my $safe_url = _safe_online_url($url);
            next unless $safe_url;
            $online_buttons .= qq{<a class="result-btn secondary" href="}
                . _escape($safe_url)
                . qq{" target="_blank" rel="noopener noreferrer" tabindex="0">Open online link</a>};
        }

        # A record with no copies at all gets no cover column: an empty 80x120
        # placeholder next to three missing rows was most of the wasted space in
        # the card. With the cover gone the title gets the full width.
        my $cover_block = ( $cover_img ne '' || $total )
            ? qq{<div class="book-cover">$cover_img</div>}
            : '';

        $html .= qq{
<div class="book-card" tabindex="0">
    <div class="book-header">
        $cover_block
        <div class="book-info">
            <div class="book-title">$safe_title</div>
            <div class="book-author">$safe_author</div>
            <div class="book-meta">
                <span class="badge $badge_class">$status</span>
                $meta
            </div>
        </div>
    </div>
    <div class="book-divider"></div>
    <div class="result-actions">
        $button
        $online_buttons
    </div>
</div>
};
    }

    return $html . '</div>';
}

1;
