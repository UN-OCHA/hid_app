
(function($, angular, contactsId) {

var jso,
  app;

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
app = angular.module('contactsId', ['ngAnimate', 'ngRoute', 'ngSanitize', 'cgBusy', 'gettext', 'ui.select', 'breakpointApp', 'angular-spinkit', 'internationalPhoneNumber', 'angular-inview']);

app.value('cgBusyDefaults',{
  message:'Loading...',
  backdrop: true,
  templateUrl: contactsId.sourcePath + '/partials/busy.html',
  delay: 0,
  minDuration: 300
});

app.directive('routeLoadingIndicator', function($rootScope, gettextCatalog) {
  return {
    restrict: 'E',
    templateUrl: contactsId.sourcePath + '/partials/loading.html',
    replace: true,
    link: function(scope, elem, attrs) {
      scope.isRouteLoading = false;
      scope.loadingMessage = gettextCatalog.getString('Loading...');
      $rootScope.$on('$routeChangeStart', function(event, nextRoute, currentRoute) {
        var nextPath = nextRoute.$$route.originalPath;
        if(nextPath !== currentRoute.$$route.originalPath) {
          if (nextPath === '/login' || nextPath === '/login/:redirectPath*' || nextPath === '/logout' || nextPath === '/register') {
            scope.loadingMessage = gettextCatalog.getString('Redirecting to authentication system...');
          }
          scope.isRouteLoading = true;
        }
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
      $location.search('redirectPath', $location.path());
      $location.path('/login');
    }
    if (nextRoute && nextRoute.bodyClasses) {
      $rootScope.bodyClasses = nextRoute.bodyClasses;
    }
  });

  $rootScope.$on("$routeChangeSuccess", function(event, nextRoute, currentRoute) {
    // Ensure your on the top of the page.
    window.scrollTo(0,0);

    // Check if route has access control.
    if (nextRoute.locals.hasOwnProperty('routeAccess')) {
      // If access check requires resovle to complete a function is passed.
      // Otherwise boolean is passed.
      var access = (typeof nextRoute.locals.routeAccess !== 'function') ? nextRoute.locals.routeAccess : nextRoute.locals.routeAccess(nextRoute.locals),
          // Allow routeAccess to send a redirect if needed.
          redirect = (typeof access !== 'boolean') ? access : '/dashboard';

      if (!access || typeof access !== 'boolean') {
        $location.path(redirect).replace();
      };
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
  var redirectPath = $routeParams.redirectPath || '';

  // Get the access token. If one in the browser cache is not found, then
  // redirect to the auth system for the user to login.
  authService.verify(function (err) {
    if (!err && authService.isAuthenticated()) {
      profileService.getUserData().then(function(data) {
        $location.path(redirectPath.length ? redirectPath : '/dashboard').replace();
        $location.search('redirectPath', null);
      });
    }
    else {
      authService.logout(true);
      window.location.href = contactsId.appBaseUrl + '/#/login' + redirectPath;
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

  $scope.userCanCreateAccount = profileService.canCreateAccount();

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
      else if ($scope.ghostWarning) {
        // Have already seen ghost warning and want to cont.
        $scope.createAccount();
      }
      else {
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
        if (isGhost){
          $scope.confirmTitle = gettextCatalog.getString("Name added to the list");
          $scope.confirmMessage = name + " " + gettextCatalog.getString("will be added to the contact list.  They will not be able to claim their account.");
        }
        else{
          $scope.confirmTitle = gettextCatalog.getString("Account Created!");
          $scope.confirmMessage = name + " " + gettextCatalog.getString("will receive an email to claim their account.");
        }
        $scope.editButtonText = gettextCatalog.getString('Edit New Account');
        $scope.editPath = '#/contact/' + data._id;
        $scope.accountConfirm = true;
        $scope.ghostWarning = false;
      }
      else {
        //If contact already exists and it was successfully returned, give the user the option to edit the contact
        if (data.contactExists && data.origContact){
          $scope.editContactId = data.origContact._profile;
          $scope.confirmTitle = gettextCatalog.getString("Contact already exists");
          $scope.confirmMessage = gettextCatalog.getString("There is already an account associated with ") + profile.email[0].address + "\n\n" + gettextCatalog.getString("Would you like to check them in?");
          $scope.editButtonText = gettextCatalog.getString('Check-in');
          $scope.editPath = '#/checkin/' + data.origContact._profile;
          $scope.accountConfirm = true;
          $scope.ghostWarning = false;
        }
        else{
          var msg = (data && data.message) ? 'Error: ' + data.message : 'An error occurred while attempting to save this profile. Please try again or contact an administrator.';
          alert(msg);
        }
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

app.controller("ProfileCtrl", function($scope, $location, $route, $routeParams, $filter, $timeout, $http, profileService, authService, placesOperations, profileData, countries, roles, protectedRoles, gettextCatalog, userData) {
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

  // Set to 0 to checkout user.
  $scope.status = 1;

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
      setPreferedCountries();
      setPermissions();
      // Scoll to top of form.
      window.scrollTo(0,0);
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
    setPermissions();
  }
  else if (!checkinFlow) {
    // If editing the global profile for the first time, add messaging.
    $scope.profile.type = 'global';
    // Set permissions at same time.
    setPermissions();
  }

  // Add the given and family name from the auth service as a default value.
  if ((!$scope.profile.nameGiven || !$scope.profile.nameGiven.length) && (!$scope.profile.nameFamily || !$scope.profile.nameFamily.length)) {
    $scope.profile.nameGiven = accountData.name_given || '';
    $scope.profile.nameFamily = accountData.name_family || '';
  }

  // Add email from the auth service as a default value.
  // Only when editing the global profile for first time.
  if ((!$scope.profile.email || !$scope.profile.email.length) && $scope.profile.type === 'global' && !$scope.profileId) {
    $scope.profile.email = [{address: accountData.email}];
  }

  // Now we have a profile, use the profile's country to fetch regions and cities
  if ($scope.profile.address) {
    if (!$scope.profile.address.length || !$scope.profile.address[0].hasOwnProperty('country')) {
      $scope.profile.address = [];
      $scope.profile.address[0] = {country: $scope.selectedPlace};
    }
    $scope.addressList = {};
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
      $scope.addressList.regions = data;
      // If we already have an administrative area set, we should also populate the cities for
      // autocomplete
      if ($scope.profile.address[0].hasOwnProperty('administrative_area')) {
        angular.forEach($scope.regions, function(value, key) {
          if (value.name === $scope.profile.address[0].administrative_area) {
            $scope.localities = value.cities;
            $scope.addressList.localities = value.cities;
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

  $scope.httpCheck = function () {
    var validObj = $scope.defaultValidObj('uri', this.$index);
    if (validObj.$invalid && validObj.$viewValue.search(/^http[s]?\:\/\//) === -1) {
      $scope.profile.uri[this.$index] = 'http://' + validObj.$viewValue;
    }
  }

  $scope.vaildFieldEntry = function(field, el) {
    if (multiFields.hasOwnProperty(field) && multiFields[field].length) {
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

  $scope.checkMultiFields = function (excludeExtras) {
    // Special treatment for voip & uri.
    if (!excludeExtras && (!$scope.profile.voip[0] || $scope.profile.voip[0].type !== 'Skype')) {
      // Add Default Skype entry.
      $scope.profile.voip.unshift({type: 'Skype', number: "_BYPASS"});
    }
    else if (excludeExtras && $scope.profile.voip[0] && !$scope.profile.voip[0].number) {
      // Remove Default Skype entry before save if blank.
      $scope.profile.voip[0] = "";
    }

    // Regular multifield validation.
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

    // Remove validation bypass for default skype entry.
    if (!excludeExtras && $scope.profile.voip[0].number == "_BYPASS") {
      $scope.profile.voip[0].number = "";
    }
  };

  // Add extra blank fields when editing a profile
  if (!checkinFlow) {
    $scope.checkMultiFields();
  }

  $scope.checkEntryValidation = function(field, index) {
    index = typeof index === 'undefined' ? this.$index : index;
    var isValid = $scope.checkMultiRequireFields(field, $scope.profile[field][index]);

    $scope.defaultValidObj(field, index).$setValidity('multiField', isValid);
  }

  // Helper used in partial.
  $scope.defaultValidObj = function(field, index) {
    index = typeof index === 'undefined' ? this.$index : index;
    switch (field) {
      case 'uri':
        return $scope.profileForm[(field + '[' + index + ']')];
      case 'email':
        return $scope.profileForm[(field + '[' + index + '][address]')];
      default:
        return $scope.profileForm[(field + '[' + index + '][number]')];
    }
  }

  // Prevents adding of field if when invalid entry.
  $scope.checkForValidEntry = function(field, index) {
    return ( $scope.profile[field]
          && $scope.profile[field][index]
          && $scope.vaildFieldEntry(field, $scope.profile[field][index]));
  }

  $scope.changeFieldEntries = function(field) {
    var validEntry = $scope.checkForValidEntry(field, this.$index);
    if (this.$last && validEntry) {
      // Add new field.
      $scope.profile[field].push("");
    }
    else if(this.$last){
      // Focus on field.
      this.focus = true;
    }
    else {
      // Remove new field.
      $scope.profile[field].splice(this.$index, 1);
    }
  }

  $scope.styleFieldEntries = function(field) {
    var validEntry = $scope.checkForValidEntry(field, this.$index);
    if (this.$last && validEntry) {
      return 'fa-plus';
    }
    else if (this.$last) {
      return 'fa-pencil';
    }
    else {
      return 'fa-remove';
    }
  }

  $scope.selectOperation = function() {
    $scope.selectedOperation = this.opid;
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


  $scope.refreshOrganization = function(select, lengthReq) {
    var clearOption = {action:'clear', name:"", alt: gettextCatalog.getString('Organizations')},
        helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
        emptyOption = {action:'clear', name:"", alt: gettextCatalog.getString('No results found.'), disable: true};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      select.searching = true;

      $http.get($scope.hrinfoBaseUrl + '/hid/organizations/autocomplete/' + encodeURIComponent(select.search))
        .then(function(response) {
          select.searching = false;
          $scope.organizations = [];
          angular.forEach(response.data, function(value, key) {
            this.push({'name': value, 'remote_id': key});
          }, $scope.organizations);

          if ($scope.organizations.length) {
            $scope.organizations.unshift(clearOption);
          }
          else {
            $scope.organizations.push(emptyOption);
          }
        });
    }
    else {
      $scope.organizations = []
      if (typeof $scope.profile.organization !== 'undefined' && $scope.profile.organization.length) {
        $scope.organizations.push(clearOption);
      }
      $scope.organizations.push(helpOption);
    }
  };

  $scope.selectOrg = function(item) {
    $scope.profile.organization = item.action === "clear" ? [] : [item];
  }

  $scope.refreshAddress = function(select, prop) {
    if(select) {
      var clearOption = {action:'clear', name:""},
          filter = select.$filter('filter');

      $scope.addressList[prop] = filter($scope[prop], select.search);

      if (select.selected) {
        switch (prop) {
          case 'countries':
            clearOption.alt = gettextCatalog.getString('Country');
            break;
          case 'regions':
            clearOption.alt = gettextCatalog.getString('Region');
            break;
          case 'localities':
            clearOption.alt = gettextCatalog.getString('Locality');
            break;
        }
        $scope.addressList[prop].unshift(clearOption);
      }
    }
  }

  $scope.selectAddress = function(item, prop) {
    var altProp = 'localities';
    $scope.profile.address = $scope.profile.address || [];
    $scope.profile.address[0] = $scope.profile.address[0] || {};

    if (item.action === "clear") {
      switch (prop) {
        case 'country':
          $scope.profile.address = [];
          break;
        case 'administrative_area':
          $scope.profile.address[0].administrative_area = null;
          $scope.localities = [];
        case 'locality':
          $scope.profile.address[0].locality = null;
      }
    }
    else {
      switch (prop) {
        case 'country':
          altProp = 'countries';
          $scope.regionsPromise = profileService.getAdminArea(item.remote_id).then(function(data) {
            $scope.regions = data;
            $scope.addressList.regions = data;
          });
          $scope.profile.address[0].administrative_area = null;
          $scope.profile.address[0].locality = null;
          $scope.localities = [];
          $scope.addressList.localities = [];
          break;
        case 'administrative_area':
          altProp = 'regions';
          $scope.localities = item.cities;
          $scope.addressList.localities = item.cities;
          $scope.profile.address[0].locality = null;
          break;
      }
      $scope.profile.address[0][prop] = item.name;
      $scope.refreshAddress(this.$select, altProp);
    }
  }

  // Update submit text when changing language.
  $scope.submitText = function() {
    if ($scope.profile.type === 'global') {
      return gettextCatalog.getString('Update Profile');
    }
    else if (!checkinFlow) {
      return gettextCatalog.getString('Update Check-in')
    }
    else {
      return gettextCatalog.getString('Check-in')
    }
  }

  // Update submit text when changing language.
  $scope.cancelText = function() {
    if ($scope.profile.type === 'global') {
      return gettextCatalog.getString('Cancel Profile Update');
    }
    else if (!checkinFlow) {
      return gettextCatalog.getString('Cancel Check-in Update')
    }
    else {
      return gettextCatalog.getString('Cancel Check-in')
    }
  }

  // Update profile name text when changing language.
  $scope.profileName = function() {
    if ($scope.profile.type === 'global') {
      return gettextCatalog.getString('Global');
    }
    else if (!$scope.profile.location && $scope.selectedPlace && $scope.selectedOperation) {
      return $scope.placesOperations[$scope.selectedPlace][$scope.selectedOperation].name
    }
    else {
      return $scope.profile.location;
    }
  }
  // Used in translating select options.
  $scope.translate = function(str) {
    return gettextCatalog.getString(str);
  };

  // Text for alerts.
  $scope.alertField = function(name) {
    name = name.split(/[[\]]/);
    var entryNum = typeof name[1] === 'undefined' ? ': ' : ' ' + (parseInt(name[1])+1) + ': ';
    switch (name[0]) {
      case 'nameGiven':
        name = gettextCatalog.getString('Given Name');
        break;
      case 'nameFamily':
        name = gettextCatalog.getString('Family Name');
        break;
      case 'phone':
        name = gettextCatalog.getString('Phone Number entry');
        break;
      case 'voip':
        name = gettextCatalog.getString('Instant Messenger entry');
        break;
      case 'email':
        name = gettextCatalog.getString('Email Address entry');
        break;
      case 'uri':
        name = gettextCatalog.getString('Websites & Social Media entry');
        break;
    }
    return name + entryNum;
  }

  $scope.alertMsg = function(type) {
    switch (type) {
      case 'required':
        return gettextCatalog.getString("Field is required.");
      case 'international-phone-number':
        return gettextCatalog.getString("Invalid phone number.");
      case 'multiField':
        return gettextCatalog.getString("Both type and number are required.");
      default:
        return gettextCatalog.getString("Invalid entry.");
    }
  }

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
    // Special treatment for voip.
    if ($scope.profile.voip[0] && !$scope.profile.voip[0].number) {
      // Remove Default Skype entry before save if blank.
      $scope.profile.voip[0] = "";
      $scope.checkEntryValidation('voip', 0);
    }

    // Checks for incomplete entries.
    if ($scope.profileForm.$valid) {
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

      if ($scope.userCanEditVerified) {
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

  $scope.deleteAccount = function () {
    var userid = profileData.profile.userid || profileData.profile._userid;
    profileService.deleteProfile(userid).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        profileService.clearData();
        // Unreliable to know where user was so try to send them back.
        $scope.back();
      }
      else {
        alert(data.message || 'error');
      }
    });
  };

  $scope.sendClaimEmail = function () {
    if (profileData.contact.email && profileData.contact.email[0] && profileData.contact.email[0].address && String(profileData.contact.email[0].address).length) {
      $scope.sendingClaimEmail = true;
      var adminName = userData.global.nameGiven + " " + userData.global.nameFamily;
      profileService.requestClaimEmail(profileData.contact.email[0].address, adminName).then(function(data) {
        $scope.sendingClaimEmail = false;
        $scope.confirmSendEmail = false;
        if (data.status === 'ok') {
          alert('Account claim email sent successfully.');
        }
        else {
          alert('An error occurred while attempting to send the account claim email. Please try again or contact an administrator.');
        }
      });
    }
  };

  $scope.checkOut = function () {
    if ($scope.userCanCheckOut) {
      var contact = {
        _id: profileData.contact._id,
        _profile: profileData.contact._profile,
        userid:  profileData.profile.userid,
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

  function setPermissions() {
    var hasRoleAdmin = profileService.hasRole('admin');
    $scope.userCanEditRoles = profileService.canEditRoles(profileData) && profileData.profile._id !== userData.profile._id;
    $scope.userCanEditKeyContact = profileService.canEditKeyContact($scope.selectedOperation);
    $scope.userCanEditProtectedRoles = profileService.canEditProtectedRoles($scope.selectedOperation);
    $scope.userCanEditVerified = profileService.canEditVerified($scope.selectedOperation);
    $scope.userCanDeleteAccount = profileService.canDeleteAccount(profileData.profile);
    $scope.userCanCheckOut = !checkinFlow && profileData.contact && profileService.canCheckOut(profileData.contact);
    $scope.userCanSendClaimEmail = !checkinFlow && profileData.contact && profileService.canSendClaimEmail(profileData.contact);
    $scope.userCanRequestDelete = $scope.profile.type === 'global' && (typeof $routeParams.profileId === 'undefined' || userData.profile._id === profileData.profile._id);

    // Determine what roles are available to assign to a user
    if ($scope.userCanEditRoles && hasRoleAdmin) {
      // You're an admin and can assign any role
      $scope.adminRoleOptions = roles;
    }
    else if ($scope.userCanEditRoles) {
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
    else {
      // For users who only have editor roles.
      for (var i in $scope.adminRoles) {
        if ($scope.adminRoles.hasOwnProperty(i)) {
          var roleData = roleInArray($scope.adminRoles[i], roles);
          if (roleData) {
            $scope.adminRoleOptions.push(roleData);
          }
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

  // Permissions
  var isOwnProfile = userData.profile._id === contact._profile._id;
  $scope.userCanEditProfile = isOwnProfile || profileService.canEditProfile(contact.locationId);
  $scope.userCanCheckIn = profileService.canCheckIn(contact._profile);
  $scope.userCanCheckOut = profileService.canCheckOut(contact);
  // Allow sending an orphan user claim email if the user has not made an edit
  // on HID, the contact has an email address (is not a ghost), and the actor
  // is an admin or a manager/editor in the location of this contact.
  $scope.userCanSendClaimEmail = profileService.canSendClaimEmail(contact);


  var roleFilter = $filter('filter');
  $scope.contact.protectedRolesByName = [];
  angular.forEach($scope.contact.protectedRoles, function(value, key) {
    var role = roleFilter(protectedRoles,function(d) { return d.id === value;})[0].name;
    this.push(role);
  }, $scope.contact.protectedRolesByName);

  $scope.locationText = function() {
    return $scope.contact.location || gettextCatalog.getString('Global');
  }

  $scope.setHttp = function (uri) {
    if (uri.search(/^http[s]?\:\/\//) == -1) {
        uri = 'http://' + uri;
    }
    return uri;
  }

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
        locationName: $scope.locationText()
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

  $scope.sendClaimEmail = function () {
    if (contact.email && contact.email[0] && contact.email[0].address && String(contact.email[0].address).length) {
      $scope.sendingClaimEmail = true;
      var adminName = userData.global.nameGiven + " " + userData.global.nameFamily;
      profileService.requestClaimEmail(contact.email[0].address, adminName).then(function(data) {
        $scope.sendingClaimEmail = false;
        $scope.confirmSendEmail = false;
        if (data.status === 'ok') {
          alert('Account claim email sent successfully.');
        }
        else {
          alert('An error occurred while attempting to send the account claim email. Please try again or contact an administrator.');
        }
      });
    }
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

  // Create protected roles array.
  $scope.protectedRoles = protectedRoles;
  $scope.protectedRoles.unshift({action:'clear', name:"", id:"", alt:'Role'});


  $scope.contactInit = function() {
    var isOwn = userData.profile._id === this.contact._profile._id;
    // Create an obj for quicklink vars.
    this.contact.ql = {
      isOwn:                  isOwn,
      keyContact:             this.contact.keyContact,
      verified:               this.contact._profile.verified,
      userCanEditProfile:     isOwn || profileService.canEditProfile($scope.locationId),
      userCanCheckIn:         profileService.canCheckIn(this.contact._profile, userData),
      userCanCheckOut:        profileService.canCheckOut(this.contact, userData),
      userCanSendClaimEmail:  profileService.canSendClaimEmail(this.contact),
      userCanEditKeyContact:  profileService.canEditKeyContact($scope.locationId),
      userCanEditVerified:    profileService.canEditVerified($scope.locationId),
      userCanDeleteAccount:   profileService.canDeleteAccount(this.contact._profile)
    }
  }

  $scope.showQuickLinks = function(contact) {
    return contact.ql.userCanEditProfile || contact.ql.userCanCheckIn || contact.ql.userCanCheckOut || contact.ql.userCanSendClaimEmail || contact.ql.userCanDeleteAccount;
  }
  // On moblie quicklinks toggle on click, not hover.
  $scope.qlClick = function() {
    $scope.qlOpen = $scope.qlOpen === this.$index ? -1 : this.$index;
  }

  $scope.checkOut = function (contact) {
    if(!contact.ql.userCanCheckOut) {
      return;
    }
    else if (contact.ql.checkOutState === "confirm") {
      var cont = {
        _id: contact._id,
        _profile: contact._profile._id,
        userid: contact._profile.userid,
        status: 0
      };

      //Determine if user being checked out is the same as the logged in user
      //If not, we need to add some properties to contact so profile service can send an email notifying the user
      if (!contact.ql.isOwn && contact.email[0]){
        //Set email fields
        var userGlobal = filter(userData.contacts, function(d) {return d.type === 'global'}),
            email = {
              type: 'notify_checkout',
              recipientFirstName: contact.nameGiven,
              recipientLastName: contact.nameFamily,
              recipientEmail: contact.email[0].address,
              adminName: userGlobal[0].nameGiven + " " + userGlobal[0].nameFamily,
              locationName: $scope.locationText()
            };

        cont.notifyEmail = email;
      }
      contact.ql.checkOutState = 'inProgress';
      profileService.saveContact(cont).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          profileService.clearData();
          $route.reload();
        }
        else {
          alert('error');
        }
      });

    }
    else if (typeof contact.ql.checkOutState === "undefined") {
      contact.ql.checkOutState = "confirm";
    }
  };

  $scope.updateProfile = function (contact, field) {
    var access = field === 'verified' ?  contact.ql.userCanEditVerified : contact.ql.userCanEditKeyContact,
        stateKey = field + 'State';
    if (access) {
      if (contact.ql[stateKey] === 'confirm') {
        contact.userid = contact._profile._userid;
        contact._profile = contact._profile._id;

        contact[field] = contact.ql[field];
        contact.ql[stateKey] = 'inProgress';
        profileService.saveContact(contact).then(function(data) {
          if (data && data.status && data.status === 'ok') {
            profileService.clearData();
            $route.reload();
          }
          else {
            alert('error');
          }
        });
      }
      else if (typeof contact.ql[stateKey] === 'undefined') {
        contact.ql[stateKey] = 'confirm';
        contact.ql[field] = !contact.ql[field];
      }
    }
  }

  $scope.deleteAccount = function (contact) {
    if (contact.ql.deleteState === "confirm") {
      var userid = contact._profile.userid || contact._profile._userid;
      contact.ql.deleteState = "inProgress";
      profileService.deleteProfile(userid).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          profileService.clearData();
          $route.reload();
        }
        else {
          alert('error');
        }
      });
    }
    else if (typeof contact.ql.deleteState === "undefined") {
      contact.ql.deleteState = "confirm";
    }
  };

  $scope.sendClaimEmail = function (contact) {
    if (contact.email && contact.email[0] && contact.email[0].address && String(contact.email[0].address).length) {
      if (contact.ql.orphanState === 'confirm') {
        var userGlobal = filter(userData.contacts, function(d) {return d.type === 'global'}),
            adminName = userGlobal[0].nameGiven + " " + userGlobal[0].nameFamily;

        contact.ql.orphanState = 'inProgress';
        profileService.requestClaimEmail(contact.email[0].address, adminName).then(function(data) {
          if (data.status === 'ok') {
            contact.ql.orphanState = 'complete';
            console.info('Account claim email sent successfully.');
          }
          else {
            alert('An error occurred while attempting to send the account claim email. Please try again or contact an administrator.');
          }
        });
      }
      else if (typeof contact.ql.orphanState === 'undefined'){
        contact.ql.orphanState = 'confirm';
      }
    }
  };

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

  $scope.openPrint = function() {
    window.open($scope.printUrl, $location.path(), 'width=1000, height=600, menubar=1, resizable=1, scrollbars=1, status=1, toolbar=1');
  }

  $scope.openPDF = function() {
    var query = $scope.query;
    query.access_token = authService.getAccessToken();
    query.export = 'pdf';
    query.limit = 0;
    query.skip = 0;
    window.open(contactsId.profilesBaseUrl + "/v0/contact/view?" + jQuery.param(query), 'hidAppPDF');
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

  $scope.locationText = function() {
    return $scope.location || gettextCatalog.getString('Global');
  }

  $scope.orphanText = function(contact) {
    switch (contact.ql.orphanState) {
      case "confirm":
        return gettextCatalog.getString("Are you sure?");
      case "inProgress":
        return gettextCatalog.getString("Sending...");
      case "complete":
        return gettextCatalog.getString("Reminder sent");
      default:
        return  gettextCatalog.getString("Remind Orphan");
    }
  }

  $scope.checkOutText = function(contact) {
    switch (contact.ql.checkOutState) {
      case "confirm":
        return gettextCatalog.getString("Are you sure?");
      case "inProgress":
        return gettextCatalog.getString("Checking-out...");
      default:
        return gettextCatalog.getString("Check-out");
    }
  }

  $scope.keyContactText = function(contact) {
    switch (contact.ql.keyContactState) {
      case "confirm":
        return gettextCatalog.getString("Are you sure?");
      case "inProgress":
        return gettextCatalog.getString("Saving...");
      default:
        return contact.ql.keyContact ? gettextCatalog.getString("Unassign key contact") : gettextCatalog.getString("Assign key contact");
    }
  }

  $scope.verifiedText = function(contact) {
    switch (contact.ql.verifiedState) {
      case "confirm":
        return gettextCatalog.getString("Are you sure?");
      case "inProgress":
        return gettextCatalog.getString("Saving...");
      default:
        return contact.ql.verified ? gettextCatalog.getString("Unverify account") : gettextCatalog.getString("Verify account");
    }
  }

  $scope.deleteText = function(contact) {
    switch (contact.ql.deleteState) {
      case "confirm":
        return gettextCatalog.getString("Are you sure?");
      case "inProgress":
        return gettextCatalog.getString("Deleting...");
      default:
        return gettextCatalog.getString("Delete account");
    }
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
    template: '',
    controller: 'LoginCtrl'
  }).
  when('/login/:redirectPath*', {
    template: '',
    controller: 'LoginCtrl'
  }).
  when('/logout', {
    template: '',
    controller: 'LogoutCtrl'
  }).
  when('/register', {
    template: '',
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
      },
      routeAccess : function(profileService) {
        return function(locals) {
          return profileService.canCheckIn(locals.profileData.profile);
        };
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
      },
      routeAccess : function(profileService, $routeParams) {
        return function(locals) {
          if (typeof $routeParams.profileId === 'undefined') {
            var redirect = null;
            angular.forEach(locals.userData.contacts, function(contact) {
              if (contact.type === 'global') {
                redirect = "/profile/" + contact._id;
              }
            });
            return redirect || true;
          }
          var profile = locals.profileData.contact,
              hasRole = profileService.canEditProfile((profile ? profile.locationId : null)),
              isOwnProfile = profile._profile === locals.userData.profile._id;

          return (hasRole || isOwnProfile);
        };
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
      },
      routeAccess : function(profileService) {
        return profileService.canCreateAccount();
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
      cacheOperationsData = false,
      cacheRolesData = false,
      cacheProtectedRolesData = false;

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
    deleteProfile: deleteProfile,
    saveContact: saveContact,
    requestClaimEmail: requestClaimEmail,
    hasRole: hasRole,
    getCountries: getCountries,
    getAdminArea: getAdminArea,
    getRoles: getRoles,
    getProtectedRoles: getProtectedRoles,
    canEditProfile: canEditProfile,
    canEditRoles: canEditRoles,
    canEditProtectedRoles: canEditProtectedRoles,
    canEditKeyContact: canEditKeyContact,
    canEditVerified: canEditVerified,
    canCreateAccount: canCreateAccount,
    canCheckIn: canCheckIn,
    canCheckOut: canCheckOut,
    canSendClaimEmail: canSendClaimEmail,
    canDeleteAccount: canDeleteAccount
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
    cacheRolesData = false;
    cacheProtectedRolesData = false;
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

  // Delete (disable) a profile
  function deleteProfile(userId) {
    var request,
      data = {
        userId: userId,
      };
    request = $http({
      method: "post",
      url: contactsId.profilesBaseUrl + "/v0/profile/delete",
      params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
      data: data
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

  // Request a claim account email.
  function requestClaimEmail(email, adminName) {
    var request,
      data = {
        email: email,
        emailFlag: "claim",
        adminName: adminName
      };
    request = $http({
      method: "post",
      url: contactsId.profilesBaseUrl + "/v0/contact/resetpw",
      params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
      data: data
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

    if (cacheRolesData) {
      promise = $q.defer();
      promise.resolve(cacheRolesData);
      return promise.promise;
    }
    else {
      promise = $http({
        method: "get",
        url: contactsId.profilesBaseUrl + "/v0/app/data",
        params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
      })
      .then(handleSuccess, handleError).then(function(data) {
        if (data && data.roles) {
          cacheRolesData = data.roles;
        }
        return cacheRolesData;
      });

      return promise;
    }
  }

  function getProtectedRoles() {
    var promise;

    if (cacheProtectedRolesData) {
      promise = $q.defer();
      promise.resolve(cacheProtectedRolesData);
      return promise.promise;
    }
    else {
      promise = $http({
        method: "get",
        url: contactsId.profilesBaseUrl + "/v0/app/data",
        params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
      })
      .then(handleSuccess, handleError).then(function(data) {
        if (data && data.protectedRoles) {
          cacheProtectedRolesData = data.protectedRoles;
        }
        return cacheProtectedRolesData;
      });

      return promise;
    }
  }

  // Returns true/false for whether the user has/doesn't have the specified
  // role. Assumes the user profile data is loaded.
  function hasRole(role, subrole, profile) {
    var matchString = (subrole && subrole.length) ? "^" + role + ":" + subrole + "$" : "^" + role;
      match = new RegExp(matchString),
      data = profile || cacheUserData;
    return (data && data.profile && data.profile.roles && data.profile.roles.length && data.profile.roles.reIndexOf(match) !== -1);
  }

  // Can edit other user's profile.
  function canEditProfile(locationId) {
    return hasRole('admin') || (locationId && (hasRole('manager', locationId) || hasRole('editor', locationId)));
  }

  // Can edit other user's roles.
  function canEditRoles(profileData) {
    var hasRoleAdmin = hasRole('admin'),
        hasRoleManager =  hasRole('manager');

    if (!hasRoleAdmin && !hasRoleManager) {
      // Need to be an Admin or Manager to edit roles.
      return false;
    }
    else if (hasRole('admin', null, profileData) && !hasRoleAdmin) {
      // Can not change roles of Admin if you are only a Manager.
      return false;
    }
    else {
      return true;
    }
  }
  // Can edit other user's protected roles.
  function canEditProtectedRoles(locationId) {
    return hasRole('admin') || (locationId && (hasRole('manager', locationId) || hasRole('editor', locationId)));
  }
  // Can edit other user's key contact.
  function canEditKeyContact(locationId) {
    return hasRole('admin') || (locationId && (hasRole('manager', locationId)));
  }
  // Can verify other user.
  function canEditVerified(locationId) {
    return hasRole('admin') || (locationId && (hasRole('manager', locationId) || hasRole('editor', locationId)));
  }
  // Can check-in other user.
  function canCheckIn(profile, user) {
    // Optionally pass user to check.
    user = typeof user !== 'undefined' ? user : cacheUserData;

    var isOwnProfile = (profile._id === user.profile._id),
        hasRightRole = hasRole('admin') || hasRole('manager') || hasRole('editor');

    return (isOwnProfile || hasRightRole);
  }
  // Can check-out profile.
  function canCheckOut(profile, user) {
    // Optionally pass user to check.
    user = typeof user !== 'undefined' ? user : cacheUserData;

    var isLocal = profile && profile.type === 'local',
        pid = typeof profile._profile === 'string' ? profile._profile : profile._profile._id,
        isOwnProfile = pid === user.profile._id,
        hasRightRole = (hasRole('admin') || (profile.locationId && (hasRole('manager', profile.locationId) || hasRole('editor', profile.locationId))));

    return (isLocal && (isOwnProfile || hasRightRole));
  }
  // Can create a ghost or orphan account.
  function canCreateAccount() {
    return (hasRole('admin') || hasRole('manager') || hasRole('editor'))
  }
  // Can send claim email to orphan user.
  function canSendClaimEmail(profile) {
    // Allow sending an orphan user claim email if the user has not made an edit
    // on HID, the contact has an email address (is not a ghost), and the actor
    // is an admin or a manager/editor in the location of this contact.
    var neverUpdated = (!profile._profile || !profile._profile.firstUpdate),
        hasEmail = (profile.email && profile.email[0] && profile.email[0].address && profile.email[0].address.length),
        hasRightRole = (hasRole('admin') || (profile.locationId && (hasRole('manager', profile.locationId) || hasRole('editor', profile.locationId))));

    return (neverUpdated && hasEmail && hasRightRole);
  }

  // Only admins not on their own profile
  // Can delete (disable) account
  function canDeleteAccount(profile) {
    var isOwnProfile = (typeof profile !== 'undefined') ? (profile._id === cacheUserData.profile._id) : false,
    hasRightRole = hasRole('admin');

    return (!isOwnProfile && hasRightRole);
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
