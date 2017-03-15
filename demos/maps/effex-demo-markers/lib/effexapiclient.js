/**
 * @namespace EffexApiClient
 * lite effex API client, with no admin capabilities
 */
/* global axios */
var EffexApiClient = (function(ns) {

  // the api base url
  var ax,keys;
  
  ns.setKeys = function (optionalKeys){
    keys = optionalKeys || ns.getUriKeys();
  };

  ns.getKeys = function () {
    return keys;
  };  
  
  ns.setBase = function(base) {
    ax = axios.create({
      baseURL: base,
      maxContentLength: 512000
    });
  };


  
  function clone (ob) {
    return JSON.parse(JSON.stringify(ob || {}));
  }

  /**
   * turns a params object into a url
   * @param {object} params the params
   * @return {string} the uri
   */
  function makeParams(params) {
    params = params || {};
    var pa = Object.keys(params).reduce(function(p, c) {
      p.push(c + "=" + encodeURIComponent(params[c]));
      return p;
    }, []);

    return pa.length ? ("?" + pa.join("&")) : "";
  }

  ns.checkKeys = function (preview) {
    if (!Array.isArray(preview)) preview = [preview];
    return preview.every(function(d){ return keys[d]});
  };
  
  /**
  * @param {string} boss the boss key
  * @param {string} mode the type like writer/reader/updater
  * @param {object} params the params 
  * @return {Promise} to the result
  */
  ns.generateKey = function (boss, mode,params) {
    return ax.get ('/' + boss  + '/' + mode + makeParams(params));
  };

  /**
   * ping the service
   * @return {object} "PONG"
   */
  ns.ping = function() {
    return ax.get('/ping');
  };

  /**
   * info the service
   * @return {object} result
   */
  ns.info = function() {
    return ax.get('/info');
  };
  
  /**
   * get quotas 
   * @return {object} the quotas
   */
  ns.getQuotas = function() {
    return ax.get('/quotas');
  };

  /**
  * update an item
  * @param {string} id the item id
  * @param {string} updater the updater key
  * @param {object} data what to write
  * @param {string} method the to use (post,get)
  * @param {object} params the params 
  * @return {Promise} to the result
  */
  ns.update = function (data, id, updater, method  , params) {
    method = (method || "post").toLowerCase();
    params = params || {};
    
    if (method === "get") {
      params = clone(params);
      params.data = JSON.stringify(data);
    }
    var url = "/updater/" + ns.checkKey("updater",updater) + "/" + ns.checkKey("item",id) + makeParams(params);
    return ax[method] (url, {data:data}); 
  };

   /**
  * @param {string} writer the writer key
  * @param {object} data what to write
  * @param {string} method the to use (post,get)
  * @param {object} params the params 
  * @return {Promise} to the result
  */
  ns.write = function (data, writer, method  , params) {
    method = (method || "post").toLowerCase();
    params = params || {};
    
    if (method === "get") {
      params = clone(params);
      params.data = JSON.stringify(data);
    }
    var url = "/writer/" + ns.checkKey("writer",writer)  + makeParams(params);
    return ax[method] (url, {data:data}); 
  };

  
  ns.checkKey = function (type, value) {
    var k=  value || keys[type];
    if (!k) console.log ("failed key check", type, value);
    return k;
  };
  

  /**
  * @param {string} id the item id
  * @param {string} writer the writer key
  * @param {object} params the params 
  * @return {Promise} to the result
  */
  ns.remove = function (id, writer  , params) {
    return ax.remove ('/writer/' + ns.checkKey("writer",writer) + '/' +  ns.checkKey("item",id) + makeParams(params || []));
  };
  
  ns.read = function (id, reader  , params) {
    params = params || {};
    id = id || keys.item;
    reader = reader || keys.reader;
    return ax.get ('/reader/' + ns.checkKey("reader",reader) + '/' + ns.checkKey("item",id) + makeParams(params));
  };

  /**
  * @param {string} coupon the coupon code
  * @return {Promise} to the result
  */
  ns.validateKey = function (coupon) {
    return ax.get ('/validate/' + coupon);
  };

  /**
  * @param {string} id the item id
  * @param {string} writer the writer key
  * @param {string} key the key to assign the alias for
  * @param {string} alias the alias to assign
  * @param {object} params the params 
  * @return {Promise} to the result
  */
  ns.registerAlias = function (writer, key, id , alias, params) {
    return ax.get('/'+ ns.checkKey("writer",writer) + '/' + key + 
      '/alias/' + encodeURIComponent(alias) + '/' + ns.checkKey("item",id) + makeParams(params));
  };

  ns.getUriParam = function (name, source) {
      var match = RegExp('[?&]' + name + '=([^&]*)').exec(source || window.location.search);
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  };
  
  /**
   * standard parameters that might useful for an effex app
   * @return {object} keys
   */
  ns.getUriKeys = function() {
    var ob = ["updater", "reader", "item","boss","writer"]
      .reduce(function(p, c) {
        p[c] = ns.getUriParam(c);
        return p;
      }, {});
      
      // updaters/writers can standin for readers
      ob.updater = ob.updater || ob.writer;
      ob.reader = ob.reader || ob.updater || ob.writer;
      
      return ob;
  };
  
  // default prod
  ns.setBase("https://ephex-auth.appspot-preview.com");
  ns.setKeys();
  axios.defaults.headers.post['Content-Type'] = 'application/json';
    
  return ns;
})({});
