casper.test.begin('H.ID login test', 4, function suite(test) {
    casper.start("http://hid:dev@dev.app.568elmp02.blackmesh.com/#login", function() {
        test.assertTitle("Humanitarian ID", "auth page loads");
        test.assertExists('form[action="login"]', "auth login form is found");
        this.fill('form[action="login"]', {
            email: 'alex@example.com',
            password: 'test',
        }, true);
    });

    casper.then(function() {
        this.waitForUrl('http://dev.app.568elmp02.blackmesh.com/#/dashboard', function() {
            test.assertTextExists('Welcome, Alex Tester', "user is logged in to app");
            test.assertSelectorHasText('.actions a', 'Edit Global Profile', "user has Edit Global Profile link");
        });
    });

    casper.run(function() {
        test.done();
    });
});
