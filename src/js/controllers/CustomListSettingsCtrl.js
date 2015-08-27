function CustomListSettingsCtrl($scope, $route, $location, profileService, list, ngDialog) {
  $scope.list = list;
  $scope.contactsCount = list.contacts.length;

  $scope.saveList = function() {
    // Replace contacts with id instead of object.
    var contacts = [];
    angular.forEach($scope.list.contacts, function(contact, key) {
      this.push(contact._id);
    }, contacts);

    $scope.list.contacts = contacts;
    profileService.saveList($scope.list).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $location.path('/list/contacts').search({id: $scope.list._id});
      }
      else {
        alert('An error occurred while saving this contact list. Please reload and try the change again.');
      }
    });
  }

  $scope.deleteList = function() {
    ngDialog.open({
      template: 'partials/deleteCustomList.html',
      scope: $scope,
      showClose: false,
      controller: ['$scope', 'profileService', function($scope, profileService) {
        $scope.delete = function() {
          profileService.deleteList($scope.list).then(function(data) {
            if (data && data.status && data.status === 'ok') {
              $location.path('/dashboard');
            }
            else {
              alert('An error occurred while deleting this contact list. Please reload and try the change again.');
            }
          });
          $scope.closeThisDialog();
        }
      }]
    });
  }
}
