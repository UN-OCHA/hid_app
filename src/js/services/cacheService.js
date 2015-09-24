(function($, angular, contactsId) {
  "use strict";

  angular.module("contactsId").service('offlineCache', function ($http, $q){
    return {
      getData: getData
    }

    function generateKey(url, params){ //use utils.encodeURL
      url += '?';
      angular.forEach(Object.keys(params).sort(),function(param,index){
        url += encodeURIComponent(param) + '=' + encodeURIComponent(params[param]) + '&';
      });
      url = url.substring(0, url.length-1); //chop off last "&"
      return url;
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
          Offline.markDown();
          
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

    function handleError(response) {
      // The API response from the server should be returned in a
      // nomralized format. However, if the request was not handled by the
      // server (or what not handles properly - ex. server error), then we
      // may have to normalize it on our end, as best we can.
      if (!angular.isObject(response.data) || !response.data.message) {
        location.replace('#/offline'); //redirect to offline
        // return ($q.reject("An unknown error occurred."));
      }

      // If a 403 status code is received from the profile service, then
      // set the user status to logged out and reload the page to trigger the
      // sign in process.
      if (response.status == 403) {
        location.replace('#/noauth');
      }

      // Otherwise, use expected error message.
      return ($q.reject(response.data.message));
    }
    
  });
}(jQuery, angular, window.contactsId));