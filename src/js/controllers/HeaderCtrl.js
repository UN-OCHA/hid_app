function HeaderCtrl($scope, $rootScope, $location, $route, profileService, gettextCatalog) {
  $rootScope.$on("appLoginSuccess", function(ev, accountData) {
    $scope.isAuthenticated = accountData && accountData.user_id;
    $scope.nameGiven = accountData.name_given;
    $scope.nameFamily = accountData.name_family;
  });
  $rootScope.$on("appUserData", function(ev, userData) {
    if (userData && userData.contacts) {
      for (var idx = 0; idx < userData.contacts.length; idx++) {
        if (userData.contacts[idx].type === 'global') {
          $scope.nameGiven = userData.contacts[idx].nameGiven;
          $scope.nameFamily = userData.contacts[idx].nameFamily;
          break;
        }
      }
    }
  });
  $scope.language = 'en';
  $scope.switchLanguage = function () {
    gettextCatalog.setCurrentLanguage($scope.language);
    gettextCatalog.debug = profileService.hasRole('admin');
  };

  $scope.mainMenu = false;
  $scope.menuToggle = function () {
    $scope.mainMenu = !$scope.mainMenu;
  };

  $scope.sendFeedbackEmail = function () {
    var link = "mailto:info@humanitarian.id" + 
                "?subject=Mobile app feedback" +
                "&body=" +escape("\n\n\n\n\n")+"Phone details: " + navigator.userAgent + escape("\n\n");

    window.open(link,"_blank");
  }

  $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
    $scope.mainMenu = false;
    $scope.kioskMode = false;
    if ($location.path() === '/kiosk') {
      $scope.kioskMode = true;
    }
  });
};
