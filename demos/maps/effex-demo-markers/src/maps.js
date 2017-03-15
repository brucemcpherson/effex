
/*global google*/
/*global errify*/
/*global getMapsApiKey*/

/**
 * @constructor Maps
 * all maps type things will be done here
 */
var Maps = function () {
  var ns = this;
  
  // the map
  ns.map = null;
  
  // the streetview panorama
  ns.pano = null;
  
  // the spots known
  ns.spots = [];
  
  // the spot with an activewindow
  ns.activeSpot = null;
  
  // the streeviewservice
  ns.sv = new google.maps.StreetViewService;
  
  /**
   * remove a spot
   * @param {object} spot the place
   */
  ns.removeSpot = function (spot) {
    ns.spots = ns.spots.filter (function (d) {
      return spot.maps.id !== d.maps.id;
    });

  };

  /**
   * uses the streetview service to detect nearby panorama
   * @param {number} [meters=50] how far to look around
   * @param {object} spot where the marker is
   * @return {Promise} the result
   */
   ns.getPanoByLocation = function (meters,spot) {
     
    meters = meters || 50;
    var markerPosition = new google.maps.LatLng(spot.place.lat, spot.place.lng);
    
    // if we already have a pano for this spot, then we'll recreate the last known thing
    var sr = spot.maps.sv;
    
    if (sr) {
      // always set the marker position
      //ns.pano.setPosition (sr.result.location);
     
      // and the pano
      ns.pano.setPano(sr.pano);
      
      // point of view last time we were here
      ns.pano.setPov ({
        heading:sr.pov.heading,
        pitch:sr.pov.pitch
      });
      ns.pano.setZoom (sr.zoom);

      return Promise.resolve (ns.pano);
    }

    
    // this'll be where search
    return new Promise (function (resolve, reject) {
       
      //https://developers.google.com/maps/documentation/javascript/3.exp/reference#StreetViewService
      ns.sv.getPanorama ({
        location:markerPosition,
        preference:google.maps.StreetViewPreference.BEST,
        radius:meters,
        source:"outdoor"
      } , function (result,status) {
         if (result && status === "OK") {

          var cameraPosition = result.location.latLng;
          var zoom = 1;
          // set the pitch to 0, but inherit the last zoom used.
          // the heading can be used to adjust the cameraposition towards the marker
          // https://developers.google.com/maps/documentation/javascript/geometry#Navigation
          spot.maps.sv = {
            pov: {
              heading:google.maps.geometry.spherical.computeHeading(cameraPosition , markerPosition),
              pitch:0
            },
            zoom:zoom
          };
          
          // point that at the pano
          var pov = spot.maps.sv.pov;
          ns.pano.setPano(result.location.pano);
          ns.pano.setPov ({
            heading:pov.heading,
            pitch:pov.pitch
          });
          ns.pano.setZoom (spot.maps.sv.zoom);
          resolve (ns.pano);
         }
         else {
           reject (status);
         }
       });
    });
     
  };
  
  /**
   * find street view and show it
   * @param {object} spot the spot to show
   */
  ns.showStreetView = function(spot) {
  
    ns.getPanoByLocation(50, spot)
      .then(function(pano) {
        ns.pano.setVisible(true);
        ns.showElem("camera", true);
      })
      .catch(function(err) {
        errify("streetview - no images", err);
      });
  };
    
  /**
   * make an infowindow
   * @param {object} spot a place
   * @return {infoWindow} the infowindow
   */
  ns.makeInfoWindow = function (spot) {
    var place = spot.place;
    var marker = spot.maps.marker;
    ns.activeSpot = spot;
   
    var content ='<div>';

    
    content += '<div class="mui-textfield">';
    content +=   '<input type="text" id="ttitle" value="'+place.title+'" cols="40" />';
    content +=   '<label>Title</label>';
    content +=  '</div>';
    content += '<div class="mui-textfield"><textarea id ="tinfo" rows="4" cols="40">'+place.info+'</textarea><label>Info</label></div>';
    
    content += '<div class="mui-textfield">';
    content +=   '<input type="text" id="taddress" value="'+place.address+'" cols="40" />';
    content +=   '<label>Address</label>';
    content +=  '</div>';
    
    content += '<div class="mui-textfield">';
    content +=   '<input type="text" disabled id="tclean" value="'+place["clean address"]+'" cols="40" />';
    content +=   '<label>Formatted address</label>';
    content +=  '</div>';
    
    content += '<button class="mui-btn mui-btn--primary" id="tsave">SAVE</button> <button class="mui-btn mui-btn--danger" id="tremove">REMOVE</button>';
       
    content += '<span class="mui--pull-right"><i id="tstreetview" class="material-icons">streetview</i></span>';
    content += '</div>';

    // im contructing the element so that I can find the button elements i just made
    var elem = document.createElement("div");
    elem.innerHTML = content;

   
    // now i can look for them
    var elems = ["tsave","tremove","ttitle","tinfo","taddress","tclean","tstreetview"].reduce(function (p,c) {
      p[c] = findElem (elem, c);
      return p;
    },{});
    
    // check i got them all
    if (Object.keys(elems).some (function (d) {
      return !elems[d];
    })) throw 'couldnt find all elements:'+JSON.stringify(elems);

    // now attach listeners
    google.maps.event.addDomListener(elems.tstreetview, "click", function () {
      ns.showStreetView (spot);
    });
    
        
    // now attach listeners
    google.maps.event.addDomListener(elems.tsave, "click", function () {
      place.title = elems.ttitle.value;
      place.info = elems.tinfo.value;
      if (place.address !==elems.taddress.value ) {
        // need to do a fresh geocode
        // if the address changes, then a geocode will happen
        // and both the address and the clean address will be updated
        // and the marker will move
        ns.geoCode(elems.taddress.value)
        .then (function (gc) {
          place.lat = gc.geometry.location.lat();
          place.lng = gc.geometry.location.lng();
          place["clean address"] = gc.formatted_address;
          place.address = elems.taddress.value;
          marker.setPosition (place);
          elems.tclean.value = place["clean address"];
          ns.resetBounds();
        })
        .catch (function (err) {
          errify ("geocoding problem", err + ":cant place:"+ elems.taddress.value);
        });
        
      }
    });
    
    google.maps.event.addDomListener( elems.tremove, "click", function () {
      // get rid of the spot
      ns.removeSpot(spot);
      // close the info window & delete the marker
      ns.infoWindow.close();
      ns.activeSpot = null;
      marker.setMap (null);
      // make everything fit again
      ns.resetBounds();
     
    });
    
    
    ns.infoWindow.setContent (elem);
    return ns.infoWindow;
    
    function findElem (elem,id) {
      // are we there yet?
      if (elem.id === id) return elem;
      var node = null;
      
      // look at the children
      (elem.hasChildNodes() ? Array.prototype.slice.call (elem.childNodes) : [])
      .forEach (function (d) {
        if (!node) node = findElem (d , id);
      });
      return node;
    }
  };
  
  /**
   * @param {object} spot the spot
   * @return {string} streetview api link
   */
  ns.makeStreetViewLink = function (spot) {

    if (!spot.maps.sv) return "";
    
    // we'll use the pano id
    var s = spot.maps.sv.pano;
    
    // and replicate the pov
    var p = spot.maps.sv.pov;
    
    // and the zoom
    var z = spot.maps.sv.zoom;
    
    // convert from zoom to fov
    // found that streetview allows the pov zoom to reach 5 , but it ignores it beyond 4, so set max zoom level to 4
    var zoom = Math.min (4 , z);
    
    // this documentation doesnt quite give a correctly projected result when used in with the SV api
    // var fov = 180/ Math.pow (2 , zoom);
    // https://developers.google.com/maps/documentation/javascript/streetview#TilingPanoramas
    // so im using this, which gives a slightly more accurate result
    var fov = Math.atan(Math.pow(2,1-zoom))*360/Math.PI;


    // replicate the dimensions of the whats been seen on the screen
    var st = ns.getComputedStyle ("map");
    var width = npx(st.width);  
    var height = npx(st.height); 

    // the maximum width of a streetview api image 640/640 .. https://developers.google.com/maps/documentation/streetview/
 
    // the maximum anything can be is 
    var maxAnything = 640;
    var maxWidth = Math.min (width , maxAnything);
    var maxHeight = Math.min (height , maxAnything);

    // resize if necessary .. need to do it twice to retain the aspect ratio
    if (width > maxWidth) {
      var ratio = maxWidth/width;
      width *= ratio;
      height *=  ratio;
    }
    
    if (height > maxHeight) {
      ratio = maxHeight/height;
      width *= ratio;
      height *= ratio;
    }
    
    var url= 'https://maps.googleapis.com/maps/api/streetview?size=' +
        Math.round(width) +'x'+ Math.round(height) +'&pano=' + 
        s + '&heading=' + p.heading + '&pitch=' + p.pitch + "&fov=" + fov + '&key=' + getMapsApiKey() ;
    
    return url;
    // get rid of px and convert to number
    function npx (v){
      return parseFloat(v.replace ("px",""));
    }
  };
    
  /**
   * Reverse geocode from a pos
   * @param {position} latlng
   * @return {Promise} the revere geocoded address
   */
  ns.reverseGeoCode = function (latlng) {
    var geocoder = new google.maps.Geocoder;
    return new Promise (function (resolve, reject) {
      geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK && results[1]) {
          resolve (results[1].formatted_address);
        }
        else {
          reject (status);
        }
      });
    });
  };
  
  /**
   * geocode an address
   * @param {string} address an address
   * @return {Promise} the geocded address
   */
  ns.geoCode = function (address) {
    var geocoder = new google.maps.Geocoder();
    return new Promise (function (resolve, reject) {
       geocoder.geocode({'address': address}, function(result, status) {
         if (status === google.maps.GeocoderStatus.OK) {
           resolve (result[0]);
         }
         else {
           reject (status);
         }
      });
    });
  };

  /**
   * make all the positions from the given data
   * @param {[object]} originalData the data from the store
   * @return {Promise} the geocoded data
   */
  ns.makePositions = function (originalData) {
    
    // take a copy of the data
    var data = JSON.parse(JSON.stringify(originalData));
    
    // because we'll update it in line
    return Promise.all(data.map(function(d){
      var lat = parseFloat(d.lat);
      var lng = parseFloat(d.lng);
      // set a default title if none given
      d.address = d.address || "";
      d.title = d.title || d.address;
      if (isNaN(lat) || isNaN(lng)) {
        return ns.geoCode (d.address)
        .then (function (gc) {
          d.lat = gc.geometry.location.lat();
          d.lng = gc.geometry.location.lng();
          d["clean address"] = gc.formatted_address;
          return d;
        });
      }
      else {
        d.lat = lat;
        d.lng = lng;
        return d;
      }
    }));
  };
  
  /**
   * fix up the bounds to include all known spots
   */ 
  ns.resetBounds = function () {
    // make everything fit
    var bounds = new google.maps.LatLngBounds();
    ns.spots.forEach (function (d) {
      bounds.extend (d.maps.marker.position);
    });
    ns.map.fitBounds(bounds);
  };

  /**
   * make an elem visible
   */
  ns.showElem = function (item, show) {
    document.getElementById (item).classList[show ? 'remove' : 'add'] ("mui--hide");
  };

  /**
   * get computed style
   */
  ns.getComputedStyle = function (item) {
    return window.getComputedStyle(document.getElementById (item));
  };
  
  /**
   * toggle sv
   */
  ns.togglePano = function() {
    ns.pano.setVisible(!ns.pano.getVisible());
  };
  

  /*
   * initialize the app and add listeners
   * @param {[object]} data the data from the store
   */
  ns.init = function (data) {

    ns.makePositions (data.value)
    .then (function(results) {
      
      // initialize the map

      var elem = document.getElementById('map');


      ns.map = new google.maps.Map(elem, {
        zoom: 5,
        mapTypeId: 'terrain'
      });
      

    
      ns.pano = ns.map.getStreetView();
      ns.pano.setOptions({ 
        linksControl: true,
        enableCloseButton:true,
        addressControl:true,
        zoomControl:false
      });
      
      // make only info window, and set its content dynamically
      ns.infoWindow = new google.maps.InfoWindow();

      // when its closed, we'll record that
      google.maps.event.addListener(ns.infoWindow,'closeclick',function(){
        ns.activeSpot = null; 
      });
      
      // add the existing data
      results.forEach (function (d){
        ns.addMarker (d);
      });

      // make everything fit
      ns.resetBounds();

      // closing the streetview, hide the camera icon
      ns.pano.addListener ("closeclick", function (a) {
        ns.togglePano();
        ns.showElem("camera",false);
      }); 
  
      /**
       * this gets called when we move to a different pano
       */
      ns.pano.addListener('pano_changed', function() {
        ns.activeSpot.maps.sv.pano = ns.pano.getPano();

      });
      
      
      
      /**
       * pov changes
       */
      ns.pano.addListener('pov_changed', function() {
        var pov = ns.pano.getPov();
        ns.activeSpot.maps.sv.pov.heading = pov.heading;
        ns.activeSpot.maps.sv.pov.pitch = pov.pitch;

      });
      
      /**
       * zoom changes
       */
      ns.pano.addListener('zoom_changed', function() {
        var zoom = ns.pano.getZoom();
        // this event fires even though there is no more zooming available
        // so limit it to 3.1 which seems to be about the highest it goes accurately
       
        if (zoom > 3.1) {
          zoom = 3.1;
        }
        ns.activeSpot.maps.sv.zoom = zoom;
        
        
      });


      // listen for camera click
      google.maps.event.addDomListener(document.getElementById("snap"), "click", function () {
        ns.activeSpot.place.view = ns.makeStreetViewLink( ns.activeSpot);
        errify("snapped",ns.activeSpot.place.title+ " captured");
      });
    
      // listen for start again
      google.maps.event.addDomListener(document.getElementById("reset"), "click", function () {
        // forget everything
        ns.activeSpot.maps.sv = null;
        ns.showStreetView (ns.activeSpot);
      });
      
      // This event listener will call addMarker() when the map is clicked.
      // can be used to add points
      google.maps.event.addListener(ns.map, 'rightclick', function(event) {
        var latlng = {lat:event.latLng.lat(), lng:event.latLng.lng()};
        ns.reverseGeoCode(latlng)
        .then (function (address){
          var place = {
            address:address,
            "clean address":address,
            lat:parseFloat(latlng.lat),
            lng:parseFloat(latlng.lng),
            created:new Date().getTime(),
            source:"maps",
            info:"some info",
            title:"title",
            view:""
          };
          
          ns.addMarker(place);
        })
        .catch (function (err) {
          errify ('reverse geocode failure', err);
        });
      });
      
    })
    .catch (function (err) {
      errify ("geocoding failure",err);
    });

    return ns;
  };
  
  // Adds a marker to the map and push to the array.
  ns.addMarker = function (place) {
    
    try {
      // make a marker for this place
      var marker = new google.maps.Marker({
        position: {lat: place.lat, lng: place.lng},
        map: ns.map,
        title: place.title || "",
        draggable:true,
        animation: google.maps.Animation.DROP
      });
      
 
      // add it to the data
      var spot = {
        maps:{
          marker:marker,
          id:new Date().getTime().toString(32) + Math.random(),
          sv:null
        },
        place:place
      };
      
      // if there's a view parameter, decode it and extract the current parameters
      if (place.view) {
        spot.maps.view = ["pano","pitch","heading","fov"].reduce(function (p,c) {
          var match = RegExp('[?&]' + c + '=([^&]*)').exec(place.view);
          p[c] = match && decodeURIComponent(match[1].replace(/\+/g, ' '));
          return p;
        },{});
        
        // now generate an active pano object using those params
        
        // estimate  the zoom 
        var fov =  parseFloat(spot.maps.view.fov);
        var zoom = 1-Math.log(Math.tan(fov*Math.PI/360))/Math.log(2);
        
        spot.maps.sv = {
          pano:spot.maps.view.pano,
          pov:{
            zoom:zoom,            
            heading:parseFloat(spot.maps.view.heading),
            pitch:parseFloat(spot.maps.view.pitch)
          }
        };
      }
      
      // make it clickable
      google.maps.event.addListener(spot.maps.marker,"click", function () {
        ns.makeInfoWindow(spot).open(ns.map,spot.maps.marker);
      });
      
      //  handle what happens if a marker is dragged
      google.maps.event.addListener(spot.maps.marker,"dragend", function () {
       // if a drag happens then the clean address is changed, the address is not.
       var pos = spot.maps.marker.getPosition();
  
       // do a reverse geocode
       ns.reverseGeoCode(pos)
       .then (function (address) {
          spot.place.lat = parseFloat(pos.lat);
          spot.place.lng = parseFloat(pos.lng);
          spot.place["clean address"]=address;
          // make everything fit
          ns.resetBounds();
          
          // if there's an active spot, then it needs refreshing
          ns.makeInfoWindow(spot);
          
        })
        .catch (function (err) {
          errify ('reverse geocode failure', err);
        });
  
       
      });
      
      ns.spots.push(spot);
    }
    catch (err) {
      errify("data invalid for "+place.title,err);
    }
  };


};

