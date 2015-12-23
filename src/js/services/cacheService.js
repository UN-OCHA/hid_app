(function($, angular, contactsId, Offline, localforage) {
  "use strict";

  angular.module("contactsId").service('offlineCache', function ($http, $q, $timeout, ngDialog){
    return {
      getData: getData,
      cacheData: cacheData,
      getProfiles: getProfiles,
      cacheProfiles: cacheProfiles,
      makeRequests: makeRequests,
      processRequest: processRequest
    }

    function generateKey(url, params){ //use utils.encodeURL
      url += '?';
      angular.forEach(Object.keys(params).filter(function(p){return p != 'access_token'}).sort(),function(param,index){
        url += encodeURIComponent(param) + '=' + encodeURIComponent(params[param]) + '&';
      });
      url = url.substring(0, url.length-1); //chop off last "&"
      return url;
    }

    function getProfiles(url, options){
      var defer = $q.defer();
      var promise = $http({
          method: "get",
          url: url,
          params: options
        })
        .then(function(response){ //handleSuccess
          defer.resolve(response.data);
          Offline.markUp();

          localforage.setItem('profile-'+response.data.profile._id, JSON.stringify(response.data));

          angular.forEach(response.data.contacts, function(contact){
            localforage.setItem('contact-'+contact._id, contact._profile);
          });

          return response.data;
        }, function(response){
          checkOnline(response);

          //get contactid and then profile from that id
          return localforage.getItem('contact-'+options.contactId).then(function(profileId){
            if (profileId != null) {
              return localforage.getItem('profile-'+profileId).then(function(cacheData){
                if (cacheData != null) {
                  cacheData = JSON.parse(cacheData);
                  defer.resolve(cacheData);
                  return cacheData;
                }
                else {
                  handleError(response);
                }
              });
            }
            else {
              handleError(response);
            }
          });
        });

      return promise;
    }

    function cacheProfiles(url, options){
      var defer = $q.defer();
      var promise = $http({
        method: "get",
        url: url,
        params: options
      }).then(function(response){
        defer.resolve(response.data);
        if (response.data){
          angular.forEach(response.data, function(profile){
           localforage.setItem('profile-'+profile.profile._id, JSON.stringify(profile));

           angular.forEach(profile.contacts, function(contact){
            localforage.setItem('contact-'+contact._id, contact._profile);
           });

          });
        }
        return response.data;
      }, function (response){
        handleError(response, true);
        return null;
      });

      return promise;
    }

    function cacheData(url, options) {
      var key = generateKey(url, options);
      var defer = $q.defer();

      var promise = $http({
        method: "get",
        url: url,
        params: options
      })
        .then(function(response){ //handleSuccess
          defer.resolve(response.data);
          //TODO catch exceptions

          localforage.setItem(key,JSON.stringify(response.data));
          return response.data;
        }, function(response){
          checkOnline(response);
          handleError(response, true);
          return null;
        });
        return promise;
    }

    function getData(url, options) {
      var key = generateKey(url, options);
      
      var defer = $q.defer();
      var promise = $http({
          method: "get",
          url: url,
          params: options
        })
        .then(function(response){ //handleSuccess
          defer.resolve(response.data);
          Offline.markUp();

          //TODO catch exceptions
          localforage.setItem(key,JSON.stringify(response.data));

          return response.data;
        }, function(response){
          checkOnline(response);
          
          return localforage.getItem(key).then(function(cacheData){
            if (cacheData != null) {
              cacheData = JSON.parse(cacheData);
              defer.resolve(cacheData);
              return cacheData;
            }
            else {
              handleError(response);
              // location.replace('#/offline'); //redirect to offline
            }
          }, function(res) {
            handleError(response);
          }
            );

        });

      return promise;
    }

    function makeRequests(){
      //get from queue in localforage
      //make all requests in order
      localforage.getItem('requestqueue').then(function(cacheData){
        if (cacheData != null){
          cacheData = JSON.parse(cacheData);
          var requests = [];
          angular.forEach(cacheData, function(request, key){
            $timeout( function() { 
              var request = processRequest(request.url, request.params, request.data).then(function(response){ 
                delete cacheData[key];      
              });
              requests.push(request);
            }, 500);
          });

          $q.all(requests).then(function(){ //all requests success
            localforage.setItem('requestqueue', JSON.stringify(cacheData));
          }, function(){ //some request failed
            localforage.setItem('requestqueue', JSON.stringify(cacheData));
          });
        }
      });
    }

    function processRequest(url, options, data){
      //standard post request
      //offline fallback -> add to cache
      // var defer = $q.defer();
      var key = generateKey(url, options);
      var request = $http({
        method: 'POST',
        url: url,
        params: options,
        data: data
      }).then(function(response){
        Offline.markUp();
        return response.data;

      }, function(response){
        checkOnline(response);

        console.log('Going to add to Q!');
        return localforage.getItem('requestqueue').then(function(cacheData){
          cacheData = (cacheData != null ? JSON.parse(cacheData) : {});
          var theTime = new Date(); //better way to do this?

          var cacheObject = {url: url, params: options, data: data, time: theTime};
          cacheData[key] = cacheObject;

          localforage.setItem('requestqueue', JSON.stringify(cacheData)).then(function(){
            console.log('Added to Q!');
          });

          //some kind of popup to show request added to queue?
          
        });

      });

      return request;
    }

    function checkOnline(response) {
      Offline.check();
      return (Offline.state == "up");
    }

    function handleError(response, passiveMode) {
      // The API response from the server should be returned in a
      // nomralized format. However, if the request was not handled by the
      // server (or what not handles properly - ex. server error), then we
      // may have to normalize it on our end, as best we can.
      if (!checkOnline(response) && !passiveMode) {
        location.replace('#/offline'); //redirect to offline
      }

      // If a 403 status code is received from the profile service, then
      // set the user status to logged out and reload the page to trigger the
      // sign in process.
      if (response.status == 403) {
        ngDialog.open({
          template: '/partials/403.html',
        }).closePromise.then(function (data) {
          location.replace('#/dashboard');
        });

      }
      if (!angular.isObject(response.data) ) {
        return ($q.reject("An unknown error occured."));
      }
      // Otherwise, use expected error message.
      return ($q.reject(response.data.message));
    }
    
  });
}(jQuery, angular, window.contactsId, window.Offline, window.localforage));
