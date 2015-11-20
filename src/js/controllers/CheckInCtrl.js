function CheckInCtrl($scope, $location, $routeParams, profileService) {
  profileService.checkInContact($routeParams.contactId).then(function (response) {
    if (response.status === 200) {
      alert('You were successfully checked in');
      $location.path('/contact/' + $routeParams.contactId);
    }
    else {
      alert('There was an error checking you in. Please try again later.');
      $location.path('/dashboard');
    }
  });
}
