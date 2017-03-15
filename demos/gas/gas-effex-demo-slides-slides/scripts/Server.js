/**
* used to expose memebers of a namespace
* @param {string} namespace name
* @param {method} method name
*/
function exposeRun (namespace, method , argArray ) {
  var func = (namespace ? this[namespace][method] : this[method])
  if (argArray && argArray.length) {
    return func.apply(this,argArray);
  }
  else {
    return func();
  }
}

/**
* generate some slides from the data in the ephex store
*/
var efx = cEffexApiClient.EffexApiClient;

var Server = (function(ns) {
  
  ns.localTest = function () {
    var alias = "macdo";
    var reader = "uxk-a10-b2kdijqnlmfc";
    var templateId = "1iLG2bDiNwsUXNO0b3Gxlm4GPgZiRgJVcChkWn-N3BbU";
    var presoName = "macdo";
  };
 /**
  * there are 2 types of templating
  * {{replacethistext}} with d.replacethistext;
  * {{[replacethisimage]}} using the url found in d.replacethisimage
  */
  ns.generateSlides = function (alias, reader, templateId,presoName) {
    
    // get the data from the store
    var data = getDataFromStore(alias,reader);
    
    // get the template and the parent folder
    var template = DriveApp.getFileById(templateId);
    var folder = template.getParents().next();
    
    // make a copy of the slide template
    var copy = template.makeCopy(presoName, folder);
    var id = copy.getId();
    
    // get the slide template
    var template = Slides.Presentations.get(id);
    
    // find the template slide (actually just the 2nd one, but could be fancier search)
    var templateSlide = template.slides[1];
    
    // need to map the created objectids to ones of my choosing so I can find them later
    var objectIds = templateSlide.pageElements.map(function(d) {
      return d.objectId;
    });
    
    // we'll also need an alias for each individual slide
    objectIds.push (templateSlide.objectId);

    
    // create the batch request to duplicate the template slides
    // slide 1 - stays as it is
    // slide 2 - duplicated to match rows in the data
    var requests = data.reduce(function(reqs, row, sindex) {
      
      // the duplication request
      reqs.push({
        duplicateObject: {
          objectId: templateSlide.objectId,
          objectIds: objectIds.reduce(function(p, c) {
            p[c] = c + "_" + sindex;
            return p;
          }, {})
        }
      });
      
      // now we can do text substitution, by object
      // cant use replacealltext, because the same placeholders are duplicated everywhere
      // for this to work .. template {{changethis}} must be in the same text element
      // maybe I'll fancy that up in a later version
      templateSlide.pageElements.forEach(function(d, pindex) {
        
        // d = templateSlide.pageElements[0]
        if (d.shape && d.shape.text && d.shape.text) {
          
          // as we change the length of the text run, the start index will increasingly get out of step
          var indexCorrection = 0;
          
          // need to look through each of the textElements 
          d.shape.text.textElements.forEach(function(t) {
            
            // t = c.shape.text.textElements[0]
            // see if this chunk has some content
            if (t.textRun && t.textRun.content) {
              
              // there's some content here, see if it needs to be changed
              Object.keys(row).forEach(function(e) {
                
                // this will find any matching templated {{properties}}
                var rx = new RegExp("\\{\\{" + e + "\\}\\}");
                var match = rx.exec (t.textRun.content);
                
                // if we have a match
                if (match) {
                  // first delete the text that is there
                  // the text to delete is the length of the match + where it starts + the offset of the text element
                  var startIndex = match.index + (t.startIndex || 0)  + indexCorrection;
                  var endIndex = startIndex + match[0].length;
                  
                  // fix the indexCorrection to take account of the future amended length of the textRun
                  indexCorrection +=  row[e].toString().length - match[0].length ;
                  
                  // create a batch request to delete that
                  reqs.push(reqDeleteText (d.objectId + '_' + sindex ,  startIndex , endIndex ));
                  
                  // add in the replacement text
                  reqs.push(reqInsertText ( d.objectId + '_' + sindex , row[e].toString() , startIndex));
                  
                }
                else {
                  // maybe this is an image match
                  var rx = new RegExp("\\{\\{\\[" + e + "\\]\\}\\}");
                  var match = rx.exec (t.textRun.content);
                  
                  if (match) {
                    
                    // first delete the text that is there
                    // the text to delete is the length of the match + where it starts + the offset of the text element
                    var startIndex = match.index + (t.startIndex || 0)  + indexCorrection;
                    var endIndex = startIndex + match[0].length;
                    
                    // fix the indexCorrection to take account of the future amended length of the textRun
                    var text = 'street view image';
                    indexCorrection +=  row[e].toString().length - text;
                    
                    // create a batch request to delete that text
                    reqs.push(reqDeleteText (d.objectId + '_' + sindex ,  startIndex , endIndex ));
                    
                    // add some comment
                    reqs.push (reqInsertText (d.objectId + '_' + sindex, text , startIndex));
                    
                    // now add the image
                    // i should really do something here to preserve the aspect ratio...
                    
                    reqs.push ({
                      createImage:{
                        url:row[e].toString(),
                        elementProperties: {
                          pageObjectId:templateSlide.objectId+'_'+sindex,
                          size:d.size,
                          transform:d.transform
                        }
                      }
                    })
                    
                  }
                  
                }
              });
            }
          });
        }
      });
      return reqs;
    },[]);
    
    // finally, delete the template
    requests.push ({
      deleteObject: {
        objectId:templateSlide.objectId
      }
    });
    
    /**
    * generates a text insert req
    * @param {string} objectId the object id
    * @param {string} text the text to insert
    * @param {number} startIndex
    * @return {object} the insertion request
    */
    function reqInsertText ( objectId , text , startIndex) {
      return {
        insertText: {
          objectId: objectId,
          text: text,
          insertionIndex: startIndex
        }
      };
    }
    
    /**
    * generates a text delete req
    * @param {string} objectId the object id
    * @param {string} text the text to insert
    * @param {number} startIndex
    * @return {object} the insertion request
    */
    function reqDeleteText ( objectId ,  startIndex , endIndex) {
      return {
        deleteText: {
          objectId: objectId,
          textRange: {
            startIndex: startIndex,
            endIndex: endIndex,
            type:'FIXED_RANGE'
          }
        }
      };
    }
    

    // execute the update
    return Slides.Presentations.batchUpdate({
      requests: requests
    }, id);
    
    
  }
  
  function getDataFromStore(alias, reader) {
    
    // pull from store
    var result = efx.read(alias, reader);
    if (!result.ok) {
      throw JSON.stringify(result);
    }
    
    return result.value;
  }
  
  return ns;
})(Server || {});