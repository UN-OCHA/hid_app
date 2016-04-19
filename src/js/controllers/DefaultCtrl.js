function DefaultCtrl($scope, $location, $window, $sce, authService) {
  $scope.isCollapsed = true;
  $scope.showIframe = $window.window.innerWidth > 460 ? true : false;
  $scope.iframeCode = '';
  if ($scope.showIframe) {
    $scope.iframeCode = $sce.trustAsHtml('<iframe id="video" src="https://www.youtube.com/embed/tqBwJld2Sz8?rel=0&controls=0&showinfo=0" frameborder="0" allowfullscreen></iframe>');
  }

  function parseLocation(location) {
    var pairs = location.substring(1).split("&"),
    obj = {},
    pair,
    i;

    for (i in pairs) {
      if (!pairs.hasOwnProperty(i) || pairs[i] === "") {
        continue;
      }

      pair = pairs[i].split("=");
      obj[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }

    return obj;
  }

  // If the Oauth2 access code param is present, then redirect to login.
  var query = parseLocation(window.location.search);
  if (query.code && query.code.length) {
    authService.verify();
  }

  if (authService.isAuthenticated()) {
    $location.path('/dashboard');
  }
}
