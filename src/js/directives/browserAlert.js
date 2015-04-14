(function(angular, contactsId) {
  "use strict";

  angular.module("contactsId").directive('browserAlert', function() {
    return {
      restrict: 'E',
      templateUrl: contactsId.sourcePath + '/partials/browser-alert.html',
      replace: true,
      link: function(scope) {
        var uagent = navigator.userAgent.toLowerCase(),
        match = '',
        _browser = {},
        x;

        _browser.chrome  = /webkit/.test(uagent)  && /chrome/.test(uagent);
        _browser.firefox = /mozilla/.test(uagent) && /firefox/.test(uagent);
        _browser.msie    = /msie/.test(uagent)    || /trident/.test(uagent);
        _browser.safari  = /safari/.test(uagent)  && /applewebkit/.test(uagent) && !/chrome/.test(uagent);
        _browser.opr     = /mozilla/.test(uagent) && /applewebkit/.test(uagent) &&  /chrome/.test(uagent) && /safari/.test(uagent) && /opr/.test(uagent);
        _browser.version = '';

        for (x in _browser) {
          if (_browser[x]) {
            match = uagent.match(new RegExp("(" + x + ")( |/)([0-9]+)"));
            if (match) {
              _browser.version = match[3];
            } else {
              match = uagent.match(new RegExp("rv:([0-9]+)"));
              if (match) {
                _browser.version = match[1];
              }
            }
            break;
          }
        }

        _browser.opera = scope.opr;
        delete _browser.opr;
        scope.version = _browser.version;
        if( _browser.chrome
          || _browser.firefox
          || _browser.safari
          || (_browser.msie && parseFloat(_browser.version) && parseFloat(_browser.version) >= 10)) {
          scope.supported = true;
        }
        else {
          scope.supported = false;
        }
      }
    };
  });
}(angular, window.contactsId));
