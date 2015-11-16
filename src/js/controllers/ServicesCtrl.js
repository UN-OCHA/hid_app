function ServicesCtrl($scope, $location, $route, $routeParams, profileService, userData, service) {

  $scope.service = service;
  $scope.mc_lists = [];
  $scope.alerts = [];

  $scope.saveService = function() {
    if (!$scope.service.userid) {
      $scope.service.userid = userData.profile.userid;
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

  $scope.deleteService = function() {
    profileService.deleteService($scope.service).then(function (response) {
      if (response.status == 204) {
        $scope.addAlert('success', 'Service deleted successfully.');
      }
    }, function (message) {
      $scope.addAlert('danger', message);
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

function ServicesListCtrl($scope, $route, $routeParams, profileService, userData) {
  $scope.services = [];
  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';
  $scope.query = {};
  $scope.query.text = '';
  $scope.servicesPromise;

  $scope.submitSearch = function() {
    $scope.servicesPromise = profileService.getServices($scope.query.text).then(function (response) {
      if (response.status == 200) {
        $scope.services = response.data;
        $scope.services.forEach(function (service) {
          service.editAllowed = false;
          if (userData.profile.roles.indexOf('admin') != -1 || service.userid == userData.profile.userid) {
            service.editAllowed = true;
          }
        });
        
      }
    });
  }

  $scope.submitSearch();
}

