function ContactCtrl($scope, $route, $location, $routeParams, $filter, profileService, gettextCatalog, userData, protectedRoles, profileData, ngDialog, md5) {
  var filter = $filter('filter');
  var contact = null;

  profileData.contacts.forEach(function (cont) {
    if (cont._id == $routeParams.contactId) {
      contact = cont;
    }
  });


  if (!contact) {
    $scope.flash.set('Sorry, you are not allowed to see this contact or this contact does not exist.', 'danger', false);
  }
  else {

    $scope.contact = contact;
    $scope.profileContacts = profileData.contacts;
    $scope.globalContactId = profileData.global ? profileData.global._id : '';
    $scope.profile = profileData.profile;
    if (!contact.status) {
      if (contact.type === 'local') {
        $scope.flash.set('This contact is already checked out and kept for archive reasons only', 'danger', false);
      }
      else if (contact.type === 'global') {
        $scope.flash.set('This contact has been deleted and is kept for archive reasons only', 'danger', false);
      }
    }

    // Permissions
    var isOwnProfile = userData.profile._id === contact._profile;
    $scope.userCanEditProfile = contact.status && (isOwnProfile || profileService.canEditProfile(contact.locationId));
    $scope.userCanCheckIn = contact.status && profileService.canCheckIn($scope.profile);
    $scope.userCanCheckOut = contact.status && profileService.canCheckOut(contact);
    // Allow sending an orphan user claim email if the user has not made an edit
    // on HID, the contact has an email address (is not a ghost), and the actor
    // is an admin or a manager/editor in the location of this contact.
    $scope.userCanSendClaimEmail = contact.status && profileService.canSendClaimEmail(contact);
    var hasRoleAdmin = profileService.hasRole('admin');
    $scope.userIsAdmin = hasRoleAdmin;
    // Get Gravatar URL
    $scope.gravatarUrl = '';
    var userEmails = (profileData.profile && profileData.profile._userid) ? profileData.profile._userid.split('_') : [];
    if (!userEmails || !userEmails.length) {
      userEmails = (profileData.profile && profileData.profile.userid) ? profileData.profile.userid.split('_') : [];
    }
    if (userEmails && userEmails.length) {
      var userEmail = userEmails[0];
      userEmail = md5.createHash(userEmail.trim().toLowerCase());
      $scope.gravatarUrl = 'https://secure.gravatar.com/avatar/' + userEmail + '?s=200&d=' + encodeURIComponent('https://app.humanitarian.id/images/avatar.png');
    }

  if($location.$$search.disasterAdded != null ){
    if($location.$$search.disasterAdded){
      var disasterName = $scope.contact.disasters[$scope.contact.disasters.length-1].name
      $scope.flash.set('Thank you for adding ' + disasterName +' to your profile', 'success');
    }
    else
      $scope.flash.set('There was an error updating your profile', 'danger');
  }
  // Permissions
  var isOwnProfile = userData.profile._id === contact._profile;
  $scope.userCanEditProfile = contact.status && (isOwnProfile || profileService.canEditProfile(contact.locationId));
  $scope.userCanCheckIn = contact.status && profileService.canCheckIn($scope.profile);
  $scope.userCanCheckOut = contact.status && profileService.canCheckOut(contact);
  // Allow sending an orphan user claim email if the user has not made an edit
  // on HID, the contact has an email address (is not a ghost), and the actor
  // is an admin or a manager/editor in the location of this contact.
  $scope.userCanSendClaimEmail = contact.status && profileService.canSendClaimEmail(contact);
  var hasRoleAdmin = profileService.hasRole('admin');
  $scope.userIsAdmin = hasRoleAdmin;
  // Get Gravatar URL
  $scope.gravatarUrl = '';
  var userEmails = (profileData.profile && profileData.profile._userid) ? profileData.profile._userid.split('_') : [];
  if (!userEmails || !userEmails.length) {
    userEmails = (profileData.profile && profileData.profile.userid) ? profileData.profile.userid.split('_') : [];
  }
  if (userEmails && userEmails.length) {
    var userEmail = userEmails[0];
    userEmail = md5.createHash(userEmail.trim().toLowerCase());
    $scope.gravatarUrl = 'https://secure.gravatar.com/avatar/' + userEmail + '?s=200&d=' + encodeURIComponent('https://app.humanitarian.id/images/avatar.png');
  }


    $scope.contact.protectedRolesByName = [];
    angular.forEach($scope.contact.protectedRoles, function(value, key) {
      var role = filter(protectedRoles,function(d) { return d.id === value;});
      if (role && role[0] && role[0].name){
        var roleName = role[0].name;
        this.push(roleName);
      }
    }, $scope.contact.protectedRolesByName);

    if (profileData.global && profileData.global.image && profileData.global.image[0] && profileData.global.image[0].url) {
      $scope.imageUrl = profileData.global.image[0].url;
    }

    $scope.contact.disastersString = $scope.contact.disasters.reduce(function (last, val) { return last ? (last + ', ' + val.name) : val.name; }, '');

    $scope.isOrganizationEditor = profileService.isOrganizationEditor(userData.profile, profileData);
    setEditorOrganizations();

    $scope.addedToContacts = false;
    // Check if contact is added to My Contacts.
    if (userData.profile.contactLists && userData.profile.contactLists.length) {
      var listMatch = filter(userData.profile.contactLists, function(d) {return d.name === "contacts"});
      if (listMatch.length && listMatch[0].contacts && listMatch[0].contacts.length) {
        if (listMatch[0].contacts.indexOf(contact._id) !== -1) {
          $scope.addedToContacts = true;
        }
      }
    }

    if ($scope.contact.departureDate) {
      $scope.contact.displayDepartureDate =  formatDate($scope.contact.departureDate);
    }

    if ($scope.contact.revised){
      $scope.contact.displayRevisedDate = formatDateTime($scope.contact.revised);
    }

    if ($scope.contact.created){
      $scope.contact.displayCreatedDate = formatDateTime($scope.contact.created);
    }

 
    $scope.locationText = function() {
      return $scope.contact.location || gettextCatalog.getString('Global');
    }

    $scope.contactListText = function() {
      return gettextCatalog.getString('Add to List');
      //return $scope.addedToContacts ? gettextCatalog.getString('Remove from My Contacts') : gettextCatalog.getString('Add to My Contacts');
    }

    $scope.setHttp = function (uri) {
      if (uri.search(/^http[s]?\:\/\//) == -1) {
          uri = 'http://' + uri;
      }
      return uri;
    }

    $scope.phoneDisplay = function (number) {
      if (number) {
        var parts = number.split(',');
        number = parts[1] ? parts[0] +' ext. ' + parts[1] : number;
      }

      return number;
    }

    $scope.back = function () {
      if (history.length) {
        history.back();
      }
      else {
        $location.path('/dashboard');
      }
    }

    $scope.updateContactList = function () {
      profileService.saveToContactList(contact._id, $scope.addedToContacts).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          profileService.clearData();
          $route.reload();
        }
        else {
          alert('error');
        }
      });
    }

    $scope.checkout = function (cid) {
      var contact = {
        _id: $scope.contact._id,
        _profile: profileData.profile._id,
        userid: profileData.profile.userid,
        status: 0
      };
      if (!$scope.userCanCheckOut) {
        return;
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
    }

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
    }

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
            if (data.message) {
              alert(data.message);
            }
            else {
              alert('An error occurred while attempting to send the account claim email. Please try again or contact an administrator.');
            }
          }
        });
      }
    }

    $scope.updateOrganization = function () {
      var newOrg = [];
      var contact = {
        _id: $scope.contact._id,
        _profile: $scope.profile,
        userid: $scope.profile
      };

      if ($scope.selectedOrg){
        if ($scope.selectedOrg.organizationId != 0){
          newOrg = [{name: $scope.selectedOrg.organizationName, remote_id: $scope.selectedOrg.organizationId}];
        }
        contact.organization = newOrg;
      }

      profileService.saveContact(contact).then(function(data) {
        if (data && data.status && data.status === 'ok') {
          profileService.clearData();
          $scope.back();
        }
        else {
          alert('error');
        }
      }, function(reason) {
          alert('error: ' + reason);
      });
    }

    $scope.reportProblem = function () {
      $scope.sendingNotifyEmail = true;
      profileService.sendNotificationEmail(contact._id).then(function(data) {
        $scope.sendingNotifyEmail = false;
        $scope.contact.confirmNotify = false;
        if (data.status === 'ok') {
          alert('Email sent successfully.');
        }
        else {
          alert('An error occurred while attempting to send the report problem email. Please try again or contact an administrator.');
        }
      });
    };

    // Add contact to the custom list.
    $scope.addContact = function() {
      $scope.contact = $scope.contact;
      $scope.userid = userData.profile.userid;
      $scope.userData = userData;

      ngDialog.open({
        name: 'AddContact',
        template: 'partials/addToCustomList.html',
        showClose: false,
        scope: $scope,
        controller: 'AddToCustomListCtrl',
      });
    }

    // Edit subscriptions
    $scope.editSubscriptionsModal = function() {
      $scope.profile_selected = $scope.profile;
      ngDialog.open({
        template: 'partials/subscriptions.html',
        showClose: false,
        scope: $scope,
        controller: 'SubscriptionsCtrl',
      });
    }

    function setEditorOrganizations() {
      var editorOrgs = [];
      var profile;
      var locationId;

      if ($scope.isOrganizationEditor){
        locationId = profileData.contact.locationId;
        var orgEditorRole = $filter('filter')(userData.profile.orgEditorRoles, {locationId: locationId}, true);
        if (orgEditorRole){
          editorOrgs.push(orgEditorRole[0]);
        }

        //Add a 'No Organization' item
        var removeOrg = {organizationName: 'Not affiliated with an organization', organizationId: 0 };
        editorOrgs.push(removeOrg);
        $scope.organizationOptions = editorOrgs;
      }

      if (editorOrgs[0]){
        $scope.selectedOrg = editorOrgs[0];
      }
    }

    function formatDate(dateValue){
      var date = new Date(dateValue),
      dd = date.getDate(),
      mm = date.getMonth()+1,
      yyyy = date.getFullYear(),
      dateString = '';

      dd = (dd<10) ? '0' + dd : dd;
      mm = (mm<10) ? '0' + mm : mm;

      dateString = yyyy + "-" + mm + "-" + dd;
      return dateString;
    }

    function formatDateTime(dateTimeValue){
      var date = new Date(dateTimeValue),
      dd = date.getDate(),
      mm = date.getMonth()+1,
      yyyy = date.getFullYear(),
      hh = date.getHours(),
      mmm = date.getMinutes(),
      dateString = '';

      dd = (dd<10) ? '0' + dd : dd;
      mm = (mm<10) ? '0' + mm : mm;
      hh = (hh<10) ? '0' + hh : hh;
      mmm = (mmm<10) ? '0' + mmm : mmm;

      dateString = yyyy + "-" + mm + "-" + dd + '  ' + hh + ':' + mmm;
      return dateString;
    }
  }
}
