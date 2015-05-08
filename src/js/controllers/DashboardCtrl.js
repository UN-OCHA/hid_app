function DashboardCtrl($scope, $route, $filter, profileService, globalProfileId, userData) {
  var filter = $filter('filter');

  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.userCanCreateAccount = profileService.canCreateAccount();
  $scope.localContacts = filter(userData.contacts, function(d){ return d.type === "local"})

  $scope.checkout = function (cid) {
    var contact = {
      _id: cid,
      _profile: $scope.userData.profile._id,
      userid: $scope.userData.profile.userid,
      status: 0
    };
    profileService.saveContact(contact).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        profileService.clearData();
        $route.reload();
      }
      else {
        alert('error');
      }
    });
  };
}