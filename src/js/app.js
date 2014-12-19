
(function($, angular, contactsId) {
  jQuery(document).ready(function($){
    $('.btn-group .btn-warning').click(function(){
      $(this).parents('.profile-item').find('.btn-hidden').toggle('slide',"", 500);
    })
  });

  var jso,
    app,
    loginRedirect = '';

// Initialize JSO
jso = new JSO({
  providerID: "hid",
  client_id: contactsId.authClientId,
  redirect_uri: contactsId.appBaseUrl + "/",
  authorization: contactsId.authBaseUrl + "/oauth/authorize",
  scopes: {require: ['profile'], request: ['profile']}
});

jso.callback(null, function (token) {
//  alert('callback have token ', token);
});

// Initialize ng
app = angular.module('contactsId', ['ngAnimate', 'ngRoute', 'cgBusy', 'angucomplete-alt', 'breakpointApp', 'angular-spinkit', 'internationalPhoneNumber']);

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

app.run(function ($rootScope, $location, authService) {
  $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
    if (nextRoute && nextRoute.requireAuth && !authService.isAuthenticated()) {
      event.preventDefault();
      loginRedirect = $location.path();
      $location.path('/login');
    }
  });
});

app.controller("HeaderCtrl", function($scope, $rootScope) {
  $rootScope.$on("appLoginSuccess", function(ev, accountData) {
    $scope.isAuthenticated = accountData && accountData.user_id;
    $scope.nameGiven = accountData.name_given;
    $scope.nameFamily = accountData.name_family;
  });
  $rootScope.$on("appUserData", function(ev, userData) {
    if (userData && userData.contacts && userData.contacts.length) {
      for (var idx = 0; idx < userData.contacts.length; idx++) {
        if (userData.contacts[idx].type === 'global') {
          $scope.nameGiven = userData.contacts[idx].nameGiven;
          $scope.nameFamily = userData.contacts[idx].nameFamily;
          break;
        }
      }
    }
  });
});

app.controller("DefaultCtrl", function($scope, $rootScope, $location, authService) {
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
  }

  // If the Oauth2 access code param is present, then redirect to login.
  var query = parseLocation(window.location.search);
  if (query.code && query.code.length) {
    authService.verify();
  }

  if (authService.isAuthenticated()) {
    $location.path('/dashboard');
  }
});

app.controller("LoginCtrl", function($scope, $location, authService) {
  // Get the access token. If one in the browser cache is not found, then
  // redirect to the auth system for the user to login.
  authService.verify(function (err) {
    if (!err && authService.isAuthenticated()) {
      $scope.$apply(function () {
        $location.path(loginRedirect.length ? loginRedirect : '/dashboard');
        loginRedirect = '';
      });
    }
  });
});

app.controller("LogoutCtrl", function($scope, authService) {
  authService.logout();
});

app.controller("RegisterCtrl", function($scope) {
  // Redirect to the registration page on the authentication system.
  window.location.href = contactsId.authBaseUrl + "/?client_id=" + contactsId.authClientId + "#register";
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

app.controller("ProfileCtrl", function($scope, $location, $route, $routeParams, profileService, authService, placesOperations, profileData, countries) {
  $scope.title = contactsId.title;
  $scope.profileId = $routeParams.profileId || '';
  $scope.profile = {};

  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.adminRoleOptions = ['admin', 'manager'];
  $scope.phoneTypes = ['Landline', 'Mobile', 'Fax', 'Satellite'];
  $scope.emailTypes = ['Work', 'Personal', 'Other'];

  var pathParams = $location.path().split('/'),
  checkinFlow = pathParams[1] === 'checkin',
  accountData = authService.getAccountData();
  $scope.adminRoles = (profileData.profile && profileData.profile.roles && profileData.profile.roles.length) ? profileData.profile.roles : [];
  $scope.userIsAdmin = profileService.hasRole('admin');
  $scope.verified = (profileData.profile && profileData.profile.verified) ? profileData.profile.verified : false;
  $scope.submitText = !checkinFlow ? 'Update Profile' : 'Check-in';

  // Setup scope variables from data injected by routeProvider resolve
  $scope.placesOperations = placesOperations;
  $scope.profileData = profileData;
  $scope.countries = countries;

  // Exclude operations for which the user is already checked in.
  if (profileData && profileData.contacts && profileData.contacts.length) {
    var checkedInKeys = profileData.contacts.map(function (val, idx, arr) {
      return (val.locationId && val.locationId.length) ? val.locationId : null;
    });
    for (var ckey in placesOperations) {
      if (placesOperations.hasOwnProperty(ckey)) {
        for (var okey in placesOperations[ckey]) {
          if (placesOperations[ckey].hasOwnProperty(okey) && checkedInKeys.indexOf(okey) !== -1) {
            delete placesOperations[ckey][okey];
            if ($.isEmptyObject(placesOperations[ckey])) {
              delete placesOperations[ckey];
            }
          }
        }
      }
    }
  }

  // When checking in to a new crisis, load the user's global profile to clone.
  if (checkinFlow) {
    $scope.selectedPlace = '';
    $scope.selectedOperation = '';

    $scope.profile = angular.fromJson(angular.toJson(profileData.global));
    delete $scope.profile._id;
    delete $scope.profile._contact;
    $scope.profile.type = 'local';
    $scope.profile.keyContact = false;
  }
  else {
    $scope.selectedPlace = 'none';
    $scope.selectedOperation = 'none';
  }

  // If loading an existing contact profile by ID, find it in the user's data.
  if (!checkinFlow && $scope.profileId.length) {
    $scope.profile = profileData.contact || {};

    if ($scope.profile.locationId) {
      for (var place in $scope.placesOperations) {
        if ($scope.placesOperations.hasOwnProperty(place) && $scope.placesOperations[place].hasOwnProperty($scope.profile.locationId)) {
          $scope.selectedPlace = place;
          $scope.selectedOperation = $scope.profile.locationId;
          break;
        }
      }
    }
    $scope.profileName = $scope.profile.type === 'global' ? 'Global' : $scope.profile.location;
  }
  else if (!checkinFlow) {
    // If editing the global profile for the first time, add messaging.
    $scope.profile.type = 'global';
    $scope.profileName = $scope.profile.type === 'global' ? 'Global' : $scope.profile.location;
  }

  // Add the given and family name from the auth service as a default value.
  if ((!$scope.profile.nameGiven || !$scope.profile.nameGiven.length) && (!$scope.profile.nameFamily || !$scope.profile.nameFamily.length)) {
    $scope.profile.nameGiven = accountData.name_given || '';
    $scope.profile.nameFamily = accountData.name_family || '';
  }

  // Now we have a profile, use the profile's country to fetch regions and cities
  if ($scope.profile.address.length && $scope.profile.address[0].hasOwnProperty('country')) {
    $scope.regions = [];
    $scope.localities = [];
    $scope.regionsPromise = profileService.getAdminArea(function() {
      var remote_id = null;
      angular.forEach($scope.countries, function(value, key) {
        if (value.name === $scope.profile.address[0].country) {
          remote_id = value.remote_id;
        }
      });
      return remote_id;
    }()).then(function(data) {
      $scope.regions = data;
      // If we already have an administrative area set, we should also populate the cities for
      // autocomplete
      if ($scope.profile.address[0].hasOwnProperty('administrative_area')) {
        angular.forEach($scope.regions, function(value, key) {
          if (value.name === $scope.profile.address[0].administrative_area) {
            $scope.localities = value.cities;
          }
        });
      }
    });
  }

  $scope.setCountryCode = function() {
    var countryInfo = jQuery('input[name="phone[' + this.$index + '][number]"]').intlTelInput('getSelectedCountryData');
    if (countryInfo && countryInfo.hasOwnProperty('dialCode')) {
      this.profile.phone[this.$index].countryCode = countryInfo.dialCode;
    }
  };

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

  /**
   * Callback for angucomplete selection.
   */
  $scope.setOrganization = function(selectedOrganization) {
    // This callback can get called if the user is deleting text from the
    // input so we should check to see that there is an actual object for
    // originalObject before attempting to modify profile information.
    if (selectedOrganization && selectedOrganization.hasOwnProperty('originalObject') && selectedOrganization.originalObject.hasOwnProperty('name')) {
      $scope.profile.organization = $scope.profile.organization || [];
      $scope.profile.organization[0] = $scope.profile.organization[0] || {};
      $scope.profile.organization[0] = angular.extend({}, $scope.profile.organization[0], selectedOrganization.originalObject);
    }
  };

  /**
   * AJAX autocomplete response formatter to massage data into format for the widget.
   */
  $scope.formatOrganizations = function(response) {
    var responseArray = [];

    angular.forEach(response, function(value, key) {
      this.push({'name': value, 'remote_id': key});
    }, responseArray);

    return responseArray;
  };

  /**
   * Callback for country angucomplete selection.
   */
  $scope.setCountry = function(selectedCountry) {
    // This callback can get called if the user is deleting text from the
    // input so we should check to see that there is an actual object for
    // originalObject before attempting to modify profile information.
    if (selectedCountry && selectedCountry.hasOwnProperty('originalObject') && selectedCountry.originalObject.hasOwnProperty('name')) {
      $scope.profile.address = $scope.profile.address || [];
      $scope.profile.address[0] = $scope.profile.address[0] || {};
      var address = {
        'country': selectedCountry.originalObject.name,
        'administrative_area': '', // Intentionally empty out the administrative zone
        'locality': '' // Intentionally empty out the locality
      };
      $scope.profile.address[0] = angular.extend({}, $scope.profile.address[0], address);

      // Clear out autocomplete fields for administrative_area and locality
      $scope.$broadcast('angucomplete-alt:clearInput', 'admin_area');
      $scope.$broadcast('angucomplete-alt:clearInput', 'locality');

      // Start querying for regions
      $scope.localities = [];
      $scope.regionsPromise = profileService.getAdminArea(selectedCountry.originalObject.remote_id).then(function(data) {
        $scope.regions = data;
      });
    }
  };

  /**
   * Callback for country angucomplete selection.
   */
  $scope.setAdminArea = function(selectedRegion) {
    // This callback can get called if the user is deleting text from the
    // input so we should check to see that there is an actual object for
    // originalObject before attempting to modify profile information.
    if (selectedRegion && selectedRegion.hasOwnProperty('originalObject') && selectedRegion.originalObject.hasOwnProperty('name')) {
      $scope.profile.address = $scope.profile.address || [];
      $scope.profile.address[0] = $scope.profile.address[0] || {};
      var address = {
        'administrative_area': selectedRegion.originalObject.name,
        'locality': '' // Intentionally empty out the locality
      };
      $scope.profile.address[0] = angular.extend({}, $scope.profile.address[0], address);

      // Clear out autocomplete field for locality
      $scope.$broadcast('angucomplete-alt:clearInput', 'locality');

      // Set the available cities for searching
      $scope.localities = selectedRegion.originalObject.cities;
    }
  };

  /**
   * Callback for country angucomplete selection.
   */
  $scope.setLocality = function(selectedLocality) {
    // This callback can get called if the user is deleting text from the
    // input so we should check to see that there is an actual object for
    // originalObject before attempting to modify profile information.
    if (selectedLocality && selectedLocality.hasOwnProperty('originalObject') && selectedLocality.originalObject.hasOwnProperty('name')) {
      $scope.profile.address = $scope.profile.address || [];
      $scope.profile.address[0] = $scope.profile.address[0] || {};
      var address = {
        'locality': selectedLocality.originalObject.name
      };
      $scope.profile.address[0] = angular.extend({}, $scope.profile.address[0], address);
    }
  };

  $scope.submitProfile = function () {
    $scope.checkMultiFields(true);
    var profile = $scope.profile;
    profile.userid = profileData.profile.userid;
    profile._profile = profileData.profile._id;
    profile.status = 1;

    if (checkinFlow) {
      profile.locationId = $scope.selectedOperation;
      profile.location = $scope.placesOperations[$scope.selectedPlace][$scope.selectedOperation].name;
    }

    if ($scope.profileId.length) {
      profile._contact = $scope.profileId;
    }

    if ($scope.userIsAdmin) {
      profile.adminRoles = $scope.adminRoles;
      profile.verified = $scope.verified;
    }

    profileService.saveContact(profile).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $location.path('/dashboard');
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
  if (contact.type === 'global') {
    $scope.contact.location = 'Global';
  }

  $scope.userIsAdmin = profileService.hasRole('admin');

  $scope.back = function () {
    if (history.length) {
      history.back();
    }
    else {
      $location.path('/dashboard');
    }
  };

  $scope.checkout = function (cid) {
    var contact = {
      _id: $scope.contact._id,
      _profile: $scope.contact._profile._id,
      userid: $scope.contact._profile.userid,
      status: 0
    };
    profileService.saveContact(contact).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        profileService.clearData();
        $scope.back();
      }
      else {
        alert('error');
      }
    });
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

  if ($scope.locationId !== 'global') {
    for (var place in $scope.placesOperations) {
      if ($scope.placesOperations.hasOwnProperty(place) && $scope.placesOperations[place].hasOwnProperty($scope.locationId)) {
        $scope.location = place;
        $scope.bundles = $scope.placesOperations[place][$scope.locationId].bundles;
        break;
      }
    }
  }
  else {
    $scope.location = 'Global';
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
    if ($scope.locationId === 'global') {
      query.type = 'global';
    }
    else {
      query.type = 'local';
      query.locationId = $scope.locationId;
    }
    query.verified = query.verified ? true : null;
    query.keyContact = query.keyContact ? true : null;
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
    // Submit search after clearing query to show all.
    $scope.submitSearch();
  };

  $scope.$on('breakpointChange', function(event, breakpoint, oldClass) {
    if ($scope.breakpoint.class !== 'smallscreen' && !$scope.contacts.length) {
      $scope.submitSearch();
    }
  });

  $scope.resetSearch();

  // Fire off search if larger screen size.
  if ($scope.breakpoint.class !== 'smallscreen') {
    $scope.submitSearch();
  }
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
    controller: 'LogoutCtrl'
  }).
  when('/register', {
    template: 'Redirecting to authentication system...',
    controller: 'RegisterCtrl'
  }).
  when('/dashboard', {
    templateUrl: contactsId.sourcePath + '/partials/dashboard.html',
    controller: 'DashboardCtrl',
    requireAuth: true,
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
  when('/checkin/:profileId?', {
    templateUrl: contactsId.sourcePath + '/partials/profile.html',
    controller: 'ProfileCtrl',
    requireAuth: true,
    resolve: {
      placesOperations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      profileData : function (profileService, $route) {
        var i,
          num,
          val,
          profileId = $route.current.params.profileId || '',
          profileData = {contact: {}},
          processProfile = function (data) {
            if (data && data.profile && data.contacts) {
              profileData.profile = data.profile;
              profileData.contacts = data.contacts;
              num = data.contacts.length;
              for (i = 0; i < num; i++) {
                val = data.contacts[i];
                // Find the user's global contact
                if (val && val.type && val.type === 'global') {
                  profileData.global = val;
                }
              }
            }
            return profileData;
          };

        // If we are not checking in the current user, then load that user's profile.
        if (profileId && profileId.length) {
          return profileService.getProfileById(profileId).then(processProfile);
        }
        return profileService.getUserData().then(processProfile);
      },
      countries : function(profileService) {
        return profileService.getCountries();
      }
    }
  }).
  when('/profile/:profileId?', {
    templateUrl: contactsId.sourcePath + '/partials/profile.html',
    controller: 'ProfileCtrl',
    requireAuth: true,
    resolve: {
      placesOperations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      profileData : function(profileService, $route) {
        var contactId = $route.current.params.profileId || '',
          profileData = {},
          i,
          num,
          val;
        if (contactId && contactId.length) {
          // Check if the contact is for the current user
          return profileService.getUserData().then(function (data) {
            if (data && data.contacts && data.contacts.length) {
              num = data.contacts.length;
              for (i = 0; i < num; i++) {
                val = data.contacts[i];
                if (val && val._id && val._id === contactId) {
                  // Contact is for the current user.
                  profileData.contact = val;
                  profileData.contacts = data.contacts;
                  profileData.profile = data.profile;

                  // If this contact is local, return the user's profile and global contact too.
                  if (val.type === 'local') {
                    profileData.global = {};
                    for (i = 0; i < num; i++) {
                      val = data.contacts[i];
                      if (val && val.type && val.type === 'global') {
                        profileData.global = val;
                        break;
                      }
                    }
                  }
                  return profileData;
                }
              }
            }
            else {
              return profileData;
            }

            // Contact is not for the current user
            return profileService.getContacts({_id: contactId}).then(function (data) {
              if (data && data.contacts && data.contacts[0] && data.contacts[0]._profile && data.contacts[0]._profile._id) {
                return profileService.getProfileById(data.contacts[0]._profile._id).then(function (data) {
                  if (data && data.profile && data.contacts && data.contacts.length) {
                    num = data.contacts.length;
                    for (i = 0; i < num; i++) {
                      val = data.contacts[i];
                      // Find the matching contact
                      if (val && val._id && val._id === contactId) {
                        profileData.contact = val;
                      }
                      // And the user's global contact
                      else if (val && val._id && val._id !== contactId && val.type && val.type === 'global') {
                        profileData.global = val;
                      }
                    }
                    if (profileData.contact && profileData.contact._id) {
                      profileData.profile = data.profile;
                    }
                  }
                  return profileData;
                });
              }
              else {
                return profileData;
              }
            });
          });
        }
        else {
          return profileData;
        }
      },
      countries : function(profileService) {
        return profileService.getCountries();
      }
    }
  }).
  when('/contact/:contactId', {
    templateUrl: contactsId.sourcePath + '/partials/contact.html',
    controller: 'ContactCtrl',
    requireAuth: true,
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
  when('/list/:locationId', {
    templateUrl: contactsId.sourcePath + '/partials/list.html',
    controller: 'ListCtrl',
    requireAuth: true,
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

app.service("authService", function($location, $rootScope) {
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

  authService.logout = function () {
    oauthToken = false;
    accountData = false;

    // Clear the tokens in browser cache.
    jso.wipeTokens();

    // Redirect to the logout page on the authentication system.
    window.location.href = contactsId.authBaseUrl + "/logout?redirect=" + contactsId.appBaseUrl;
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

  return authService;
});

app.service("profileService", function(authService, $http, $q, $rootScope) {
  var cacheUserData = false,
  cacheOperationsData = false;

  // Return public API.
  return({
    getUserData: getUserData,
    getOperationsData: getOperationsData,
    clearData: clearData,
    getProfileById: getProfileById,
    getProfileByUser: getProfileByUser,
    getProfiles: getProfiles,
    getContacts: getContacts,
    saveProfile: saveProfile,
    saveContact: saveContact,
    hasRole: hasRole,
    getCountries: getCountries,
    getAdminArea: getAdminArea
  });

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
        url: contactsId.profilesBaseUrl + "/v0/profile/view",
        params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()}
      })
      .then(handleSuccess, handleError).then(function(data) {
        if (data && data.profile && data.contacts) {
          cacheUserData = data;
          $rootScope.$emit("appUserData", cacheUserData);
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
      promise = $http({
        method: "get",
        url: contactsId.hrinfoBaseUrl + "/hid/operations"
      })
      .then(handleSuccess, handleError).then(function(data) {
        if (data) {
          cacheOperationsData = data;
        }

        return cacheOperationsData;
      });
      return promise;
    }
  }

  // Clear stored app data.
  function clearData() {
    cacheUserData = false;
    cacheOperationsData = false;
  }

  // Get a profile by ID.
  function getProfileByUser(userId) {
    return getProfiles({userid: userId});
  }

  // Get a profile by ID.
  function getProfileById(profileId) {
    return getProfiles({_id: profileId});
  }

  // Get profiles that match specified parameters.
  function getProfiles(terms) {
    var request = $http({
      method: "get",
      url: contactsId.profilesBaseUrl + "/v0/profile/view",
      params: $.extend({}, terms, {access_token: authService.getAccessToken()})
    });
    return(request.then(handleSuccess, handleError));
  }

  // Get contacts that match specified parameters.
  function getContacts(terms) {
    terms.access_token = authService.getAccessToken();
    var request = $http({
      method: "get",
      url: contactsId.profilesBaseUrl + "/v0/contact/view",
      params: terms
    });
    return(request.then(handleSuccess, handleError));
  }

  // Save a profile (create or update existing).
  function saveProfile(profile) {
    var request;
    request = $http({
      method: "post",
      url: contactsId.profilesBaseUrl + "/v0/profile/save",
      params: {access_token: authService.getAccessToken()},
      data: profile
    });
    return(request.then(handleSuccess, handleError));
  }

  // Save a contact (create or update existing).
  function saveContact(contact) {
    var request;
    request = $http({
      method: "post",
      url: contactsId.profilesBaseUrl + "/v0/contact/save",
      params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
      data: contact
    });
    return(request.then(handleSuccess, handleError));
  }

  function getCountries() {
    var promise;

    promise = $http({
      method: "get",
      url: contactsId.hrinfoBaseUrl + "/hid/locations/countries"
    })
    .then(handleSuccess, handleError).then(function(data) {
      var countryData = [];
      if (data) {
        angular.forEach(data, function(value, key) {
          this.push({'name': value, 'remote_id': key});
        }, countryData);
      }
      return countryData;
    });

    return promise;
  }

  function getAdminArea(country_id) {
    var promise;

    promise = $http({
      method: "get",
      url: contactsId.hrinfoBaseUrl + "/hid/locations/" + country_id
    })
    .then(handleSuccess, handleError).then(function(data) {
      var regionData = [];
      if (data && data.regions) {
        angular.forEach(data.regions, function(value, key) {
          var region = value;
          var cities = [];
          if (region.hasOwnProperty('cities')) {
            angular.forEach(region.cities, function(value, key) {
              this.push(angular.extend({}, {'remote_id': key, 'name': value}));
            }, cities);
          }
          region.cities = cities;
          this.push(angular.extend({}, value, {'remote_id' : key}));
        }, regionData);
      }
      return regionData;
    });

    return promise;
  }

  // Returns true/false for whether the user has/doesn't have the specified
  // role. Assumes the user profile data is loaded.
  function hasRole(role) {
    return (cacheUserData && cacheUserData.profile && cacheUserData.profile.roles && cacheUserData.profile.roles.length && cacheUserData.profile.roles.indexOf(role) !== -1);
  }

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

});

}(jQuery, angular, window.contactsId));
