function CustomListSettingsCtrl($scope, $route, $location, $http, $timeout, authService, profileService, userData, list, gettextCatalog, ngDialog) {
  $scope.list = list;
  $scope.userData = userData;

  if (!list.privacy) {
    $scope.list.privacy = 'all';
  }
  $scope.contactsCount = list.contacts.length;
  $scope.path = contactsId.appBaseUrl + '/#/list/contacts?id=' + list._id;
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.list.readers.push("");
  $scope.list.editors.push("");
  $scope.list.services.push("");

  $scope.isOwner = $scope.list.userid === userData.profile.userid;
  if ($scope.isOwner) {
    $scope.list.userid = userData.profile;
    //$scope.list.userid.userid = $scope.list.userid.userid.replace(/(_\d+)$/,'');
  }
  else {
    $scope.list.userid = { userid: $scope.list.userid };
  }

  angular.forEach($scope.list.readers, function(reader,key){
    if (reader && reader.userid) {
      reader.userid = reader.userid.replace(/(_\d+)$/,'');
    }
  });
  angular.forEach($scope.list.editors, function(editor,key){
    if (editor && editor.userid) {
      editor.userid = editor.userid.replace(/(_\d+)$/,'');
    }
  });

  $scope.refreshServices = function(select, lengthReq) {
    var helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
        emptyOption = {action:'clear', name:"", alt: gettextCatalog.getString('No results found.'), disable: true};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      select.searching = true;

      $http.get(contactsId.profilesBaseUrl + '/v0.1/services', {
        'params': {
          'access_token': authService.getAccessToken(),
          'q': encodeURIComponent(select.search),
          'status': true
        }
        })
        .then(function(response) {
          select.searching = false;
          $scope.services = response.data;
          if (!$scope.services.length) {
            $scope.services.push(emptyOption);
          }
        });
    }
    else {
      $scope.services = []
      $scope.services.push(helpOption);
    }
  };


  $scope.refreshUsers = function(select, lengthReq) {
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
          $scope.users = [];
          angular.forEach(response.data.contacts, function(value, key) {
            var email = value._profile.userid.replace(/(_\d+)$/,'');
            this.push({
              'name': value.nameGiven + ' ' + value.nameFamily,
              'userid': value.nameGiven + ' ' + value.nameFamily + ' (' + email + ')',
              '_id': value._profile._id,
              '_userid': value._profile.userid
            });
          }, $scope.users);

          if (!$scope.users.length) {
            $scope.users.push(emptyOption);
          }
        });
    }
    else {
      $scope.users = []
      $scope.users.push(helpOption);
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
      $scope.list[field].push("");
    }
    else if(this.$last){
      // Focus on field.
      this.focus = true;
    }
    else {
      // Remove new field.
      $scope.list[field].splice(this.$index, 1);
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
    var contacts = [], readers = [], editors = [], services = [];
    angular.forEach($scope.list.contacts, function(contact, key) {
      if (contact && contact._id) {
        this.push(contact._id);
      }
    }, contacts);
    $scope.list.contacts = contacts;

    // Replace readers with id instead of object.
    angular.forEach($scope.list.readers, function(reader, key) {
      if (reader && reader._id) {
        this.push(reader._id);
      }
    }, readers);
    $scope.list.readers = readers;

    // Replace editors with id instead of object.
    angular.forEach($scope.list.editors, function(editor, key) {
      if (editor && editor._id) {
        this.push(editor._id);
      }
    }, editors);
    $scope.list.editors = editors;

    // Replace list owner with userid instead of object
    if ($scope.list.userid._userid) {
      $scope.list.userid = $scope.list.userid._userid;
    }
    else {
      if ($scope.list.userid.userid) {
        $scope.list.userid = $scope.list.userid.userid;
      }
    }

    angular.forEach($scope.list.services, function (service, key) {
      if (service && service._id) {
        this.push(service._id);
      }
    }, services);
    $scope.list.services = services;

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
          profileService.deleteList($scope.list).then(function(response) {
            if (response.status === 204) {
              $location.path('/dashboard');
            }
          }, function (response) {
            if (response.status === 403) {
              $scope.flash.set('You can not delete this list because you are not the list owner.', 'danger');
            }
            else {
              $scope.flash.set('An error occurred while deleting this contact list. Please reload and try the change again.', 'danger');
            }
          });
          $scope.closeThisDialog();
        }
      }]
    });
  }

  $scope.onCopySuccess = function (e) {
    e.clearSelection();
    $scope.urlCopied = true;
    $timeout(function() {
      $scope.urlCopied = false;
    }, 2000);
  }
}
