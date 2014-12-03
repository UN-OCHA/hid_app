
(function($, angular) {

var contactsId = {
    "title": "Humanitarian ID",
    "sourcePath": ""
  },
  jso,
  app,
  oauthToken,
  accountData;


// Initialize Oauth2 client
jso = new JSO({
  providerID: "hid",
  client_id: "hid-local",
  redirect_uri: "http://app.contactsid.vm/",
  authorization: "http://auth.contactsid.vm/oauth/authorize",
  scopes: { request: ['profile']}
});
jso.callback(null, function (token) {
  alert('callback have token ', token);
});

function verifyAuth($scope, $location) {
  var opts = {};
  jso.getToken(function(token) {

    if (token && token.access_token && token.access_token.length) {
      // Store the Oauth token
      contactsId.oauthToken = token.access_token;

      // Request the account data from the auth system.
      $.ajax({
        success: function (data) {
          contactsId.accountData = JSON.parse(data);
          $scope.$apply(function () {
            $location.path('/contactsId');
          });
        },
        error: function (err) {
          alert('err');
        },
        data: {
          "access_token": token.access_token
        },
        url: "http://auth.contactsid.vm/account.json"
      });
    }
  }, opts);
}

function parseLocation(location) {
  var pairs = location.substring(1).split("&"),
    obj = {},
    pair,
    i;

  for (i in pairs) {
    if (!pairs.hasOwnProperty(i) || pairs[i] === "") {
      continue;
    }

    pair = pairs[i].split("=");
    obj[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }

  return obj;
};

// Initialize ng
app = angular.module('contactsId', ['ngRoute', 'cgBusy', 'angular-spinkit']);

app.value('cgBusyDefaults',{
  message:'Loading...',
  backdrop: true,
  templateUrl: contactsId.sourcePath + '/partials/busy.html',
  delay: 0,
  minDuration: 300
});

app.directive('routeLoadingIndicator', function($rootScope) {
  return {
    restrict: 'E',
    template: "<div ng-show='isRouteLoading' class='loading-indicator'>" +
      "<div class='loading-indicator-body'>" +
        "<h3 class='loading-title'>Loading...</h3>" +
        "<div class='spinner'><rotating-plane-spinner></rotating-plane-spinner></div>" +
      "</div>" +
      "</div>",
    replace: true,
    link: function(scope, elem, attrs) {
      scope.isRouteLoading = false;

      $rootScope.$on('$routeChangeStart', function() {
        scope.isRouteLoading = true;
      });
      $rootScope.$on('$routeChangeSuccess', function() {
        scope.isRouteLoading = false;
      });
    }
  };
});

app.controller("DefaultCtrl", function($scope, $location) {
  // If the Oauth2 access code param is present, then redirect to login.
  var query = parseLocation(window.location.search);//$location.search();
  if (query.code && query.code.length) {
    verifyAuth($scope, $location);
  }
});

app.controller("LoginCtrl", function($scope, $location) {
  // Get the access token. If one in the browser cache is not found, then
  // redirect to the auth system for the user to login.
  verifyAuth($scope, $location);
});

app.controller("LogoutCtrl", function($scope) {
  // Clear the tokens in browser cache.
  jso.wipeTokens('hid');

  // Redirect to the logout page on the authentication system.
  window.location.href = "http://auth.contactsid.vm/logout";
});

app.controller("RegisterCtrl", function($scope) {
  // Redirect to the registration page on the authentication system.
  window.location.href = "http://auth.contactsid.vm/#register";
});

app.controller("404Ctrl", function($scope) {
});

app.controller("AboutCtrl", function($scope) {
});

app.controller("DashboardCtrl", function($scope, $route, profileService, globalProfileId, userData) {
  $scope.title = contactsId.title;
  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;

  $scope.checkout = function (cid) {
    var contact = {
      _id: cid,
      _profile: $scope.userData.profile._id,
      userid: $scope.userData.profile.userid,
      status: 0
    };
    profileService.saveContact(contact).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        profileService.clearData();
        $route.reload();
      }
      else {
        alert('error');
      }
    });
  };
});

app.controller("ProfileCtrl", function($scope, $location, $route, $routeParams, profileService, userData, placesOperations) {
  $scope.title = contactsId.title;
  $scope.profileId = $routeParams.profileId || '';
  $scope.profile = {};

  var pathParams = $location.path().split('/'),
      checkinFlow = pathParams[2] === 'checkin';

  // Setup scope variables from data injected by routeProvider resolve
  $scope.userData = userData;
  $scope.placesOperations = placesOperations;

  if (checkinFlow) {
    $scope.selectedPlace = '';
    $scope.selectedOperation = '';

    for (var idx = 0; idx < $scope.userData.contacts.length; idx++) {
      if ($scope.userData.contacts[idx].type === 'global') {
        $scope.profile = angular.fromJson(angular.toJson($scope.userData.contacts[idx]));
        delete $scope.profile._id;
        delete $scope.profile._contact;
        break;
      }
    }
    $scope.profile.type = 'local';
  }
  else {
    $scope.selectedPlace = 'none';
    $scope.selectedOperation = 'none';
  }

  if ($scope.profileId.length) {
    for (var idx = 0; idx < $scope.userData.contacts.length; idx++) {
      if ($scope.userData.contacts[idx]._id == $scope.profileId) {
        $scope.profile = $scope.userData.contacts[idx];

        if ($scope.profile.locationId) {
          for (var place in $scope.placesOperations) {
            if ($scope.placesOperations.hasOwnProperty(place) && $scope.placesOperations[place].hasOwnProperty($scope.profile.locationId)) {
              $scope.selectedPlace = place;
              $scope.selectedOperation = $scope.profile.locationId;
              break;
            }
          }
        }
        break;
      }
    }
    $scope.profileName = $scope.profile.type === 'global' ? 'Global' : $scope.profile.location;
  }
  else if (!checkinFlow) {
    $scope.profile.type = 'global';
    $scope.profileName = $scope.profile.type === 'global' ? 'Global' : $scope.profile.location;
  }

  $scope.checkMultiFields = function (excludeExtras) {
    var multiFields = {'uri': null, 'voip': 'number', 'email': 'address', 'phone': 'number', 'bundle': null};
    for (var field in multiFields) {
      if (multiFields.hasOwnProperty(field)) {
        if ($scope.profile[field] && $scope.profile[field].filter) {
          $scope.profile[field] = $scope.profile[field].filter(function (el) {
            return ((multiFields[field] === null && el && el.length) || (multiFields[field] && el && el[multiFields[field]] && el[multiFields[field]].length));
          });
        }
        else {
          $scope.profile[field] = [];
        }
        var len = $scope.profile[field].length;
        if (!excludeExtras) {
          if (multiFields[field] === null && (!len || $scope.profile[field][len - 1].length)) {
            $scope.profile[field].push('');
          }
          else if (multiFields[field].length && (!len || $scope.profile[field][len - 1][multiFields[field]].length)) {
            $scope.profile[field].push('');
          }
        }
      }
    }
  };

  $scope.checkMultiFields();
  
  $scope.selectPlace = function () {
    var opkeys = [],
      key;
    for (key in this.operations) {
      if (this.operations.hasOwnProperty(key)) {
        opkeys.push(key);
      }
    }
    $scope.selectedPlace = this.place;
    if (opkeys.length == 1) {
      $scope.selectedOperation = opkeys[0];
    }
  };

  $scope.submitProfile = function () {
    $scope.checkMultiFields(true);
    var profile = $scope.profile;
    profile.userid = $scope.userData.profile.userid;
    profile._profile = $scope.userData.profile._id;
    profile.status = 1;

    if (checkinFlow) {
      profile.locationId = $scope.selectedOperation;
      profile.location = $scope.placesOperations[$scope.selectedPlace][$scope.selectedOperation].name;
    }

    if ($scope.profileId.length) {
      profile._contact = $scope.profileId;
    }
    profileService.saveContact(profile).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $location.path('/contactsId');
        profileService.clearData();
      }
      else {
        alert('error');
      }
    });
  };
});

app.controller("ContactCtrl", function($scope, $route, $routeParams, profileService, contact) {
  $scope.title = contactsId.title;
  $scope.contact = contact;

  $scope.back = function () {
    if (history.length) {
      history.back();
    }
    else {
      $location.path('/contactsId');
    }
  };
});

app.controller("ListCtrl", function($scope, $route, $routeParams, profileService, userData, placesOperations) {
  $scope.title = contactsId.title;
  $scope.location = '';
  $scope.locationId = $routeParams.locationId || '';
  $scope.contacts = [];
  $scope.placesOperations = placesOperations;
  $scope.bundles = {};
  $scope.mode = 'search';
  $scope.contactsPromise;

  for (var place in $scope.placesOperations) {
    if ($scope.placesOperations.hasOwnProperty(place) && $scope.placesOperations[place].hasOwnProperty($scope.locationId)) {
      $scope.location = place;
      $scope.bundles = $scope.placesOperations[place][$scope.locationId].bundles;
      break;
    }
  }

  $scope.showList = function () {
    if ($scope.contacts.length) {
      $scope.mode = 'list';
    }
    else {
      $scope.submitSearch();
    }
  };

  $scope.submitSearch = function () {
    var query = $scope.query;
    query.locationId = $scope.locationId;
    query.status = 1;
    $scope.contactsPromise = profileService.getContacts(query).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $scope.contacts = data.contacts || [];
      }
    });
    $scope.mode = 'list';
  };

  $scope.resetSearch = function () {
    $scope.query = {
      text: '',
      bundle: '',
      role: ''
    };
  };

  $scope.resetSearch();
});

app.config(function($routeProvider, $locationProvider) {
  $routeProvider.
    when('/', {
      templateUrl: contactsId.sourcePath + '/partials/index.html',
      controller: 'DefaultCtrl'
    }).
    when('/login', {
      template: 'Redirecting to authentication system...',
      controller: 'LoginCtrl'
    }).
    when('/logout', {
      template: 'Redirecting to authentication system...',
      controller: 'LoginCtrl'
    }).
    when('/register', {
      template: 'Redirecting to authentication system...',
      controller: 'RegisterCtrl'
    }).
    when('/contactsId', {
      templateUrl: contactsId.sourcePath + '/partials/dashboard.html',
      controller: 'DashboardCtrl',
      resolve: {
        userData : function(profileService) {
          return profileService.getUserData().then(function(data) {
            if (!data || !data.profile || !data.contacts) {
              throw new Error('Your user data cannot be retrieved. Please sign in again.');
            }
            return data;
          });
        },
        globalProfileId : function(profileService) {
          return profileService.getUserData().then(function(data) {
            for (var idx = 0; idx < data.contacts.length; idx++) {
              if (data.contacts[idx].type === 'global') {
                return data.contacts[idx]._id;
              }
            }
          });
        }
      }
    }).
    when('/contactsId/checkin', {
      templateUrl: contactsId.sourcePath + '/partials/profile.html',
      controller: 'ProfileCtrl',
      resolve: {
        userData : function(profileService) {
          return profileService.getUserData().then(function(data) {
            return data;
          });
        },
        placesOperations : function(profileService) {
          return profileService.getOperationData().then(function(data) {
            return data;
          });
        }
      }
    }).
    when('/contactsId/profile/:profileId?', {
      templateUrl: contactsId.sourcePath + '/partials/profile.html',
      controller: 'ProfileCtrl',
      resolve: {
        userData : function(profileService) {
          return profileService.getUserData().then(function(data) {
            return data;
          });
        },
        placesOperations : function(profileService) {
          return profileService.getOperationData().then(function(data) {
            return data;
          });
        }
      }
    }).
    when('/contactsId/contact/:contactId', {
      templateUrl: contactsId.sourcePath + '/partials/contact.html',
      controller: 'ContactCtrl',
      resolve: {
        contact : function(profileService, $route) {
          var query = {
            '_id': $route.current.params.contactId || ''
          };
          return profileService.getContacts(query).then(function(data) {
            return data.contacts[0] || {};
          });
        }
      }
    }).
    when('/contactsId/list/:locationId', {
      templateUrl: contactsId.sourcePath + '/partials/list.html',
      controller: 'ListCtrl',
      resolve: {
        userData : function(profileService) {
          return profileService.getUserData().then(function(data) {
            return data;
          });
        },
        placesOperations : function(profileService) {
          return profileService.getOperationsData().then(function(data) {
            return data;
          });
        }
      }
    }).
    when('/about', {
      templateUrl: contactsId.sourcePath + '/partials/about.html',
      controller: 'AboutCtrl'
    }).
    otherwise({
      templateUrl: contactsId.sourcePath + '/partials/404.html',
      controller: '404Ctrl'
    });
});

app.service("profileService", function($http, $q) {
  // Return public API.
  return({
    getUserData: getUserData,
    getOperationsData: getOperationsData,
    clearData: clearData,
    getProfile: getProfile,
    getProfiles: getProfiles,
    getContacts: getContacts,
    saveProfile: saveProfile,
    saveContact: saveContact
  });

  var cacheUserData = false,
    cacheOperationsData = false;

  // Get app data.
  function getUserData() {
    var promise;

    if (cacheUserData) {
      promise = $q.defer();
      promise.resolve(cacheUserData);
      return promise.promise;
    }
    else {
      promise = $http({
        method: "get",
        url: "http://profiles.contactsid.vm/v0/profile/view",
        params: {userid: contactsId.accountData.user_id, access_token: contactsId.oauthToken}
      })
      .then(handleSuccess, handleError).then(function(data) {
        if (data && data.profile && data.contacts) {
          cacheUserData = data;
        }

        return cacheUserData;
      });

      return promise;
    }
  }

  // Get app data.
  function getOperationsData() {
    var promise;

    if (cacheOperationsData) {
      promise = $q.defer();
      promise.resolve(cacheOperationsData);
      return promise.promise;
    }
    else {
//TODO//
/*
      promise = $http({
        method: "get",
        url: "http://profiles.contactsid.vm/v0/profile/view",
        params: {userid: contactsId.accountData.user_id, access_token: contactsId.oauthToken}
      })
      .then(handleSuccess, handleError).then(function(data) {
        if (data && data.userData && data.placesOperations) {
          cacheOperationsData = data;
        }

        return cacheOperationsData;
      });
      return promise;
*/
    }
  }

  // Clear stored app data.
  function clearData() {
    cacheUserData = {};
    cacheOperationsData = {};
  }

  // Get a profile by ID.
  function getProfile(profileId) {
    var request = $http({
      method: "get",
      url: "/contactsid/profile/" + profileId
    });
    return(request.then(handleSuccess, handleError));
  }

  // Get profiles that match specified parameters.
  function getProfiles(terms) {
    return;
  }

  // Get contacts that match specified parameters.
  function getContacts(terms) {
    var request = $http({
      method: "get",
      url: "/contactsid/contact",
      params: terms
    });
    return(request.then(handleSuccess, handleError));
  }

  // Save a profile (create or update existing).
  function saveProfile(profile) {
    var profileId = profile.profileId || "",
    request = $http({
      method: "post",
      url: "/contactsid/profile/" + profileId,
      data: profile
    });
    return(request.then(handleSuccess, handleError));
  }

  // Save a contact (create or update existing).
  function saveContact(contact) {
    var contactId = contact.contactId || "",
    request = $http({
      method: "post",
      url: "/contactsid/contact/" + contactId,
      data: contact
    });
    return(request.then(handleSuccess, handleError));
  }

  function handleError( response ) {
    // The API response from the server should be returned in a
    // nomralized format. However, if the request was not handled by the
    // server (or what not handles properly - ex. server error), then we
    // may have to normalize it on our end, as best we can.
    if ( !angular.isObject(response.data) || !response.data.message ) {
      return ( $q.reject( "An unknown error occurred." ) );
    }

    // Otherwise, use expected error message.
    return ( $q.reject( response.data.message ) );
  }


  function handleSuccess( response ) {
    return ( response.data );
  }

});
//// END ANGULAR

}(jQuery, angular));
