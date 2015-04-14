function ListCtrl($scope, $route, $routeParams, $location, $http, $filter, authService, profileService, userData, operations, gettextCatalog, protectedRoles, countries) {
  var searchKeys = ['address.administrative_area', 'address.country', 'bundle', 'disasters.remote_id', 'keyContact', 'organization.name', 'protectedRoles', 'role', 'text', 'verified'];

  $scope.location = '';
  $scope.locationId = $routeParams.locationId || '';
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.operations = operations;

  $scope.contacts = [];
  $scope.bundles = [];
  $scope.disasterOptions = [];
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

  if ($scope.locationId !== 'global') {
    // Create bundles and disasters array.
    if ($scope.operations.hasOwnProperty($scope.locationId)) {
      $scope.location = $scope.operations[$scope.locationId].name;
      $scope.bundles = listObjectToArray($scope.operations[$scope.locationId].bundles);
      $scope.disasterOptions = listObjectToArray($scope.operations[$scope.locationId].disasters);
    }

    // Fetch regions for filter.
    if ($scope.location) {
      var tmpRegion = $scope.query['address.administrative_area'],
          len = $scope.countries.length,
          remote_id = null;

      $scope.regions = tmpRegion ? [{name: tmpRegion}] : [];
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
      });
    }
  }

  // Create protected roles array.
  $scope.protectedRoles = protectedRoles;

  $scope.parseAcronym = function (orgName) {
    if (!orgName || !orgName.length) {
      return '';
    }
    var acronymMatch = orgName.match(/\((.*)\)$/);
    return acronymMatch ? acronymMatch[1] : orgName;
  };

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
      userCanEditVerified:     (this.contact._profile.verified ? profileService.canRemoveVerified(this.contact, this.contact._profile) : profileService.canAddVerified($scope.locationId)),
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
  $scope.submitSearch = function() {
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
            $scope.organizations.unshift(emptyOption);
          }
        });
    }
    else {
      $scope.organizations = [helpOption];
    }
  };

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
    return $scope.location || gettextCatalog.getString('Global Contact List');
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
}
