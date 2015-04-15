function ProfileCtrl($scope, $location, $route, $routeParams, $filter, $timeout, $http, profileService, authService, operations, profileData, countries, roles, protectedRoles, gettextCatalog, userData) {
  $scope.profileId = $routeParams.profileId || '';
  $scope.profile = {};

  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.adminRoleOptions = [];
  $scope.protectedRoles = protectedRoles;
  $scope.addressList = {};

  $scope.phoneTypes = ['Landline', 'Mobile', 'Fax', 'Satellite'];
  $scope.emailTypes = ['Work', 'Personal', 'Other'];
  $scope.imageTypes = ['URL', 'Facebook', 'Google+'];
  var multiFields = {'uri': [], 'voip': ['number', 'type'], 'email': ['address'], 'phone': ['number', 'type'], 'bundle': [], 'disasters': ['remote_id']};

  var pathParams = $location.path().split('/'),
  checkinFlow = pathParams[1] === 'checkin',
  accountData = authService.getAccountData();
  $scope.adminRoles = (profileData.profile && profileData.profile.roles && profileData.profile.roles.length) ? profileData.profile.roles : [];
  $scope.selectedProtectedRoles = (profileData.contact && profileData.contact.protectedRoles && profileData.contact.protectedRoles.length) ? profileData.contact.protectedRoles : [];
  $scope.verified = (profileData.profile && profileData.profile.verified) ? profileData.profile.verified : false;
  $scope.orgEditorRoles = (profileData.profile && profileData.profile.orgEditorRoles && profileData.profile.orgEditorRoles.length) ? profileData.profile.orgEditorRoles : [];
  $scope.passwordUrl = contactsId.authBaseUrl + "/#forgotPass";

  // Setup scope variables from data injected by routeProvider resolve
  $scope.operations = operations;
  $scope.profileData = profileData;
  $scope.countries = countries;

  // Exclude operations for which the user is already checked in.
  var availOperations = angular.copy(operations);
  if (profileData && profileData.contacts && profileData.contacts.length) {
    profileData.contacts.forEach(function (val, idx, arr) {
      if (val.type === 'local' && val.locationId && val.locationId.length && availOperations.hasOwnProperty(val.locationId)) {
        delete availOperations[val.locationId];
      }
    });
  }

  // Convert list into a sorted array
  $scope.availOperations = [];
  angular.forEach(availOperations, function (value, key) {
    $scope.availOperations.push(value);
  });
  $scope.availOperations.sort(function (a, b) {
    return a.name && b.name ? String(a.name).localeCompare(b.name) : false;
  });

  // When checking in to a new crisis, load the user's global profile to clone.
  if (checkinFlow) {
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
    $scope.selectedOperation = 'none';
    setPreferedCountries();
  }

  // Creates an array to be used as options for group select
  $scope.$watch("selectedOperation", function(newValue, oldValue) {
    if (newValue !== oldValue && $scope.selectedOperation.length) {
      $scope.initCountry();
      setBundles();
      setDisasters();
      setOffices();
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
    if ($scope.profile.locationId && $scope.operations.hasOwnProperty($scope.profile.locationId)) {
      $scope.selectedOperation = $scope.profile.locationId;
      setBundles();
      setDisasters();
      setOffices();
    }
    setPermissions();
    setOrganizationEditor();
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

  // Split ext into own field.
  phoneSplit();
  // Show image if field is populated.
  setImage();

  // Toggle logic for verified field.
  $scope.setVerified = function() {
    if ((!$scope.verified && $scope.userCanAddVerified) || ($scope.verified && $scope.userCanRemoveVerified)) {
      $scope.verified = !$scope.verified;
    }
  };

  $scope.setCountryCode = function() {
    var countryInfo = jQuery('input[name="phone[' + this.$index + '][number]"]').intlTelInput('getSelectedCountryData');
    if (countryInfo && countryInfo.hasOwnProperty('dialCode')) {
      this.profile.phone[this.$index].countryCode = countryInfo.dialCode;
    }
  };

  $scope.setPhonePlaceholder = function() {
    var countryInfo = jQuery('input[name="phone[' + this.$index + '][number]"]').intlTelInput('getSelectedCountryData');
    return intlTelInputUtils.getExampleNumber(countryInfo.iso2, false, 0).replace(/[0-9]/g, "5");
  }

  $scope.httpCheck = function() {
    var validObj = $scope.defaultValidObj('uri', this.$index);
    if (validObj.$invalid && validObj.$viewValue.search(/^http[s]?\:\/\//) === -1) {
      $scope.profile.uri[this.$index] = 'http://' + validObj.$viewValue;
    }
  }

  $scope.initDepartureDate = function() {
    var today = new Date(),
        dd = today.getDate(),
        mm = today.getMonth()+1,
        yyyy = today.getFullYear();

    dd = (dd<10) ? '0' + dd : dd;
    mm = (mm<10) ? '0' + mm : mm;

    $scope.todaysDate = yyyy + "-" + mm + "-" + dd;

    if ($scope.profile.departureDate) {
      $scope.profile.departureDate = new Date($scope.profile.departureDate);
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
    // Special treatment for voip.
    $scope.profile.voip = $scope.profile.voip || [];
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

  $scope.selectOperation = function(operationId) {
    $scope.selectedOperation = operationId;
  }

  $scope.updateImage = function() {
    $scope.updatingImage = !$scope.updatingImage;

    if (!$scope.updatingImage) {
      setImage();
    }
  }

  $scope.refreshOrganization = function(select, lengthReq) {
    var helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
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

          if (!$scope.organizations.length) {
            $scope.organizations.push(emptyOption);
          }
        });
    }
    else {
      $scope.organizations = []
      $scope.organizations.push(helpOption);
    }
  };

  $scope.selectCountry = function(item, isInit) {
    if (item && item.hasOwnProperty('remote_id')) {
      $scope.regionsPromise = profileService.getAdminArea(item.remote_id).then(function(data) {
        $scope.regions = data;
      });
    }
    if (!isInit) {
      $scope.profile.address[0].administrative_area = null;
    }

    setPreferedCountries();
  }

  $scope.initCountry = function() {
    $scope.regions = [];
    $scope.profile.address = $scope.profile.address || [];
    $scope.profile.address[0] = $scope.profile.address[0] || {};

    if (!$scope.profile.address[0].country && $scope.profile.type == 'local' && $scope.selectedOperation && $scope.operations[$scope.selectedOperation]) {
      $scope.profile.address[0].country = $scope.operations[$scope.selectedOperation].name;
    }

    if ($scope.profile.address[0].country) {
      angular.forEach($scope.countries, function(value, key) {
        if (value.name === $scope.profile.address[0].country) {
          $scope.selectCountry(value, true);
        }
      });
    }
  }

  // Update submit text when changing language.
  $scope.submitText = function() {
    if ($scope.profile.type === 'global' || !checkinFlow) {
      return gettextCatalog.getString('Save');
    }
    else {
      return gettextCatalog.getString('Check-in')
    }
  }

  // Update profile name text when changing language.
  $scope.profileName = function() {
    if ($scope.profile.type === 'global') {
      return gettextCatalog.getString('Global');
    }
    else if (!$scope.profile.location && $scope.selectedOperation) {
      return $scope.operations[$scope.selectedOperation].name
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
      case 'imageURL':
        name = gettextCatalog.getString('Image URL');
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

  $scope.onRoleChange = function(item, prop) {
    var i = $scope[prop].indexOf(item.id);
    if (i > -1) {
      $scope[prop].splice(i, 1);
      if (!$scope['selectedProtectedRoles'].length && !$scope['adminRoles'].length) {
        $scope.userCanRemoveVerified = profileService.canRemoveVerified(profileData.contact, profileData.profile)
      }
    }
    else {
      $scope[prop].push(item.id);

      if ($scope[prop].length) {
        $scope.verified = true;
        $scope.userCanRemoveVerified = false;
      }
    }
  }

  $scope.submitProfile = function () {
    // Special treatment for voip.
    if ($scope.profile.voip[0] && !$scope.profile.voip[0].number) {
      // Remove Default Skype entry before save if blank.
      $scope.profile.voip[0] = "";
      $scope.checkEntryValidation('voip', 0);
    }

    // Ensure disasters are stored with the display name
    angular.forEach($scope.profile.disasters, function (item) {
      if (item.remote_id && $scope.operations[$scope.selectedOperation].disasters) {
        angular.forEach($scope.operations[$scope.selectedOperation].disasters, function (ditem) {
          if (ditem.remote_id == item.remote_id) {
            item.name = ditem.name;
          }
        });
      }
    });

    // Checks for incomplete entries.
    if ($scope.profileForm.$valid) {
      // Removes empty entries.
      $scope.checkMultiFields(true);
      phoneJoin();


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
        profile.location = $scope.operations[$scope.selectedOperation].name;

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
      if (profile.image && profile.image[0] && profile.image[0].imageUrl) {
        profile.image[0].url = profile.image[0].imageUrl;
      }

      if (profile.departureDate && profile.type !== "local") {
        delete profile.departureDate;
      }

      profile.verified = $scope.verified;

      //Organization Editor
      if ($scope.userCanAssignOrganizationEditor){
        //If organization editor is selected and location and organization are valid, add orgEditorRole
        if ($scope.isOrganizationEditor && $scope.profile.locationId && $scope.profile.organization[0] && $scope.profile.organization[0].remote_id) {
          var locationId = $scope.profile.locationId;
          var organizationId = $scope.profile.organization[0].remote_id

          //Verify the OrganizationEditor doesn't already exist
          if (!findOrganizationEditor(locationId, organizationId)){
            $scope.orgEditorRoles.push({'location': locationId, 'organization': organizationId});
          }
          //Set verified = true for all Organization editors
          profile.verified = true;
        }
        else {
          //Remove any existing OrgEditor role for current location
          if ($scope.orgEditorRoles){
            $scope.orgEditorRoles = $filter('filter')($scope.orgEditorRoles, {location: '!'+ $scope.profile.locationId}, true);
          }
        }
        profile.orgEditorRoles = $scope.orgEditorRoles;
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

  // If profile is local, set preferred county code to checkin location.
  function setPreferedCountries() {
    var address, match, countryMatch, iso2Codes;
    $scope.defaultPreferredCountryAbbr = [];

    if ($scope.profile.hasOwnProperty('address')) {
      address = $scope.profile.address;
    }
    else if (profileData.hasOwnProperty('contact') && profileData.contact.hasOwnProperty('address')) {
      address = profileData.contact.address;
    }
    else {
      address = [{}];
    }

    match = (address.length && typeof address[0].country === 'string' && address[0].country.length) ? address[0].country.toUpperCase()
      : ($scope.profile.location) ? $scope.profile.location.toUpperCase() : $scope.selectedOperation;

    countryMatch = $.fn.intlTelInput.getCountryData().filter(function (el) {
      // Returns country data that is similar to selectedPlace.
      return el.name.toUpperCase().match(match);
    });

    iso2Codes = [];
    angular.forEach(countryMatch, function(value){
      this.push(value.iso2);
    },iso2Codes);

    iso2Codes = iso2Codes.length ? iso2Codes : ["ch"]

    // Converts array to a string.
    $scope.defaultPreferredCountryAbbr = iso2Codes.join(', ');
    updateCountryCodes(iso2Codes[0]);
  }

  function updateCountryCodes(iso2) {
    angular.forEach($scope.profile.phone, function(value, key) {
      if (!value.number) {
        var countryInfo = jQuery('input[name="phone[' + key + '][number]"]').intlTelInput('selectCountry', iso2);
      }
    });
  }

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

  // Break extension off phone number.
  function phoneSplit() {
    angular.forEach($scope.profile.phone, function(value, key) {
      if (value.hasOwnProperty('number')) {
        var parts = value.number.split(',');
        $scope.profile.phone[key].number = parts[0];
        $scope.profile.phone[key].ext = parts[1];
      }
    });
  };

  // Add extension to phone number.
  function phoneJoin() {
    angular.forEach($scope.profile.phone, function(value, key) {
      if (value.number && value.ext) {
        $scope.profile.phone[key].number += ',' + value.ext;
      }
    });
  };

  function setBundles(){
    var bundles = $scope.operations[$scope.selectedOperation].bundles;
    $scope.bundles = listObjectToArray(bundles);
  }

  function setDisasters() {
    var disasterOptions = $scope.operations[$scope.selectedOperation].disasters;
    $scope.disasterOptions = listObjectToArray(disasterOptions);
  }

  function setOffices() {
    $scope.offices = [];
    angular.forEach($scope.operations[$scope.selectedOperation].offices, function(value) {
      $scope.offices.push(value);
    }, $scope.offices);
  }

  // Shows image url.
  function setImage() {
    if (!$scope.profile.image || !$scope.profile.image[0]) {
      return
    }
    if ($scope.profile.image[0].type === 'URL') {
      $scope.profile.image[0].imageUrl = $scope.profile.image[0].url;
    }
    else if (typeof $scope.profile.image[0].type !== 'undefined') {
      var defaultWidth = 325,
          request = {method:"get"},
          cb;

      if ($scope.profile.image[0].type === 'Facebook') {
        request.url = "https://graph.facebook.com/" + $scope.profile.image[0].socialMediaId + "/picture";
        request.params = {type: "square", redirect: false, width: defaultWidth};
        cb = function(response) {
          if (response.data && response.data.data) {
            $scope.profile.image[0].imageUrl = response.data.data.url;
          }
        }
      }
      else {
        request.url = "https://www.googleapis.com/plus/v1/people/" + $scope.profile.image[0].socialMediaId;
        request.params = {type: "image", key: contactsId.googlePlusApiKey};
        cb = function(response) {
          if (response.data && response.data.image) {
            $scope.profile.image[0].imageUrl = response.data.image.url.replace('?sz=50', ('?sz=' +defaultWidth));
          }
        }
      }
      $http(request).then(cb);
    }
  }

  function setPermissions() {
    var hasRoleAdmin = profileService.hasRole('admin'),
        contactNotEmpty = profileData.contact && Object.keys(profileData.contact).length;

    $scope.userCanEditRoles = profileService.canEditRoles(profileData.profile) && profileData.profile._id !== userData.profile._id;
    $scope.userCanEditKeyContact = profileService.canEditKeyContact($scope.selectedOperation);
    $scope.userCanEditProtectedRoles = profileService.canEditProtectedRoles($scope.selectedOperation);
    $scope.userCanAddVerified = profileService.canAddVerified($scope.selectedOperation);
    $scope.userCanRemoveVerified = profileService.canRemoveVerified(profileData.contact, profileData.profile);
    $scope.userCanDeleteAccount = profileService.canDeleteAccount(profileData.profile);
    $scope.userCanCheckOut = !checkinFlow && contactNotEmpty && profileService.canCheckOut(profileData.contact);
    $scope.userCanSendClaimEmail = !checkinFlow && contactNotEmpty && profileService.canSendClaimEmail(profileData.contact);
    $scope.userCanRequestDelete = $scope.profile.type === 'global' && (typeof $routeParams.profileId === 'undefined' || userData.profile._id === profileData.profile._id);
    $scope.userCanRequestPassword = $scope.profile.type === 'global' && (typeof $routeParams.profileId === 'undefined' || userData.profile._id === profileData.profile._id);
    $scope.userCanAssignOrganizationEditor = $scope.profile.type === 'local' && profileService.canAssignOrganizationEditor();

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

  
  function setOrganizationEditor(){
    //Check to see if Organization Editor Role exists for this profile's locationand organization
    if ($scope.profile.locationId && $scope.profile.organization[0] && $scope.profile.organization[0].remote_id){
      var locationId = $scope.profile.locationId;
      var organizationId = $scope.profile.organization[0].remote_id

      $scope.isOrganizationEditor = findOrganizationEditor(locationId, organizationId);
    }
    else{
      $scope.isOrganizationEditor = false;
    }
  }

  function findOrganizationEditor(locationId, organizationId){
    var found = false;

    if ($scope.orgEditorRoles){
      if (organizationId){
        //Verify editor role exists for specified location and organization 
        var orgEditorRole = $filter('filter')($scope.orgEditorRoles, {location: locationId, organization: organizationId}, true);
        if (orgEditorRole.length){
          found = true;
        }
      }
      else {
        //Verify editor role exists for specified location
        var orgEditorRole = $filter('filter')($scope.orgEditorRoles, {location: locationId}, true);
        if (orgEditorRole.length){
          found = true;
        }
      }
    }
    return found;
  }
}