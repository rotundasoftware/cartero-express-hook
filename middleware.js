var fs = require( "fs" ),
	_ = require( "underscore" ),
	path = require( "path" ),
	async = require( "async" ),
	View = require('express/lib/view');

var kCarteroJsonFileName = "cartero.json";

module.exports = function( projectDir ) {

	var parcelMap;
	var configMap;
	var staticDir;
	var carteroJson;

	try {
		carteroJson = JSON.parse( fs.readFileSync( path.join( projectDir, kCarteroJsonFileName ) ).toString() );
		parcelMap = carteroJson.parcels;
		staticDir = carteroJson.publicDir;
	}
	catch( e ) {
		throw new Error( "Error while reading parcels.json file. Please run the grunt cartero task before running your application." + e.stack );
	}

	return function( req, res, next ) {
		var oldRender = res.render;

		res.render = function( name, options ) {
			// find the absolute path of the view, using same method as app.render
			var app = req.app;
			var view = new View( name, {
				defaultEngine: this.get( "view engine" ),
				root: app.get( "views" ),
				engines: app.engines
			} );
			var absolutePath = view.path;

			// now get the path relative to our project directory, since that is how it is stored in the parcel map.
			var relativePath = path.relative( projectDir, absolutePath );

			var parcelName = options && options.cartero_parcel ? options.cartero_parcel : relativePath;
			var _arguments = arguments;

			var parcelMetadata = parcelMap[ parcelName ];
			if( ! parcelMetadata ) return next( new Error( "Could not find parcel \"" + parcelName + "\" in parcel map." ) );

			res.locals.cartero_js = _.map( parcelMetadata.js, function( fileName ) {
				return "<script type='text/javascript' src='" + fileName.replace( staticDir, "" ) + "'></script>";
			} ).join( "" );

			res.locals.cartero_css = _.map( parcelMetadata.css, function( fileName ) {
				return "<link rel='stylesheet' href='" + fileName.replace( staticDir, "" ) + "'></link>";
			} ).join( "" );

			var tmplContents = "";

			async.each( parcelMetadata.tmpl, function( fileName, cb ) {
				fs.readFile( path.join( projectDir, fileName ),  function( err, data ) {
					if( err ) {
						cb( err );
						return;
					}

					tmplContents += data.toString();
					cb();
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
