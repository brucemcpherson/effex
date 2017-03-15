/* global google */
/* global Maps */
/* global EffexApiClient */
/* global getMapsApiKey */

google.load('maps', '3', {
  callback: function() {

    // this particular app is expecting to read and update an item, so ensure we have keys for that
    if (!EffexApiClient.checkKeys(["updater", "reader", "item"])) {
      errify('missing uri parameters', 'both an updater key and an item key are required');
    }
    
    else {
      // give some info 
      document.getElementById("efx-id").innerHTML = EffexApiClient.getKeys().item;
      document.getElementById("efx-key").innerHTML = EffexApiClient.getKeys().updater;

      var maps;
      // and get the data
      EffexApiClient.read()
        .then(function(response) {
          if (response.data && response.data.ok) {
            // initialize the map and get going
            maps = new Maps().init(response.data);
          }
          else {
            errify("Failed to get effexdata", JSON.stringify(response));
          }
        })
        .catch(function(err) {
          errify("grevious error getting data", err);
        });

      // hook up the update button
      document.getElementById("update")
        .addEventListener("click", function() {
          EffexApiClient.update(maps.spots.map(function(d) {
              return d.place;
            }))
            .then(function(result) {
              if (result.data && result.data.ok) {
                errify("Effex updated", maps.spots.length + " spots sent");
              }
              else {
                errify("Failed to update effexdata", JSON.stringify(result));
              }
            })
            .catch(function(err) {
              errify("grevious error updating data", err);
            });
        });
    }


  },
  

  other_params: 'key=' + getMapsApiKey()

});

// error messages
function errify(message, error) {
  var ef = document.getElementById("errify");
  ef.classList.remove ("mui--hide");
  ef.innerHTML = message + '<br>' + error;
  console.log(message, error);
  setTimeout(function () {
    ef.classList.add ("mui--hide");
  }, 5000);
}
