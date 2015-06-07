'use strict';

module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		wiredep: {
			task: {
				src: ['index.html']
			}
		},
		jshint: {
			options: {
				node: true,
				browser: true,
				esnext: true,
				bitwise: true,
				camelcase: true,
				curly: true,
				eqeqeq: true,
				immed: true,
				indent: 2,
				latedef: true,
				newcap: true,
				noarg: true,
				quotmark: 'single',
				undef: true,
				unused: true,
				strict: true,
				trailing: true,
				smarttabs: true,
				jquery: true
			},
			all: ['Gruntfile.js', 'js/**/*.js']
		},
		watch: {},
		connect: {
			server: {
				options: {
					port: 9000,
					open: true,
					keepalive: true
				}
			}
		},
		clean: {
			build: 'dist'
		},
		copy: {
			main: {
				files: [
					{src: 'index.html', dest: 'dist/'},
					{src: 'favicon.ico', dest: 'dist/'},
					{expand: true, src: ['config/**', 'css/**', 'data/**', 'js/**', '!data/*.js', '!data/*.j', '!data/*.backup*'], dest: 'dist/'},
				]
			}
		},
		bower: {
			dev: {
				dest: 'dist/bower_components',
				options: {
					expand: true
				}
			}
		}
	});

	grunt.registerTask('default', ['jshint', 'wiredep']);
	grunt.registerTask('serve', ['connect']);
	grunt.registerTask('build', ['clean','bower','copy']);

};