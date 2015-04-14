(function($, angular, contactsId) {
  "use strict";

  // Initialize JSO
  var jso = new JSO({
        providerID: "hid",
        client_id: contactsId.authClientId,
        redirect_uri: contactsId.appBaseUrl + "/",
        authorization: contactsId.authBaseUrl + "/oauth/authorize",
        scopes: {require: ['profile'], request: ['profile']}
      });

  // Run JSO callback to catch an authentication token, if present.
  jso.callback(null, function (token) {});

  angular.module("contactsId").service("authService", function($location, $http, $q, $rootScope) {
    var authService = {},
        oauthToken = false,
        accountData = false;

    authService.getAccessToken = function () {
      return oauthToken;
    };

    authService.getAccountData = function () {
      return accountData;
    };

    authService.isAuthenticated = function () {
      return oauthToken && accountData && accountData.user_id;
    };

    authService.logout = function (skipRedirect) {
      oauthToken = false;
      accountData = false;

      // Clear the tokens in browser cache.
      jso.wipeTokens();

      // Redirect to the logout page on the authentication system.
      if (!skipRedirect) {
        window.location.href = contactsId.authBaseUrl + "/logout?redirect=" + contactsId.appBaseUrl;
      }
    };

    authService.verify = function (cb) {
      jso.getToken(function(token) {
        if (token && token.access_token && token.access_token.length) {
          // Store the Oauth token
          oauthToken = token.access_token;

          // Request the account data from the auth system.
          $.ajax({
            success: function (data) {
              accountData = JSON.parse(data);
              $rootScope.$emit("appLoginSuccess", accountData);
              return cb();
            },
            error: function (err) {
              console.log("Error encountered while verifying user account data: ", err);
              return cb(err);
            },
            data: {
              "access_token": token.access_token
            },
            url: contactsId.authBaseUrl + "/account.json"
          });
        }
      }, {});
    };

    function handleError(response) {
      // The API response from the server should be returned in a
      // nomralized format. However, if the request was not handled by the
      // server (or what not handles properly - ex. server error), then we
      // may have to normalize it on our end, as best we can.
      if (!angular.isObject(response.data) || !response.data.message) {
        return ($q.reject("An unknown error occurred."));
      }

      // Otherwise, use expected error message.
      return ($q.reject(response.data.message));
    }

    function handleSuccess(response) {
      return (response.data);
    }

    return authService;
  });

}(jQuery, angular, window.contactsId));
