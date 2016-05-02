function AddProtectedGroupsCtrl($scope, profileService) {

  $scope.bundles = $scope.operations[$scope.contact.locationId].bundles;
  $scope.customGroups = profileService.getAllBundles().then(function(data){
      $scope.allGroups = [];
      angular.forEach($scope.bundles, function(value,key){
        var list = value;
        list.addToList = false;
        for(var i in $scope.contact.protectedBundles){
          if(value.name === $scope.contact.protectedBundles[i])
            list.addToList = true;  
        }
        for (var i in $scope.contact.bundle) {
          if (value.name === $scope.contact.bundle[i])
            list.addToList = true;
        }
        this.push(list);
      }, $scope.allGroups)
  });

  $scope.addToList = function (list) {
    list.addToList = list.addToList === false ? true: false;
  }
   
  $scope.updateContact = function(){
    angular.forEach($scope.allGroups, function(value, key) {
      if (value.hid_access == "open" && $scope.contact.bundle.indexOf(value.name) === -1) {
        if (value.addToList === true) {
          $scope.contact.bundle.push(value.name);
        }
      }
      else {
        if (value.hid_access == "open" && value.addToList === false) {
          $scope.contact.bundle.splice($scope.contact.bundle.indexOf(value.name), 1);
        }
      }
      if (value.hid_access == 'closed' && $scope.contact.protectedBundles.indexOf(value.name) === -1) {
        if (value.addToList === true) {
          $scope.contact.protectedBundles.push(value.name);
        }
      }
      else {
        if (value.hid_access == 'closed' && value.addToList === false) {
          $scope.contact.protectedBundles.splice($scope.contact.protectedBundles.indexOf(value.name), 1);
        }
      }
    })
    var contact = {
      _id: $scope.contact._id,
      _profile: $scope.contact._profile,
      status: 0
    };
    var userid = contact._profile.userid;
    $scope.contact.userid = userid;
    profileService.saveContact($scope.contact).then(function(data) {
    if (data && data.status && data.status === 'ok') {
        $scope.flash.set('Updated', 'success');
    }
    else {
        $scope.flash.set('There was an error updating this profile.', 'danger');
    }
  });
  $scope.closeThisDialog();
  }
}

