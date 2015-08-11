function DashboardCtrl($scope, $route, $filter, profileService, globalProfileId, userData) {
  var filter = $filter('filter');

  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.userCanCreateAccount = profileService.canCreateAccount();
  $scope.localContacts = filter(userData.contacts, function(d){ return d.type === "local"})

  $scope.customContactsPromise = profileService.getLists().then(function(data) {
    if (data && data.status && data.status === 'ok') {
      $scope.customContacts = data.lists;
    }
  });

  $scope.unfollowContactList = function(list, index) {
    var updatedUsers = [];
    angular.forEach(list.users, function(user, key) {
      if (user != $scope.userData.profile.userid) {
        this.push(user);
      }
    }, updatedUsers);

    list.users = updatedUsers;

    profileService.saveList(list).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        list.users = updatedUsers;
        $scope.customContacts.splice(index, 1);
      }
      else {
        alert('An error occurred while unfollowing this contact list. Please reload and try the change again.');
      }
    });
  }

  // TODO: Handle validation in a later ticket.
  $scope.addCustomContactList = function(list) {
    profileService.saveList(list).then(function(data) {
      if (data && data.status && data.list && data.status === 'ok') {
        // Add the newly created list to the model then clear it.
        $scope.customContacts.push(data.list);
        $scope.list = {};
      }
      else {
        alert('An error occurred while saving this contact list. Please reload and try the change again.');
      }
    });
  }

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
