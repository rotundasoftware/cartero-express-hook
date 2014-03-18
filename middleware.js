/*
 * cartero-express-hook v0.1.1
 * https://github.com/rotundasoftware/cartero-express-hook
 *
 * Copyright (c) 2013 Rotunda Software, LLC
 * Licensed under the MIT license.
 *
 * A Node.js / Express Hook for the Cartero asset manager, implemented as Express middleware.
 * 
 */

 var fs = require( "fs" ),
	path = require( "path" ),
	carteroNodeHook = require( "cartero-node-hook" ),
	View = require('express/lib/view');

module.exports = function( options ) {
	var hook = carteroNodeHook( options );

	return function( req, res, next ) {
		var oldRender = res.render;

		// for each request, wrap the render function so that we can execute our own code 
		// first to populate the `cartero_js`, `cartero_css`
		res.render = function( name, options ) {
			var _arguments = arguments;
			var app = req.app;
			var absolutePath;
			var existsSync = fs.existsSync ? fs.existsSync : path.existsSync;
			
			// try to find the absolute path of the template by resolving it against the views folder
			absolutePath = path.resolve( app.get( "views" ), name );
			if( ! existsSync( absolutePath ) ) {
				// if that doesn't work, resolve it using same method as app.render, which adds
				// extensions based on the view engine being used, etc.
				var view = new View( name, {
					defaultEngine: app.get( "view engine" ),
					root: app.get( "views" ),
					engines: app.engines
				} );
				absolutePath = view.path;
			}

			hook.getAssetsForView( absolutePath, function( err, result ) {
				if( err )
					return next( err );

				res.locals.cartero_js = result.js;
				res.locals.cartero_css = result.css;
				oldRender.apply( res, _arguments );
			} );

			
		};

		next();
	};
};