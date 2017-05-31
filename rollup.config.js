
var typescript = require( 'rollup-plugin-typescript');
module.exports = {
	entry: 'src/base-url.ts',
	plugins: [
		typescript({
			typescript: require('typescript'),
			include: ['**/*.ts', '**/*.js'],
			exclude: ['node_modules/**']
		})
	],
	moduleName: 'urlPolyfill',
	format: 'iife',
	dest: 'dist/bundle.js'
};
