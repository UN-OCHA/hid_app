function ContactCtrl($scope, $route, $routeParams, $filter, profileService, gettextCatalog, userData, protectedRoles, profileData) {
  var contact = profileData.contact;
  $scope.contact = contact;
  $scope.profileContacts = profileData.contacts;
  $scope.globalContactId = profileData.global._id;

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
    var role = roleFilter(protectedRoles,function(d) { return d.id === value;});
    if (role && role[0] && role[0].name){
      var roleName = role[0].name;
      this.push(roleName);
    }
  }, $scope.contact.protectedRolesByName);

  if (profileData.global.image && profileData.global.image[0] && profileData.global.image[0].url) {
    $scope.imageUrl = profileData.global.image[0].url;
  }

  $scope.contact.disastersString = $scope.contact.disasters.reduce(function (last, val) { return last ? (last + ', ' + val.name) : val.name; }, '');

  if ($scope.contact.departureDate) {
    var date = new Date($scope.contact.departureDate),
        dd = date.getDate(),
        mm = date.getMonth()+1,
        yyyy = date.getFullYear();

    dd = (dd<10) ? '0' + dd : dd;
    mm = (mm<10) ? '0' + mm : mm;

    $scope.contact.displayDepartureDate = yyyy + "-" + mm + "-" + dd;
  }

  $scope.locationText = function() {
    return $scope.contact.location || gettextCatalog.getString('Global');
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
      if (userData.global.email && userData.global.email[0] && userData.global.email[0].address) {
        email.adminEmail = userData.global.email[0].address;
      }
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
          alert('An error occurred while attempting to send the account claim email. Please try again or contact an administrator.');
        }
      });
    }
  }
}
