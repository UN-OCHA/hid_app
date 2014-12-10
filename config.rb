# Required extra libraries
require 'bootstrap-sass'
require 'font-awesome-sass'
require 'sass-globbing'

# Project Type
project_type = :stand_alone

# Location of the theme's resources.
  css_dir              = "src/css"
  sass_dir             = "src/scss"
  javascripts_dir      = "src/js"
  fonts_dir            = "src/fonts"
  images_dir           = "src/images"
  sprite_load_path     = "src/assets/sprites"
  generated_images_dir = "src/images/generated"
  relative_assets = true

# Change this to :production when ready to deploy the CSS to the live server.
  environment = :development

# In development, we can turn on the FireSass-compatible debug_info.
  firesass = false

# You can select your preferred output style here (can be overridden via the command line):
# output_style = :expanded or :nested or :compact or :compressed
  output_style = (environment == :development) ? :expanded : :compressed

# To disable debugging comments that display the original location of your selectors. Uncomment:
  line_comments = false

# Pass options to sass. For development, we turn on the FireSass-compatible
# debug_info if the firesass config variable above is true.
  sass_options = (environment == :development && firesass == true) ? {
    :debug_info => true,
    :unix_newlines => true
  } : {
    :quiet => true,
    :unix_newlines => true
  }
