function ServicesCtrl($scope, $location, $route, $routeParams, $http, authService, profileService, userData, ngDialog, operations, gettextCatalog, service) {

  $scope.service = service;
  $scope.mc_lists = [];
  $scope.alerts = [];
  $scope.users = [];

  if (!$scope.service.locations) {
    $scope.service.locations = [];
  }
  $scope.service.locations.push("");

  if (!$scope.service.owners) {
    $scope.service.owners = [];
  }
  angular.forEach($scope.service.owners, function(owner,key){
    if (owner && owner.userid) {
      owner.userid = owner.userid.replace(/(_\d+)$/,'');
    }
  });
  $scope.service.owners.push("");

  $scope.operations = operations;

  // Exclude operations for which the user is already checked in.
  var availOperations = angular.copy(operations);

  // Convert list into a sorted array
  $scope.availOperations = [];
  angular.forEach(availOperations, function (value, key) {
    if (profileService.hasRole('admin') || profileService.hasRole('manager:' + key)) {
      $scope.availOperations.push(value);
    }
  });
  $scope.availOperations.sort(function (a, b) {
    return a.name && b.name ? String(a.name).localeCompare(b.name) : false;
  });

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
              '_id': value._profile._id
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


  $scope.changeFieldEntries = function(field) {
    if (this.$last) {
      // Add new field.
      $scope.service[field].push("");
      this.focus = true;
    }
    else {
      // Remove new field.
      $scope.service[field].splice(this.$index, 1);
    }
  }

  $scope.styleFieldEntries = function(field) {
    if (this.$last) {
      return 'fa-plus';
    }
    else {
      return 'fa-remove';
    }
  }

  $scope.saveService = function() {
    var owners = [];
    // Replace owners with id instead of object.
    angular.forEach($scope.service.owners, function(owner, key) {
      if (owner && owner._id) {
        this.push(owner._id);
      }
    }, owners);
    $scope.service.owners = owners;

    if (!$scope.service.userid) {
      $scope.service.userid = userData.profile.userid;
    }
    for (var i = 0; i < $scope.service.locations.length; i++) {
      if ($scope.service.locations[i] === "") {
        $scope.service.locations.splice(i, 1);
      }
    }
    profileService.saveService($scope.service).then(function(response) {  
      if (response.status == 201) {
        $location.path('/services/' + response.data._id + '/edit');
      }
      else if (response.status == 200) {
        $scope.service = response.data;
        angular.forEach($scope.service.owners, function(owner,key){
          if (owner && owner.userid) {
            owner.userid = owner.userid.replace(/(_\d+)$/,'');
          }
        });
        $scope.addAlert('success', 'Service saved successfully.');
      }
    }, function (message) {
      $scope.addAlert('danger', message);
    });
  }

  $scope.deleteServiceDialog = function() {
    ngDialog.openConfirm({
      template: 'partials/serviceDelete.html',
      scope: $scope,
    }).then(function () {
      profileService.deleteService($scope.service).then(function (response) {
        if (response.status === 204) {
          $scope.addAlert('success', 'Service deleted successfully.');
        }
      }, function (message) {
        $scope.addAlert('danger', 'There was an error deleting this service: ' + message);
      });
    });
  }

  $scope.getMailchimpLists = function() {
    profileService.getMailchimpLists($scope.service.mc_api_key).then(function (response) {
      if (response.data.data) {
        $scope.mc_lists = response.data.data.map(function (val) {
            return { id: val.id, name: val.name};
          });
      }
    }, function (message) {
      $scope.alerts.push({type: 'danger', msg: message});
    });
  }

  if ($scope.service.mc_api_key) {
    $scope.getMailchimpLists();
  }

  $scope.addAlert = function(type, message) {
    $scope.alerts.length = 0;
    $scope.alerts.push({type: type, msg: message});
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };
}

function ServicesListCtrl($scope, $location, $route, $routeParams, profileService, userData, ngDialog, operations) {
  $scope.alerts = [];
  $scope.services = [];
  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';
  $scope.query = $location.search();
  $scope.userEmails = [];

  if ($routeParams.locationId) {
    $scope.alerts.length = 0;
    $scope.alerts.push({type: 'info', msg: 'Thank you for checking into ' + operations[$routeParams.locationId].name + '. We thought these services might be of interest to you. Feel free to subscribe to them.'});
  }

  userData.contacts.forEach(function (item) {
    if (item.email && item.email.length) {
      item.email.forEach(function (email) {
        if ($scope.userEmails.indexOf(email.address) === -1) {
          $scope.userEmails.push(email.address);
        }
      });
    }
  });

  $scope.submitSearch = function() {
    $scope.query.status = true;
    if ($routeParams.locationId) {
      $scope.query.location = $routeParams.locationId;
    }
    $scope.servicesPromise = profileService.getServices($scope.query).then(function (response) {
      if (response.status == 200) {
        $scope.services = response.data;
        $scope.services.forEach(function (service) {
          service.editAllowed = false;
          service.subscribed = false;
          if (!$routeParams.locationId && (userData.profile.roles.indexOf('admin') != -1 || service.userid == userData.profile.userid || (service.owners && service.owners.indexOf(userData.profile._id) != -1))) {
            service.editAllowed = true;
          }
          if (userData.profile.subscriptions) {
            userData.profile.subscriptions.forEach(function (sub) {
              if (sub.service === service._id) {
                service.subscribed = true;
              }
            });
          }
        });
        
      }
    });
  }

  $scope.subscribeDialog = function(service) {
    ngDialog.open({
      template: 'partials/subscribeService.html',
      showClose: false,
      scope: $scope,
      controller: ['$scope', 'profileService', function ($scope, profileService) {
        $scope.service = service;
        $scope.email = '';
        $scope.subscribe = function () {
          profileService.subscribeService(service, $scope.email, userData.profile).then(function (response) {
            if (response.status === 204) {
              $scope.closeThisDialog();
              service.subscribed = true;
            }
          }, function (message) {
            alert(message);
          });
        };
      }]
    });
  }

  $scope.unsubscribeDialog = function (service) {
    $scope.service = service;
    ngDialog.openConfirm({
      template: 'partials/unsubscribeService.html',
      scope: $scope,
    }).then(function () {
      profileService.unsubscribeService(service, userData.profile).then(function (response) {
        service.subscribed = false;
      }, function (message) {
        alert('There was an error unsubscribing: ' + message);
      });
    });
  }

  $scope.submitSearch();
}

