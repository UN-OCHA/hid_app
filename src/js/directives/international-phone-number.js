// Forked from https://github.com/mareczek/international-phone-number
// Modified to initialize country flag and phone format better, but requires
// app-specific model domain knowledge.

(function() {
  "use strict";
  angular.module("internationalPhoneNumber", []).directive('internationalPhoneNumber', function($timeout) {
    return {
      restrict: 'A',
      require: '^ngModel',
      scope: true,
      link: function(scope, element, attrs, ctrl) {
        var handleWhatsSupposedToBeAnArray, options, read;
        read = function() {
          return ctrl.$setViewValue(element.val());
        };
        handleWhatsSupposedToBeAnArray = function(value) {
          if (typeof value === "object") {
            return value;
          } else {
            return value.toString().replace(/[ ]/g, '').split(',');
          }
        };
        options = {
          autoFormat: true,
          autoHideDialCode: true,
          defaultCountry: "",
          nationalMode: false,
          numberType: '',
          onlyCountries: void 0,
          preferredCountries: ['us', 'uk'],
          responsiveDropdown: false,
          utilsScript: "/libraries/intl-tel-input/lib/libphonenumber/build/utils.js"
        };
        angular.forEach(options, function(value, key) {
          var option;
          option = eval("attrs." + key);
          if (angular.isDefined(option)) {
            if (key === 'preferredCountries') {
              return options.preferredCountries = handleWhatsSupposedToBeAnArray(option);
            } else if (key === 'onlyCountries') {
              return options.onlyCountries = handleWhatsSupposedToBeAnArray(option);
            } else if (typeof value === "boolean") {
              return options[key] = option === "true";
            } else {
              return options[key] = option;
            }
          }
        });
        element.intlTelInput(options);
        if (scope.phone.number) {
          $timeout(function() {
            element.intlTelInput('setNumber', scope.phone.number);
            var country = element.intlTelInput('getSelectedCountryData');
            element.intlTelInput('setCountry', country.iso2);
          }, 100);
        }
        if (!options.utilsScript) {
          element.intlTelInput('loadUtils', 'bower_components/intl-tel-input/lib/libphonenumber/build/utils.js');
        }
        ctrl.$parsers.push(function(value) {
          if (!value) {
            return value;
          }
          return element.intlTelInput("getCleanNumber");
        });
        ctrl.$parsers.push(function(value) {
          if (value) {
            ctrl.$setValidity('international-phone-number', element.intlTelInput("isValidNumber"));
          } else {
            value = '';
            //delete ctrl.$error['international-phone-number'];
            ctrl.$setValidity('international-phone-number', true);
          }
          return value;
        });
        // element.on('blur keyup change', function(event) {
        //   return scope.$apply(read);
        // });
        return element.on('$destroy', function() {
          var parent = element.parent();
          $timeout(function() {
            parent.remove();
          }, 50);
          return element.off('blur keyup change');
        });
      }
    };
  });

}).call(this);
