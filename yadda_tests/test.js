
/* jslint node: true */
/* global casper */
"use strict";

var fs = require('fs');
var async = require('async');
var Yadda = require('yadda');
var xpath = require('casper').selectXPath;

var Dictionary = Yadda.Dictionary;
var English = Yadda.localisation.English;

var parser = new Yadda.parsers.FeatureParser();
var library = require('./steps').init();
var yadda = Yadda.createInstance(library);
Yadda.plugins.casper(yadda, casper);

new Yadda.FeatureFileSearch('./yadda_tests/features').each(function(file) {

  var feature = parser.parse(fs.read(file));

  casper.test.begin(feature.title, function suite(test) {
    async.eachSeries(feature.scenarios, function(scenario, next) {
      // TODO: Add this to config.
      casper.options.viewportSize = {width: 1600, height: 950};
      casper.start("http://hid:dev@dev.app.568elmp02.blackmesh.com/#login");
      casper.setHttpAuth('hid', 'dev');
      casper.test.info(scenario.title);
      casper.yadda(scenario.steps);
      casper.run(function() {
          next();
      });
    }, function(err) {
      casper.test.done();
    });
  });

  casper.test.on('fail', function captureFail() {
    var d = new Date();
    var filename = d.toUTCString();
    casper.capture('./yadda_tests/failures/' + filename + '.jpg', undefined, {
      format: 'jpg',
      quality: 75
    });
  });

});
