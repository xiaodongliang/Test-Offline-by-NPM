/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Philippe Leefsma 2015 - ADN/Developer Technical Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
////////////////////////////////////////////////////////////////////////
var Promise = require('es6-promise').Promise;
var request = require('request');
var admZip = require ('adm-zip');
var mkdirp = require("mkdirp");
var async = require('async');
var path = require('path');
var util = require('util');
var zlib = require ('zlib');
var _ = require('lodash');
var fs = require('fs');

module.exports = function(config) {

  config = _.assign(
    require('./config-view-and-data'),
    config);

  var _self = this;

  var _token = null;

  var _refreshTimeout = 0;


  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  function _handleResponse(
    error, res, body,
    resolve,
    reject) {


    if (error || res.statusCode != 200) {

      try {

        if(res) {

          error = error || {error: res.statusMessage};

          error.statusCode = res.statusCode || 204;

          reject(error);
        }
        else {

          reject({
            statusCode: 204,
            message: 'Unspecified Error'
          });
        }
      }
      catch(ex) {

        reject(ex);
      }
    }

    else {

      try {


        resolve(body ? JSON.parse(body) : '')
      }
      catch(ex) {

        reject(ex);
      }
    }
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  function _refreshToken() {

    var promise = new Promise(function(resolve, reject) {

      _self.getToken().then(

        function(response){

          _token = response.access_token;

          clearTimeout(_refreshTimeout)

          _refreshTimeout = setTimeout(function() {

            _refreshToken(arguments.callee);

          }, (response.expires_in * 0.7) * 1000);

          resolve();
        },
        function(error){

          _token = null;

          reject(error);
        });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  _self.getToken = function() {

    var params = {
      client_secret: config.credentials.clientSecret,
      client_id: config.credentials.clientId,
      grant_type: 'client_credentials',
      scope: config.scope.join(' ')
    };

    var promise = new Promise(function(resolve, reject) {

      request.post(
        config.endPoints.authenticate,
        { form: params },

        function (error, res, body) {

          _handleResponse(error, res, body,
            resolve,
            reject);
        });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  _self.setToken = function(token) {

    _token = token
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  _self.initialize = function() {

    return _refreshToken();
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  _self.getSupportedFormats = function() {

    var promise = new Promise(function(resolve, reject) {

      request.get({
          url: config.endPoints.supported,
          headers: {
            'Authorization': 'Bearer ' + _token,
            'Content-Type': 'application/json'
          }
        },
        function (error, res, body) {

          _handleResponse(error, res, body,
            resolve,
            reject);
        });
    });

    return promise;
  }
  
  ///////////////////////////////////////////////////////////////////
  // Use:
  // Get bucket details
  //
  // API:
  // GET /oss/{apiversion}/buckets/{bucketkey}/details
  //
  // Response:
  //
  // "{
  //      "key":"bucketKey",
  //      "owner":"tAp1fqjjtcgqS4CKpCYDjAyNbKW4IVCC",
  //      "createDate":1404984496468,
  //      "permissions":[{
  //          "serviceId":"tAp1fqjjtcgqS4CKpCYDjAyNbKW4IVCC",
  //          "access":"full"}],
  //      "policyKey":"persistent"
  //  }"
  ///////////////////////////////////////////////////////////////////
  // Use:
  // Create bucket
  //
  // bucketCreationData = {
  //      bucketKey : "bucketKey",
  //      servicesAllowed: {},
  //      policy: "temporary/transient/persistent"
  // }
  //
  // API:
  // POST /oss/{apiversion}/buckets
  //
  // Response:
  //
  // {
  // "bucketKey": "sampletestbucketdanieldu12345",
  // "bucketOwner": "mvMpJWBGyBuGpVycB77FFgP45T4dBycD",
  // "createdDate": 1435633089537,
  // "permissions": [
  // {
  // "authId": "mvMpJWBGyBuGpVycB77FFgP45T4dBycD",
  // "access": "full"
  // }
  // ],
  // "policyKey": "temporary"
  // }
  ///////////////////////////////////////////////////////////////////
  _self.getBucket = function(
    bucketKey,
    createIfNotExists,
    bucketCreationData) {

    var promise = new Promise(function(resolve, reject) {

      var getBucketUrl = util.format(
        config.endPoints.getBucket,
        bucketKey);

      request.get({
          url: getBucketUrl,
          headers: {
            'Authorization': 'Bearer ' + _token,
            'Content-Type': 'application/json'
          }
        },
        function (error, res, body) {

          if(res.statusCode == 200 || !createIfNotExists) {

            _handleResponse(error, res, body,
              resolve,
              reject);
          }
          else {

            request.post({
                url: config.endPoints.createBucket,
                headers: {
                  'Authorization': 'Bearer ' + _token,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(bucketCreationData)
              },
              function (error, res, body) {

                _handleResponse(error, res, body,
                  resolve,
                  reject);
              });
          }
        });
    });

    return promise;
  }
  
  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Upload a file to bucket
  //
  // API:
  // PUT /oss/{apiversion}/buckets/{bucketkey}/objects/{objectkey}
  //
  // Response:
  //
  // "{   "bucket-key" : "adn-10.07.2014-11.28.15",
  //      "file": file,
  //      "objects" : [ {
  //          "location" : "baseUrl/oss/v1/buckets/bucketKey/objects/file.name",
  //          "size" : 1493911,
  //          "key" : "file.name",
  //          "id" : "urn:adsk.objects:os.object:bucketKey/file.name",
  //          "sha-1" : "ba824b22a6df9d0fc30943ffcf8129e2b9de80f6",
  //          "content-type" : "application/stream"  } ]
  //  }"
  ///////////////////////////////////////////////////////////////////////////
  _self.upload = function(filename, bucketKey, objectKey) {


    var promise = new Promise(function(resolve, reject) {
      
      var uploadUrl = util.format(
        config.endPoints.upload,
        bucketKey, objectKey.replace (/ /g, '+'));

      var readStream = fs.createReadStream(filename);

      readStream.pipe(
        request.put({
          url: uploadUrl,
          headers: {
            'Authorization': 'Bearer ' + _token,
            'Content-Type': 'application/octet-stream'
          }
        },
        function (error, res, body) {

          _handleResponse(error, res, body,
            resolve,
            reject);
        }));
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////////////
  // Use:
  // Upload a file to bucket
  //
  // API:
  // PUT /oss/{apiversion}/buckets/{bucketkey}/objects/{objectkey}/resumable
  //
  // Response:
  //
  // "{   "bucket-key" : "adn-10.07.2014-11.28.15",
  //      "file": file,
  //      "objects" : [ {
  //          "location" : "baseUrl/oss/v1/buckets/bucketKey/objects/file.name",
  //          "size" : 1493911,
  //          "key" : "file.name",
  //          "id" : "urn:adsk.objects:os.object:bucketKey/file.name",
  //          "sha-1" : "ba824b22a6df9d0fc30943ffcf8129e2b9de80f6",
  //          "content-type" : "application/stream"  } ]
  //  }"
  ///////////////////////////////////////////////////////////////////////////
  _self.resumableUpload = function(filename, bucketKey, objectKey,progressCallback) {

    var promise = new Promise(function(resolve, reject) {

      fs.stat(filename, function (err, stats) {

        if (err) {

          reject(err);
          return;
        }

        var total = stats.size ;

        var chunkSize = config.fileResumableChunk * 1024 * 1024 ;

        var nbChunks = Math.round (0.5 + total / chunkSize) ;

        var resumableUploadUrl = util.format (
          config.endPoints.resumableUpload,
          bucketKey, objectKey.replace (/ /g, '+')) ;

        var sessionId = 'adn-lmv-' + guid();

        // pipe is better since it avoids loading all in memory
        var fctChunks = function (n, chunkSize) {

          return (function (callback) {


            var start = n * chunkSize ;

            var end = Math.min (total, (n + 1) * chunkSize) - 1 ;

            var contentRange ='bytes '
              + start + '-'
              + end + '/'
              + total ;

            var readStream = fs.createReadStream (filename, {'start': start, 'end': end});

            readStream.pipe (
              request.put({
                  url: resumableUploadUrl,
                  headers: {
                    'Authorization': 'Bearer ' + _token,
                    'Content-Type': 'application/octet-stream',
                    'Content-Range': contentRange,
                    'Session-Id': sessionId
                  }
                },
                function (error, res, body) {

                  if(res.statusCode == 200 || res.statusCode == 202){
                    if(progressCallback)
                      progressCallback(n,nbChunks);

                    callback (null, body ? JSON.parse(body) : '');
                  }
                  else {
                    callback(err, null) ;
                  }
                }));
          });
        };

        var fctChunksArray = Array.apply(null, { length: nbChunks }).map(Number.call, Number);

        for ( var i =0 ; i < fctChunksArray.length ; i++)
          fctChunksArray[i] = fctChunks (i, chunkSize);

        async.parallelLimit (
          fctChunksArray,
          10,
          function (err, results) {
            if (err) {

              reject(err);
            }
            else {

              if(results.length == nbChunks) {
                 resolve(results);
              }
              else {
                reject({error: 'incomplete upload'});
              }
            }
          });
      });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  // Use:
  // Register an uploaded file
  //
  // API:
  // POST /viewingservice/{apiversion}/register
  //
  // Response:
  //
  // "{"Result":"Success"}"
  ///////////////////////////////////////////////////////////////////
  _self.register = function(urn, force) {

    var promise = new Promise(function(resolve, reject) {

      request.post({
          url: config.endPoints.register,
          headers: {
            'Authorization': 'Bearer ' + _token,
            'Content-Type': 'application/json',
            'x-ads-force': force
          },
          body: JSON.stringify({urn: urn})
        },
        function (error, res, body) {

          _handleResponse(error, res, body,
            resolve,
            reject);
        });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  // Use:
  // Get model thumbnail
  //
  // API:
  // GET /viewingservice/{apiversion}/thumbnails/{urn}?
  //     guid=$GUID$ & width=$WIDTH$ & height=$HEIGHT$ (& type=$TYPE$)
  //
  // Response:
  //
  ///////////////////////////////////////////////////////////////////
  _self.getThumbnail = function (urn, width, height, guid) {

    var promise = new Promise(function(resolve, reject) {

      var thumbnailUrl = util.format(
        config.endPoints.thumbnail, urn);

      var parameters =
        '?width=' + (width ? width : '150') +
        '&height=' + (height ? height : '150') +
        (guid ? '&guid=' + guid : '');

      request.get({
          url: thumbnailUrl + parameters,
          headers: {
            'Authorization': 'Bearer ' + _token
          },
          encoding: null
        },
        function (error, res, body) {

          if (error || res.statusCode != 200) {

            error = error || {error: res.statusMessage};

            error.statusCode = res.statusCode;

            reject(error);
          }
          else {

            var thumbnail = arrayToBase64(body);

            resolve(thumbnail);
          }
        });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  // Use:
  // Get model viewable
  //
  // API:
  // GET /viewingservice/{apiversion}/{urn}?guid=$GUID$
  // GET /viewingservice/{apiversion}/{urn}/status?guid=$GUID$
  // GET /viewingservice/{apiversion}/{urn}/all?guid=$GUID$
  //
  // Response:
  //
  //{"guid":"dXJuOmFkc2sub...","type":"design","hasThumbnail":"true",
  //"progress":"complete","startedAt":"Mon Jun 23 11:28:18 UTC 2014",
  //"status":"success","success":"100%","urn":"dXJuOmFkc2sub...",
  //"children":[{"guid":"4cf5994a25ba","type":"folder","hasThumbnail":"true",
  //"name":"Trailer.dwf","progress":"complete","role":"viewable",
  //"status":"success","success":"100%","version":"2.0",
  //"children":[{"guid":"12EB52A2-7281-44D8-A704-02D8D4A2C69C_Sheets",
  //"type":"folder","hasThumbnail":"true","name":"Sheets",
  //"progress":"complete","status":"success","success":"100%",
  //"children":[{"guid":"com.autodesk.dwf.eModel","type":"geometry",
  //"hasThumbnail":"true","name":"Trailer.iam","order":0,"progress":"Complete",
  //"role":"3d","status":"Success","viewableID":"com.autodesk.dwf.eModel",
  //"properties":{"":{"Description":""},
  //"hidden":{"_InitialURI":"presentation=49c8fb97,d4121f60",
  //"_LabelIconResourceID":"12EB52A6"}},
  //"children":[{"guid":"d1fe2007","type":"view",
  //"camera":[5,-7,5,-0.1,-2,-5,-0.1,0.2,0.1,0.3,0.4,483.5,1],
  //"hasThumbnail":"false","name":"Home View","role":"3d"},{"guid":"45291936",
  //"type":"resource","hasThumbnail":"false",
  //"mime":"application/autodesk-svf","role":"graphics",
  //"urn":"urn:adsk.viewing:fs.file:sfsfsghs==/output/com.autodesk/0.svf"},
  //{"guid":"9a5c1bcb","type":"resource",
  //"mime":"application/autodesk-db",
  //"role":"Autodesk.CloudPlatform.PropertyDatabase",
  //"urn":"urn:...ssdd==/output/com.autodesk.dwf/section_properties.db"}]}]}]}]}
  //
  ///////////////////////////////////////////////////////////////////
  _self.getViewable = function (urn, option, guid) {

    var promise = new Promise(function(resolve, reject) {

      var viewableUrl = util.format(
        config.endPoints.viewable, urn);

      var parameters = (guid ? '?guid=' + guid : '');

      var optionStr = "";

      switch (option) {

        case 'status':
          optionStr = "/status";
          break;

        case 'all':
          optionStr = "/all";
          break;

        default:
          break;
      }
      request.get({
          url: viewableUrl + optionStr + parameters,
          headers: {
            'Authorization': 'Bearer ' + _token,
            'Content-Type': 'application/json'
          }
        },
        function (error, res, body) {

          _handleResponse(error, res, body,
            resolve,
            reject);
        });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  _self.checkTranslationStatus = function(
    urn, timeout, period, progressCallback) {

    var promise = new Promise(function(resolve, reject) {

      var startTime = new Date().getTime();

      var timer = setInterval(function () {

        var dt = (new Date().getTime() - startTime) / timeout;

        if (dt >= 1.0) {

          clearInterval(timer);

          reject({error: 'timeout'});
        }
        else {

          _self.getViewable(urn).then(
            function (response) {

              if(progressCallback)
                progressCallback(response.progress);

              if (response.progress === 'complete') {

                clearInterval(timer);

                resolve(response);
              }
            },
            function (error) {

              reject(error);
            });
        }
      }, period);
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  //
  // API:
  // GET /viewingservice/v1/items/:encodedURN
  //
  ///////////////////////////////////////////////////////////////////
  _self.getItem = function(urn) {

    var promise = new Promise(function(resolve, reject) {

      var itemUrl = util.format(
        config.endPoints.items, urn);

      request.get({
          url: itemUrl,
          headers: {
            'Authorization': 'Bearer ' + _token
          },
          encoding: null
        },
        function (error, res, body) {

          try {

            if (error || res.statusCode != 200) {

              error = error || {error: res.statusMessage || 'undefined'};

              error.statusCode = res.statusCode;

              reject(error);
            }
            else {

              resolve(body);
            }
          }
          catch(ex) {

            reject({error: ex});
          }
        });
    });

    return promise;
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  _self.toBase64 = function (str) {

    return new Buffer(str).toString('base64');
  }

  _self.fromBase64 = function (str) {

    return new Buffer(str, 'base64').toString('ascii');
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  function guid() {

    var d = new Date().getTime();

    var guid = 'xxxx-xxxx-xxxx-xxxx'.replace(
      /[xy]/g,
      function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
      });

    return guid;
  }

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  function arrayToBase64(arraybuffer) {
    
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    var bytes = arraybuffer, i, len = bytes.length, base64 = "";
    
    for (i = 0; i < len; i+=3) {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }
    
    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }
    
    return base64;
  }
  
  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  function base64ToArray(base64) {
    
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    var bufferLength = base64.length * 0.75,
      len = base64.length, i, p = 0,
      encoded1, encoded2, encoded3, encoded4;
    
    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }
    
    var arraybuffer = new ArrayBuffer(bufferLength),
      bytes = new Uint8Array(arraybuffer);
    
    for (i = 0; i < len; i+=4) {
      encoded1 = chars.indexOf(base64[i]);
      encoded2 = chars.indexOf(base64[i+1]);
      encoded3 = chars.indexOf(base64[i+2]);
      encoded4 = chars.indexOf(base64[i+3]);
      
      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    
    return arraybuffer;
  }

  ////////////////////////////////////////////////////////////////////////
  // Download specified model from URN to target directory
  //
  ////////////////////////////////////////////////////////////////////////
  _self.download = function(urn, directory,progressCallback) {

    var promise = new Promise(function(resolve, reject) {

      mkdirp(directory, function (error) {

        if (error) {

          reject(error);
        }
        else {

          async.waterfall([

              function(callback) {

                if(progressCallback)
                  progressCallback('downloading viewable');
                parseViewable(directory, urn, true, callback);
              },
              function(items, callback) {
                if(progressCallback)
                  progressCallback('downloading items');
                downloadItems(items, directory, 10, callback);
              },
              function (items, callback) {
                if(progressCallback)
                  progressCallback('downloading manifest');
                parseManifest(items, callback);
              },
              function (uris, callback) {
                if(progressCallback)
                  progressCallback('downloading items');
                 downloadItems(uris, directory, 10, callback);
              }
            ],
            function (wfError, items) {

              if(wfError) {

                reject(wfError);
              }
              else {

                resolve(items);
              }
            }
          );
        }
      });
    });

    return promise;
  }

  ////////////////////////////////////////////////////////////////////////
  // Extract items from viewable
  //
  ////////////////////////////////////////////////////////////////////////
  function parseViewable(directory, urn, saveViewable, callback) {

    var filename = path.join(
      directory,
      'viewable.json');

    _self.getViewable(urn).then(

      function(viewable) {

        if (viewable.progress == 'complete') {

          //optionally saves viewable on disk
          if(saveViewable) {

            fs.writeFile(filename,
              JSON.stringify(viewable, null, 2),
              function (err) {

              });
          }

          var items = getUrnRec(viewable);

          //removes model urn
          while(items[0] === urn) {

            items.shift();
          }

          var views = getViewsRec(viewable, viewable, directory);

          items = items.concat(views);

          // Add manifest & metadata files for f2d file
          for (var i=0 ; i < items.length; i++) {

            if (path.extname(items[i]) == '.f2d') {

              items.push(path.dirname(items[i]) + '/manifest.json.gz');
              items.push(path.dirname(items[i]) + '/metadata.json.gz');
            }
          }

          callback(null, items);
        }
        else {

          callback ({error:'translation incomplete'}, null);
        }
      },
      function(error){

        callback(error, null);
      });
  }

  ////////////////////////////////////////////////////////////////////////
  // Download all items to target directory
  //
  ////////////////////////////////////////////////////////////////////////
  function downloadItems(items, directory, maxWorkers, callback) {

    //Download each item asynchronously
    async.mapLimit (items, maxWorkers,
      function (item, mapCallback) {

        if (typeof item != 'string' ) {

          mapCallback(null, item);
        }
        else {

          downloadItem(item, directory, mapCallback);
        }
      },
      //All tasks are done
      function (err, results) {

        if (err) {

          //error during download
          callback(err, null) ;
        }
        else {

          callback(null, results);
        }
      }
    );
  }

  ////////////////////////////////////////////////////////////////////////
  // Grab all urn's from viewable recursively
  //
  ////////////////////////////////////////////////////////////////////////
  function getUrnRec(item) {

    var urn =[];

    if (item.urn !== undefined )
      urn.push(item.urn);

    if(item.children !== undefined) {

      for(var key in item.children)
        urn = urn.concat(getUrnRec(
          item.children[key]));
    }

    return urn;
  }

  ////////////////////////////////////////////////////////////////////////
  // Grab all views recursively
  //
  ////////////////////////////////////////////////////////////////////////
  function getViewsRec(item, parentNode, directory) {

    var views = [];

    if(item.urn !== undefined) {

      var ext = path.extname(item.urn);

      if (ext === '.svf' || ext === '.f2d') {

        var fullFileName = path.join(directory,
          item.urn.substring(item.urn.indexOf ('/output/') + 8));

        views.push({
          path: fullFileName,
          name: parentNode.name,
          type: (ext === '.svf' ? '3d' : '2d')
        });
      }
    }

    if(item.children !== undefined ) {

      for(var key in item.children)

        views = views.concat(getViewsRec(
          item.children[key], item, directory));
    }

    return views;
  }

  ////////////////////////////////////////////////////////////////////////
  // Download item to target directory
  //
  ////////////////////////////////////////////////////////////////////////
  function downloadItem(item, directory, callback) {

    _self.getItem(item).then(

      function(data) {

        var fullFileName = path.join(directory,
          item.substring(item.indexOf ('/output/') + 8));

        try {

          mkdirp (path.dirname(fullFileName), function (err) {

            if(err) {

              callback(err, null);
            }
            else {

              fs.writeFile(fullFileName, data, function (err) {

                callback(null, {
                  urn: item,
                  path: fullFileName
                });
              });
            }
          });

        } catch(err) {

          callback(err, null);
        }
      },

      function(error) {

        console.log('Item Download failed: ' + item);
        console.log(error);

        var fullFileName = path.join(directory,
          item.substring (item.indexOf ('/output/') + 8));

        callback(null, {
          urn: item,
          path: fullFileName,
          error: error
        });
      }
    );
  }

  ////////////////////////////////////////////////////////////////////////
  // Collect additional elements from manifest
  //
  ////////////////////////////////////////////////////////////////////////
  function parseManifest(items, callback) {

    async.parallel([

        function (parallelCallback) {

          var svf = filterItems(items, '.*\\.svf$');

          async.map (
            svf,
            function (item, mapCallback) {

              readSvfItem(item, mapCallback);
            },
            function(err, uris) {

              if(err) {

                parallelCallback(err, null) ;
              }
              else {

                var out = [];
                out = out.concat.apply(out, uris);
                parallelCallback(null, out);
              }
            }
          );
        },

        function (parallelCallback) {

          var f2d = filterItems(items, '.*\\.f2d$');

          async.map (
            f2d,
            function (item, mapCallback) {

              readF2dfItem(item, mapCallback);
            },
            function(err, uris) {

              if(err) {

                parallelCallback(err, null) ;
              }
              else {

                var out = [];
                out = out.concat.apply(out, uris);
                parallelCallback(null, out);
              }
            }
          );
        },

        function (parallelCallback) {

          var manifest = filterItems(items, '.*manifest\\.json\\.gz$');

          async.map (
            manifest,
            function (item, mapCallback)
            {
              readManifest(item, mapCallback);
            },
            function(err, uris) {

              if(err) {

                parallelCallback(err, null) ;
              }
              else {

                var out = [];
                out = out.concat.apply(out, uris);
                parallelCallback(null, out);
              }
            }
          );
        }
      ],
      function(err, uris) {

        if(err) {

          callback(err, null);
        }
        else {

          var out = items;
          out = out.concat.apply(out, uris);
          callback(null, out);
        }
      }
    );
  }

  ////////////////////////////////////////////////////////////////////////
  //
  //
  ////////////////////////////////////////////////////////////////////////
  function filterItems(items, filter) {

    return items.filter (function (item) {

      return (new RegExp(filter).test(item.path));
    });
  }

  ////////////////////////////////////////////////////////////////////////
  // Extract URI's from manifest recursively
  //
  ////////////////////////////////////////////////////////////////////////
  function getUriRec(manifest, urnParent) {

    var uris = [];

    // embed:/ - Resource embedded into the svf file, so just ignore it
    if(manifest.URI !== undefined && manifest.URI.indexOf('embed:/') != 0)
      uris.push(path.normalize(
        urnParent + '/' + manifest.URI).split(path.sep).join ('/'));

    if(manifest.assets !== undefined) {

      for (var key in manifest.assets)
        uris = uris.concat(getUriRec(
          manifest.assets[key], urnParent)) ;
    }

    return uris;
  }

  ////////////////////////////////////////////////////////////////////////
  //
  //
  ////////////////////////////////////////////////////////////////////////
  function readSvfItem(item, callback) {

    var uris = [];

    // Get manifest file
    fs.readFile(item.path, function (err, content) {

      var zip = new admZip(content);

      var entries = zip.getEntries();

      entries.forEach(function(entry) {

        if (!entry.isDirectory) {

          if (entry.entryName == 'manifest.json' ) {

            var manifest = JSON.parse(entry.getData().toString('utf8'));

            uris = uris.concat(getUriRec(manifest, path.dirname(item.urn)));
          }
        }
      });

      uris = uris.filter(function(uri) {

        return uri.startsWith('urn:');
      });

      callback(null, uris);
    });
  }

  ////////////////////////////////////////////////////////////////////////
  //
  //
  ////////////////////////////////////////////////////////////////////////
  function readF2dfItem(item, callback) {

    callback(null, []);
  }

  ////////////////////////////////////////////////////////////////////////
  //
  //
  ////////////////////////////////////////////////////////////////////////
  function readManifest(item, callback) {

    fs.readFile(item.path, function (err, content) {

      zlib.unzip (content, function (err, unzipedContent) {

        var manifest = JSON.parse(unzipedContent);

        var uris = getUriRec(manifest, path.dirname(item.urn));

        uris = uris.filter(function(uri) {

          return uri.startsWith('urn:');
        });

        callback(null, uris);
      });
    });
  }
}