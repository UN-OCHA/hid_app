function OfflineSettingsCtrl($scope, cache) {
  
  $scope.cache = {}
  $scope.contacts = {};
  $scope.profiles = {};
  $scope.contactIds = {};
  $scope.appData = {};
  $scope.lists = {};
  $scope.locations = {};

  $scope.requests = {};

  angular.forEach(cache, function(value, key){
    if (key.indexOf('contact-') != -1){
      $scope.contactIds[key] = value;
    }
    else if (key.indexOf('/app/data') != -1){
      $scope.appData[key] = value;
    }
    else if (key.indexOf('/contact/view') != -1){
     $scope.contacts[key] = value; 
    }
    else if (key.indexOf('/list/view') != -1){
     $scope.lists[key] = value; 
    }
    else if (key.indexOf('/hid/locations') != -1){
     $scope.locations[key] = value; 
    }
    else if (key.indexOf('profile-') != -1){
      $scope.profiles[key] = value;
    }
    else if (key.indexOf('requestqueue') != -1){
      $scope.requests[key] = value;
    }
    else {
      $scope.cache[key] = value;
    }

  });

}
