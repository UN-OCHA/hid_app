function AddProtectedRolesCtrl($scope, profileService) {

  $scope.customRolesPromise = profileService.getProtectedRoles().then(function(data){
    if(data){

      $scope.allRoles = [];
      angular.forEach(data, function(value, key){
        console.log("val", value);
        var list = value;
        list.addToList = false;
        for (var i in $scope.contact.protectedRoles)
        {
          if(value.id === $scope.contact.protectedRoles[i])
            list.addToList = true;
        }
        this.push(list);
      }, $scope.allRoles)
    }
  });

  $scope.addToList = function (list) {
    list.addToList = list.addToList === false ? true: false;
  }

   

  $scope.updateContact = function(){    
    
    angular.forEach($scope.allRoles, function(value,key){
      if($scope.contact.protectedRoles.indexOf(value.id) === -1){
        if(value.addToList === true)
          $scope.contact.protectedRoles.push(value.id);          
      }
      else{
        if(value.addToList === false)
          $scope.contact.protectedRoles.splice($scope.contact.protectedRoles.indexOf(value.id), 1);
      }
    })

    console.log($scope.contact.protectedRoles);
    var contact = {
        _id: $scope.contact._id,
        _profile: $scope.contact._profile,
        status: 0
    };
    var userid = contact._profile.userid || contact._profile._userid;
    console.log(userid);
    $scope.contact.userid = userid;
    profileService.saveContact($scope.contact).then(function(data) {
     console.log("data: ", data);
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