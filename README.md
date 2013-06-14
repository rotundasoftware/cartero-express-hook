This npm module is the Node.js/Express implementation of the Hook for [Cartero](https://github.com/rotundasoftware/cartero).

Please see [The Hook](https://github.com/rotundasoftware/cartero/blob/master/README.md#the-hook) section of the Cartero documentation on how to get Cartero to inject a page's dependencies.

When creating your routing logic, you can optionally specify a second `options` parameter into your `res.render()` call that contains the parcel name being rendered.  This value will be used by the middleware to look up in `cartero.json` which js, css, and tmpl files should be injected into the page.

```javascript
var options = {
  cartero_parcel : "parcel/key/as/listed/in/cartero.json"
  };
  
res.render( yourTemplate, options );
```
