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

module.exports = function( projectDir ) {
	var carteroJson;

	// cache the cartero.json file, which lists the required assets for each view template.
	try {
		carteroJson = JSON.parse( fs.readFileSync( path.join( projectDir, "cartero.json" ) ).toString() );
	}
	catch( err ) {
		throw new Error( "Error while reading the cartero.json file. Have you run the grunt cartero task yet?" + err.stack );
	}

	return function( req, res, next ) {
		var oldRender = res.render;

		// for each request, wrap the render function so that we can execute our own code 
		// first to populate the `cartero_js`, `cartero_css`, and `cartero_tmpl` variables.
		res.render = function( name, options ) {
			var _arguments = arguments;
			var parcelName;
			
			if( options && options.cartero_parcel ) parcelName = options.cartero_parcel;
			else {
				var app = req.app;
				var absolutePath;
				var existsSync = fs.existsSync ? fs.existsSync : path.existsSync;
				
				// try to find the absolute path of the template by resolving it against the views folder
				absolutePath = path.resolve( app.get( "views" ), name );
				if( ! existsSync( absolutePath ) ) {
					// if that doesn't work, resolve it using same method as app.render, which adds
					// extensions based on the view engine being used, etc.
					var view = new View( name, {
						defaultEngine: this.get( "view engine" ),
						root: app.get( "views" ),
						engines: app.engines
					} );
					absolutePath = view.path;
				}

				parcelName = path.relative( projectDir, absolutePath );
			}

			var parcelMetadata = carteroJson.parcels[ parcelName ];
			if( ! parcelMetadata ) return next( new Error( "Could not find parcel \"" + parcelName + "\" in parcel map." ) );

			res.locals.cartero_js = _.map( parcelMetadata.js, function( fileName ) {
				// don't change file path if its a CDN file
				if ( ! /https?:\/\//.test( fileName ) )
					fileName = fileName.replace( carteroJson.publicDir, "" );

				return "<script type='text/javascript' src='" + fileName + "'></script>";
				
			} ).join( "" );

			res.locals.cartero_css = _.map( parcelMetadata.css, function( fileName ) {
				// don't change file path if its a CDN file
				if ( ! /https?:\/\//.test( fileName ) )
					fileName = fileName.replace( carteroJson.publicDir, "" );

				return "<link rel='stylesheet' href='" + fileName + "'></link>";

			} ).join( "" );

			var tmplContents = "";

			async.each( parcelMetadata.tmpl, function( fileName, callback ) {
				fs.readFile( path.join( projectDir, fileName ),  function( err, data ) {
					if( err ) {
						callback( err );
						return;
					}

					tmplContents += data.toString();
					callback();
				} );
			},
			function( err ) {
				if( err ) {
					console.log( "ERROR: Exception while reading tmpl files to inject into response: " + err );
				}

				res.locals.cartero_tmpl = tmplContents;
				oldRender.apply( res, _arguments );
			} );
		};

		next();
	};
};
