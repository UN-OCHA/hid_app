(function($, angular, contactsId, Offline) {
// Initialize ng
var app = angular.module('contactsId', ['ngAnimate', 'ngRoute', 'ngSanitize', 'cgBusy', 'gettext', 'ui.select', 'breakpointApp', 'angular-spinkit', 'internationalPhoneNumber', 'angular-inview', 'ngDialog', 'angular-md5', 'ui.bootstrap', 'angular-loading-bar', 'ngIOS9UIWebViewPatch', 'ngCsvImport', 'ngCsv', 'ngclipboard']);

//Access to the facebook SDK 
window.fbAsyncInit = function() {
  FB.init({
    appId      : '593963747410690',
    xfbml      : true,
    version    : 'v2.5'
  });
};

(function(d, s, id){
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = "//connect.facebook.net/en_US/sdk.js";
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));


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

app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider){
  cfpLoadingBarProvider.includeSpinner = false;
}]);

app.config(['$compileProvider', function ($compileProvider) {
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel):/);
}]);

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

app.run(function ($rootScope, $location, $timeout, profileService, flashService){
  
  function cacheLists() {
    var cached = false;
    return function(forceCache) {
      if (cached && !forceCache){
        return;
      }
      console.log('DEBUG: Started caching for custom contact lists');
      var cacheRequests = 0, cacheResponses=0;

      //cache global profile
      profileService.getUserData().then(function (userData) {
        if (userData) {
          profileService.cacheLists(userData.profile).then(function(profileData){
            if (profileData){

              //cache list details for each list in profile
              angular.forEach(profileData, function(list, listIndex){
                cacheRequests++;
                var terms = {};
                terms.contactList = true;
                terms.limit = 30; //api still returns all objects without limit
                terms.locationId = 'contacts';
                terms.skip = 0;
                terms.status = 1;
                terms.sort = 'name'; //default sort

                terms.id = list._id;

                //cache each contact in list
                profileService.cacheList(list._id).then(function(listData){
                  if (listData) {
                    profileService.cacheProfiles({id: listData._id}).then(function(){
                      cacheResponses++;
                    }, function() {
                      cacheResponses++;
                    });
                  }
                });
              });
            }
            $rootScope.isCaching = function(){
              return (cacheRequests - cacheResponses) > 2;
            }
         });
         cached = true;
       }
      });
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
      console.log('DEBUG: Caching custom lists after restoring network');
      $rootScope.cacheCustomLists(true);
    }
  })

  $rootScope.goBack = function(force){
    if (history.length && !force) {
      history.back();
    }
    else {
      $location.url('/dashboard');
    }
  }

  $rootScope.flash = flashService;

});

app.controller("AboutCtrl", ["$scope", AboutCtrl]);
app.controller("ContactCtrl", ["$scope", "$route", "$routeParams", "$filter", "profileService", "gettextCatalog", "userData", "protectedRoles", "profileData", "currentContact", "ngDialog", "md5", ContactCtrl]);
app.controller("CreateAccountCtrl", ["$scope", "$location", "$route", "$http", "profileService", "authService", "operations", "globalProfileId", "userData", "gettextCatalog", "countries", CreateAccountCtrl]);
app.controller("DashboardCtrl", ["$scope", "$route", "$filter", "$window", "$location","$timeout", "profileService", "globalProfileId", "userData", "operations", "ngDialog", "gettextCatalog", DashboardCtrl]);
app.controller("DefaultCtrl", ["$scope", "$location", "authService", DefaultCtrl]);
app.controller("404Ctrl", ["$scope", FourZeroFourCtrl]);
app.controller("NumbersCtrl", ["$scope", NumbersCtrl]);
app.controller("HeaderCtrl", ["$scope", "$rootScope", "$location", "profileService", "gettextCatalog", HeaderCtrl]);
app.controller("ListCtrl", ["$scope", "$route", "$routeParams", "$location", "$http", "$filter", "authService", "profileService", "userData", "operations", "gettextCatalog", "protectedRoles", "orgTypes", "countries", "roles", "ngDialog", ListCtrl]);
app.controller("ListsCtrl", ["$scope", "$location", "userData", "profileService", "gettextCatalog", "ngDialog", ListsCtrl]);
app.controller("LoginCtrl", ["$scope", "$location", "$routeParams", "authService", "profileService", LoginCtrl]);
app.controller("LogoutCtrl", ["$scope", "authService", LogoutCtrl]);
app.controller("ProfileCtrl", ["$scope", "$location", "$route", "$routeParams", "$filter", "$timeout", "$http", "profileService", "authService", "operations", "profileData", "countries", "roles", "protectedRoles", "gettextCatalog", "userData", "md5", 'ngDialog', ProfileCtrl]);
app.controller("RegisterCtrl", ["$scope", RegisterCtrl]);
app.controller("AddToCustomListCtrl", ["$scope", "profileService", AddToCustomListCtrl]);
app.controller("AddProtectedRolesCtrl", ["$scope", "profileService", AddProtectedRolesCtrl]);
app.controller("AddProtectedGroupsCtrl", ["$scope", "profileService", AddProtectedGroupsCtrl]);
app.controller("CustomListSettingsCtrl", ["$scope", "$route", "$location", "$http", "$timeout", "authService", "profileService", "userData", "list", "gettextCatalog", "ngDialog", CustomListSettingsCtrl]);
app.controller("CheckInCtrl", ["$scope", "$location", "$routeParams", "$timeout", "profileService", CheckInCtrl]);
app.controller("CheckOutCtrl", ["$scope", "$location", "$routeParams", "$timeout", "profileService", CheckOutCtrl]);
app.controller("ServicesCtrl", ["$scope", "$location", "$route", "$routeParams", "$http", "authService", "profileService", "userData", "ngDialog", "operations", "gettextCatalog", "service", ServicesCtrl]);
app.controller("ServicesListCtrl", ["$scope", "$location", "$route", "$routeParams", "profileService", "userData", "ngDialog", "operations", ServicesListCtrl]);
app.controller("SubscriptionsCtrl", ["$scope", "profileService", "ngDialog", "gettextCatalog", SubscriptionsCtrl]);
app.controller("SubscriptionsAddCtrl", ["$scope", "profileService", "ngDialog", SubscriptionsAddCtrl]);
app.controller("BulkAddCtrl", ["$scope", "$http", "$timeout", "profileService", "operations", BulkAddCtrl]);


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
      currentContact : function (profileService, $route) {
        return profileService.getContact($route.current.params.contactId);
      }
    }
  }).
  when('/contact/:contactId/checkin', {
    template: '',
    controller: 'CheckInCtrl',
    requireAuth: true
  }).
  when('/contact/:contactId/checkout', {
    template: '',
    controller: 'CheckOutCtrl',
    requireAuth: true
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
  when('/lists', {
    templateUrl: contactsId.sourcePath + '/partials/lists.html',
    controller: 'ListsCtrl',
    requireAuth: true,
    resolve: {
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
        return profileService.getList($route.current.params.listId).then(function(data) {
          if (data) {
            return data;
          }
          else {
            throw new Error('Could not find list');
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
  when('/services/add', {
    templateUrl: contactsId.sourcePath + '/partials/servicesEdit.html',
    controller: 'ServicesCtrl',
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
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      service: function() {
        return {};
      }
    }
  }).
  when('/services/:serviceId/edit', {
    templateUrl: contactsId.sourcePath + '/partials/servicesEdit.html',
    controller: 'ServicesCtrl',
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
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      },
      service: function (profileService, $route) {
        return profileService.getService($route.current.params.serviceId).then(function (response) {
          if (response.status != 200) {
            throw new Error('Could not find service');
          }
          return response.data;
        });
      }
    }
  }).
  when('/services/:locationId?', {
    templateUrl: contactsId.sourcePath + '/partials/services.html',
    controller: 'ServicesListCtrl',
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
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      }
    }
  }).
  when('/bulkadd', {
    templateUrl: contactsId.sourcePath + '/partials/bulkadd.html',
    controller: 'BulkAddCtrl',
    requireAuth: true,
    resolve: {
      operations : function(profileService) {
        return profileService.getOperationsData().then(function(data) {
          return data;
        });
      }
    }
  }).
  when('/offline', {
    templateUrl: contactsId.sourcePath + '/partials/offline.html'
  }).
  when('/AddProtectedRoles', {
    controller: 'AddProtectedRolesCtrl'
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
