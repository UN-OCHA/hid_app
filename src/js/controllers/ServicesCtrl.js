function ServicesCtrl($scope, $location, $route, $routeParams, profileService, userData, service) {

  $scope.service = service;

  $scope.saveService = function() {
    if (!$scope.service.userid) {
      $scope.service.userid = userData.profile.userid;
    }
    profileService.saveService($scope.service).then(function(response) {
      if (response.status == 201) {
        $location.path('/services/' + response.data._id + '/edit');
      }
      else if (response.status == 200) {
        $location.path('/dashboard');
      }
      else {
        alert('An error occurred while saving this service. Please reload and try the change again.');
      }
    });
  }

  $scope.deleteService = function() {
    profileService.deleteService($scope.service).then(function (response) {
      if (response.status == 204) {
        $location.path('/dashboard');
      }
      else {
        alert('An error occurred when trying to delete this service.');
      }
    });
  }

  $scope.getMailchimpLists = function() {
    profileService.getMailchimpLists($scope.service.mc_api_key).then(function (response) {
      console.log(response);
    });
  }
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

