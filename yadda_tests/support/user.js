"use strict";

module.exports = function(role) {
  var usernames = {
    admin: "humanitarianidtest+admin@gmail.com",
    manager: "humanitarianidtest+manager@gmail.com",
    editor: "humanitarianidtest+editor@gmail.com",
    orgeditor: "humanitarianidtest+orgeditor@gmail.com",
    verifiedresponder: "humanitarianidtest+verifiedresponder@gmail.com",
    responder: "humanitarianidtest+responder@gmail.com",
    orphan: "humanitarianidtest+orphan@gmail.com",
  }

  return {
    username: usernames[role],
    password: "zombietestaccount"
  };
};
