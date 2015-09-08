module.exports = function(grunt) {

  var target = grunt.option('target') || 'local';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'bower-install-simple': {
      'default': {}
    },
    cacheHash : {},
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
        // Override defaults allowing me to define my own flow.
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
            'src/js/**/*.js',
            'src/index.html',
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
    ngtemplates: {
      app: {
        cwd: 'src',
        src: 'partials/*.html',
        dest: 'src/js/partials.js',
        options: {
          module: 'contactsId',
          prefix: '/',
          htmlmin: {
            collapseBooleanAttributes:      true,
            collapseWhitespace:             true,
            removeAttributeQuotes:          true,
            removeComments:                 true,
            removeEmptyAttributes:          true,
            removeRedundantAttributes:      true,
            removeScriptTypeAttributes:     true,
            removeStyleLinkTypeAttributes:  true
          }
        }
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
          'src/libraries/ngDialog/css/ngDialog.css',
          'src/libraries/ngDialog/css/ngDialog-theme-default.css',
          'src/libraries/offline/themes/offline-theme-default-indicator.css',
          'src/libraries/offline/themes/offline-language-english-indicator.css'
        ],
      },
      // Concatenates js files.
      js: {
        files: [{
          dest: '.tmp/concat/js/app.js',
          src: [
            'src/libraries/jquery/dist/jquery.min.js',
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
            'src/libraries/ngDialog/js/ngDialog.js',
            'src/libraries/webshim/js-webshim/minified/polyfiller.js',
            'src/libraries/offline/offline.min.js',
            'src/libraries/angular-cache/dist/angular-cache.min.js',
            'src/libraries/localforage/dist/localforage.min.js',
            'src/js/libraries/angularjs-breakpoint/breakpoint-0.0.1.js',
            'src/js/directives/international-phone-number.js',
            'src/js/jso.js',
            'src/js/config.js',
            'src/js/translations.js',
            'src/js/controllers/AboutCtrl.js',
            'src/js/controllers/AddToCustomListCtrl.js',
            'src/js/controllers/ContactCtrl.js',
            'src/js/controllers/CreateAccountCtrl.js',
            'src/js/controllers/CustomListSettingsCtrl.js',
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
            'src/js/partials.js',
            'src/js/directives/activeLink.js',
            'src/js/directives/browserAlert.js',
            'src/js/directives/focusField.js',
            'src/js/directives/routeLoadingIndicator.js',
            'src/js/services/authService.js',
            'src/js/services/profileService.js',
            'src/js/services/cacheService.js'
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
    // Cache bust
    cacheBust: {
      options: {
        encoding: 'utf8',
        algorithm: 'md5',
        length: 16,
        rename: false,
        jsonOutput: '../.tmp/cachebust.json'
      },
      assets: {
        files: [{
          src: ['dist/index.html','dist/offline.manifest']
        }]
      }
    },
    // Build cache manifest
    manifest: {
      generate: {
        options: {
          basePath: 'dist/',
          cache: ['<%= cacheHash["/js/app.min.js"] %>',
                  '<%= cacheHash["/css/app.min.css"] %>',
                  'fonts/font-awesome/fontawesome-webfont.woff?1424885649',
                  'http://fonts.googleapis.com/css?family=Noto+Serif:400,700,400italic|Open+Sans:700,400',
                  'http://fonts.googleapis.com/css?family=Open+Sans:400,300,600,700,800',
                  '<%= cacheHash["/favicon-32x32.png"] %>'],
          // network: ['*'],
          fallback: ['/ partials/offline.html'],
          // exclude: ['']
          preferOnline: true,
          hash: true,
          verbose: false
        },
        src: [
          // 'js/app.min.js',
          // 'css/app.min.css',
          // 'index.html',
          'images/*.png',
          'libraries/webshim/js-webshim/minified/shims/styles/shim.css',
          'libraries/webshim/js-webshim/minified/shims/form-core.js',
          'libraries/webshim/js-webshim/minified/shims/form-validation.js',
          'libraries/webshim/js-webshim/minified/shims/plugins/jquery.ui.position.js',
          'fonts/exo2/exo2-semibold-webfont.woff2',
        ],
        dest: 'dist/offline.appcache'
      }
    },
    // Removes tmp dir.
    clean: {
      dist: {
        src: ['dist/**/*']
      },
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
  grunt.loadNpmTasks("grunt-cache-bust");
  grunt.loadNpmTasks("grunt-angular-templates");
  grunt.loadNpmTasks("grunt-usemin");
  grunt.loadNpmTasks("grunt-manifest");

  //load cache buster json and generate manifest
  grunt.registerTask('manifest-gen','Generate manifest from cache buster output', function(){
    grunt.config.set('cacheHash',grunt.file.readJSON('.tmp/cachebust.json'));
    grunt.log.write('Read cacheBust output');
    grunt.task.run(['manifest']);
  });

  // Default task(s).
  grunt.registerTask('default', [
    'clean:dist',
    'bower-install-simple',
    'nggettext_extract',
    'nggettext_compile',
    'compass',
    'useminPrepare',
    'copy',
    'ngtemplates',
    'concat',
    'ngAnnotate',
    'uglify',
    'cssmin',
    'usemin',
    'cacheBust',
    'manifest-gen',
    'clean:tmp'
  ]);

  // Build task (excludes compass, nggettext, and copy:config)
  grunt.registerTask('build', [
    'clean:dist',
    'bower-install-simple',
    'useminPrepare',
    'copy:html',
    'copy:partials',
    'copy:po',
    'copy:images',
    'copy:fonts',
    'copy:shims',
    'copy:touchIcons',
    'ngtemplates',
    'concat',
    'ngAnnotate',
    'uglify',
    'cssmin',
    'usemin',
    'cacheBust',
    'manifest-gen',
    'clean:tmp'
  ]);
};
