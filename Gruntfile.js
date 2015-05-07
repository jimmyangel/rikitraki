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
		}
	});

	grunt.registerTask('default', ['jshint', 'wiredep']);
	grunt.registerTask('serve', ['connect']);

};