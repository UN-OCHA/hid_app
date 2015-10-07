function CustomListSettingsCtrl($scope, $route, $location, $http, authService, profileService, list, gettextCatalog, ngDialog) {
  $scope.list = list;
  if (!list.privacy) {
    $scope.list.privacy = 'all';
  }
  $scope.contactsCount = list.contacts.length;
  $scope.path = contactsId.appBaseUrl + '/#/list/contacts?id=' + list._id;
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.list.readers.push("");

  $scope.refreshReaders = function(select, lengthReq) {
    var helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
        emptyOption = {action:'clear', name:"", alt: gettextCatalog.getString('No results found.'), disable: true};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      select.searching = true;

      $http.get(contactsId.profilesBaseUrl + '/v0/contact/view', {
        'params': {
          'access_token': authService.getAccessToken(),
          'globalContacts': true,
          'limit': 30,
          'skip': 0,
          'sort': 'name',
          'status': 1,
          'type': 'global',
          'text': encodeURIComponent(select.search)
        }
        })
        .then(function(response) {
          select.searching = false;
          $scope.readers = [];
          angular.forEach(response.data.contacts, function(value, key) {
            this.push({
              'name': value.nameGiven + ' ' + value.nameFamily,
              'userid': value.nameGiven + ' ' + value.nameFamily + ' (' + value._profile.userid + ')',
              '_id': value._profile._id
            });
          }, $scope.readers);

          if (!$scope.readers.length) {
            $scope.readers.push(emptyOption);
          }
        });
    }
    else {
      $scope.readers = []
      $scope.readers.push(helpOption);
    }
  };

  // Prevents adding of field if when invalid entry.
  $scope.checkForValidEntry = function(field, index) {
    return true;
    /*return ( $scope.profile[field]
          && $scope.profile[field][index]
          && $scope.vaildFieldEntry(field, $scope.profile[field][index]));*/
  }

  $scope.changeFieldEntries = function(field) {
    var validEntry = $scope.checkForValidEntry(field, this.$index);
    if (this.$last && validEntry) {
      // Add new field.
      $scope.list.readers.push("");
    }
    else if(this.$last){
      // Focus on field.
      this.focus = true;
    }
    else {
      // Remove new field.
      $scope.list.readers.splice(this.$index, 1);
    }
  }

  $scope.styleFieldEntries = function(field) {
    var validEntry = $scope.checkForValidEntry(field, this.$index);
    if (this.$last && validEntry) {
      return 'fa-plus';
    }
    else {
      return 'fa-remove';
    }
  }



  $scope.saveList = function() {
    // Replace contacts with id instead of object.
    var contacts = [], readers = [];
    angular.forEach($scope.list.contacts, function(contact, key) {
      this.push(contact._id);
    }, contacts);
    $scope.list.contacts = contacts;

    // Replace readers with id instead of object.
    angular.forEach($scope.list.readers, function(reader, key) {
      this.push(reader._id);
    }, readers);
    $scope.list.readers = readers;

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
