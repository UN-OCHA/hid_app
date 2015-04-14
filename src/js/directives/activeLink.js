(function(angular) {
  "use strict";

  // Identifies active link via active-link attr.
  angular.module("contactsId").directive('activeLink', ['$location', function(location) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, controller) {
        var linkClass = attrs.activeLink;
        var path = attrs.href;
        // Added because path does not return including hashbang
        path = path.substring(1);
        scope.location = location;
        scope.$watch('location.path()', function(newPath) {
          if (path === newPath) {
            element.addClass(linkClass);
          } else {
            element.removeClass(linkClass);
          }
        });
      }
    };
  }]);
}(angular));
