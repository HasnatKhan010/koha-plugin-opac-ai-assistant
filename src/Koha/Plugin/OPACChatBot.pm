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

our $metadata = {
    name            => 'OPAC AI Assistant',
    author          => 'Hasnat Khan',
    description     => 'AI-powered chatbot for Koha OPAC — search by title, author, ISBN, subject, and more',
    date_authored   => '2026-07-05',
    date_updated    => '2026-07-27',
    minimum_version => '26.05',
    maximum_version => undef,
    version         => '1.0.3',
};

# -----------------------------------------------------------------------
# CSS load order — must match variable dependencies
# -----------------------------------------------------------------------
my @CSS_FILES = qw(
    variables.css
    theme.css
    components.css
    chatbot.css
    responsive.css
    animations.css
);

# -----------------------------------------------------------------------
# JS load order — later files depend on earlier ones
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

    Koha::Logger->get({ interface => 'intranet' })->info(
        sprintf( 'OPACChatBot: install called (version %s)', $metadata->{version} )
    );

    return 1;
}

# -----------------------------------------------------------------------
# upgrade() — Called when an existing installation is upgraded
# -----------------------------------------------------------------------
sub upgrade {
    my ( $self, $args ) = @_;

    my $dt = DateTime->now;
    Koha::Logger->get({ interface => 'intranet' })->info(
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

    Koha::Logger->get({ interface => 'intranet' })->info(
        'OPACChatBot: uninstall called — removing plugin data'
    );

    return 1;
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
            api_base_url    => scalar $cgi->param('api_base_url') // 'http://127.0.0.1:8000',
            plugin_enabled  => scalar $cgi->param('plugin_enabled') // '1',
            debug_mode      => scalar $cgi->param('debug_mode') // '0',
        );

        # Basic URL validation
        if ( $params{api_base_url} !~ m{^https?://} ) {
            $params{api_base_url} = 'http://127.0.0.1:8000';
            Koha::Logger->get({ interface => 'intranet' })->warn(
                'OPACChatBot: invalid api_base_url provided; using default'
            );
        }

        $self->store_data( \%params );
        $self->go_home();
    }

    $template->param(
        api_base_url   => $self->retrieve_data('api_base_url')   // 'http://127.0.0.1:8000',
        plugin_enabled => $self->retrieve_data('plugin_enabled')  // '1',
        debug_mode     => $self->retrieve_data('debug_mode')      // '0',
    );

    $self->output_html( $template->output() );
}

# -----------------------------------------------------------------------
# tool() — Staff tools page (optional, placeholder)
# -----------------------------------------------------------------------
sub tool {
    my ( $self, $args ) = @_;

    my $template = $self->get_template( { file => 'tool.tt' } );
    $self->output_html( $template->output() );
}

# -----------------------------------------------------------------------
# opac_head() — Injects CSS and global config into the OPAC <head>
# -----------------------------------------------------------------------
sub opac_head {
    my ( $self ) = @_;

    my $enabled = $self->retrieve_data('plugin_enabled') // '1';
    return '' unless $enabled eq '1';

    use File::Basename qw(dirname);
    use File::Spec;
    my $plugin_dir = File::Spec->catdir( dirname(__FILE__), 'OPACChatBot' );
    my $css_dir = File::Spec->catdir( $plugin_dir, 'css' );
    my $output  = '';

    # Inject CSS in defined load order
    for my $file ( @CSS_FILES ) {
        my $path = "$css_dir/$file";
        if ( -f $path ) {
            if ( open my $fh, '<:encoding(UTF-8)', $path ) {
                local $/;
                my $content = <$fh>;
                close $fh;
                $output .= "/* === $file === */\n$content\n";
            }
            else {
                Koha::Logger->get({ interface => 'opac' })->warn(
                    "OPACChatBot: cannot read CSS file: $path"
                );
            }
        }
        else {
            Koha::Logger->get({ interface => 'opac' })->debug(
                "OPACChatBot: CSS file not found (skipping): $path"
            );
        }
    }

    return '' unless $output;

    # Inject the API base URL as a JS variable so config.js can pick it up
    my $api_url    = $self->retrieve_data('api_base_url') // 'http://127.0.0.1:8000';
    my $debug_mode = $self->retrieve_data('debug_mode')   // '0';

    my $config_script = <<"END_SCRIPT";
<script>
window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.API_BASE_URL = "$api_url";
window.KohaChatPlugin.DEBUG_MODE   = $debug_mode;
</script>
END_SCRIPT

    return $config_script . "<style>\n$output\n</style>\n";
}

# -----------------------------------------------------------------------
# opac_js() — Injects JavaScript at the bottom of the OPAC page
# -----------------------------------------------------------------------
sub opac_js {
    my ( $self ) = @_;

    my $enabled = $self->retrieve_data('plugin_enabled') // '1';
    return '' unless $enabled eq '1';

    use File::Basename qw(dirname);
    use File::Spec;
    my $plugin_dir = File::Spec->catdir( dirname(__FILE__), 'OPACChatBot' );
    my $js_dir = File::Spec->catdir( $plugin_dir, 'js' );
    my $output = '';

    for my $file ( @JS_FILES ) {
        my $path = "$js_dir/$file";
        if ( -f $path ) {
            if ( open my $fh, '<:encoding(UTF-8)', $path ) {
                local $/;
                my $content = <$fh>;
                close $fh;
                $output .= "/* === $file === */\n$content\n\n";
            }
            else {
                Koha::Logger->get({ interface => 'opac' })->warn(
                    "OPACChatBot: cannot read JS file: $path"
                );
            }
        }
        else {
            Koha::Logger->get({ interface => 'opac' })->debug(
                "OPACChatBot: JS file not found (skipping): $path"
            );
        }
    }

    return '' unless $output;
    return "<script>\n$output\n</script>\n";
}

1;
