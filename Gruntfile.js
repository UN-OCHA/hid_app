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
    copy: {
      config: {
        src: 'src/js/config.' + target + '.js',
        dest: 'src/js/config.js',
      }
    }
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
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-symlink');

  // Default task(s).
  grunt.registerTask('default', ['bower-install-simple', 'jshint', 'copy']);
};
