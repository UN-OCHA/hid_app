function LoginCtrl($scope, $location, $routeParams, authService, profileService) {
  var redirectPath = $routeParams.redirectPath || '';

  // Get the access token. If one in the browser cache is not found, then
  // redirect to the auth system for the user to login.
  authService.verify(function (err) {
    if (!err && authService.isAuthenticated()) {
      profileService.getUserData().then(function(data) {
        $location.path(redirectPath.length ? redirectPath : '/dashboard').replace();
        $location.search('redirectPath', null);
      });
    }
    else {
      authService.logout(true);
      window.location.href = contactsId.appBaseUrl + '/#/login' + redirectPath;
    }
  });
}