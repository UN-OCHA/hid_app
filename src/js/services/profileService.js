(function($, angular, contactsId) {
  "use strict";

  angular.module("contactsId").service("profileService", function(authService, $http, $q, $rootScope, $filter) {
    var cacheUserData = false,
        cacheAppData = false,
        promiseAppData = false;

    // Return public API.
    return({
      getUserData: getUserData,
      getOperationsData: getOperationsData,
      clearData: clearData,
      getProfileById: getProfileById,
      getProfileByUser: getProfileByUser,
      getProfiles: getProfiles,
      getContacts: getContacts,
      getProfileData: getProfileData,
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
      canAddVerified: canAddVerified,
      canRemoveVerified: canRemoveVerified,
      canCreateAccount: canCreateAccount,
      canCheckIn: canCheckIn,
      canCheckOut: canCheckOut,
      canSendClaimEmail: canSendClaimEmail,
      canDeleteAccount: canDeleteAccount,
      canAssignOrganizationEditor: canAssignOrganizationEditor
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
        promiseAppData = $http({
          method: "get",
          url: contactsId.profilesBaseUrl + "/v0/app/data",
          params: {userid: authService.getAccountData().user_id, access_token: authService.getAccessToken()},
        })
        .then(handleSuccess, handleError).then(function(data) {
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

    function getProfileData(contactId) {
      contactId = contactId || '';

      var promise = getUserData(),
          filter = $filter('filter');

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
            return getContacts({_id: contactId}).then(function(data) {
              if (data && data.contacts && data.contacts[0] && data.contacts[0]._profile && data.contacts[0]._profile._id) {
                  var cont = data.contacts[0];
                  return getProfileById(data.contacts[0]._profile._id).then(function (data) {
                    if (data && data.profile && data.contacts && data.contacts.length) {
                      return prepProfileData(cont, data, false);
                    }
                  });
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
    // Can edit other user's key contact.
    function canEditKeyContact(locationId) {
      return hasRole('admin') || (locationId && (hasRole('manager', locationId)));
    }
    // Can verify other user.
    function canAddVerified(locationId) {
      return hasRole('admin') || (locationId && (hasRole('manager', locationId) || hasRole('editor', locationId)));
    }
    // Can remove verified status other user.
    function canRemoveVerified(contact, profile) {
      var pHasRole = hasRole('admin', null, profile) || hasRole('manager', null, profile) || hasRole('editor', null, profile),
          pHasProtectedRole = (contact && contact.protectedRoles && contact.protectedRoles.length),
          locationId = contact ? contact.locationId : null;

      return (!pHasRole && !pHasProtectedRole && canAddVerified(locationId));
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
      return (hasRole('admin') || hasRole('manager'))
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