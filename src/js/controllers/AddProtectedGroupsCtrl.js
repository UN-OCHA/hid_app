function AddProtectedGroupsCtrl($scope, profileService) {

  $scope.customGroups = profileService.getAllBundles().then(function(data){
      $scope.allGroups = [];
      angular.forEach($scope.bundles, function(value,key){
        console.log("val 2", value.value);
        var list = value.value;
        list.addToList = false;
        for(var i in $scope.contact.protectedBundles){
          if(value.value.name === $scope.contact.protectedBundles[i])
            list.addToList = true;  
        }
        this.push(list);
      }, $scope.allGroups)
  });

  $scope.addToList = function (list) {
    list.addToList = list.addToList === false ? true: false;
  }
   
  $scope.updateContact = function(){
    angular.forEach($scope.allGroups, function(value, key){
      if($scope.contact.protectedBundles.indexOf(value.name) === -1){
        if(value.addToList === true)
          $scope.contact.protectedBundles.push(value.name);
      }
      else{
        if(value.addToList === false)
          $scope.contact.protectedBundles.splice($scope.contact.protectedBundles.indexOf(value.name), 1);
      }
    })
    console.log($scope.contact.protectedBundles);

    var contact = {
      _id: $scope.contact._id,
      _profile: $scope.contact._profile,
      status: 0
    };
    
    var userid = contact._profile.userid;
    console.log(userid);
    $scope.contact.userid = userid;
    profileService.saveContact($scope.contact).then(function(data) {
    if (data && data.status && data.status === 'ok') {
      console.log('updated');
    }
    else {
      alert('An error occurred.');
    }
  });
  $scope.closeThisDialog();
  }
}


















