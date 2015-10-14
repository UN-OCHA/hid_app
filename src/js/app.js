(function($, angular, contactsId, Offline) {
// Initialize ng
var app = angular.module('contactsId', ['ngAnimate', 'ngRoute', 'ngSanitize', 'cgBusy', 'gettext', 'ui.select', 'breakpointApp', 'angular-spinkit', 'internationalPhoneNumber', 'angular-inview', 'ngDialog', 'angular-md5']);

webshims.setOptions({
   waitReady: false,
   basePath: './libraries/webshim/js-webshim/minified/shims/'
});

webshim.polyfill('forms forms-ext');

Offline.options = {
  checkOnLoad: true,
  interceptRequests: false,
  reconnect: false,
  // reconnect: {
  //   initialDelay: 30,
  //   delay: 60
  // },
  requests: false //record ajax requests and re-make on connection restore
}

if (window.applicationCache){
  window.applicationCache.addEventListener('updateready', function(e){
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY){
      setTimeout(function(){
        window.location.reload();
      },500);
    }
  }, false);
}

app.value('cgBusyDefaults',{
  message:'Loading...',
  backdrop: true,
  templateUrl: contactsId.sourcePath + '/partials/busy.html',
  delay: 0,
  minDuration: 300
});

app.run(function ($rootScope, $location, $window, $timeout, authService) {

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

app.run(function ($rootScope, $timeout, profileService){
  
  function cacheLists() {
    var cached = false;
    return function(forceCache) {
      if (cached && !forceCache){
        return;
      }
      console.log('Starting caching for custom contact lists');

      //cache global profile
      profileService.cacheLists().then(function(profileData){
        if (profileData && profileData.status && profileData.status === 'ok' && profileData.lists && profileData.lists.length > 0){

          //cache list details for each list in profile
          angular.forEach(profileData.lists, function(list, index){
            var terms = {};
            terms.contactList = true;
            terms.limit = 30; //api still returns all objects without limit
            terms.locationId = 'contacts';
            terms.skip = 0;
            terms.status = 1;
            terms.sort = 'name'; //default sort

            terms.id = list._id;

            //cache each contact in list
            profileService.cacheLists(terms).then(function(listData){
              if (listData && listData.status && listData.status === 'ok' && listData.lists.contacts && listData.lists.contacts.length > 0) {
                angular.forEach(listData.lists.contacts, function(contact, index){
                  $timeout(function(){
                    profileService.cacheProfiles({contactId: contact._id});
                  },200);
                });
              }
            });
          });
        }
       });
      cached = true;
      console.log('Finished making requests for custom contact lists');
    }

  }

  $rootScope.cacheCustomLists = cacheLists();

  $rootScope.isOffline = function(){
    return (Offline.state === 'down');
  }

  $rootScope.$watch(function(){
    return Offline.state;
  }, function(newValue, oldValue){
    if (newValue === "up" && oldValue === "down"){
      console.log('Caching custom lists after restoring network');
      $rootScope.cacheCustomLists(true);
    }
  })

});

app.controller("AboutCtrl", ["$scope", AboutCtrl]);
app.controller("ContactCtrl", ["$scope", "$route", "$routeParams", "$filter", "profileService", "gettextCatalog", "userData", "protectedRoles", "profileData", "ngDialog", "md5", ContactCtrl]);
app.controller("CreateAccountCtrl", ["$scope", "$location", "$route", "$http", "profileService", "authService", "operations", "globalProfileId", "userData", "gettextCatalog", "countries", CreateAccountCtrl]);
app.controller("DashboardCtrl", ["$scope", "$route", "$filter", "$window", "$location","$timeout", "profileService", "globalProfileId", "userData", "operations", DashboardCtrl]);
app.controller("DefaultCtrl", ["$location", "authService", DefaultCtrl]);
app.controller("404Ctrl", ["$scope", FourZeroFourCtrl]);
app.controller("NumbersCtrl", ["$scope", NumbersCtrl]);
app.controller("HeaderCtrl", ["$scope", "$rootScope", "$location", "profileService", "gettextCatalog", HeaderCtrl]);
app.controller("ListCtrl", ["$scope", "$route", "$routeParams", "$location", "$http", "$filter", "authService", "profileService", "userData", "operations", "gettextCatalog", "protectedRoles", "orgTypes", "countries", "roles", "ngDialog", ListCtrl]);
app.controller("LoginCtrl", ["$scope", "$location", "$routeParams", "authService", "profileService", LoginCtrl]);
app.controller("LogoutCtrl", ["$scope", "authService", LogoutCtrl]);
app.controller("ProfileCtrl", ["$scope", "$location", "$route", "$routeParams", "$filter", "$timeout", "$http", "profileService", "authService", "operations", "profileData", "countries", "roles", "protectedRoles", "gettextCatalog", "userData", "md5", ProfileCtrl]);
app.controller("RegisterCtrl", ["$scope", RegisterCtrl]);
app.controller("AddToCustomListCtrl", ["$scope", "profileService", AddToCustomListCtrl]);
app.controller("CustomListSettingsCtrl", ["$scope", "$route", "$location", "$http", "authService", "profileService", "list", "gettextCatalog", "ngDialog", CustomListSettingsCtrl]);


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
  when('/numbers', {
    templateUrl: contactsId.sourcePath + '/partials/numbers.html',
    controller: 'NumbersCtrl'
  }).
  when('/dashboard', {
    templateUrl: contactsId.sourcePath + '/partials/dashboard.html',
    controller: 'DashboardCtrl',
    requireAuth: true,
    resolve: {
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
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
        profileService.clearData();
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
      countries : function(profileService) {
        return profileService.getCountries();
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
  when('/settings/list/:listId', {
    templateUrl: contactsId.sourcePath + '/partials/settingsList.html',
    controller: 'CustomListSettingsCtrl',
    requireAuth: true,
    resolve: {
      userData : function(profileService) {
        return profileService.getUserData().then(function(data) {
          return data;
        });
      },
      list : function(profileService, $route) {
        return profileService.getLists({id: $route.current.params.listId}).then(function(data) {
          if (data && data.lists && data.status === 'ok') {
            return data.lists;
          } else {
            throw new Error('The custom contact list could not be found.');
          }
        });
      },
      routeAccess : function() {
        return function(locals) {
          var checkEditor = [];
          // Make sure user is not an editor of a list
          if (locals.list.editors && locals.list.editors.length) {
            checkEditor = locals.list.editors.filter(function (value) {
              if (value._id == locals.userData.profile._id) {
                return value;
              }
            });
          }
          if (locals.userData.profile.userid === locals.list.userid || checkEditor.length) {
            return true;
          }
          else {
            return false;
          }
        };
      }
    }
  }).
  when('/offline', {
    templateUrl: contactsId.sourcePath + '/partials/offline.html'
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

}(jQuery, angular, window.contactsId, window.Offline));
