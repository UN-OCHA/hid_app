angular.module("contactsId").service('localForageCache', function (CacheFactory, $localForage){
  var storagePollyfill = {
    // cbFunction: function(value) { //function to return value as promsise
    //   return value;
    // },
    getItem: function(key){
      $localForage.getItem(key).then(function(value){
          console.log("fetched item: \n" + key)
          return value;
        }, function (error){
          console.log("localForage unable to getItem: \n"+key + error)
        }
      );
    },
    setItem: function(key,value){
      console.log("localForage setItem \n" + key);
      $localForage.setItem(key,value);
    },
    removeItem: $localForage.removeItem
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