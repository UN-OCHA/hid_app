(function(angular) {
  "use strict";

  // Trigger focus on field.
  angular.module("contactsId").directive('focusField', function() {
    return function(scope, element, attrs) {
      scope.$watch(attrs.focusField,
      function (newValue) {
        newValue && element.focus();
      },true);
    }
  });
}(angular));
