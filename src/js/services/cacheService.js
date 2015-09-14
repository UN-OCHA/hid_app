(function($, angular, contactsId) {
  "use strict";

  angular.module("contactsId").service('offlineCache', function (CacheFactory, $http, $q){
    return {
      getCacheFactory: function () {
        return offlineCache;
      },
      getData: getData
    }

    function encodeURL(url, params){ //use utils.encodeURL
      url += '?';
      angular.forEach(Object.keys(params).sort(),function(param,index){
        url += encodeURIComponent(param) + '=' + encodeURIComponent(params[param]) + '&';
      });
      url = url.substring(0, url.length-1); //chop off last "&"
      return url;
    }


    function getData(url, options) {
      var key = encodeURL(url, options);
      
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
          Offline.markDown();
          
          return localforage.getItem(key).then(function(cacheData){
            if (cacheData != null) {
              cacheData = JSON.parse(cacheData);
              defer.resolve(cacheData);
              return cacheData;
            }
            else {
              handleError(response);
            }
          }, function(res) {
            handleError(response);
          }
            );

        });

      return promise;
    }

    function handleError(response) {
      // The API response from the server should be returned in a
      // nomralized format. However, if the request was not handled by the
      // server (or what not handles properly - ex. server error), then we
      // may have to normalize it on our end, as best we can.
      if (!angular.isObject(response.data) || !response.data.message) {
        if (response.status === 0) {
          location.replace('#/offline'); //redirect to offline
        }
        return ($q.reject("An unknown error occurred."));
      }

      // If a 403 status code is received from the profile service, then
      // set the user status to logged out and reload the page to trigger the
      // sign in process.
      if (response.status == 403) {
        authService.logout(true);
        location.reload();
        return $q.defer();
      }

      // Otherwise, use expected error message.
      return ($q.reject(response.data.message));
    }

    var localPollyfill = {
      getItem: function(key){
        console.log("getItem " + key);
        return localStorage.getItem(key);
      },
      setItem: function(key, value){
        console.log("setItem" + key);
        return localStorage.setItem(key,value);
      },
      removeItem: localStorage.removeItem
    };


    var storagePollyfill = { //not in use
      // cbFunction: function(value) { //function to return value as promise
      //   return value;
      // },
      getItem: function(key){
        var promise;
        var defer = $q.defer();
        promise = localforage.getItem(key).then(function(value){
            console.log("fetched item: \n" + key)
            return value;
          }, function (error){
            console.log("localForage unable to getItem: \n"+ key + error)
          }
        ).then(function(data){
          defer.resolve(data);
          return data;
        });
        return promise.promise;

      },
      setItem: function(key,value){
        console.log("localForage setItem \n" + key);
        localforage.setItem(key,value);
      },
      removeItem: localforage.removeItem
    };

    var offlineCache = CacheFactory('offlineCache',{
      maxAge:   10*60*1000, //10 minutes
      cacheFlushInterval:   15*60*1000, //15 minutes
      deleteOnExpire:   'aggressive',
      storageMode:  'localStorage',
      storageImpl:  localPollyfill
    });

    
  });
}(jQuery, angular, window.contactsId));