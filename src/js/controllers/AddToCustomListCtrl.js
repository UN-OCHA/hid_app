function AddToCustomListCtrl($scope, profileService) {
  $scope.customContactsPromise = profileService.getLists().then(function(data) {
    if (data && data.status && data.status === 'ok') {
      $scope.customContacts = [];
      // Only allow contacts to be added to lists that they aren't already part of.
      angular.forEach(data.lists, function(value, key) {
        if (value.contacts.indexOf($scope.contact._id) == -1) {
          var list = value;
          list.addToList = false;
          this.push(list);
        }
      }, $scope.customContacts);
    }
  });

  $scope.addToList = function (index) {
    $scope.customContacts[index].addToList = $scope.customContacts[index].addToList === false ? true: false;
  }

  $scope.saveList = function () {
    angular.forEach($scope.customContacts, function(value, key) {
      if (value.addToList === true) {
        value.contacts.push($scope.contact._id);

        profileService.saveList(value).then(function(data) {
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
