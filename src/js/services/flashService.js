angular.module('contactsId').service("flashService", function() {
  var queue = [], currentMessage = '';
  
  return {
    set: function(message, type) {
      queue.push({ 'msg': message, 'type': type});
    },
    get: function() {
      return queue;
    },
    close: function(index) {
      queue.splice(index, 1);
    }
  };
});

