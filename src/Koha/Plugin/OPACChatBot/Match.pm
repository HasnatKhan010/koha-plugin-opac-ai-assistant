package Koha::Plugin::OPACChatBot::Match;

use Modern::Perl;
use C4::Context;
use Koha::Plugin::OPACChatBot::Search qw(search_catalog visible_biblio);
use Exporter 'import';
our @EXPORT_OK = qw(compare_entries);

use constant MAX_BATCH => 25;
use constant MAX_CANDIDATES => 12;

sub _norm {
    my ($s) = @_;
    return '' unless defined $s && !ref $s;
    $s = lc "$s";
    $s =~ s/[^\p{L}\p{N}]+/ /g;
    $s =~ s/^\s+|\s+$//g;
    $s =~ s/\s+/ /g;
    return $s;
}

sub _isbn13 {
    my ($raw) = @_;
    return '' unless defined $raw && !ref $raw;
    my $isbn = uc "$raw";
    $isbn =~ s/[^0-9X]//g;
    if ( length($isbn) == 10 && $isbn =~ /^\d{9}[\dX]$/ ) {
        my $sum = 0;
        for my $i ( 0 .. 8 ) {
            $sum += ( 10 - $i ) * substr( $isbn, $i, 1 );
        }
        my $check = substr( $isbn, 9, 1 ) eq 'X' ? 10 : substr( $isbn, 9, 1 );
        return '' if ( $sum + $check ) % 11;
        $isbn = '978' . substr( $isbn, 0, 9 );
        my $weight = 0;
        for my $i ( 0 .. 11 ) {
            $weight += substr( $isbn, $i, 1 ) * ( $i % 2 ? 3 : 1 );
        }
        return $isbn . ( ( 10 - $weight % 10 ) % 10 );
    }
    return '' unless $isbn =~ /^97[89]\d{10}$/;
    my $sum = 0;
    for my $i ( 0 .. 11 ) {
        $sum += substr( $isbn, $i, 1 ) * ( $i % 2 ? 3 : 1 );
    }
    return ( $sum + substr( $isbn, 12, 1 ) ) % 10 == 0 ? $isbn : '';
}

sub _book_isbns {
    my ($raw) = @_;
    return () unless defined $raw;
    my $text = "$raw";
    my %seen;
    my @out;
    # Koha may store several ISBNs, edition qualifiers and separators in one
    # biblioitems.isbn value. Validate each candidate before comparing it.
    while ( $text =~ /(?<!\d)(97[89][\d\s-]{10,25}|\d[\d\s-]{8,18}[\dXx])(?!\d)/g ) {
        my $v = _isbn13($1);
        push @out, $v if $v && !$seen{$v}++;
    }
    return @out;
}

sub _catalog_isbns {
    my ($book) = @_;
    my %seen = map { $_ => 1 } _book_isbns( $book->{isbn} );
    # biblioitems.isbn is a display/cache field. MARC can contain additional
    # 020$a values (010$a in UNIMARC), which must count as exact ISBN evidence.
    eval {
        require Koha::Biblios;
        my $biblio = Koha::Biblios->find( $book->{biblionumber} );
        my $record = $biblio && $biblio->metadata->record;
        if ($record) {
            for my $tag (qw(020 010)) {
                for my $field ( $record->field($tag) ) {
                    for my $raw ( $field->subfield('a') ) {
                        $seen{$_} = 1 for _book_isbns($raw);
                    }
                }
            }
        }
        1;
    };
    return keys %seen;
}

sub _isbn10_from13 {
    my ($isbn) = @_;
    return '' unless $isbn && $isbn =~ /^978\d{10}$/;
    my $base = substr( $isbn, 3, 9 );
    my $sum = 0;
    for my $i ( 0 .. 8 ) { $sum += ( 10 - $i ) * substr( $base, $i, 1 ) }
    my $check = ( 11 - $sum % 11 ) % 11;
    return $base . ( $check == 10 ? 'X' : $check );
}

sub _title_score {
    my ( $a, $b ) = @_;
    return 0 unless $a && $b;
    return 1 if $a eq $b;
    my %left = map { $_ => 1 } split /\s+/, $a;
    my %right = map { $_ => 1 } split /\s+/, $b;
    my $overlap = scalar grep { $right{$_} } keys %left;
    my $union = scalar keys %left;
    $union += scalar grep { !$left{$_} } keys %right;
    return $union ? $overlap / $union : 0;
}

sub _result_book {
    my ($book) = @_;
    my $id = $book->{biblionumber};
    return {
        biblionumber => $id,
        title        => $book->{title}  // '',
        author       => $book->{author} // '',
        isbn         => $book->{isbn}   // '',
        url          => "/cgi-bin/koha/opac-detail.pl?biblionumber=$id",
    };
}

sub _direct_isbn_candidates {
    my ($isbn) = @_;
    return () unless $isbn;
    my @numbers;
    my $ok = eval {
        my $dbh = C4::Context->dbh;
        my $sth = $dbh->prepare(
            'SELECT DISTINCT biblionumber FROM biblioitems WHERE isbn LIKE ? OR isbn LIKE ? LIMIT 20'
        );
        # A substring is only a candidate. _book_isbns verifies the complete
        # checksum and value before anything is reported as a match.
        my $isbn10 = _isbn10_from13($isbn);
        $sth->execute( '%' . $isbn . '%', $isbn10 ? '%' . $isbn10 . '%' : 'NO-ISBN10-MATCH' );
        @numbers = map { $_->[0] } @{ $sth->fetchall_arrayref };
        1;
    };
    return () unless $ok;
    return grep { $_ } map { visible_biblio($_) } @numbers;
}

sub _compare_one {
    my ($entry) = @_;
    my $title = _norm( $entry->{title} );
    my $author = _norm( $entry->{author} );
    my $isbn = _isbn13( $entry->{isbn} );
    return { status => 'invalid', reason => 'No usable title or valid ISBN', matches => [] }
        unless $title || $isbn;

    my @found;
    my %seen;
    if ($isbn) {
        for my $book ( _direct_isbn_candidates($isbn),
            @{ search_catalog( { keyword => $isbn }, MAX_CANDIDATES ) } ) {
            next unless $book && !$seen{ $book->{biblionumber} }++;
            push @found, $book;
        }
        my @exact = map { { %{ _result_book($_) }, evidence => 'ISBN' } }
            grep {
                my $book = $_;
                scalar grep { $_ eq $isbn } _catalog_isbns($book)
            } @found;
        return { status => 'confirmed', reason => 'Verified catalog match', matches => [ @exact[ 0 .. ( $#exact < 2 ? $#exact : 2 ) ] ] }
            if @exact;
    }
    if ($title) {
        for my $book ( @{ search_catalog( { title => $entry->{title} }, MAX_CANDIDATES ) } ) {
            next unless $book && !$seen{ $book->{biblionumber} }++;
            push @found, $book;
        }
    }

    my ( @confirmed, @possible );
    for my $book (@found) {
        my $book_title = _norm( $book->{title} );
        my $book_author = _norm( $book->{author} );
        my $title_score = _title_score( $title, $book_title );
        my $author_same = $author && $book_author && $author eq $book_author;
        my $isbn_same = $isbn && grep { $_ eq $isbn } _catalog_isbns($book);
        if ($isbn_same) {
            push @confirmed, { %{ _result_book($book) }, evidence => 'ISBN' };
        }
        elsif ( !$isbn && $title_score == 1 && $author_same ) {
            push @confirmed, { %{ _result_book($book) }, evidence => 'title and author' };
        }
        elsif ( $title_score == 1 || ( $title_score >= 0.8 && $author_same ) ) {
            my $evidence = $isbn && $title_score == 1 && $author_same
                ? 'title and author; ISBN differs'
                : 'similar title';
            push @possible, { %{ _result_book($book) }, evidence => $evidence };
        }
    }

    return { status => 'confirmed', reason => 'Verified catalog match', matches => [ @confirmed[ 0 .. ( $#confirmed < 2 ? $#confirmed : 2 ) ] ] }
        if @confirmed;
    return { status => 'possible', reason => 'Review title match', matches => [ @possible[ 0 .. ( $#possible < 2 ? $#possible : 2 ) ] ] }
        if @possible;
    return { status => 'not_found', reason => 'No OPAC-visible match found', matches => [] };
}

sub compare_entries {
    my ($entries) = @_;
    die 'entries must be an array' unless ref $entries eq 'ARRAY';
    die 'batch is too large' if @{$entries} > MAX_BATCH;
    # A database outage must be an error, never a misleading “not found”.
    if ( @{$entries} ) {
        my $alive = C4::Context->dbh->selectrow_array('SELECT 1');
        die 'database unavailable' unless defined $alive && $alive == 1;
    }
    my @results;
    for my $entry ( @{$entries} ) {
        die 'entry must be an object' unless ref $entry eq 'HASH';
        for my $field (qw(title author isbn)) {
            next unless exists $entry->{$field};
            die "invalid $field" if ref $entry->{$field};
            die "$field too long" if length( $entry->{$field} // '' ) > 250;
        }
        push @results, _compare_one($entry);
    }
    return \@results;
}

1;
