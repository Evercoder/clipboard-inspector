module.exports = {
	entry: './src/app.js',
	output: {
		filename: 'bundle.js'
	},
	module: {
	  rules: [
	    { 
	    	test: /\.js$/, 
	    	exclude: /node_modules/, 
	    	loader: "babel-loader",
	    	query: {
	    		presets: ['env', 'react', 'es2015']
	    	} 
	    }
	  ]
	}
}