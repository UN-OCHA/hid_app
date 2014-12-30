module.exports = function(grunt) {

  var target = grunt.option('target') || 'local';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'bower-install-simple': {
      'default': {}
    },
    jshint: {
      options: {
//        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        force: true
      },
      build: {
        src: 'src/js/**',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    compass: {
      sass: {
        options: {
          config: 'config.rb'
        }
      }
    },
    copy: {
      config: {
        src: 'src/js/config.' + target + '.js',
        dest: 'src/js/config.js',
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
/*
    symlink: {
      options: {
        overwrite: true
      },
      config: {
        src: 'src/js/config.' + target + '.js',
        dest: 'src/js/config.js',
      },
    }
*/
  });

  grunt.loadNpmTasks('grunt-bower-install-simple');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-symlink');
  grunt.loadNpmTasks('grunt-angular-gettext');

  // Default task(s).
  grunt.registerTask('default', ['bower-install-simple', 'jshint', 'compass', 'copy']);
};
