function CheckInCtrl($scope, $location, $routeParams, $timeout, profileService) {
  profileService.checkInContact($routeParams.contactId).then(function (response) {
    if (response.status === 200) {
      $scope.flash.set(response.data.nameGiven + ' ' + response.data.nameFamily + ' was successfully checked in', 'success', false);
      $timeout(function() {
        $location.path('/contact/' + $routeParams.contactId);
      }, 3000);
    }
    else {
      $scope.flash.set('There was an error checking this contact in. Please try again later.', 'danger', false);
      $timeout(function() {
        $location.path('/dashboard');
      }, 3000);
    }
  });
}

function CheckOutCtrl($scope, $location, $routeParams, $timeout, profileService) {
  profileService.checkOutContact($routeParams.contactId).then(function (response) {
    if (response.status === 200) {
      $scope.flash.set(response.data.nameGiven + ' ' + response.data.nameFamily + ' was successfully checked out from ' + response.data.location + '. You will be redirected in a few seconds...', 'success', false);
      profileService.clearData();
    }
    else {
      $scope.flash.set('There was an error checking this contact out.', 'danger');
    }
    $timeout(function(){
      $location.path('/dashboard');
    }, 3000);
  });
}

