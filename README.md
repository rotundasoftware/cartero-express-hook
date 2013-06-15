A Node.js / Express  Hook for the [Cartero asset manager](https://github.com/rotundasoftware/cartero), implemented as Express middleware.

## Usage

After configuring the Cartero Grunt Task, install the middleware when your application is initialized, passing it the absolute path of your project directory (i.e. the `projectDir` option from the gruntfile configuration).

```javascript
// app.js

var app = express();
var carteroMiddleware = require( "cartero-express-hook" );
// ...

app.configure( function() {
	app.set( "port" , process.env.PORT || 3000 );
	app.set( "views" , path.join( __dirname, "views" ) );
	app.use( express.static( path.join( __dirname, "static" ) ) );
	// ...
	app.use( carteroMiddleware( __dirname ) );	// install the Cartero Hook
} );
```

The middleware wraps the existing `res.render()` function, so it has an opportunity to populate the `cartero_js`, `cartero_css`, and `cartero_tmpl` variables with the appropriate values each time a template is rendered. By default, the middleware uses the path of the template as the name of the parcel of assets to serve. You can override this behavior and explicitly set what parcel of assets will be served by passing in `cartero_parcel` as a property of the `render` function's `locals`.

```javascript
res.render( "myTemplate.jade", { cartero_parcel : "parcel/key/as/listed/in/cartero.json" } );
```


Please see the [Cartero documentation](https://github.com/rotundasoftware/cartero) for more information.