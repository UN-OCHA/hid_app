angular.module('contactsId').service("flashService", function($rootScope) {
  var queue = [], currentMessage = '';

  $rootScope.$on("$routeChangeStart", function() {
    queue = [];
  });
  
  return {
    set: function(message, type, close, timeout) {
      queue = [];
      var dismissable = (close === undefined) ? true : close;
      queue.push({ 'msg': message, 'type': type, 'close': dismissable, 'timeout': timeout});
    },
    get: function() {
      return queue;
    },
    close: function(index) {
      queue.splice(index, 1);
    },
    clear: function () {
      queue = [];
    }
  };
});

