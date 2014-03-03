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
	_ = require( "underscore" ),
	path = require( "path" ),
	async = require( "async" ),
	View = require('express/lib/view');

module.exports = function( options ) {
	var assetsDir = options.assetsDir;
	var assetsBaseUrl = options.assetsBaseUrl;
	var viewMap;
	var assetsMap = {};

	try {
		viewMap = require( path.join( assetsDir, "view_map.json" ) );
	}
	catch( err ) {
		throw new Error( "Error while reading the view_map.json file. Have you run the grunt cartero task yet?" + err.stack );
	}

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

			var parcelId = viewMap[ absolutePath ];

			async.waterfall( [
				function( callback ) {
					if( assetsMap[ parcelId ] )
						callback( null, assetsMap[ parcelId ] );
					else {
						fs.readFile( path.join( assetsDir, parcelId, "assets.json" ), function( err, contents ) {
							if( err ) return callback( err );
							assetsMap[ parcelId ] = JSON.parse( contents );
							callback( null, assetsMap[ parcelId ] );
						} );
					}
				}],
				function( err, assets ) {
					if( err ) return next( err );

					res.locals.cartero_js = _.map( assets.script, function( fileName ) {
						return "<script type='text/javascript' src='" + path.join( assetsBaseUrl, fileName ) + "'></script>";
					} ).join( "" );

					res.locals.cartero_css = _.map( assets.style, function( fileName ) {
						return "<link rel='stylesheet' href='" + path.join( assetsBaseUrl, fileName ) + "'></link>";
					} ).join( "" );

					oldRender.apply( res, _arguments );

				}
			);
		};

		next();
	};
};