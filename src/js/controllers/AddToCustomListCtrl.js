function AddToCustomListCtrl($scope, profileService) {
  
  $scope.customContactsPromise = profileService.getLists().then(function(data) {
   
    if (data && data.status && data.status === 'ok') {
      $scope.customContacts = [];
      angular.forEach(data.lists, function(value, key) {
        if ((value.contacts.indexOf($scope.contact._id) == -1) && ($scope.userid == value.userid || value.editors.indexOf($scope.userData.profile._id) != -1)) {
          var list = value;
          list.addToList = false;
          this.push(list);
        }
      }, $scope.customContacts);
    }
  });

  $scope.addToList = function (list) {
    list.addToList = list.addToList === false ? true: false;
  }

  $scope.newList = function (list) {
    profileService.saveList(list).then(function(data) {
      if (data && data.status && data.list && data.status === 'ok') {
        data.list.addToList = true;
        $scope.customContacts.push(data.list);
        $scope.list = {};
      }
      else {
        alert('An error occurred while saving this contact list. Please reload and try the change again.');
      }
    });
  }

  $scope.saveList = function () {
    angular.forEach($scope.customContacts, function(value, key) {
      if (value.addToList === true) {

        profileService.addContactToList(value, $scope.contact._id).then(function(data) {
          if (data && data.status && data.status === 'ok') {
            console.log('updated');
          }
          else {
            alert('An error occurred while unfollowing this contact list. Please reload and try the change again.');
          }
        });
      }
      $scope.closeThisDialog();
    });
  }
}
