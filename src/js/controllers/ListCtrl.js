function ListCtrl($scope, $route, $routeParams, $location, $http, $filter, authService, profileService, userData, operations, gettextCatalog, protectedRoles, orgTypes, countries, roles, ngDialog) {
  var searchKeys = ['address.administrative_area', 'address.country', 'bundle', 'disasters.remote_id', 'ghost', 'globalContacts', 'keyContact', 'localContacts', 'office.name', 'organization.name', 'organization.org_type_remote_id', 'orphan', 'protectedBundles', 'protectedRoles', 'role', 'text', 'verified', 'id', 'sort'],
      filter = $filter('filter');

  $scope.location = '';
  $scope.locationId = $routeParams.locationId || '';
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.operations = operations;
  $scope.hid_access = operations[$scope.locationId] ? operations[$scope.locationId].hid_access : '';

  $scope.list = {};
  $scope.contacts = [];
  $scope.bundles = [];
  $scope.disasterOptions = [];
  $scope.organizations = [];
  $scope.orgTypes = orgTypes;
  $scope.protectedRoles = protectedRoles;
  $scope.countries = countries;
  $scope.adminRoleOptions = roles;
  $scope.userData = userData;
   
  $scope.shortcuts = [
    {title: "Humanitarian Coordinator", path: "/list/global?localContacts&protectedRoles=56026"},
    {title: "Head of Agencies", path: "/list/global?localContacts&protectedRoles=2377"},
    {title: "Cluster Coordinators", path: "/list/global?localContacts&protectedRoles=2381"},
    {title: "Information Management Officers", path: "/list/global?localContacts&protectedRoles=2387"},
    {title: "Donors", path: "/list/global?localContacts&protectedRoles=56025"},
  ];

  $scope.contactsPromise;
  $scope.listPromise;
  $scope.query = $location.search();
  $scope.loadLimit = 30;
  $scope.contactsCount = 0;
  $scope.sort = 'name';

  $scope.showResetBtn = Object.keys($scope.query).length;
  $scope.isContactList = ($scope.locationId !== 'global' && !$scope.locationId.match(/hrinfo:/));

  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';
  $scope.emailExportTpl = contactsId.sourcePath + '/partials/emailExport.html';
  $scope.listComplete = false;
  $scope.contactsCreated = false;
  $scope.isEditor = false;
  $scope.isVerified = userData.profile.verified;
  
  setPermissions();

  function setPermissions() {
    var hasRoleAdmin = profileService.hasRole('admin');
    $scope.userCanEditProtectedRoles = profileService.canEditProtectedRoles($scope.selectedOperation);
    $scope.userCanEditProtectedBundle = profileService.canEditProtectedBundle($scope.selectedOperation);
    
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


  if ($scope.locationId === 'global' && !$scope.query.hasOwnProperty('globalContacts') && !$scope.query.hasOwnProperty('localContacts')) {
    $scope.query.globalContacts = true;
    $scope.query.localContacts = false;
  }

  if ($scope.locationId === 'global' || $scope.isContactList) {
    var allDisasters = {};
    angular.forEach(operations, function (oper, opId) {
      if (oper.disasters) {
        angular.forEach(oper.disasters, function (dstr) {
          if (dstr.remote_id && dstr.name && !allDisasters.hasOwnProperty(dstr.remote_id)) {
            allDisasters[dstr.remote_id] = dstr;
          }
        });
      }
    });
    $scope.disasterOptions = listObjectToArray(allDisasters);
  }
  else {
    // Create bundles and disasters array.
    if ($scope.operations.hasOwnProperty($scope.locationId)) {
      $scope.offices = [];
      $scope.protectedBundles = [];
      $scope.bundles = listObjectToArray($scope.operations[$scope.locationId].bundles);

      angular.forEach($scope.operations[$scope.locationId].offices, function(value) {
        $scope.offices.push(value);
      }, $scope.offices);

      angular.forEach($scope.bundles, function(bundle){
        if (bundle.value.hid_access !== "open") {
          $scope.protectedBundles.push(bundle.value.name);
        }
      });

      $scope.displayBundle = $scope.query.protectedBundles || $scope.query.bundle || null;
      $scope.location = $scope.operations[$scope.locationId].name;
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

  // Custom contact list.
  if ($scope.locationId !== 'global' && $routeParams.id) {
    $scope.showResetBtn = Object.keys($scope.query).length - 1;
  }

  $scope.parseAcronym = function (orgName) {
    if (!orgName || !orgName.length) {
      return '';
    }
    var acronymMatch = orgName.match(/\((.*)\)$/);
    return acronymMatch ? acronymMatch[1] : orgName;
  };

  var myContacts = [];
  if (userData.profile.contactLists && userData.profile.contactLists.length) {
    var listMatch = filter(userData.profile.contactLists, function(d){return d.name === "contacts"});
    if (listMatch.length && listMatch[0].contacts) {
      myContacts = listMatch[0].contacts;
    }
  }

  $scope.contactInit = function() {
    var isOwn = userData.profile._id === this.contact._profile._id;

    // Create an obj for quicklink vars.
    this.contact.ql = {
      isOwn:                  isOwn,
      keyContact:             this.contact.keyContact,
      verified:               this.contact._profile.verified,
      myContact:              (myContacts.indexOf(this.contact._id) !== -1),
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
      if (!contact.ql.isOwn && contact.email[0]) {
        //Set email fields
        var userGlobal = filter(userData.contacts, function(d) {return d.type === 'global'}),
            email = {
              type: 'notify_checkout',
              recipientFirstName: contact.nameGiven,
              recipientLastName: contact.nameFamily,
              recipientEmail: contact.email[0].address,
              adminName: userGlobal[0].nameGiven + " " + userGlobal[0].nameFamily,
              locationName: $scope.locationText(),
              locationType: contact.type
            };

        if (userGlobal.email && userGlobal.email[0] && userGlobal.email[0].address) {
          email.adminEmail = userGlobal.email[0].address;
        }

        cont.notifyEmail = email;
      }
      contact.ql.checkOutState = 'inProgress';
      profileService.saveContact(cont).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          profileService.clearData();
          $route.reload();
        }
        else {
          $scope.flash.set('There was an error checking this contact out.', 'danger');
        }
      });

    }
    else if (typeof contact.ql.checkOutState === "undefined") {
      contact.ql.checkOutState = "confirm";
    }
  };

  $scope.updateContactList = function (contact) {
    if (contact.ql.contactListState === "confirm") {
      contact.ql.contactListState = 'inProgress';
      profileService.saveToContactList(contact._id, contact.ql.myContact).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          profileService.clearData();
          $route.reload();
        }
        else {
          $scope.flash.set('There was an error adding this contact to the contact list.', 'danger');
        }
      });
    }
    else if (typeof contact.ql.contactListState === "undefined") {
      contact.ql.contactListState = "confirm";
    }
  }

  $scope.updateProfile = function (contact, field) {
    var access = field === 'verified' ?  contact.ql.userCanEditVerified : contact.ql.userCanEditKeyContact,
        stateKey = field + 'State';

    if (access) {
      if (contact.ql[stateKey] === 'confirm') {
        contact.userid = contact._profile._userid || contact._profile.userid;
        contact[field] = contact.ql[field];
        contact.ql[stateKey] = 'inProgress';
       
        profileService.saveContact(contact).then(function(data) {
          if (data && data.status && data.status === 'ok') {
            profileService.clearData();
            $route.reload();
          }
          else {
            $scope.flash.set('There was an error updating this profile.', 'danger');
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
          $scope.flash.set('There was an error deleting this profile.', 'danger');
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
            $scope.flash.set('An error occurred while attempting to send the account claim email. Please try again or contact an administrator.', 'danger');
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
      if (searchKeys[i] != 'id') {
        $scope.query[searchKeys[i]] = null;
      }
    }
    // Submit search after clearing query to show all.
    $scope.submitSearch();
  };

  $scope.selectShortcut = function() {
    var url = $location.url(this.shortcut.path);
  }

  $scope.submitBundle = function() {
    var bundle = this.displayBundle,
        match = filter($scope.protectedBundles, function(d) {return d === bundle;});

    $scope.query.bundle = match.length ? null : bundle;
    $scope.query.protectedBundles = match.length ? bundle : null;

    $scope.submitSearch();
  }

  $scope.submitSort = function() {
    $scope.submitSearch();
  }

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
    if ($routeParams.id) {
      window.open(contactsId.profilesBaseUrl + "/v0/list/view?" + jQuery.param(query), 'hidAppCSV');
    } else {
      window.open(contactsId.profilesBaseUrl + "/v0/contact/view?" + jQuery.param(query), 'hidAppCSV');
    }
  }

  $scope.exportEmail = function() {
    var query = $scope.query;
    query.access_token = authService.getAccessToken();
    query.export = 'email';
    query.limit = 0;
    query.skip = 0;

    // Custom contact list.
    if ($routeParams.id) {
      var terms = query;
      terms.id = $routeParams.id;

      $scope.listPromise = profileService.getLists(terms).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          var contacts = [];
          angular.forEach(data.lists.contacts, function(value, key) {
            this.push({
              name: value.nameGiven + " " + value.nameFamily,
              email: value.email[0].address
            });
          }, contacts);

          openEmailPopup(contacts);
        }
      });
    } else {
      $scope.contactsPromise = profileService.getContacts(query).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          data.contacts = data.contacts || [];
          console.log(data.contacts);
          openEmailPopup(data.contacts);
        }
      });
    }
  };

  function openEmailPopup(contacts) {
    $scope.exportEmails = contacts;
    var emailExportString = "";

    angular.forEach(contacts, function(value, key) {
      if (key) {
        emailExportString += ", ";
      }
      emailExportString += value.name + " <" + value.email + ">";
    });

    ngDialog.open({
      template: $scope.emailExportTpl,
      controller: ['$scope', function($scope) {
          $scope.emails = emailExportString;
      }],
    });
  }

  // If the page loads with the email export attribute set, then remove its
  // query parameter before the contact list is built, and also open the
  // email dialog.
  if ($scope.query.export == 'email') {
    delete $scope.query.export;
    $scope.exportEmail();
  }

  $scope.openPDF = function() {
    var query = $scope.query;
    query.access_token = authService.getAccessToken();
    query.export = 'pdf';
    query.limit = 0;
    query.skip = 0;
    if ($routeParams.id) {
      window.open(contactsId.profilesBaseUrl + "/v0/list/view?" + jQuery.param(query), 'hidAppCSV');
    } else {
      window.open(contactsId.profilesBaseUrl + "/v0/contact/view?" + jQuery.param(query), 'hidAppPDF');
    }
  }

  // Autocomplete call for Orgs
  $scope.refreshOrganization = function(select, lengthReq) {
    var helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
        emptyOption = {action:'clear', name:"", alt: gettextCatalog.getString('No results found.'), disable: true};

    // If search is an array, only act on first item.
    if ( Object.prototype.toString.call( select.search ) === '[object Array]' ) {
      select.search = select.search[0];
    }

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
    if ($scope.isContactList) {
      return $scope.list.name;
    }
    else {
      return $scope.location || gettextCatalog.getString('Global Contact List');
    }
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

  $scope.contactListText = function(contact) {
    switch (contact.ql.contactListState) {
      case "confirm":
        return gettextCatalog.getString("Are you sure?");
      case "inProgress":
        return contact.ql.myContact ? gettextCatalog.getString("Removing...") : gettextCatalog.getString("Adding...");
      default:
        return contact.ql.myContact ? gettextCatalog.getString('Remove from My Contacts') : gettextCatalog.getString('Add to My Contacts');
    }
  }

  // Remove contact from the custom list.
  $scope.removeContact = function(contact) {
    // Create copy of $scope.list.
    var list = (JSON.parse(JSON.stringify($scope.list)));
    index = $scope.list.contacts.indexOf(contact);

    profileService.deleteContactFromList(list, contact).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $scope.contacts.splice(index, 1);
        $scope.contactsCount--;
        $scope.queryCount--;
      }
      else {
        $scope.flash.set('An error occurred while trying to delete this contact. Please reload and try the change again.', 'danger');
      }
    });
  }

  // Add contact to the custom list.
  $scope.addContact = function(contact) {
    $scope.contact = contact;
    $scope.userid = userData.profile.userid;

    ngDialog.open({
      name: 'AddContact',
      template: 'partials/addToCustomList.html',
      showClose: false,
      scope: $scope,
      controller: 'AddToCustomListCtrl',
    });
  }



  $scope.showRoles = function(contact){

    $scope.protectedRoles = protectedRoles;
    $scope.contact = contact;
    $scope.userid = userData.profile.userid;
    $scope.profile = userData.profile; 
    ngDialog.open({
      name: 'AddRole',
      template: 'partials/addProtectedRoles.html',
      showClose: false,
      scope: $scope,
      controller: 'AddProtectedRolesCtrl',
    });

  }

  $scope.showGroups = function(contact){
  
    $scope.contact = contact;
    $scope.userid = userData.profile.userid;

    //This contains the logged in users profile.
    $scope.profile = userData.profile; 
    ngDialog.open({
      name: 'AddContact',
      template: 'partials/addProtectedGroups.html',
      showClose: false,
      scope: $scope,
      controller: 'AddProtectedGroupsCtrl',
    });

  }

  // Edit subscriptions
  $scope.editSubscriptionsModal = function(profile) {
    $scope.profile_selected = profile;
    ngDialog.open({
      template: 'partials/subscriptions.html',
      showClose: false,
      scope: $scope,
      controller: 'SubscriptionsCtrl',
    });
  }

  $scope.toggleFollow = function() {
    var list = $scope.list;
    var cb = function (data) {
      if (data && data.status && data.status === 'ok') {
        $scope.toggleFollowButton = $scope.toggleFollowButton === 'Follow' ? 'Unfollow': 'Follow';
      }
      else {
        $scope.flash.set('An error occurred while unfollowing this contact list. Please reload and try the change again.', 'danger');
      }
    };
    if ($scope.toggleFollowButton === 'Follow') {
      profileService.followList(list).then(cb);
    }
    else {
      profileService.unfollowList(list).then(cb);
    }
  }

  // Builds the list of contacts.
  function createContactList() {
    var query = $scope.query;

    if ($scope.locationId === 'global') {
      if ((!query.hasOwnProperty('localContacts') || !query.localContacts) && query.hasOwnProperty('disasters.remote_id') && query['disasters.remote_id']) {
        query.localContacts = true;
      }

      if (query.globalContacts && query.localContacts) {
        delete query.type;
      }
      else if (query.globalContacts) {
        query.type = 'global';
      }
      else if (query.localContacts) {
        query.type = 'local';
      }
      else {
        query.type = 'none';
      }
    }
    else {
      query.type = 'local';
      query.locationId = $scope.locationId;
    }

    if (query.verified) {
      query.verified = true;
    }
    else {
      delete query.verified;
    }
    if (query.keyContact) {
      query.keyContact = true;
    }
    else {
      delete query.keyContact;
    }

    if ($scope.isContactList) {
      query.contactList = true;
      delete query.type;
    }

    query.status = 1;
    query.limit = $scope.loadLimit;
    query.skip = $scope.contactsCount;
    if (!query.sort) {
      query.sort = $scope.sort;
    }

    // Custom contact list.
    if ($routeParams.id) {
      setCustomList($routeParams.id, query);
    } else {
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
  }

  function setCustomList(id, query) {
    var terms = query;
    terms.id = id;

    $scope.listPromise = profileService.getLists(terms).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $scope.list = data.lists;
        $scope.listCount = data.lists.length;
        $scope.queryCount = data.totalCount;

        $scope.toggleFollowButton = 'Follow';
        if ($scope.list.users.indexOf($scope.userData.profile.userid) != -1) {
          $scope.toggleFollowButton = 'Unfollow';
        }

        var contacts = data.lists.contacts;

        $scope.contactsCreated = true;
        $scope.contacts = contacts;
        $scope.contactsCount = contacts.length;

        if ($scope.list.editors && $scope.list.editors.length) {
          var checkEditor = $scope.list.editors.filter(function (value) {
            if (value.userid && value.userid == userData.profile.userid) {
              return value;
            }
          });
          $scope.isEditor = checkEditor.length ? true: false;
        }
      }
    });
  };

  // Converts object to a sortable array.
  function listObjectToArray(obj) {
    var listArray = [];
    angular.forEach(obj, function(v, k) {
      this.push({key:k, value: v});
    }, listArray);
    return listArray;
  }

}
