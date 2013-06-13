var fs = require( "fs" ),
	_ = require( "underscore" ),
	path = require( "path" ),
	async = require( "async" );

var kCarteroJsonFileName = "cartero.json";

module.exports = function( rootDir ) {

	var parcelMap;
	var configMap;
	var staticDir;
	var carteroJson;

	try {
		carteroJson = JSON.parse( fs.readFileSync( path.join( rootDir, kCarteroJsonFileName ) ).toString() );
		parcelMap = carteroJson.parcels;
		staticDir = carteroJson.publicDir;
	}
	catch( e ) {
		throw new Error( "Error while reading parcels.json file. Please run the grunt cartero task before running your application." + e.stack );
	}

	return function( req, res, next ) {

		var oldRender = res.render;

		res.render = function( filePath, options ) {
			var parcelMapKey = options && options.cartero_parcelMapKey ? options.cartero_parcelMapKey : filePath.replace( rootDir, "" ).substring( 1 );
			var _arguments = arguments;

			var parcelMetadata = parcelMap[ parcelMapKey ];
			if( ! parcelMetadata ) return next( new Error( "Could not find parcelKey " + parcelMapKey + " in parcel key map." ) );

			res.locals.cartero_js = _.map( parcelMetadata.js, function( fileName ) {
				return "<script type='text/javascript' src='" + fileName.replace( staticDir, "" ) + "'></script>";
			} ).join( "" );

			res.locals.cartero_css = _.map( parcelMetadata.css, function( fileName ) {
				return "<link rel='stylesheet' href='" + fileName.replace( staticDir, "" ) + "'></link>";
			} ).join( "" );

			var tmplContents = "";

			async.each( parcelMetadata.tmpl, function( fileName, cb ) {
				fs.readFile( path.join( rootDir, fileName ),  function( err, data ) {

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
