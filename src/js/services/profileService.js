(function($, angular, contactsId) {
  "use strict";

  angular.module("contactsId").service("profileService", function(authService, $http, $q, $rootScope, $filter) {
    var cacheUserData = false,
        cacheAppData = false,
        cacheCountries = false,
        promiseAppData = false,
        filter = $filter('filter');

    // Return public API.
    return({
      getUserData: getUserData,
      getOperationsData: getOperationsData,
      clearData: clearData,
      getProfileById: getProfileById,
      getProfileByUser: getProfileByUser,
      getProfiles: getProfiles,
      getContacts: getContacts,
      getLists: getLists,
      saveList: saveList,
      deleteList: deleteList,
      getProfileData: getProfileData,
      saveProfile: saveProfile,
      deleteProfile: deleteProfile,
      saveContact: saveContact,
      saveToContactList: saveToContactList,
      requestClaimEmail: requestClaimEmail,
      hasRole: hasRole,
      getCountries: getCountries,
      getAdminArea: getAdminArea,
      getRoles: getRoles,
      getProtectedRoles: getProtectedRoles,
      getOrgTypes: getOrgTypes,
      canEditProfile: canEditProfile,
      canEditRoles: canEditRoles,
      canEditProtectedRoles: canEditProtectedRoles,
      canEditProtectedBundle: canEditProtectedBundle,
      canEditKeyContact: canEditKeyContact,
      canAddVerified: canAddVerified,
      canRemoveVerified: canRemoveVerified,
      canCreateAccount: canCreateAccount,
      canCheckIn: canCheckIn,
      canCheckOut: canCheckOut,
      canSendClaimEmail: canSendClaimEmail,
      canDeleteAccount: canDeleteAccount,
      canAssignOrganizationEditor: canAssignOrganizationEditor,
      isOrganizationEditor: isOrganizationEditor,
      canUseAdminFilters: canUseAdminFilters,
      sendNotificationEmail: sendNotificationEmail
    });

    // Get user data.
    function getUserData() {
      var promise;

      if (cacheUserData) {
        promise = $q.defer();
        promise.resolve(cacheUserData);
        return promise.promise;
      }
      else {
        var defer = $q.defer();
        promise = $http({
          method: "get",
          cache: true,
          url: contactsId.profilesBaseUrl + "/v0/profile/view",
          params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()}
        })
        .then(handleSuccess, handleError).then(function(data) {
          defer.resolve(data);
          if (data && data.profile && data.contacts) {
            var globalMatch = filter(data.contacts, function(d){return d.type === 'global';});
            cacheUserData = data;
            if (globalMatch.length) {
              cacheUserData.global = globalMatch[0];
            }
            $rootScope.$emit("appUserData", cacheUserData);
          }

          return cacheUserData;
        });

        return promise;
      }
    }

    // Get app data.
    function getAppData() {
      if (cacheAppData) {
        var promise = $q.defer();
        promise.resolve(cacheAppData);
        return promise.promise;
      }
      else if (promiseAppData) {
        return promiseAppData;
      }
      else {
        var defer = $q.defer();
        promiseAppData = $http({
          method: "get",
          cache: true,
          url: contactsId.profilesBaseUrl + "/v0/app/data",
          params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
        })
        .then(handleSuccess, handleError).then(function(data) {
          defer.resolve(data);
          if (data) {
            cacheAppData = data;
          }
          return cacheAppData;
        });
        return promiseAppData;
      }
    }

    // Get operations data (part of app data).
    function getOperationsData() {
      var promise;

      if (cacheAppData) {
        promise = $q.defer();
        promise.resolve(cacheAppData.operations);
        return promise.promise;
      }
      else {
        promise = getAppData()
        .then(function(data) {
          return (data && data.operations) ? data.operations : false;
        });
        return promise;
      }
    }

    // Clear stored app data.
    function clearData() {
      cacheUserData = false;
      cacheAppData = false;
    }

    // Get a profile by ID.
    function getProfileByUser(userId) {
      return getProfiles({userid: userId});
    }

    // Get a profile by ID.
    function getProfileById(profileId) {
      return getProfiles({_id: profileId});
    }

    // Get a profile by a contact ID that it contains.
    function getProfileByContactId(contactId) {
      return getProfiles({contactId: contactId});
    }

    // Get profiles that match specified parameters.
    function getProfiles(terms) {
      var defer = $q.defer();
      var request = $http({
        method: "get",
        cache: true,
        url: contactsId.profilesBaseUrl + "/v0/profile/view",
        params: $.extend({}, terms, {access_token: authService.getAccessToken()})
      });
      return(request.then(handleSuccess, handleError).then(function(data){
        defer.resolve(data);
      }));
    }

    // Get contacts that match specified parameters.
    function getContacts(terms) {
      terms.access_token = authService.getAccessToken();
      var request = $http({
        method: "get",
        cache: true,
        url: contactsId.profilesBaseUrl + "/v0/contact/view",
        params: terms
      });
      return(request.then(handleSuccess, handleError));
    }

    // Get custom contact lists that match specified parameters.
    function getLists(terms) {
      if (!terms) {
        var terms = {};
      }

      terms.access_token = authService.getAccessToken();
      var request = $http({
        method: "get",
        url: contactsId.profilesBaseUrl + "/v0/list/view",
        params: terms
      });
      return(request.then(handleSuccess, handleError));
    }

    // Save a profile (create or update existing).
    function saveList(list) {
      var request;
      request = $http({
        method: "post",
        url: contactsId.profilesBaseUrl + "/v0/list/save",
        params: {access_token: authService.getAccessToken()},
        data: list
      });
      return(request.then(handleSuccess, handleError));
    }

    function deleteList(list) {
      var request;
      request = $http({
        method: "post",
        url: contactsId.profilesBaseUrl + "/v0/list/delete",
        params: {access_token: authService.getAccessToken()},
        data: list
      });
      return(request.then(handleSuccess, handleError));
    }

    function getProfileData(contactId) {
      contactId = contactId || '';

      var promise = getUserData();

      return getUserData().then(function(data){
        // Check if the contact is for the current user
        if (data && data.contacts && data.contacts.length) {
          if (!contactId) {
            return prepProfileData({}, data, true);
          }

          var match = filter(data.contacts, function(d){return d._id === contactId;});
          if (match.length) {
            // Contact is for the current user.
            return prepProfileData(match[0], data, true);
          }
          else {
            // Contact is not for the current user
            return getProfileByContactId(contactId).then(function (data) {
              if (data && data.profile && data.contacts && data.contacts.length) {
                var match = filter(data.contacts, function(d){return d._id === contactId;});
                return prepProfileData(match[0], data, false);
              }
              else {
                return {};
              }
            });
          }
        }
        return {};
      });

      function prepProfileData(contact, data, isUserProfile) {
        var globalMatch = filter(data.contacts, function(d){return d.type === 'global';}),
            profileData = {
              contact: contact,
              contacts: data.contacts,
              profile: data.profile,
              global: globalMatch.length ? globalMatch[0] : {},
              isUserProfile: isUserProfile
            };

        return profileData;
      }
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

    // Save a contact to personal (create or update existing).
    function saveToContactList(contactId, remove) {
      var request;
      request = $http({
        method: "post",
        url: contactsId.profilesBaseUrl + "/v0/profile/save",
        params: {
          access_token: authService.getAccessToken(),
          field: "contactLists",
          name: "contacts",
          action: !!remove ? 'remove' : 'add',
          contactId: contactId
        },
        data: cacheUserData.profile
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

    // Send notification Email
    function sendNotificationEmail(contactId) {
      var request,
        data = {
          contactId: contactId
        };
      request = $http({
        method: "post",
        url: contactsId.profilesBaseUrl + "/v0/contact/notifyContact",
        params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
        data: data
      });
      return(request.then(handleSuccess, handleError));
    }

    // Request a claim account email.
    function send(email, adminName) {
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
      if (cacheCountries) {
        promise = $q.defer();
        promise.resolve(cacheCountries);
        return promise.promise;
      }
      else {
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
          cacheCountries = countryData;
          return cacheCountries;
        });
        
        return promise;
      }
      
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
        cache: true,
        url: contactsId.hrinfoBaseUrl + "/hid/locations/" + country_id
      })
      .then(handleSuccess, handleError).then(function(data) {
        var regionData = [];
        if (data && data.regions) {
          angular.forEach(data.regions, function(value, key) {
            this.push(angular.extend({}, value, {'remote_id' : key}));
          }, regionData);
        }
        return regionData;
      });

      return promise;
    }

    function getRoles() {
      var promise;

      if (cacheAppData) {
        promise = $q.defer();
        promise.resolve(cacheAppData.roles);
        return promise.promise;
      }
      else {
        promise = getAppData()
        .then(function(data) {
          return (data && data.roles) ? data.roles : false;
        });
        return promise;
      }
    }

    function getProtectedRoles() {
      var promise;

      if (cacheAppData) {
        promise = $q.defer();
        promise.resolve(cacheAppData.protectedRoles);
        return promise.promise;
      }
      else {
        promise = getAppData()
        .then(function(data) {
          return (data && data.protectedRoles) ? data.protectedRoles : false;
        });
        return promise;
      }
    }

    function getOrgTypes() {
      var promise;

      if (cacheAppData) {
        promise = $q.defer();
        promise.resolve(cacheAppData.orgTypes);
        return promise.promise;
      }
      else {
        promise = getAppData()
        .then(function(data) {
          return (data && data.orgTypes) ? data.orgTypes : false;
        });
        return promise;
      }
    }

    // Returns true/false for whether the user has/doesn't have the specified
    // role. Assumes the user profile data is loaded.
    function hasRole(role, subrole, profile) {
      profile = typeof profile === 'undefined' ? (!cacheUserData ? null : cacheUserData.profile) : profile;

      var matchString = (subrole && subrole.length) ? "^" + role + ":" + subrole + "$" : "^" + role,
          match = new RegExp(matchString);

      return (profile && profile.roles && profile.roles.length && profile.roles.reIndexOf(match) !== -1);
    }

    // Can edit other user's profile.
    function canEditProfile(locationId) {
      return hasRole('admin') || (locationId && (hasRole('manager', locationId) || hasRole('editor', locationId)));
    }

    // Can edit other user's roles.
    function canEditRoles(profile) {
      var hasRoleAdmin = hasRole('admin'),
          hasRoleManager =  hasRole('manager');

      if (!hasRoleAdmin && !hasRoleManager) {
        // Need to be an Admin or Manager to edit roles.
        return false;
      }
      else if (hasRole('admin', null, profile) && !hasRoleAdmin) {
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
    // Can edit other user's protected group.
    function canEditProtectedBundle(locationId) {
      return hasRole('admin') || (locationId && (hasRole('manager', locationId) || hasRole('editor', locationId)));
    }
    // Can edit other user's key contact.
    function canEditKeyContact(locationId) {
      return hasRole('admin') || (locationId && (hasRole('manager', locationId)));
    }
    // Can verify other user.
    function canAddVerified() {
      return hasRole('admin') || hasRole('manager') || hasRole('editor');
    }
    // Can remove verified status other user.
    function canRemoveVerified(contact, profile) {
      var pHasRole = hasRole('admin', null, profile) || hasRole('manager', null, profile) || hasRole('editor', null, profile),
          pHasProtectedRole = (contact && contact.protectedRoles && contact.protectedRoles.length);
      return (!pHasRole && !pHasProtectedRole && canAddVerified());
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

    // Can assign Organization Editor Role
    function canAssignOrganizationEditor() {
      return (hasRole('admin') || hasRole('manager'));
    }

    // Can use administrative contact list filters (orphan, ghost, admin role)
    function canUseAdminFilters() {
      return hasRole('admin');
    }

    //Verify editor role exists for specified location and organization
    function isOrganizationEditor(adminProfile, userProfile){
      var found = false;
      var locationId = null;
      var organizationId = null;

      if (userProfile && userProfile.contact && userProfile.contact.locationId){
        locationId = userProfile.contact.locationId;
      }

      if (adminProfile && adminProfile.orgEditorRoles && locationId){
       var orgEditorRole = $filter('filter')(adminProfile.orgEditorRoles, {locationId: locationId}, true);
        if (orgEditorRole.length){
          found = true;
        }
      }

      return found;
    }

    function handleError(response) {
      // The API response from the server should be returned in a
      // nomralized format. However, if the request was not handled by the
      // server (or what not handles properly - ex. server error), then we
      // may have to normalize it on our end, as best we can.
      if (!angular.isObject(response.data) || !response.data.message) {
        if (response.status == 0) {
          location.replace('#/offline'); //redirect to offline
        }
        return ($q.reject("An unknown error occurred."));
      }

      // If a 403 status code is received from the profile service, then
      // set the user status to logged out and reload the page to trigger the
      // sign in process.
      if (response.status == 403) {
        authService.logout(true);
        location.reload();
        return $q.defer();
      }

      // Otherwise, use expected error message.
      return ($q.reject(response.data.message));
    }

    function handleSuccess(response) {
      return (response.data);
    }

  });

}(jQuery, angular, window.contactsId));
