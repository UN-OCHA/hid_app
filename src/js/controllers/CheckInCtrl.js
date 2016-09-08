function CheckInCtrl($scope, $location, $routeParams, $timeout, profileService, userData) {

  $scope.contact = {};
  profileService.getContact($routeParams.contactId).then(function (response) {
    $scope.contact = response;
    if ($scope.contact.departureDate) {
      $scope.contact.departureDate = new Date($scope.contact.departureDate);
    }
  });

  $scope.initDepartureDate = function() {
    var today = new Date(),
        dd = today.getDate(),
        mm = today.getMonth()+1,
        yyyy = today.getFullYear();

    dd = (dd<10) ? '0' + dd : dd;
    mm = (mm<10) ? '0' + mm : mm;

    $scope.todaysDate = yyyy + "-" + mm + "-" + dd;
  };
  
  $scope.checkBackIn = function() {
    $scope.contact.status = true;
    $scope.contact.remindedCheckout = false;
    $scope.contact.userid = userData.profile.userid;
    profileService.saveContact($scope.contact).then(function (response) {
      if (response.status && response.status == "ok") {
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
  };
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

