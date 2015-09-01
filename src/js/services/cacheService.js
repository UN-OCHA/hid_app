(function($, angular, contactsId) {
  "use strict";

  angular.module("contactsId").service('offlineCache', function (CacheFactory, $q){
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
      storageMode:  'localStorage'
      // storageImpl:  storagePollyfill
    });

    return {
      getCacheFactory: function () {
        return offlineCache;
      }
    }
  });
}(jQuery, angular, window.contactsId));