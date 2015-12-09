function ServicesCtrl($scope, $location, $route, $routeParams, profileService, userData, ngDialog, operations, service) {

  $scope.service = service;
  $scope.mc_lists = [];
  $scope.alerts = [];

  if (!$scope.service.locations) {
    $scope.service.locations = [];
  }
  $scope.service.locations.push("");

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

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

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
          if (!$routeParams.locationId && (userData.profile.roles.indexOf('admin') != -1 || service.userid == userData.profile.userid)) {
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

