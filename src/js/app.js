(function($, angular, contactsId) {
// Initialize ng
var app = angular.module('contactsId', ['ngAnimate', 'ngRoute', 'ngSanitize', 'cgBusy', 'gettext', 'ui.select', 'breakpointApp', 'angular-spinkit', 'internationalPhoneNumber', 'angular-inview', 'ngDialog', 'angular-cache']);

webshims.setOptions({
   waitReady: false,
   basePath: './libraries/webshim/js-webshim/minified/shims/'
});

webshim.polyfill('forms forms-ext');

Offline.options = {
  // interceptRequests: true,
  reconnect: false,
  // reconnect: {
  //   initialDelay: 30,
  //   delay: 60
  // },
  requests: false //record ajax requests and re-make on connection restore
}

app.value('cgBusyDefaults',{
  message:'Loading...',
  backdrop: true,
  templateUrl: contactsId.sourcePath + '/partials/busy.html',
  delay: 0,
  minDuration: 300
});

app.run(function ($rootScope, $location, $window, $timeout, authService, $http, offlineCache) {
  $http.defaults.cache = offlineCache.getCacheFactory();

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

  //Polyfill needs update when dynamic view loads
  $rootScope.$on('$viewContentLoaded', function() {
    $timeout(function(){
      $('body').updatePolyfill();
    }, 100)
  });
});

app.controller("AboutCtrl", ["$scope", AboutCtrl]);
app.controller("ContactCtrl", ["$scope", "$route", "$routeParams", "$filter", "profileService", "gettextCatalog", "userData", "protectedRoles", "profileData", ContactCtrl]);
app.controller("CreateAccountCtrl", ["$scope", "$location", "$route", "$http", "profileService", "authService", "operations", "globalProfileId", "userData", "gettextCatalog", CreateAccountCtrl]);
app.controller("DashboardCtrl", ["$scope", "$route", "$filter", "$window", "profileService", "globalProfileId", "userData", DashboardCtrl]);
app.controller("DefaultCtrl", ["$location", "authService", DefaultCtrl]);
app.controller("404Ctrl", ["$scope", FourZeroFourCtrl]);
app.controller("HeaderCtrl", ["$scope", "$rootScope", "$location", "profileService", "gettextCatalog", HeaderCtrl]);
app.controller("ListCtrl", ["$scope", "$route", "$routeParams", "$location", "$http", "$filter", "authService", "profileService", "userData", "operations", "gettextCatalog", "protectedRoles", "orgTypes", "countries", "roles", "ngDialog", ListCtrl]);
app.controller("LoginCtrl", ["$scope", "$location", "$routeParams", "authService", "profileService", LoginCtrl]);
app.controller("LogoutCtrl", ["$scope", "authService", LogoutCtrl]);
app.controller("ProfileCtrl", ["$scope", "$location", "$route", "$routeParams", "$filter", "$timeout", "$http", "profileService", "authService", "operations", "profileData", "countries", "roles", "protectedRoles", "gettextCatalog", "userData", ProfileCtrl]);
app.controller("RegisterCtrl", ["$scope", RegisterCtrl]);


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
      operations : function(profileService) {
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
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      profileData : function(profileService, $route) {
        return profileService.getProfileData($route.current.params.profileId);
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
          else if (!locals.profileData.profile) {
            return false;
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
      profileData : function(profileService, $route) {
        return profileService.getProfileData($route.current.params.contactId);
      },
      routeAccess : function(profileService) {
        return function(locals) {
          return !!locals.profileData.contact;
        };
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
      roles : function(profileService) {
        return profileService.getRoles();
      },
      userData : function(profileService) {
        return profileService.getUserData().then(function(data) {
          return data;
        });
      },
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      protectedRoles : function(profileService) {
        return profileService.getProtectedRoles();
      },
      orgTypes : function(profileService) {
        return profileService.getOrgTypes();
      }
    }
  }).
  when('/createaccount', {
    templateUrl: contactsId.sourcePath + '/partials/createAccount.html',
    controller: 'CreateAccountCtrl',
    requireAuth: true,
    resolve: {
      operations : function(profileService) {
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