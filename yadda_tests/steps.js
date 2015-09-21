/* jslint node: true */
/* global Dictionary, English, casper, xpath, __utils__ */
"use strict";

module.exports.init = function() {
  var users = require('./support/user.js');
  var dictionary = new Dictionary()
    .define('ROLE', /(admin|manager|editor|orgeditor|verifiedresponder|responder|orphan)/)
    .define('NUM', /(\d+)/);

  var library = English.library(dictionary)

    .given("I am logged into the HID APP as $ROLE", function(role) {
      var user = users(role);
      casper.test.assertTitle("Humanitarian ID", "auth page loads");
      casper.test.assertExists('form[action="login"]', "auth login form is found");
      casper.fill('form[action="login"]', {
        email: user.username,
        password: user.password,
      }, true);
    })

    .given("I am checked into the $COUNTRY", function(country) {
      casper.test.assertSelectorHasText('.active-profiles-wrapper', country);
    })

    .given("I am not checked into the $COUNTRY", function(country) {
      casper.test.assertSelectorDoesntHaveText('.active-profiles-wrapper', country);
    })

    .when("I click $TEXT", function(text) {
      casper.test.assertSelectorHasText('a', text, "the \"" + text + "\" link exists");
      casper.clickLabel(text);
    })

    .when("I press header link with class $CSSCLASS", function(CSSclass) {
      // Remove target="_blank" since casper doesn't support it.
      casper.evaluate(function () {
          [].forEach.call(__utils__.findAll('a'), function(link) {
              link.removeAttribute('target');
          });
      });
      casper.test.assertExists('a ' + CSSclass);
      casper.click('a ' + CSSclass);
    })

    .when("I wait for the text $TEXT", function(text) {
      casper.waitForText(text);
    })

    .when("I submit the $FORM form", function(form) {
      casper.test.assertExists('form[name="'+ form +'"]', form + " form is found");
      casper.click('form[name="'+ form +'"] input[type="submit"]');
    })

    .when("I checkout of the $COUNTRY", function(country) {
      casper.click('a[title="Check-out from '+ country +'"]');
      casper.wait(1000, function() {
          casper.test.assertExists('button[ng-show="profile.confirmDelete"]');
          casper.click('button[ng-show="profile.confirmDelete"]');
      });
    })

    .when("I wait for $NUM seconds", function(num) {
      casper.wait(num * 1000);
    })

    .then("I should be on $URL", function(url) {
      casper.waitForUrl(url);
    })

    .then("I should not see $TEXT", function(text) {
      casper.test.assertTextDoesntExist(text, "the text \"" + text + "\" doesn't exist");
    })

    .then("I should see $TEXT", function(text) {
      casper.test.assertTextExists(text, "the text \"" + text + "\" exists");
    })

    .then("I should be logged in", function() {
      casper.waitForUrl('http://app.dev.humanitarian.id/#/dashboard', function() {
        casper.test.assertTextExists('Welcome,', "user is logged in to app");
        casper.test.assertSelectorHasText('.actions a', 'Edit Global Profile', "user has Edit Global Profile link");
      });
    });

  return library;
};
