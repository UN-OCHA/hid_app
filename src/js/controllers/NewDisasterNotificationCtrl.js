function NewDisasterNotificationCtrl($scope, $location, $route, $routeParams, $http, profileService, operations, profileData) {
  if($routeParams.profileId && !profileData.profile){
    // No profile data
    return false;
  }
  $scope.operations = operations;
  var locationPath = $location.$$path.split("/");
  if (profileData.contact && profileData.profile) {
    profileData.contact._profile = profileData.profile;
  }
  $scope.automaticAddDisaster = false;
  if(locationPath.length == 4)
    $scope.automaticAddDisaster = true;

  if($scope.automaticAddDisaster){
      var glide_id = locationPath[3];
      var profile = profileData.contact;

      if (profileData.profile && profileData.profile.userid && profileData.profile._id) {
        profile.userid = profileData.profile.userid;
        profile._profile = profileData.profile._id;
      }
      else {
        profile.userid = accountData.user_id;
        profile._profile = null;
      }

      $scope.selectedOperation = profile.locationId;
      var disasterOptions = $scope.operations[$scope.selectedOperation].disasters;
      var newDisaster = {};
        disasterOptions.forEach(function(item){
          if(item.glide_id == glide_id){
            newDisaster.name = item.name;
            newDisaster.remote_id = item.remote_id;
            profile.disasters.push(newDisaster);
             profileService.saveContact(profile).then(function(data) {
              $scope.disasterAdd = false;
              if (data && data.status && data.status === 'ok') {
                $scope.disasterAdd = true;
                $location.search({ 'disasterAdded': $scope.disasterAdd });
                $location.path('/profile/' + profile._id);
              }
              else {
                $location.search({ 'disasterAdded': $scope.disasterAdd });
                $location.path('/profile/' + profile._id);
              }
            });
          }
        })
  }
}

 
