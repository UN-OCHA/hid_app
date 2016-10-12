function KioskCtrl($scope, $http, gettextCatalog, profileService, operations, countries) {
  $scope.operations = [];
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.countries = countries;
  $scope.selectedOrganization = {};

  angular.forEach(operations, function (value, key) {
    $scope.operations.push(value);
  });
  $scope.operations.sort(function (a, b) {
    return a.name && b.name ? String(a.name).localeCompare(b.name) : false;
  });

  $scope.onSelect = function(item, qProp) {
    if (!item) {
      $scope.query[qProp] = undefined;
    }
    if (item.name && item.remote_id){
      $scope.selectedOrganization = item;
    }
  };

  $scope.refreshOrganization = function(select, lengthReq) {
    var helpOption = {action:'clear', name:"", alt: gettextCatalog.getString('Search term must be at least 3 characters long.'), disable: true},
        emptyOption = {action:'clear', name:"", alt: gettextCatalog.getString('No results found.'), disable: true};

    // Remove text in parentheses.
    select.search = select.search.replace(/ *\([^)]*\) */g, "");

    if (select.search.length > (lengthReq || 0)) {
      select.searching = true;
      $http.get($scope.hrinfoBaseUrl + '/hid/organizations/extended/autocomplete/' + encodeURIComponent(select.search))
        .then(function(response) {
          select.searching = false;
          $scope.organizations = [];
          angular.forEach(response.data, function(value, key) {
            this.push({
              'name': value.name,
              'org_type_name': value.org_type_name,
              'org_type_remote_id': value.org_type_id,
              'remote_id': key
            });
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

  // Set the country based on the crisis chosen
  $scope.setCountry = function(item) {
    $scope.profile.address = new Array();
    $scope.profile.address[0] = {};
    $scope.profile.address[0].country = item.name;
  };

  $scope.validateAccount = function () {
    $scope.submitted = false;

    if ($scope.createAccountForm.$valid) {
      //Submit as normal
      $scope.createAccount();
    }
    else{
      //Form validation error
      $scope.submitted = true;
    }
  };

  $scope.createAccount = function () {
    var authID = "";
    var profile = $.extend(true, {}, $scope.profile);
    var name = profile.nameGiven + " " + profile.nameFamily;

    //Disable the create button until we are done saving the contact
    $scope.createButtonDisabled = true;

    if (profile.phone && profile.phone[0] && profile.phone[0].number) {
      var phone = profile.phone;
      profile.phone = new Array();
      profile.phone[0] = {};
      profile.phone[0].number = phone[0].number;
      profile.phone[0].type = 'Mobile';
    }

    if (profile.email && profile.email[0] && profile.email[0].address) {
      var email = profile.email;
      profile.email = new Array();
      profile.email[0] = {};
      profile.email[0].address = email[0].address;
      profile.email[0].type = 'Work';
    }

    profile.userid = '';
    profile._profile = null;
    profile.status = 1;
    profile.type = 'local';
    profile.isNewContact = true;
    profile.notify = true;
    profile.expires = true;
    profile.expiresAfter = 7 * 24 * 3600; // Expires profiles created through the kiosk after 7 days
    //profile.adminName = userData.global.nameGiven + " " + userData.global.nameFamily;
    //profile.adminEmail = userData.global.email && userData.global.email[0] ? userData.global.email[0].address : "";

    if ($scope.profile.location) {
      profile.locationId = $scope.profile.location.remote_id;
      profile.location = $scope.profile.location.name;
    }

    if ($scope.selectedOrganization){
      profile.organization = $scope.selectedOrganization;
    }

    profileService.saveContact(profile).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $scope.flash.set('Thank you for checking into ' + profile.location + ', ' + name + '. You will receive an email to claim your account. Please claim it within 7 days, otherwise your account will be deleted.', 'success', true, 10000);
      }
      else {
        //If contact already exists and it was successfully returned, give the user the option to edit the contact
        if (data.contactExists && data.origContact){
          $scope.flash.set('Thank you for checking into ' + profile.location + ', ' + name + '. The email address you provided was already associated with an existing account, so your account was checked into ' + profile.location + '.', 'success', true, 10000);
        }
        else{
          var msg = (data && data.message) ? 'Error: ' + data.message : 'An error occurred while attempting to save this profile. Please try again or contact an administrator.';
          $scope.flash.set(msg, 'danger');
        }
      }
      var location = $scope.profile.location;
      var address = $scope.profile.address;
      $scope.profile = {};
      $scope.profile.location = location;
      $scope.profile.address = address;
      $scope.createButtonDisabled = false;
    });
  };



  

}

