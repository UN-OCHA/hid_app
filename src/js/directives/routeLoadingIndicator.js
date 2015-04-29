(function(angular, contactsId) {
  "use strict";
  angular.module("contactsId").directive('routeLoadingIndicator', function($rootScope, gettextCatalog) {
    return {
      restrict: 'E',
      templateUrl: contactsId.sourcePath + '/partials/loading.html',
      replace: true,
      link: function(scope, elem, attrs) {
        scope.isRouteLoading = false;
        $rootScope.$on('$routeChangeStart', function(event, nextRoute, currentRoute) {
          var nextPath = nextRoute.$$route.originalPath;
          scope.loadingMessage = gettextCatalog.getString('Loading...');
          if (!currentRoute || nextPath !== currentRoute.$$route.originalPath) {
            if (nextPath === '/login' || nextPath === '/login/:redirectPath*' || nextPath === '/logout' || nextPath === '/register') {
              scope.loadingMessage = gettextCatalog.getString('Redirecting to authentication system...');
            }
            scope.isRouteLoading = true;
          }
        });
        $rootScope.$on('$routeChangeSuccess', function() {
          scope.isRouteLoading = false;
        });
      }
    };
  });
}(angular, window.contactsId));
