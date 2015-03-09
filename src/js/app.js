
(function($, angular, contactsId) {

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

// Run JSO callback to catch an authentication token, if present.
jso.callback(null, function (token) {});

// Initialize ng
app = angular.module('contactsId', ['ngAnimate', 'ngRoute', 'ngSanitize', 'cgBusy', 'gettext', 'angucomplete-alt', 'ui.select', 'breakpointApp', 'angular-spinkit', 'internationalPhoneNumber', 'angular-inview']);

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
    templateUrl: contactsId.sourcePath + '/partials/loading.html',
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

app.directive('browserAlert', function() {
  return {
    restrict: 'E',
    templateUrl: contactsId.sourcePath + '/partials/browser-alert.html',
    replace: true,
    link: function(scope) {
      var uagent = navigator.userAgent.toLowerCase(),
      match = '',
      _browser = {};

      _browser.chrome  = /webkit/.test(uagent)  && /chrome/.test(uagent);
      _browser.firefox = /mozilla/.test(uagent) && /firefox/.test(uagent);
      _browser.msie    = /msie/.test(uagent)    || /trident/.test(uagent);
      _browser.safari  = /safari/.test(uagent)  && /applewebkit/.test(uagent) && !/chrome/.test(uagent);
      _browser.opr     = /mozilla/.test(uagent) && /applewebkit/.test(uagent) &&  /chrome/.test(uagent) && /safari/.test(uagent) && /opr/.test(uagent);
      _browser.version = '';

      for (x in _browser) {
        if (_browser[x]) {
          match = uagent.match(new RegExp("(" + x + ")( |/)([0-9]+)"));
          if (match) {
            _browser.version = match[3];
          } else {
            match = uagent.match(new RegExp("rv:([0-9]+)"));
            if (match) {
              _browser.version = match[1];
            }
          }
          break;
        }
      }

      _browser.opera = scope.opr;
      delete _browser.opr;
      scope.version = _browser.version;
      if( _browser.chrome
        || _browser.firefox
        || _browser.safari
        || (_browser.msie && parseFloat(_browser.version) && parseFloat(_browser.version) >= 10)) {
        scope.supported = true;
      }
      else {
        scope.supported = false;
      }
    }
  };
});

app.run(function ($rootScope, $location, $window, authService) {
  $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
    $rootScope.bodyClasses = [];
    if (nextRoute && nextRoute.requireAuth && !authService.isAuthenticated()) {
      event.preventDefault();
      loginRedirect = $location.path();
      $location.path('/login');
    }
    if (nextRoute && nextRoute.bodyClasses) {
      $rootScope.bodyClasses = nextRoute.bodyClasses;
    }
  });

  // Google analytics page view tracking
  $rootScope.$on('$routeChangeSuccess', function() {
    $window.ga('send', 'pageview', { page: $location.url() });
  });
});


app.controller("HeaderCtrl", function($scope, $rootScope, $location, profileService, gettextCatalog) {
  $rootScope.$on("appLoginSuccess", function(ev, accountData) {
    $scope.isAuthenticated = accountData && accountData.user_id;
    $scope.nameGiven = accountData.name_given;
    $scope.nameFamily = accountData.name_family;
  });
  $rootScope.$on("appUserData", function(ev, userData) {
    if (userData && userData.contacts) {
      for (var idx = 0; idx < userData.contacts.length; idx++) {
        if (userData.contacts[idx].type === 'global') {
          $scope.nameGiven = userData.contacts[idx].nameGiven;
          $scope.nameFamily = userData.contacts[idx].nameFamily;
          break;
        }
      }
    }
  });
  $scope.language = 'en';
  $scope.switchLanguage = function () {
    gettextCatalog.setCurrentLanguage($scope.language);
    gettextCatalog.debug = profileService.hasRole('admin');
  };

  $scope.mainMenu = false;
  $scope.externalLinks = false;
  $scope.menuToggle = function () {
    if ($scope.externalLinks) {
      $scope.externalLinks = false;
    }
    else {
      $scope.mainMenu = !$scope.mainMenu;
    }
  };

  $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
    $scope.mainMenu = false;
    $scope.externalLinks = false;
  });

});

// Identifies active link via active-link attr.
app.directive('activeLink', ['$location', function(location) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs, controller) {
      var linkClass = attrs.activeLink;
      var path = attrs.href;
      // Added because path does not return including hashbang
      path = path.substring(1);
      scope.location = location;
      scope.$watch('location.path()', function(newPath) {
        if (path === newPath) {
          element.addClass(linkClass);
        } else {
          element.removeClass(linkClass);
        }
      });
    }
  };
}]);

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

app.controller("LoginCtrl", function($scope, $location, $routeParams, authService, profileService) {
  var redirectPath = $routeParams.redirectPath || loginRedirect || '';

  // Get the access token. If one in the browser cache is not found, then
  // redirect to the auth system for the user to login.
  authService.verify(function (err) {
    if (!err && authService.isAuthenticated()) {
      profileService.getUserData().then(function(data) {
        $location.path(redirectPath.length ? redirectPath : '/dashboard');
        loginRedirect = '';
      });
    }
    else {
      authService.logout(true);
      window.location.href = contactsId.appBaseUrl + '/#/login' + loginRedirect;
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
  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;

  $scope.userCanCreateAccount = profileService.hasRole('admin') || profileService.hasRole('manager') || profileService.hasRole('editor');

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

app.controller("CreateAccountCtrl", function($scope, $location, $route, $http, profileService, authService, placesOperations, globalProfileId, userData, gettextCatalog) {
  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.organizations = [];
  $scope.selectedOrganization = [];
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.accountConfirm = false;
  $scope.ghostConfirm = false;
  $scope.confirmMessage = "";
  $scope.profile = {email:[{}], phone:[{}]};
  $scope.newProfileID;
  $scope.query = $location.search();

  // Setup scope variables from data injected by routeProvider resolve
  $scope.placesOperations = placesOperations;
  var availPlacesOperations = angular.copy(placesOperations);
  // Convert list into an array that can be sorted
  $scope.availPlacesOperations = listObjectToArray(availPlacesOperations, 'place', 'operations');

  $scope.userCanViewAllFields = profileService.hasRole('admin') || profileService.hasRole('manager') || profileService.hasRole('editor');

  $scope.back = function () {
    if (history.length) {
      history.back();
    }
    else {
      $location.path('/dashboard');
    }
  };

  $scope.validateAccount = function () {
    $scope.submitted = false;

    if ($scope.createAccountForm.$valid) {
      //Submit as normal
      //Check to see if the account already exists
      if ($scope.profile.email && $scope.profile.email[0].address){
       $scope.createAccount();
      }
      else{
       //Warn user of ghost account
       $scope.ghostWarning = true;
      }
    }
    else{
      //Form validation error
      $scope.submitted = true;
    }
  };

  $scope.createAccount = function () {
    var authID = "";
    var isGhost = false;
    var profile = $.extend(true, {}, $scope.profile);
    var name = profile.nameGiven + " " + profile.nameFamily;

    //Disable the create button until we are done saving the contact
    $scope.createButtonDisabled = true;

    if (!profile.email[0].address){
      isGhost = true;
    }

    if (profile.phone[0].number) {
      profile.phone[0].type = 'Mobile';
    }

    profile.userid = '';
    profile._profile = null;
    profile.status = 1;
    profile.type = 'local';
    profile.isNewContact = true;
    profile.adminName = userData.global.nameGiven + " " + userData.global.nameFamily;

    if ($scope.profile.location) {
      profile.locationId = Object.keys($scope.profile.location.operations);
      profile.location = $scope.profile.location.place;
    }

    if ($scope.selectedOrganization){
      profile.organization = $scope.selectedOrganization;
    }

    profileService.saveContact(profile).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $scope.newProfileID = data.data._profile;

        if (isGhost){
          $scope.confirmTitle = gettextCatalog.getString("Name added to the list");
          $scope.confirmMessage = name + " " + gettextCatalog.getString("will be added to the contact list.  They will not be able to claim their account.");
        }
        else{
          $scope.confirmTitle = gettextCatalog.getString("Account Created!");
          $scope.confirmMessage = name + " " + gettextCatalog.getString("will receive an email to claim their account.");
        }
        $scope.accountConfirm = true;
        $scope.ghostWarning = false;
      }
      else {
        var msg = (data && data.message) ? 'Error: ' + data.message : 'An error occurred while attempting to save this profile. Please try again or contact an administrator.';
        alert(msg);
      }
      $scope.createButtonDisabled = false;
    });
  };

  // Converts object to a sortable array.
  function listObjectToArray(obj, kLabel, vLabel) {
    var listArray = [];
    // Having difficulty getting location to work when keys are generalized.
    kLabel = kLabel || 'key';
    vLabel = vLabel || 'value';
    angular.forEach(obj, function(v, k) {
      var tmp = {};
      tmp[kLabel] = k;
      tmp[vLabel] = v;
      this.push(tmp);
    }, listArray);
    return listArray;
  }

  $scope.refreshOrganization = function(select, lengthReq) {
    var clearOption = {action:'clear', name:"", alt:'Organizations'};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      $http.get($scope.hrinfoBaseUrl + '/hid/organizations/autocomplete/' + encodeURIComponent(select.search))
        .then(function(response) {
          $scope.organizations = [];
          angular.forEach(response.data, function(value, key) {
            this.push({'name': value, 'remote_id': key});
          }, $scope.organizations);
          if ($scope.organizations.length) {
            $scope.organizations.unshift(clearOption);
          }
        });
    }
    else {
      $scope.organizations = [];
      if (typeof $scope.query['organization.name'] !== 'undefined' && $scope.query['organization.name'].length) {
        $scope.organizations.push(clearOption);
      }
    }
  };

  $scope.onSelect = function(item, qProp) {
    if (item.action === "clear") {
      $scope.query[qProp] = undefined;
    }
    if (item.name && item.remote_id){
      $scope.selectedOrganization = {'name': item.name, 'remote_id': item.remote_id};
    }
  };

  $scope.resetAccount = function(){
    $scope.profile = {email:[{}], phone:[{}]};
    $scope.selectedOrganization = {};
    profile = {};
    $scope.accountConfirm = false;
    $scope.ghostConfirm = false;
    $location.path('/createaccount');
  }
});

app.controller("ProfileCtrl", function($scope, $location, $route, $routeParams, $filter, $timeout, profileService, authService, placesOperations, profileData, countries, roles, protectedRoles, gettextCatalog, userData) {
  $scope.profileId = $routeParams.profileId || '';
  $scope.profile = {};

  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.invalidFields = {};
  $scope.adminRoleOptions = [];
  $scope.protectedRoles = protectedRoles;

  $scope.phoneTypes = ['Landline', 'Mobile', 'Fax', 'Satellite'];
  $scope.emailTypes = ['Work', 'Personal', 'Other'];
  var multiFields = {'uri': [], 'voip': ['number', 'type'], 'email': ['address'], 'phone': ['number', 'type'], 'bundle': []};

  var pathParams = $location.path().split('/'),
  checkinFlow = pathParams[1] === 'checkin',
  accountData = authService.getAccountData();
  $scope.adminRoles = (profileData.profile && profileData.profile.roles && profileData.profile.roles.length) ? profileData.profile.roles : [];
  $scope.selectedProtectedRoles = (profileData.contact && profileData.contact.protectedRoles && profileData.contact.protectedRoles.length) ? profileData.contact.protectedRoles : [];

  $scope.verified = (profileData.profile && profileData.profile.verified) ? profileData.profile.verified : false;
  $scope.submitText = !checkinFlow ? gettextCatalog.getString('Update Profile') : gettextCatalog.getString('Check-in');

  // Variable to help determine field visibility.
  var hasRoleAdmin = profileService.hasRole('admin'),
      hasRoleManager = profileService.hasRole('manager'),
      hasRoleEditor = profileService.hasRole('editor'),
      isLocal = (profileData.contact && profileData.contact.type === 'local');

  $scope.userCanViewAllFields = (hasRoleAdmin || hasRoleManager || hasRoleEditor);
  $scope.userCanEditProfile = (
            hasRoleAdmin
        ||  (isLocal && (profileService.hasRole('manager', profileData.contact.locationId) || profileService.hasRole('editor', profileData.contact.locationId)))
        ||  (checkinFlow && (hasRoleManager || hasRoleEditor))
      );

  $scope.userCanEditRoles = (hasRoleAdmin || hasRoleManager) && profileData.profile._id !== userData.profile._id;
  if ($scope.userCanEditRoles) {
    if (profileService.hasRole('admin', null, profileData) && !hasRoleAdmin) {
      $scope.userCanEditRoles = false;
    }
    if (profileService.hasRole('manager', null, profileData) && !(hasRoleAdmin || hasRoleManager)) {
      $scope.userCanEditRoles = false;
    }
  }

  $scope.userCanEditKeyContact = (
            hasRoleAdmin
        ||  (checkinFlow && hasRoleManager)
        ||  (isLocal && profileService.hasRole('manager', profileData.contact.locationId)));

  $scope.userCanEditProtectedRoles = (
            $scope.userCanEditKeyContact
        ||  (checkinFlow && hasRoleEditor)
        ||  (isLocal && profileService.hasRole('editor', profileData.contact.locationId)));

  // Determine what roles are available to assign to a user
  if ($scope.userCanEditRoles && userData.profile.roles.indexOf('admin') > -1) {
    // You're an admin and can assign any role
    $scope.adminRoleOptions = roles;
  }
  else if ($scope.userCanEditRoles) {
    if ($scope.userCanEditRoles) {
      for (var i in userData.profile.roles) {
        if (userData.profile.roles.hasOwnProperty(i)) {
          var role = userData.profile.roles[i],
              roleData = roleInArray(role, roles),
              roleParts = role.split(":");

          if (roleData) {
            $scope.adminRoleOptions.push(roleData);
          }

          if (roleParts[0] === 'manager') {
            var tempData = roleInArray(('editor:' + roleParts[1] + ':'+ roleParts[2]), roles);
            if (tempData) {
              $scope.adminRoleOptions.push(tempData);
            }
          }
        }
      }
    }
  }
  else {
    for (var i in $scope.adminRoles) {
      if ($scope.adminRoles.hasOwnProperty(i)) {
        var roleData = roleInArray($scope.adminRoles[i], roles);
        if (roleData) {
          $scope.adminRoleOptions.push(roleData);
        }
      }
    }
  }

  // Helper for fetching role data.
  function roleInArray(roleId, roles) {
    var rolesById = roles.map(function(e) { return e.id; })
        index = rolesById.indexOf(roleId);
    return (index > -1) ? roles[index] : false;
  }

  // Setup scope variables from data injected by routeProvider resolve
  $scope.placesOperations = placesOperations;
  var availPlacesOperations = angular.copy(placesOperations);
  $scope.availPlacesOperations = availPlacesOperations;
  $scope.profileData = profileData;
  $scope.countries = countries;

  // Exclude operations for which the user is already checked in.
  if (profileData && profileData.contacts && profileData.contacts.length) {
    var checkedInKeys = profileData.contacts.map(function (val, idx, arr) {
      return (val.locationId && val.locationId.length) ? val.locationId : null;
    });
    for (var ckey in availPlacesOperations) {
      if (availPlacesOperations.hasOwnProperty(ckey)) {
        for (var okey in availPlacesOperations[ckey]) {
          if (availPlacesOperations[ckey].hasOwnProperty(okey) && checkedInKeys.indexOf(okey) !== -1) {
            delete availPlacesOperations[ckey][okey];
            if ($.isEmptyObject(availPlacesOperations[ckey])) {
              delete availPlacesOperations[ckey];
            }
          }
        }
      }
    }
  }
  // Convert list into an array that can be sorted
  $scope.availPlacesOperations = listObjectToArray(availPlacesOperations, 'place', 'operations');

  // When checking in to a new crisis, load the user's global profile to clone.
  if (checkinFlow) {
    $scope.selectedPlace = '';
    $scope.selectedOperation = '';
    $scope.profile = profileData.global ? angular.fromJson(angular.toJson(profileData.global)) : {};
    if ($scope.profile._id) {
      delete $scope.profile._id;
    }
    if ($scope.profile._contact) {
      delete $scope.profile._contact;
    }
    $scope.profile.type = 'local';
    $scope.profile.keyContact = false;
  }
  else {
    $scope.selectedPlace = 'none';
    $scope.selectedOperation = 'none';
    setPreferedCountries();
  }

  // Creates an array to be used as options for group select
  $scope.$watch("selectedOperation", function(newValue, oldValue) {
    if (newValue !== oldValue && $scope.selectedPlace.length && $scope.selectedOperation.length) {
      setBundles();

      $scope.profileName = $scope.placesOperations[$scope.selectedPlace][$scope.selectedOperation].name;
      setPreferedCountries();
      // Need timeout to fix dropdown width issues.
      $timeout($scope.checkMultiFields, 100);
    }
  });

  // If loading an existing contact profile by ID, find it in the user's data.
  if (!checkinFlow && $scope.profileId.length) {
    $scope.profile = profileData.contact || {};

    if ($scope.profile.locationId) {
      for (var place in $scope.placesOperations) {
        if ($scope.placesOperations.hasOwnProperty(place) && $scope.placesOperations[place].hasOwnProperty($scope.profile.locationId)) {
          $scope.selectedPlace = place;
          $scope.selectedOperation = $scope.profile.locationId;
          setBundles();
          setPreferedCountries();
          break;
        }
      }
    }
    $scope.profileName = $scope.profile.type === 'global' ? gettextCatalog.getString('Global') : $scope.profile.location;
  }
  else if (!checkinFlow) {
    // If editing the global profile for the first time, add messaging.
    $scope.profile.type = 'global';
    $scope.profileName = $scope.profile.type === 'global' ? gettextCatalog.getString('Global') : $scope.profile.location;
  }

  // Add the given and family name from the auth service as a default value.
  if ((!$scope.profile.nameGiven || !$scope.profile.nameGiven.length) && (!$scope.profile.nameFamily || !$scope.profile.nameFamily.length)) {
    $scope.profile.nameGiven = accountData.name_given || '';
    $scope.profile.nameFamily = accountData.name_family || '';
  }

  // Add email from the auth service as a default value.
  // Only when editing the global profile for first time.
  if ((!$scope.profile.email || !$scope.profile.email.length) && $scope.profileName === "Global" && !$scope.profileId) {
    $scope.profile.email = [{address: accountData.email}];
  }

  // Now we have a profile, use the profile's country to fetch regions and cities
  if ($scope.profile.address) {
    if (!$scope.profile.address.length || !$scope.profile.address[0].hasOwnProperty('country')) {
      $scope.profile.address = [];
      $scope.profile.address[0] = {country: $scope.selectedPlace};
    }
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

  $scope.vaildFieldEntry= function(field, el) {
    if (multiFields[field].length) {
      var valid = !!el;
      for (var reqField in multiFields[field]) {
        if (multiFields[field].hasOwnProperty(reqField)) {
          if (!el[multiFields[field][reqField]] || !el[multiFields[field][reqField]].length) {
            valid = false;
            break;
          }
        }
      };
      return valid;
    }
    else {
      return el && el.length;
    }
  }

  // Check field with 2 or more requires inputs for incomplete entries.
  $scope.checkMultiRequireFields = function (field, el) {
    var valid = undefined;
    for (var reqField in multiFields[field]) {
      if (multiFields[field].hasOwnProperty(reqField)) {
        var subValid = (!el[multiFields[field][reqField]] || !el[multiFields[field][reqField]].length);
        if (valid === undefined) {
          valid = subValid;
        }
        else if (subValid != valid) {
          // Field is incomplete.
          return false;
        }
      }
    }
    // Field is complete or empty.
    return true;
  }

  // Checks ALL multi field with 2 or more requires inputs for incomplete entries.
  $scope.checkAllMultiRequireFields = function () {
    var allValid = true;
    for (var field in multiFields) {
      if (multiFields.hasOwnProperty(field) && multiFields[field].length > 1 && $scope.profile[field]) {
        $scope.invalidFields[field] = {};
        for (var index in $scope.profile[field]) {
          if ($scope.profile[field].hasOwnProperty(index)) {
            if (!$scope.checkMultiRequireFields(field, $scope.profile[field][index])) {
              $scope.invalidFields[field][index] =  true;
              allValid = false;
            }
          }
        };
      }
      else if (typeof $scope.invalidFields[field] !== 'undefined') {
        delete $scope.invalidFields[field];
      }
    }
    return allValid;
  }

  // Remove error styling when corrected.
  $scope.removeFieldError = function(field) {
    if ($scope.invalidFields[field] && $scope.invalidFields[field][this.$index] && $scope.checkMultiRequireFields(field, this[field])) {
      delete $scope.invalidFields[field][this.$index]
    }
  }

  $scope.checkMultiFields = function (excludeExtras) {
    for (var field in multiFields) {
      if (multiFields.hasOwnProperty(field)) {
        if ($scope.profile[field] && $scope.profile[field].filter) {
          $scope.profile[field] = $scope.profile[field].filter(function (el) {
            return $scope.vaildFieldEntry(field, el);
          });
        }
        else {
          $scope.profile[field] = [];
        }
        var len = $scope.profile[field].length;
        if (!excludeExtras) {
          if (!multiFields[field].length && (!len || $scope.profile[field][len - 1].length)) {
            $scope.profile[field].push('');
          }
          else if (multiFields[field].length && (!len || $scope.profile[field][len - 1][multiFields[field][0]].length)) {
            $scope.profile[field].push('');
          }
        }
      }
    }
  };
  // Add extra blank fields when editing a profile
  if (!checkinFlow) {
    $scope.checkMultiFields();
  }

  $scope.checkForValidEntry = function(field, index){
    return (multiFields.hasOwnProperty(field)
          && $scope.profile[field]
          && $scope.profile[field][index]
          && $scope.vaildFieldEntry(field, $scope.profile[field][index]));
  }
  $scope.changeFieldEntries = function(field, index, last){
    var validEntry = $scope.checkForValidEntry(field, index);
    if (last && validEntry) {
      // Add new field.
      $scope.profile[field].push("");
    }
    else if(last){
      // Focus on field.
      this.focus = true;
    }
    else {
      // Remove new field.
      $scope.profile[field].splice(index, 1);
    }
  }

  $scope.styleFieldEntries = function(field, index, last){
    var validEntry = $scope.checkForValidEntry(field, index);
    if (last && validEntry) {
      return 'fa-plus';
    }
    else if (last) {
      return 'fa-pencil';
    }
    else {
      return 'fa-remove';
    }
  }

  $scope.selectPlace = function () {
    var opkeys = [],
        key;
    for (key in this.place.operations) {
      if (this.place.operations.hasOwnProperty(key)) {
        opkeys.push(key);
      }
    }
    $scope.selectedPlace = this.place.place;
    if (opkeys.length == 1) {
      $scope.selectedOperation = opkeys[0];
    }
  };

  // Used in validation alerts.
  $scope.bumpIndex = function() {
    return parseInt(this.index) + 1;
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

  $scope.back = function () {
    if (history.length) {
      history.back();
    }
    else {
      $location.path('/dashboard');
    }
  };

  $scope.onChange = function(item, prop) {
    var i = $scope[prop].indexOf(item.id);
    if (i > -1) {
      $scope[prop].splice(i, 1);
    }
    else {
      $scope[prop].push(item.id);
    }
  }

  $scope.submitProfile = function () {
    // Checks for incomplete entries.
    if ($scope.checkAllMultiRequireFields()) {
      // Removes empty entries.
      $scope.checkMultiFields(true);
      var profile = $scope.profile;
      if (profileData.profile && profileData.profile.userid && profileData.profile._id) {
        profile.userid = profileData.profile.userid;
        profile._profile = profileData.profile._id;
      }
      else {
        profile.userid = accountData.user_id;
        profile._profile = null;
      }
      profile.status = 1;

      if (checkinFlow) {
        profile.locationId = $scope.selectedOperation;
        profile.location = $scope.placesOperations[$scope.selectedPlace][$scope.selectedOperation].name;

        //Determine if user being checked in is the same as the logged in user
        //If not, we need to add some properties to contact so profile service can send an email notifying the user
        if (userData.profile.userid != profile.userid  && profile.email[0]){
          //Set email fields
          var email = {
            type: 'notify_checkin',
            recipientFirstName: profile.nameGiven,
            recipientLastName: profile.nameFamily,
            recipientEmail: profile.email[0].address,
            adminName: userData.global.nameGiven + " " + userData.global.nameFamily,
            locationName: profile.location
          };
          profile.notifyEmail = email;
        }
      }

      if ($scope.profileId.length) {
        profile._contact = $scope.profileId;
      }

      if ($scope.userCanEditRoles) {
        profile.adminRoles = $scope.adminRoles;
      }

      if ($scope.userCanEditProtectedRoles) {
        profile.newProtectedRoles = $scope.selectedProtectedRoles;
      }

      if ($scope.userCanEditProfile) {
        profile.verified = $scope.verified;
      }

      profileService.saveContact(profile).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          $scope.back();
          profileService.clearData();
        }
        else {
          alert('error');
        }
      });
    }
  };

  // Converts object to a sortable array.
  function listObjectToArray(obj, kLabel, vLabel) {
    var listArray = [];
    // Having difficulty getting location to work when keys are generalized.
    kLabel = kLabel || 'key';
    vLabel = vLabel || 'value';
    angular.forEach(obj, function(v, k) {
      var tmp = {};
      tmp[kLabel] = k;
      tmp[vLabel] = v;
      this.push(tmp);
    }, listArray);

    return listArray;
  }

  function setBundles(){
    var bundles = $scope.placesOperations[$scope.selectedPlace][$scope.selectedOperation].bundles;
    $scope.bundles = listObjectToArray(bundles);
  }

  // If profile is local, set preferred county code to checkin location.
  function setPreferedCountries() {
    if ($scope.profile.type === 'local') {
      $scope.defaultPreferredCountryAbbr = [];
      var match, countryMatch;

      match = $scope.selectedPlace.toUpperCase();
      countryMatch = $.fn.intlTelInput.getCountryData().filter(function (el) {
        // Returns country data that is similar to selectedPlace.
        return el.name.toUpperCase().match(match);
      });
      for (var i in countryMatch) {
        $scope.defaultPreferredCountryAbbr.push(countryMatch[i].iso2)
      };
      // Converts array to a string.
      $scope.defaultPreferredCountryAbbr = $scope.defaultPreferredCountryAbbr.join(', ') || "ch";
    }
    else {
      $scope.defaultPreferredCountryAbbr = "ch";
    }
  }

});

// Trigger focus on field.
app.directive('focusField', function() {
  return function(scope, element, attrs) {
    scope.$watch(attrs.focusField,
    function (newValue) {
      newValue && element.focus();
    },true);
  };
});

app.controller("ContactCtrl", function($scope, $route, $routeParams, $filter, profileService, contact, gettextCatalog, userData, protectedRoles) {
  $scope.contact = contact;
  if (contact.type === 'global') {
    $scope.contact.location = gettextCatalog.getString('Global');
  }

  $scope.userCanEdit = $scope.userCanCheckIn = profileService.hasRole('admin') || profileService.hasRole('manager') || profileService.hasRole('editor');
  $scope.userCanCheckOut = (contact.type === 'local') && (profileService.hasRole('admin') || profileService.hasRole('manager', contact.locationId) || profileService.hasRole('editor', contact.locationId));

  var roleFilter = $filter('filter');
  $scope.contact.protectedRolesByName = [];
  angular.forEach($scope.contact.protectedRoles, function(value, key) {
    var role = roleFilter(protectedRoles,function(d) { return d.id === value;})[0].name;
    this.push(role);
  }, $scope.contact.protectedRolesByName);

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
    if (!$scope.userCanCheckOut) {
      return;
    }

    //Determine if user being checked out is the same as the logged in user
    //If not, we need to add some properties to contact so profile service can send an email notifying the user
    if (userData.profile.userid != $scope.contact._profile.userid && $scope.contact.email[0]){
      //Set email fields
      var email = {
        type: 'notify_checkout',
        recipientFirstName: $scope.contact.nameGiven,
        recipientLastName: $scope.contact.nameFamily,
        recipientEmail: $scope.contact.email[0].address,
        adminName: userData.global.nameGiven + " " + userData.global.nameFamily,
        locationName: $scope.contact.location
      };
      contact.notifyEmail = email;
    }

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

  $scope.generateVcard = function () {
    var vcard = "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      "N:" + contact.nameFamily + ";" + contact.nameGiven + ";;;\n" +
      "FN:" + contact.nameGiven + " " + contact.nameFamily + "\n";
    if (contact.organization[0] && contact.organization[0].name) {
      vcard += "ORG:" + contact.organization[0].name + "\n";
    }
    if (contact.jobtitle) {
      vcard += "TITLE:" + contact.jobtitle + "\n";
    }
    angular.forEach(contact.phone, function (item) {
      if (item.type && item.number) {
        vcard += "TEL;TYPE=" + item.type + ",VOICE:" + item.number + "\n";
      }
    });
    angular.forEach(contact.email, function (item) {
      if (item.address) {
        vcard += "EMAIL:" + item.address + "\n";
      }
    });
    vcard += "REV:" + new Date().toISOString() + "\n" +
      "END:VCARD\n";
    window.location.href = 'data:text/vcard;charset=UTF-8,' + encodeURIComponent(vcard);
  };
});

app.controller("ListCtrl", function($scope, $route, $routeParams, $location, $http, $filter, authService, profileService, userData, placesOperations, gettextCatalog, protectedRoles, countries) {
  var searchKeys = ['address.administrative_area', 'address.country', 'address.locality', 'bundle','keyContact', 'organization.name', 'protectedRoles', 'role','text','verified'];

  $scope.location = '';
  $scope.locationId = $routeParams.locationId || '';
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.placesOperations = placesOperations;

  $scope.contacts = [];
  $scope.bundles = [];
  $scope.organizations = [];
  $scope.protectedRoles = [];
  $scope.countries = countries;

  $scope.contactsPromise;
  $scope.query = $location.search();
  $scope.loadLimit = 30;
  $scope.contactsCount = 0;

  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';
  $scope.listComplete = false;
  $scope.contactsCreated = false;

  $scope.userCanExportContacts = profileService.hasRole('admin') || ($scope.locationId && (profileService.hasRole('manager', $scope.locationId) || profileService.hasRole('editor', $scope.locationId)));


  var pathParams = $location.url().split('/'),
      filter = $filter('filter');

  if (pathParams[2] === 'print') {
    $scope.date = moment().format('MMM Do YYYY');
    $scope.loadLimit = 0;
    $scope.filtersParams = [];

    angular.forEach(searchKeys, function(paramKey){
      if ($scope.query.hasOwnProperty(paramKey)) {
        switch (paramKey) {
          case 'keyContact':
            this.push('Key Contact');
            break;
          case 'protectedRoles':
            this.push(filter(protectedRoles,function(d) { return d.id === $scope.query[paramKey];})[0].name);
            break;
          case 'verified':
            this.push('Verified User');
            break;
          default:
            this.push($scope.query[paramKey])
        }
      }
    }, $scope.filtersParams);
  }
  else {
    pathParams.splice(2, 0, "print")
    $scope.printUrl = '#' + pathParams.join('/');
  }

  // Add default country entry.
  $scope.countries.unshift({action:'clear', name:"", alt:'Country'});

  if ($scope.locationId !== 'global') {
    // Create bundles array.
    for (var place in $scope.placesOperations) {
      if ($scope.placesOperations.hasOwnProperty(place) && $scope.placesOperations[place].hasOwnProperty($scope.locationId)) {
        $scope.location = place;
        $scope.bundles = listObjectToArray($scope.placesOperations[place][$scope.locationId].bundles);
        $scope.bundles.unshift({action:'clear', value:"", alt:'Group'});
        break;
      }
    }

    // Fetch regions and cities for filters.
    if ($scope.location) {
      var tmpRegion = $scope.query['address.administrative_area'],
          tmpLocality = $scope.query['address.locality'],
          len = $scope.countries.length,
          remote_id = null;

      $scope.regions = tmpRegion ? [{name: tmpRegion}] : [];
      $scope.localities = tmpLocality ? [{name: tmpLocality}] :[];
      profileService.getAdminArea(function() {
        for (var i = 0; i < len; i++) {
          if ($scope.countries[i].name === $scope.location) {
            remote_id = $scope.countries[i].remote_id;
            break;
          }
        }
        return remote_id;
      }()).then(function(data) {
        $scope.regions = data;
        $scope.regions.unshift({action:'clear', name:"", alt:'Region'});
        // If we already have an administrative area set, we should also populate the cities for
        // autocomplete
        if ($scope.query.hasOwnProperty('address.administrative_area')) {
          angular.forEach($scope.regions, function(value, key) {
            if (value.name === $scope.query['address.administrative_area']) {
              $scope.localities = value.cities;
              $scope.localities.unshift({action:'clear', name:"", alt:'Locality'});
            }
          });
        }
      });
    }
  }
  else {
    $scope.location = gettextCatalog.getString('Global');
  }

  // Create protected roles array.
  $scope.protectedRoles = protectedRoles;
  $scope.protectedRoles.unshift({action:'clear', name:"", id:"", alt:'Role'});

  $scope.resetSearch = function () {
    for (var i in searchKeys) {
      $scope.query[searchKeys[i]] = null;
    }
    // Submit search after clearing query to show all.
    $scope.submitSearch();
  };

  // Sets sets url params thru $location.search().
  $scope.submitSearch = function(){
    var query = $scope.query,
        sObj = {};

    for (var i in searchKeys) {
      if (query[searchKeys[i]]) {
        sObj[searchKeys[i]] = query[searchKeys[i]]
      }
    }
    // Close sidebar on mobile.
    sidebarOptions = false;

    $location.search(sObj);
  }

  $scope.exportSearch = function() {
    var query = $scope.query;
    query.access_token = authService.getAccessToken();
    query.export = 'csv';
    query.limit = 0;
    query.skip = 0;
    window.open(contactsId.profilesBaseUrl + "/v0/contact/view?" + jQuery.param(query), 'hidAppCSV');
  }

  // Autocomplete call for Orgs
  $scope.refreshOrganization = function(select, lengthReq) {
    var clearOption = {action:'clear', name:"", alt:'Organizations'};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      $http.get($scope.hrinfoBaseUrl + '/hid/organizations/autocomplete/' + encodeURIComponent(select.search))
        .then(function(response) {
          $scope.organizations = [];
          angular.forEach(response.data, function(value, key) {
            this.push({'name': value, 'remote_id': key});
          }, $scope.organizations);
          if ($scope.organizations.length) {
            $scope.organizations.unshift(clearOption);
          }
        });
    }
    else {
      $scope.organizations = [];
      if (typeof $scope.query['organization.name'] !== 'undefined' && $scope.query['organization.name'].length) {
        $scope.organizations.push(clearOption);
      }
    }
  };

  $scope.onSelect = function(item, qProp) {
    if (item.action === "clear") {
      $scope.query[qProp] = undefined;
    }
    if (qProp === "address.administrative_area" && $scope.query.hasOwnProperty('address.locality')) {
      delete $scope.query['address.locality'];
    }
    // Search upon changing filter.
    $scope.submitSearch();
  }

  $scope.loadMoreContacts = function(inview, inviewpart) {
    // Don't do anything if elem not completely visible
    if (!inview || inviewpart !== 'both') {
      return;
    }

    if ($scope.queryCount > $scope.contactsCount) {
      createContactList();
    }
    else {
      $scope.listComplete = true;
    }
  }

  createContactList();
  if ($scope.query['organization.name']) {
    $scope.refreshOrganization({search:$scope.query['organization.name']})
  }

  // Builds the list of contacts.
  function createContactList() {
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
    query.limit = $scope.loadLimit;
    query.skip = $scope.contactsCount;

    $scope.contactsPromise = profileService.getContacts(query).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        data.contacts = data.contacts || [];
        $scope.contacts = $scope.contacts.concat(data.contacts);
        $scope.contactsCreated = true;
        $scope.queryCount = data.count;
        $scope.contactsCount = $scope.contacts.length;
      }
    });
  }

  // Converts object to a sortable array.
  function listObjectToArray(obj) {
    var listArray = [];
    angular.forEach(obj, function(v, k) {
      this.push({key:k, value: v});
    }, listArray);
    return listArray;
  }

});

app.config(function($routeProvider, $locationProvider) {
  $routeProvider.
  when('/', {
    templateUrl: contactsId.sourcePath + '/partials/index.html',
    controller: 'DefaultCtrl',
    bodyClasses: ['index']
  }).
  when('/login', {
    template: 'Redirecting to authentication system...',
    controller: 'LoginCtrl'
  }).
  when('/login/:redirectPath*', {
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
          var num = data.contacts.length;
          for (var idx = 0; idx < num; idx++) {
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

        // If profileId is set, we are not checking in the current user. Load the new user's profile.
        if (profileId && profileId.length) {
          return profileService.getProfileById(profileId).then(processProfile);
        }
        // Load data for current user
        return profileService.getUserData().then(processProfile);
      },
      countries : function(profileService) {
        return profileService.getCountries();
      },
      roles : function(profileService) {
        return profileService.getRoles();
      },
      protectedRoles : function(profileService) {
        return profileService.getProtectedRoles();
      },
      userData : function(profileService) {
        var userdata = {},
            num,
            i,
            val;
        return profileService.getUserData().then(function(data) {
          if (!data || !data.profile || !data.contacts) {
            throw new Error('Your user data cannot be retrieved. Please sign in again.');
          }
          else{
            userdata.profile = data.profile;
            userdata.contacts = data.contacts;
            num = data.contacts.length;
            for (i = 0; i < num; i++) {
              val = data.contacts[i];
              // Find the user's global contact
              if (val && val.type && val.type === 'global') {
                userdata.global = val;
              }
            }
            return userdata;
          }
        });
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
      },
      roles : function(profileService) {
        return profileService.getRoles();
      },
      protectedRoles : function(profileService) {
        return profileService.getProtectedRoles();
      },
      userData : function(profileService) {
        return profileService.getUserData().then(function(data) {
          if (!data || !data.profile || !data.contacts) {
            throw new Error('Your user data cannot be retrieved. Please sign in again.');
          }
          return data;
        });
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
      },
      protectedRoles : function(profileService) {
        return profileService.getProtectedRoles();
      },
      userData : function(profileService) {
        var userdata = {},
            num,
            i,
            val;
        return profileService.getUserData().then(function(data) {
          if (!data || !data.profile || !data.contacts) {
            throw new Error('Your user data cannot be retrieved. Please sign in again.');
          }
          else{
            userdata.profile = data.profile;
            userdata.contacts = data.contacts;
            num = data.contacts.length;
            for (i = 0; i < num; i++) {
              val = data.contacts[i];
              // Find the user's global contact
              if (val && val.type && val.type === 'global') {
                userdata.global = val;
              }
            }
            return userdata;
          }
        });
      }
    }
  }).
  when('/list/:locationId', {
    templateUrl: contactsId.sourcePath + '/partials/list.html',
    controller: 'ListCtrl',
    requireAuth: true,
    resolve: {
      countries : function(profileService) {
        return profileService.getCountries();
      },
      userData : function(profileService) {
        return profileService.getUserData().then(function(data) {
          return data;
        });
      },
      placesOperations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      protectedRoles : function(profileService) {
        return profileService.getProtectedRoles();
      }
    }
  }).
  when('/list/print/:locationId', {
    templateUrl: contactsId.sourcePath + '/partials/list-print.html',
    controller: 'ListCtrl',
    bodyClasses: ['print'],
    requireAuth: true,
    resolve: {
      countries : function(profileService) {
        return profileService.getCountries();
      },
      userData : function(profileService) {
        return profileService.getUserData().then(function(data) {
          return data;
        });
      },
      placesOperations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      protectedRoles : function(profileService) {
        return profileService.getProtectedRoles();
      }
    }
  }).
  when('/createaccount', {
    templateUrl: contactsId.sourcePath + '/partials/createAccount.html',
    controller: 'CreateAccountCtrl',
    requireAuth: true,
    resolve: {
      placesOperations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      userData : function(profileService) {
        var userdata = {},
            num,
            i,
            val;
        return profileService.getUserData().then(function(data) {
          if (!data || !data.profile || !data.contacts) {
            throw new Error('Your user data cannot be retrieved. Please sign in again.');
          }
          else{
            userdata.profile = data.profile;
            userdata.contacts = data.contacts;
            num = data.contacts.length;
            for (i = 0; i < num; i++) {
              val = data.contacts[i];
              // Find the user's global contact
              if (val && val.type && val.type === 'global') {
                userdata.global = val;
              }
            }
            return userdata;
          }
        });
      },
      globalProfileId : function(profileService) {
        return profileService.getUserData().then(function(data) {
          var num = data.contacts.length;
          for (var idx = 0; idx < num; idx++) {
            if (data.contacts[idx].type === 'global') {
              return data.contacts[idx]._id;
            }
          }
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

app.service("authService", function($location, $http, $q, $rootScope) {
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
    getAdminArea: getAdminArea,
    getRoles: getRoles,
    getProtectedRoles: getProtectedRoles
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

    if (!country_id) {
      promise = $q.defer();
      promise.resolve(null);
      return promise.promise;
    }
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

  function getRoles() {
    var promise;

    promise = $http({
      method: "get",
      url: contactsId.profilesBaseUrl + "/v0/app/data",
      params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
    })
    .then(handleSuccess, handleError).then(function(data) {
      return data.roles;
    });

    return promise;
  }

  function getProtectedRoles() {
    var promise;

    promise = $http({
      method: "get",
      url: contactsId.profilesBaseUrl + "/v0/app/data",
      params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
    })
    .then(handleSuccess, handleError).then(function(data) {
      return data.protectedRoles;
    });

    return promise;
  }

  // Returns true/false for whether the user has/doesn't have the specified
  // role. Assumes the user profile data is loaded.
  function hasRole(role, subrole, profile) {
    var matchString = (subrole && subrole.length) ? "^" + role + ":" + subrole + "$" : "^" + role;
      match = new RegExp(matchString),
      data = profile || cacheUserData;
    return (data && data.profile && data.profile.roles && data.profile.roles.length && data.profile.roles.reIndexOf(match) !== -1);
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

/**
 * Regular Expresion IndexOf for Arrays
 * This little addition to the Array prototype will iterate over array
 * and return the index of the first element which matches the provided
 * regular expresion.
 * Note: This will not match on objects.
 * @param  {RegEx}   rx The regular expression to test with. E.g. /-ba/gim
 * @return {Numeric} -1 means not found
 */
if (typeof Array.prototype.reIndexOf === 'undefined') {
  Array.prototype.reIndexOf = function (rx) {
    for (var i in this) {
      if (this[i].toString().match(rx)) {
        return i;
      }
    }
    return -1;
  };
}

}(jQuery, angular, window.contactsId));
