use strict;
use warnings;
use Test::More;
use MARC::Record;
use MARC::Field;
BEGIN {
    package C4::Context;
    sub preference { return '' }
    $INC{'C4/Context.pm'} = 1;
}
use Koha::Plugin::OPACChatBot::Search qw(render_books books_for_llm);

{
    package SadiTestMetadata;
    sub record { return $_[0]->{record} }
    package SadiTestBiblio;
    sub metadata { return $_[0]->{metadata} }
    package SadiTestItem;
    sub uri { return $_[0]->{uri} }
}

my $record = MARC::Record->new;
$record->append_fields(
    MARC::Field->new( '856', '4', '0', 'u', 'https://ebooks.example.org/read?id=7&lang=en' ),
    MARC::Field->new( '856', '4', '0', 'u', 'javascript:alert(1)' ),
    MARC::Field->new( '856', '4', '0', 'u', 'https://ebooks.example.org/read?id=7&lang=en' ),
);
my $biblio = bless { metadata => bless( { record => $record }, 'SadiTestMetadata' ) }, 'SadiTestBiblio';
my $items = [ bless( { uri => 'https://vendor.example.org/item/8' }, 'SadiTestItem' ) ];

my $links = Koha::Plugin::OPACChatBot::Search::_online_links( $biblio, $items );
is_deeply(
    $links,
    [ 'https://ebooks.example.org/read?id=7&lang=en', 'https://vendor.example.org/item/8' ],
    '856 and item links are collected, deduplicated, and unsafe schemes rejected'
);

for my $bad ( 'javascript:alert(1)', 'data:text/html,test', 'https://user@host.example/a', 'https://host.example/a" onmouseover="x' ) {
    is( Koha::Plugin::OPACChatBot::Search::_safe_online_url($bad), '', "rejects unsafe URL: $bad" );
}

my $book = {
    biblionumber => 42,
    title => 'Online & Digital',
    author => 'A <Author>',
    isbn => '',
    items => [],
    total_items => 0,
    available_items => 0,
    status => 'online_link',
    online_links => $links,
};
my $html = render_books( [$book], '' );
like( $html, qr/Online link/, 'online status is visible' );
like( $html, qr/https:\/\/ebooks\.example\.org\/read\?id=7&amp;lang=en/, 'URL is HTML escaped' );
like( $html, qr/rel="noopener noreferrer"/, 'external links are isolated' );
unlike( $html, qr/javascript:/, 'unsafe URL never reaches rendered HTML' );
is( books_for_llm( [$book] )->[0]{online_link_count}, 2, 'model receives link count without URLs' );

done_testing;
