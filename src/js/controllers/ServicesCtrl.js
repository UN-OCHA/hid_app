function ServicesCtrl($scope, $location, $route, $routeParams, $http, authService, profileService, flashService, userData, ngDialog, operations, gettextCatalog, service) {

  $scope.service = service;
  $scope.mc_lists = [];
  $scope.flash = flashService;
  $scope.users = [];
  $scope.googlegroup_creds = [];
  $scope.googlegroups = [];

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

  // Get available service credentials
  profileService.getServiceCredentials().then(function (response) {
    angular.forEach(response.data, function (cred, key) {
      if (cred.type === 'googlegroup') {
        $scope.googlegroup_creds.push(cred.googlegroup.domain);
      }
    });
    if ($scope.service.googlegroup && $scope.service.googlegroup.domain) {
      $scope.setGoogleGroups($scope.service.googlegroup.domain);
    }
  }, function (message) {
    flashService.set('Could not retrieve list of available google groups domains', 'danger');
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

  // Set the google groups for a given domain
  $scope.setGoogleGroups = function (domain) {
    profileService.getGoogleGroups(domain).then(function (response) {
       $scope.googlegroups = response.data;
    }, function (message) {
      flashService.set('There was an error retrieving groups for this domain', 'danger');
    });
  };

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
        flashService.set('Service saved successfully.', 'success');
        $location.path('/services/' + response.data._id + '/edit');
      }
      else if (response.status == 200) {
        $scope.service = response.data;
        angular.forEach($scope.service.owners, function(owner,key){
          if (owner && owner.userid) {
            owner.userid = owner.userid.replace(/(_\d+)$/,'');
          }
        });
        flashService.set('Service saved successfully', 'success');
      }
    }, function (message) {
      flashService.set(message, 'danger');
    });
  }

  $scope.deleteServiceDialog = function() {
    ngDialog.openConfirm({
      template: 'partials/serviceDelete.html',
      scope: $scope,
    }).then(function () {
      profileService.deleteService($scope.service).then(function (response) {
        if (response.status === 204) {
          flashService.set('Service deleted successfully.', 'success');
        }
      }, function (message) {
        flashService.set('There was an error deleting this service: ' + message, 'danger');
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
      flashService.set(message, 'danger');
    });
  }

  if ($scope.service.mc_api_key) {
    $scope.getMailchimpLists();
  }
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

