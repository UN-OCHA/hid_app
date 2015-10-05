function CustomListSettingsCtrl($scope, $route, $location, profileService, list, ngDialog) {
  $scope.list = list;
  if (!list.privacy) {
    $scope.list.privacy = 'all';
  }
  $scope.contactsCount = list.contacts.length;
  $scope.path = contactsId.appBaseUrl + '/#/list/contacts?id=' + list._id;

  $scope.refreshReaders = function(select, lengthReq) {
    var helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
        emptyOption = {action:'clear', name:"", alt: gettextCatalog.getString('No results found.'), disable: true};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      select.searching = true;

      $http.get($scope.hrinfoBaseUrl + '/hid/organizations/extended/autocomplete/' + encodeURIComponent(select.search))
        .then(function(response) {
          select.searching = false;
          $scope.organizations = [];
          angular.forEach(response.data, function(value, key) {
            this.push({
              'name': value.name,
              'org_type_name': value.org_type_name,
              'org_type_remote_id': value.org_type_id,
              'remote_id': key
            });
          }, $scope.organizations);

          if (!$scope.organizations.length) {
            $scope.organizations.push(emptyOption);
          }
        });
    }
    else {
      $scope.organizations = []
      $scope.organizations.push(helpOption);
    }
  };


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
