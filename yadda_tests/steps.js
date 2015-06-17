/* jslint node: true */
/* global Dictionary, English, casper, xpath, __utils__ */
"use strict";

module.exports.init = function() {
  var dictionary = new Dictionary()
    .define('LOCALE', /(fr|es|ie)/)
    .define('NUM', /(\d+)/);

  var library = English.library(dictionary)

    .when("I log to the HID APP as $ROLE", function(role) {
      casper.test.assertTitle("Humanitarian ID", "auth page loads");
      casper.test.assertExists('form[action="login"]', "auth login form is found");
      casper.fill('form[action="login"]', {
        email: 'alex@example.com',
        password: 'test',
      }, true);
    })

    .then("I should be logged in", function() {
      casper.waitForUrl('http://dev.app.568elmp02.blackmesh.com/#/dashboard', function() {
        casper.test.assertTextExists('Welcome, Alex Tester', "user is logged in to app");
        casper.test.assertSelectorHasText('.actions a', 'Edit Global Profile', "user has Edit Global Profile link");
      });
    });

  return library;
};
