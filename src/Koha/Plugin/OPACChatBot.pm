package Koha::Plugin::OPACChatBot;

# Copyright 2026 Hasnat Khan
#
# This file is part of Koha.
#
# Koha is free software; you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# Koha is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Koha; if not, see <http://www.gnu.org/licenses>.

use Modern::Perl;
use base qw(Koha::Plugins::Base);

use Koha::Logger;
use JSON qw(decode_json);

our $VERSION = '1.4.6';

our $metadata = {
    name            => 'OPAC AI Assistant',
    author          => 'Hasnat Khan',
    description     => 'Self-contained AI chatbot for the Koha OPAC. Searches the catalogue by '
                     . 'title, author, ISBN, subject and more, and answers library FAQs. '
                     . 'No external server required — the plugin serves its own API and calls '
                     . 'the LLM provider directly.',
    date_authored   => '2026-07-05',
    date_updated    => '2026-10-11',
    minimum_version => '22.11',
    maximum_version => undef,
    version         => $VERSION,
};

# -----------------------------------------------------------------------
# Concatenated asset bundles, built by scripts/build.sh.
#
# Keys are paths relative to bundle_path; values are the URL segment the
# bundles are mounted under, below this plugin's own api_routes namespace:
#   /api/v1/contrib/opacchatbot/asset/css/bundle.css
#
# These are served by OPACChatBot::Controller#asset, NOT by Koha's
# Koha::REST::V1::Static. Static#get inspects $c->req->url->path and 400s
# unless it literally starts with "/api/v1/contrib":
#
#     return $c->render( status => 400, ... )
#         unless "$path" =~ /^\/api\/v1\/contrib/;
#
# That holds only when Koha runs as a native Mojolicious app. Under the
# common Apache + api/v1/app.pl deployment the request arrives as
# /api/v1/app.pl/api/v1/contrib/... and the "/api/v1" prefix ends up in the
# URL *base*, so $c->req->url->path no longer matches and every bundle
# request returns "400 Endpoint intended for plugin static files" — the
# widget then never loads. Serving the files from our own controller makes
# asset delivery independent of how the host mounts its API, which also
# means it works on a Koha too old to ship Static.pm at all.
# -----------------------------------------------------------------------
my @BUNDLES = (
    { rel => 'css/bundle.css', route => '/asset/css/bundle.css', type => 'text/css' },
    { rel => 'js/bundle.js',   route => '/asset/js/bundle.js',   type => 'application/javascript' },
);

# Loaded only after a patron selects a photo. All OCR and barcode processing
# stays in the browser; no image is uploaded to an AI or third-party service.
my @OCR_ASSETS = map {
    { rel => "ocr/$_", route => "/asset/ocr/$_", type => 'application/javascript' }
} qw(
    zxing.min.js
    tesseract.min.js
    worker.min.js
    tesseract-core.wasm.js
    tesseract-core-simd.wasm.js
    tesseract-core-lstm.wasm.js
    tesseract-core-simd-lstm.wasm.js
);
push @OCR_ASSETS, {
    rel => 'ocr/eng.traineddata.gz',
    route => '/asset/ocr/eng.traineddata.gz',
    type => 'application/octet-stream',
};
my @IMPORT_ASSETS = (
    { rel => 'import/pdf.mjs', route => '/asset/import/pdf.mjs', type => 'application/javascript' },
    { rel => 'import/pdf.worker.mjs', route => '/asset/import/pdf.worker.mjs', type => 'application/javascript' },
    { rel => 'import/mammoth.browser.min.js', route => '/asset/import/mammoth.browser.min.js', type => 'application/javascript' },
    { rel => 'import/xlsx.full.min.js', route => '/asset/import/xlsx.full.min.js', type => 'application/javascript' },
);
my @IMAGE_ASSETS = (
    { rel => 'images/logo.svg', route => '/asset/images/logo.svg', type => 'image/svg+xml' },
);
my @ROUTE_ASSETS = ( @BUNDLES, @OCR_ASSETS, @IMPORT_ASSETS, @IMAGE_ASSETS );

# -----------------------------------------------------------------------
# CSS load order — must match variable dependencies.
# Used for the inline fallback and to build css/bundle.css.
# -----------------------------------------------------------------------
my @CSS_FILES = qw(
    variables.css
    theme.css
    components.css
    chatbot.css
    responsive.css
    animations.css
    compare.css
);

# -----------------------------------------------------------------------
# JS load order — later files depend on earlier ones.
# Used for the inline fallback and to build js/bundle.js.
# -----------------------------------------------------------------------
my @JS_FILES = qw(
    icons.js
    config.js
    utils.js
    knowledgeBase.js
    faq.js
    intentEngine.js
    api.js
    ui.js
    chatController.js
    compare.js
    app.js
);

# -----------------------------------------------------------------------
# new() — Constructor
# -----------------------------------------------------------------------
sub new {
    my ( $class, $args ) = @_;
    $args->{metadata} = $metadata;
    my $self = $class->SUPER::new($args);
    return $self;
}

# -----------------------------------------------------------------------
# install() — Called when the plugin is first installed
# -----------------------------------------------------------------------
sub install {
    my ( $self, $args ) = @_;

    Koha::Logger->get( { interface => 'intranet' } )->info(
        sprintf( 'OPACChatBot: install called (version %s)', $metadata->{version} )
    );

    return 1;
}

# -----------------------------------------------------------------------
# upgrade() — Called when an existing installation is upgraded
# -----------------------------------------------------------------------
sub upgrade {
    my ( $self, $args ) = @_;

    # Move the old generic/Athena assistant branding to the new default while
    # preserving any name chosen by a library administrator.
    my $name = $self->retrieve_data('library_name') // '';
    if ( $name eq '' || $name eq 'Athena' || $name eq 'Library AI Assistant' ) {
        $self->store_data( { library_name => 'Sadi' } );
    }

    # Existing 1.2.4 installations may have saved retired provider defaults.
    # Leave other, deliberately chosen model names untouched.
    my $provider = $self->retrieve_data('llm_provider') // '';
    my $model    = $self->retrieve_data('llm_model') // '';
    if ( $provider eq 'gemini' && $model eq 'gemini-1.5-flash-latest' ) {
        $self->store_data( { llm_model => 'gemini-3.5-flash-lite' } );
    }
    elsif ( $provider eq 'groq' && $model eq 'llama-3.1-8b-instant' ) {
        $self->store_data( { llm_model => 'openai/gpt-oss-20b' } );
    }

    require DateTime;
    my $dt = DateTime->now;
    Koha::Logger->get( { interface => 'intranet' } )->info(
        sprintf(
            'OPACChatBot: upgrade called at %s (version %s)',
            $dt->iso8601(),
            $metadata->{version}
        )
    );

    return 1;
}

# -----------------------------------------------------------------------
# uninstall() — Called when the plugin is removed
# -----------------------------------------------------------------------
sub uninstall {
    my ( $self, $args ) = @_;

    Koha::Logger->get( { interface => 'intranet' } )->info(
        'OPACChatBot: uninstall called — removing plugin data'
    );

    return 1;
}

# -----------------------------------------------------------------------
# api_namespace() — base path segment for this plugin's REST routes
# Routes are mounted at: /api/v1/contrib/opacchatbot/...
# -----------------------------------------------------------------------
sub api_namespace {
    my ($self) = @_;
    return 'opacchatbot';
}

# -----------------------------------------------------------------------
# api_routes() — OpenAPI 2.0 path spec for the plugin's REST routes.
#
# The routes deliberately have NO "x-koha-authorization" key, which makes
# them anonymous-accessible under /api/v1/contrib (see Koha::REST::V1::Auth:
# the is_plugin branch allows the request without a logged-in user).
# The spec is returned inline (a decoded data structure) so there is no
# dependency on a bundled file being readable at request time.
# -----------------------------------------------------------------------
sub api_routes {
    my ($self) = @_;

    my $spec = <<'SPEC';
{
  "/chat": {
    "post": {
      "x-mojo-to": "OPACChatBot::Controller#chat",
      "operationId": "opacChatbotChat",
      "tags": ["opacchatbot"],
      "consumes": ["application/json"],
      "produces": ["application/json"],
      "parameters": [
        {
          "name": "body",
          "in": "body",
          "required": true,
          "schema": { "type": "object", "additionalProperties": true }
        }
      ],
      "responses": {
        "200": { "description": "Chat reply",  "schema": { "type": "object", "additionalProperties": true } },
        "400": { "description": "Bad request", "schema": { "type": "object", "additionalProperties": true } },
        "500": { "description": "Server error","schema": { "type": "object", "additionalProperties": true } }
      }
    }
  },
  "/compare": {
    "post": {
      "x-mojo-to": "OPACChatBot::Controller#compare",
      "operationId": "opacChatbotCompare",
      "tags": ["opacchatbot"],
      "consumes": ["application/json"],
      "produces": ["application/json"],
      "parameters": [
        {
          "name": "body",
          "in": "body",
          "required": true,
          "schema": { "type": "object", "additionalProperties": true }
        }
      ],
      "responses": {
        "200": { "description": "Comparison results", "schema": { "type": "object", "additionalProperties": true } },
        "400": { "description": "Bad request", "schema": { "type": "object", "additionalProperties": true } },
        "429": { "description": "Rate limited", "schema": { "type": "object", "additionalProperties": true } },
        "500": { "description": "Comparison failed", "schema": { "type": "object", "additionalProperties": true } }
      }
    }
  },
  "/suggestions": {
    "get": {
      "x-mojo-to": "OPACChatBot::Controller#suggestions",
      "operationId": "opacChatbotSuggestions",
      "tags": ["opacchatbot"],
      "produces": ["application/json"],
      "parameters": [
        { "name": "q", "in": "query", "required": false, "type": "string" }
      ],
      "responses": {
        "200": { "description": "Suggestions", "schema": { "type": "object", "additionalProperties": true } }
      }
    }
  }
}
SPEC

    my $routes = decode_json($spec);

    # Merge in one literal route per asset bundle. Swagger 2.0 has no wildcard
    # path syntax, so each file must be declared on its own. The main widget
    # is two bundles and the optional OCR runtime is loaded only on a scan.
    # An asset with
    # no readable file behind it is skipped rather than advertised, so a
    # partial build can never produce a <link> that 404s.
    #
    # eval-guarded for the same reason static_routes was: if this method dies,
    # Koha drops the whole plugin, chat route included. A failure here must cost
    # us cacheable assets, never the chatbot.
    eval {
        for my $bundle (@ROUTE_ASSETS) {
            next unless $self->_bundle_file( $bundle->{rel} );

            ( my $op = $bundle->{rel} ) =~ s/[^A-Za-z0-9]//g;

            $routes->{ $bundle->{route} } = {
                get => {
                    'x-mojo-to' => 'OPACChatBot::Controller#asset',
                    operationId => 'opacChatbotAsset' . ucfirst($op),
                    tags        => ['opacchatbot'],
                    produces    => [ $bundle->{type} ],

                    # The cache-buster is declared so it is a documented part of
                    # the contract; "required" is omitted because Swagger 2.0
                    # defaults it to false for non-path parameters.
                    parameters => [ { name => 'v', in => 'query', type => 'string' } ],
                    responses  => {
                        200 => { description => 'Asset bundle',     schema => { type => 'file' } },
                        404 => { description => 'Bundle not found', schema => { type => 'object' } },
                    },
                },
            };
        }
        1;
    } or do {
        Koha::Logger->get( { interface => 'opac' } )
            ->warn("OPACChatBot: asset routes failed ($@); assets will be inlined");
    };

    return $routes;
}

# -----------------------------------------------------------------------
# static_routes() is deliberately NOT implemented.
#
# It is the obvious way to ship plugin assets — Koha prefixes each path with
# "/contrib/<namespace>/static" and Koha::REST::V1::Static serves the file.
# But Static#get rejects the request with
#   400 "Endpoint intended for plugin static files"
# unless $c->req->url->path itself begins with "/api/v1/contrib", which is not
# true under the Apache + api/v1/app.pl deployment (there the prefix lives in
# the URL base, and the path arrives as /api/v1/app.pl/api/v1/contrib/...).
# Since hooks are duck-typed, simply not defining static_routes means Koha
# never calls it; the bundles are declared in api_routes instead and served by
# this plugin's own controller, which makes no assumptions about mounting.
# See the @BUNDLES comment for the full reasoning.
# -----------------------------------------------------------------------

# -----------------------------------------------------------------------
# Asset delivery helpers.
# -----------------------------------------------------------------------

# Absolute path to a bundled file, or undef when it is absent/unreadable.
sub _bundle_file {
    my ( $self, $rel ) = @_;

    my $base = eval { $self->bundle_path };
    return undef unless defined $base && $base ne '';

    my $path = "$base/$rel";
    return ( -f $path && -r _ ) ? $path : undef;
}

# Resolve an asset route back to (absolute path, content type), for the
# controller that serves it. Lookup is against @ROUTE_ASSETS by exact route match,
# so a caller can never reach a file outside bundle_path however the request
# path was manipulated — nothing from the URL is interpolated into a filename.
sub bundle_for_route {
    my ( $self, $route ) = @_;

    for my $bundle (@ROUTE_ASSETS) {
        next unless $bundle->{route} eq ( $route // '' );
        my $path = $self->_bundle_file( $bundle->{rel} ) or return;
        return ( $path, $bundle->{type} );
    }
    return;
}

# True when the OPAC should link to the bundles rather than inline everything.
#
# Deliberately conservative: it demands that the bundle files actually exist,
# because a missing bundle would give the patron a <link> that 404s and an
# invisible widget, which is a worse failure than a fat page. There is no
# Koha::REST::V1::Static probe any more — the bundles are served by this
# plugin's own controller, so nothing version-specific is required.
sub _use_bundles {
    my ($self) = @_;

    return 0 if ( $self->retrieve_data('asset_delivery') // 'auto' ) eq 'inline';

    for my $bundle (@BUNDLES) {
        return 0 unless $self->_bundle_file( $bundle->{rel} );
    }
    return 1;
}

# Read and concatenate files from a bundle subdirectory, in the given order.
sub _read_assets {
    my ( $self, $subdir, @files ) = @_;

    # The separator must match scripts/build.sh exactly, so the inline fallback
    # and js/bundle.js are byte-identical (asserted at build time).
    #
    # The bare ';' matters: JavaScript inserts no semicolon before a line
    # starting with '(', so a file ending in an unterminated assignment fuses
    # with the next file's leading '(function () {' and is parsed as a function
    # CALL. That silently broke localIntent once already.
    my $sep = $subdir eq 'js' ? "\n;\n" : "\n";

    my $output = '';
    for my $file (@files) {
        my $path = $self->_bundle_file("$subdir/$file");
        if ( !$path ) {
            Koha::Logger->get( { interface => 'opac' } )
                ->warn("OPACChatBot: missing asset $subdir/$file");
            next;
        }
        if ( open my $fh, '<:encoding(UTF-8)', $path ) {
            local $/;
            my $content = <$fh>;
            close $fh;
            $output .= "/* === $file === */\n$content$sep";
        }
        else {
            Koha::Logger->get( { interface => 'opac' } )
                ->warn("OPACChatBot: cannot read $path: $!");
        }
    }
    return $output;
}

# URL for a bundle, cache-busted by plugin version so an upgrade is picked up
# immediately. Takes the bundle_path-relative name and resolves the route from
# @BUNDLES, so the emitted URL cannot drift from the route api_routes declared.
sub _bundle_url {
    my ( $self, $rel ) = @_;

    my ($bundle) = grep { $_->{rel} eq $rel } @BUNDLES;
    return '' unless $bundle;

    return '/api/v1/contrib/' . $self->api_namespace . $bundle->{route} . "?v=$VERSION";
}

# -----------------------------------------------------------------------
# configure() — Plugin configuration page (Staff interface)
# -----------------------------------------------------------------------
sub configure {
    my ( $self, $args ) = @_;

    my $template = $self->get_template( { file => 'configure.tt' } );
    my $cgi      = $self->{'cgi'};

    if ( $cgi->param('save') ) {
        my %params = (
            plugin_enabled => scalar $cgi->param('plugin_enabled') // '1',
            debug_mode     => scalar $cgi->param('debug_mode') // '0',

            # LLM provider selection
            llm_provider   => scalar $cgi->param('llm_provider') // 'groq',
            llm_model      => scalar $cgi->param('llm_model') // '',

            # Branding / library info (all non-secret)
            library_name    => scalar $cgi->param('library_name')    // 'Sadi',
            logo_url        => scalar $cgi->param('logo_url')        // '',
            info_hours      => scalar $cgi->param('info_hours')      // '',
            info_membership => scalar $cgi->param('info_membership') // '',
            info_borrowing  => scalar $cgi->param('info_borrowing')  // '',
            info_rules      => scalar $cgi->param('info_rules')      // '',
            info_contact    => scalar $cgi->param('info_contact')    // '',

            # Optional: OPAC base URL used to build detail/reserve links.
            # Empty = use relative links (recommended, works on any host).
            opac_base_url  => scalar $cgi->param('opac_base_url') // '',

            # Photo recognition runs locally in the patron's browser. The
            # packaged OCR assets load only after a photo is selected.
            enable_image_scan => scalar $cgi->param('enable_image_scan') // '1',

            # 'auto'   = serve cached bundles when this Koha supports it
            # 'inline' = always inline the assets into the page
            asset_delivery => scalar $cgi->param('asset_delivery') // 'auto',
        );

        $params{asset_delivery} = 'auto'
            unless $params{asset_delivery} eq 'inline';

        # Default model per provider if left blank
        if ( !$params{llm_model} ) {
            my %default_model = (
                groq   => 'openai/gpt-oss-20b',
                gemini => 'gemini-3.5-flash-lite',
                openai => 'gpt-4o-mini',
            );
            $params{llm_model} = $default_model{ $params{llm_provider} } // 'openai/gpt-oss-20b';
        }

        # --- API key: write-only, encrypted at rest ---------------------
        # If the field is blank on save, keep the existing key (don't wipe).
        my $new_key = scalar $cgi->param('api_key');
        if ( defined $new_key && $new_key ne '' ) {
            $new_key =~ s/^\s+|\s+$//g;    # trim
            $params{api_key_enc} = $self->_encrypt($new_key);
            $params{api_key_set} = '1';
        }

        $self->store_data( \%params );
        $self->go_home();
        return;
    }

    # Build masked indicator: never send the real key back to the browser.
    my $key_set = $self->retrieve_data('api_key_set') // '0';

    # CSRF token for the Save POST. Recent Koha (>= ~24.05) wraps every
    # intranet POST in Koha::Middleware::CSRF and rejects a tokenless save with
    # "403 - No CSRF token passed"; older Koha has no such middleware and simply
    # ignores the extra hidden field. Generated with the same defaults the
    # middleware checks against — session id from the CGISESSID cookie, secret
    # from the DB password — and eval-guarded so a Koha without Koha::Token
    # still renders the page.
    my $csrf_token = eval {
        require Koha::Token;
        Koha::Token->new->generate_csrf(
            { session_id => scalar $cgi->cookie('CGISESSID') } );
    } // '';

    $template->param(
        csrf_token => $csrf_token,

        plugin_enabled => $self->retrieve_data('plugin_enabled') // '1',
        debug_mode     => $self->retrieve_data('debug_mode') // '0',

        llm_provider => $self->retrieve_data('llm_provider') // 'groq',
        llm_model    => $self->retrieve_data('llm_model') // '',

        api_key_set => $key_set,

        library_name    => $self->retrieve_data('library_name') // 'Sadi',
        logo_url        => $self->retrieve_data('logo_url') // '',
        info_hours      => $self->retrieve_data('info_hours') // '',
        info_membership => $self->retrieve_data('info_membership') // '',
        info_borrowing  => $self->retrieve_data('info_borrowing') // '',
        info_rules      => $self->retrieve_data('info_rules') // '',
        info_contact    => $self->retrieve_data('info_contact') // '',

        opac_base_url => $self->retrieve_data('opac_base_url') // '',

        enable_image_scan => $self->retrieve_data('enable_image_scan') // '1',
        asset_delivery      => $self->retrieve_data('asset_delivery') // 'auto',

        # Shown on the config page so an admin can see which delivery mode is
        # actually in force, rather than only what was requested.
        bundles_in_use => $self->_use_bundles ? 1 : 0,

        encryption_available => $self->_encryption_available ? 1 : 0,
    );

    $self->output_html( $template->output() );
}

# -----------------------------------------------------------------------
# opac_head() — injects the stylesheet and the NON-SECRET settings object
# into the OPAC <head>. The API key is never included here.
# -----------------------------------------------------------------------
sub opac_head {
    my ($self) = @_;

    my $enabled = $self->retrieve_data('plugin_enabled') // '1';
    return '' unless $enabled eq '1';

    # Assemble the non-secret settings consumed by config.js.
    my $settings = {
        API_BASE   => '/api/v1/contrib/' . $self->api_namespace,
        DEBUG_MODE => ( $self->retrieve_data('debug_mode') // '0' ) eq '1' ? 1 : 0,
        APP_NAME   => $self->retrieve_data('library_name') // 'Sadi',
        LOGO_URL   => $self->retrieve_data('logo_url') // '',
        OPAC_BASE  => $self->retrieve_data('opac_base_url') // '',

        ENABLE_IMAGE_SCAN =>
            ( $self->retrieve_data('enable_image_scan') // '1' ) eq '1' ? 1 : 0,

        INFO => {
            hours      => $self->retrieve_data('info_hours') // '',
            membership => $self->retrieve_data('info_membership') // '',
            borrowing  => $self->retrieve_data('info_borrowing') // '',
            rules      => $self->retrieve_data('info_rules') // '',
            contact    => $self->retrieve_data('info_contact') // '',
        },
    };

    require JSON;
    my $settings_json = JSON->new->utf8(0)->encode($settings);

    # The settings contain admin-authored HTML (the Library Information fields),
    # and this JSON is interpolated inside a <script> element. JSON escaping
    # alone is NOT enough there:
    #
    #   * An HTML parser ends a <script> at the first literal "</script" in the
    #     text, wherever it appears -- inside a JSON string or not. An admin who
    #     pastes "</script><img src=x onerror=alert(1)>" into Library Rules would
    #     otherwise close the element early and inject live markup into every
    #     OPAC page. Escaping the "/" as \/ keeps the JSON identical in meaning
    #     while making the byte sequence unrecognisable to the HTML parser.
    #   * U+2028 / U+2029 are legal unescaped in JSON but are line terminators
    #     to a JS parser, which would raise a SyntaxError and kill the widget.
    #   * "<!--" opens an HTML comment inside legacy script parsing.
    #
    # This is defence in depth rather than a live hole: only a staff user with
    # the plugins permission can set these fields. It still must not be possible.
    $settings_json =~ s{</}{<\\/}g;
    $settings_json =~ s{<!--}{<\\!--}g;
    $settings_json =~ s{\x{2028}}{\\u2028}g;
    $settings_json =~ s{\x{2029}}{\\u2029}g;

    my $out = <<"END_SCRIPT";
<script>
window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.SETTINGS = $settings_json;
</script>
END_SCRIPT

    if ( $self->_use_bundles ) {
        my $href = $self->_bundle_url('css/bundle.css');
        $out .= qq{<link rel="stylesheet" href="$href">\n};
    }
    else {
        my $css = $self->_read_assets( 'css', @CSS_FILES );
        $out .= "<style>\n$css\n</style>\n" if $css;
    }

    return $out;
}

# -----------------------------------------------------------------------
# opac_js() — injects the JavaScript at the bottom of the OPAC page.
# -----------------------------------------------------------------------
sub opac_js {
    my ($self) = @_;

    my $enabled = $self->retrieve_data('plugin_enabled') // '1';
    return '' unless $enabled eq '1';

    if ( $self->_use_bundles ) {

        # defer is safe here: app.js does all its work inside a
        # DOMContentLoaded listener, and SETTINGS is already defined by the
        # inline <script> that opac_head emitted in <head>.
        my $src = $self->_bundle_url('js/bundle.js');
        return qq{<script defer src="$src"></script>\n};
    }

    my $js = $self->_read_assets( 'js', @JS_FILES );
    return '' unless $js;
    return "<script>\n$js\n</script>\n";
}

# -----------------------------------------------------------------------
# get_api_key() — decrypt and return the stored LLM API key (server-side
# only). Returns '' if none set.
# -----------------------------------------------------------------------
sub get_api_key {
    my ($self) = @_;
    my $stored = $self->retrieve_data('api_key_enc');
    return '' unless defined $stored && $stored ne '';
    return $self->_decrypt($stored);
}

# -----------------------------------------------------------------------
# Encryption helpers (Koha::Encryption = AES-CBC, key from koha-conf.xml).
# If encryption is unavailable, fall back to a clearly-marked plaintext
# store and log a warning — never fail silently.
# -----------------------------------------------------------------------
sub _encryption_available {
    my ($self) = @_;
    my $ok = eval {
        require Koha::Encryption;
        Koha::Encryption->new;
        1;
    };
    return $ok ? 1 : 0;
}

sub _encrypt {
    my ( $self, $plain ) = @_;
    my $enc = eval {
        require Koha::Encryption;
        Koha::Encryption->new->encrypt_hex($plain);
    };
    if ( defined $enc && !$@ ) {
        return $enc;
    }
    Koha::Logger->get( { interface => 'intranet' } )->warn(
        'OPACChatBot: Koha::Encryption unavailable; storing API key without encryption. '
        . 'Set <encryption_key> in koha-conf.xml to enable at-rest encryption.'
    );
    return 'PLAIN:' . $plain;
}

sub _decrypt {
    my ( $self, $stored ) = @_;
    if ( $stored =~ /^PLAIN:(.*)$/s ) {
        return $1;
    }
    my $plain = eval {
        require Koha::Encryption;
        Koha::Encryption->new->decrypt_hex($stored);
    };
    return defined $plain ? $plain : '';
}

1;
