module.exports = function(grunt) {

  var target = grunt.option('target') || 'local';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'bower-install-simple': {
      'default': {}
    },
    compass: {
      sass: {
        options: {
          config: 'config.rb'
        }
      }
    },
    useminPrepare: {
      html: 'src/index.html',
      options: {
        dest: 'dist',
        // Override defaults allowing me to defind my own flow.
        flow: {
          steps: {
            js: [],
            css: []
          },
          post: {}
        }
      }
    },
    copy: {
      config: {
        src: 'src/js/config.' + target + '.js',
        dest: 'src/js/config.js',
      },
      // Copy's index to dist, later to be compiled by usemin.
      html: {
        src: 'src/index.html',
        dest: 'dist/index.html'
      },
      // Copy's assets to dist.
      partials: {
        expand: true,
        cwd: 'src/partials',
        src: '**',
        dest: 'dist/partials/'
      },
      po: {
        expand: true,
        cwd: 'src/po',
        src: '**',
        dest: 'dist/po/'
      },
      images: {
        expand: true,
        cwd: 'src/images',
        src: '**',
        dest: 'dist/images/'
      },
      fonts: {
        expand: true,
        cwd: 'src/fonts',
        src: '**',
        dest: 'dist/fonts/'
      },
      shims: {
        expand: true,
        cwd: 'src/libraries/webshim/js-webshim/minified/shims',
        src: '**',
        dest: 'dist/libraries/webshim/js-webshim/minified/shims/'
      },
      touchIcons: {
        expand: true,
        cwd: 'src/',
        src: ['**.{png,ico}'],
        dest: 'dist/'
      }
    },
    nggettext_extract: {
      pot: {
        files: {
          'src/po/template.pot': [
            'src/js/app.js',
            'src/partials/*.html'
          ]
        },
        options: {
          postProcess: function (catalog) {
            catalog.headers = {
              'Language': '<<specify ISO language string here>>',
              'Project-Id-Version': new Date().toISOString()
            };
          }
        }
      },
    },
    nggettext_compile: {
      all: {
        files: {
          'src/js/translations.js': ['src/po/*.po']
        }
      },
    },
    watch: {
      css: {
        files: '**/*.scss',
        tasks: ['compass', 'concat:css', 'cssmin'],
        options: {
          livereload: true
        },
      },
      js: {
        files: '**/*.js',
        tasks: ['concat:js', 'ngAnnotate', "uglify"]
      }
    },
    concat: {
      // Concatenates css files.
      css: {
        dest: '.tmp/concat/css/app.css',
        src: [
          'src/css/app.css',
          'src/libraries/angular-busy/angular-busy.css',
          'src/libraries/angular-spinkit/build/angular-spinkit.min.css',
          'src/libraries/intl-tel-input/build/css/intlTelInput.css',
        ],
      },
      // Concatenates js files.
      js: {
        files: [{
          dest: '.tmp/concat/js/app.js',
          src: [
            'src/libraries/jquery/dist/jquery.min.js',
            'src/libraries/moment/min/moment.min.js',
            'src/libraries/angular/angular.js',
            'src/libraries/angular-route/angular-route.js',
            'src/libraries/angular-animate/angular-animate.js',
            'src/libraries/angular-sanitize/angular-sanitize.js',
            'src/libraries/angular-busy/angular-busy.js',
            'src/libraries/angular-spinkit/build/angular-spinkit.min.js',
            'src/libraries/angular-gettext/dist/angular-gettext.min.js',
            'src/libraries/angular-ui-select/dist/select.min.js',
            'src/libraries/angular-inview/angular-inview.js',
            'src/libraries/intl-tel-input/build/js/intlTelInput.js',
            'src/libraries/intl-tel-input/lib/libphonenumber/build/utils.js',
            'src/libraries/webshim/js-webshim/minified/polyfiller.js',
            'src/js/libraries/angularjs-breakpoint/breakpoint-0.0.1.js',
            'src/js/directives/international-phone-number.js',
            'src/js/jso.js',
            'src/js/config.js',
            'src/js/translations.js',
            'src/js/controllers/AboutCtrl.js',
            'src/js/controllers/ContactCtrl.js',
            'src/js/controllers/CreateAccountCtrl.js',
            'src/js/controllers/DashboardCtrl.js',
            'src/js/controllers/DefaultCtrl.js',
            'src/js/controllers/FourZeroFourCtrl.js',
            'src/js/controllers/HeaderCtrl.js',
            'src/js/controllers/ListCtrl.js',
            'src/js/controllers/LoginCtrl.js',
            'src/js/controllers/LogoutCtrl.js',
            'src/js/controllers/ProfileCtrl.js',
            'src/js/controllers/RegisterCtrl.js',
            'src/js/app.js',
            'src/js/directives/activeLink.js',
            'src/js/directives/browserAlert.js',
            'src/js/directives/focusField.js',
            'src/js/directives/routeLoadingIndicator.js',
            'src/js/services/authService.js',
            'src/js/services/profileService.js'
          ]
        }]
      }
    },
    // Annotates to prevent angularjs errors on minification.
    ngAnnotate: {
      js: {
        files: {
          '.tmp/concat/js/app2.js': ['.tmp/concat/js/app.js']
        }
      }
    },
    // Minifies js.
    uglify: {
      js: {
        files: [{
          dest: 'dist/js/app.min.js',
          src: ['.tmp/concat/js/app2.js'],
        }]
      }
    },
    // Minifies css.
    cssmin: {
      css: {
        files: [{
          dest: 'dist/css/app.min.css',
          src: ['.tmp/concat/css/app.css']
        }]
      }
    },
    // Compiles new index.html with min references.
    usemin: {
      html: ['dist/index.html']
    },
    // Removes tmp dir.
    clean: {
      tmp: {
        src: ['.tmp']
      }
    }
  });

  grunt.loadNpmTasks('grunt-bower-install-simple');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-symlink');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-angular-gettext');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-ng-annotate");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-usemin");

  // Default task(s).
  grunt.registerTask('default', ['bower-install-simple', 'nggettext_extract', 'nggettext_compile', 'compass', 'useminPrepare', 'copy', 'concat', 'ngAnnotate', 'uglify', 'cssmin', 'usemin', 'clean']);
  // Build task
  grunt.registerTask('build', ['bower-install-simple', 'useminPrepare', 'copy', 'concat', 'ngAnnotate', 'uglify', 'cssmin', 'usemin', 'clean']);
};
