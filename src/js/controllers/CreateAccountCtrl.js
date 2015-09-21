function CreateAccountCtrl($scope, $location, $route, $http, profileService, authService, operations, globalProfileId, userData, gettextCatalog, countries) {
  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.organizations = [];
  $scope.selectedOrganization = [];
  $scope.hrinfoBaseUrl = contactsId.hrinfoBaseUrl;
  $scope.accountConfirm = false;
  $scope.ghostConfirm = false;
  $scope.confirmMessage = "";
  $scope.profile = {email:[{}], phone:[{}]};
  $scope.newProfileID;
  $scope.query = $location.search();
  $scope.countries = countries;

  // Setup scope variables from data injected by routeProvider resolve
  $scope.operations = operations;
  var availOperations = angular.copy(operations);

  // Convert list into a sorted array
  $scope.availOperations = [];
  angular.forEach(availOperations, function (value, key) {
    $scope.availOperations.push(value);
  });
  $scope.availOperations.sort(function (a, b) {
    return a.name && b.name ? String(a.name).localeCompare(b.name) : false;
  });

  $scope.back = function () {
    if (history.length) {
      history.back();
    }
    else {
      $location.path('/dashboard');
    }
  };

  $scope.validateAccount = function () {
    $scope.submitted = false;

    if ($scope.createAccountForm.$valid) {
      //Submit as normal
      //Check to see if the account already exists
      if ($scope.profile.email && $scope.profile.email[0].address){
        $scope.createAccount();
      }
      else if ($scope.ghostWarning) {
        // Have already seen ghost warning and want to cont.
        $scope.createAccount();
      }
      else {
        //Warn user of ghost account
        $scope.ghostWarning = true;
      }
    }
    else{
      //Form validation error
      $scope.submitted = true;
    }
  };

  $scope.createAccount = function () {
    var authID = "";
    var isGhost = false;
    var profile = $.extend(true, {}, $scope.profile);
    var name = profile.nameGiven + " " + profile.nameFamily;

    //Disable the create button until we are done saving the contact
    $scope.createButtonDisabled = true;

    if (!profile.email[0].address){
      isGhost = true;
    }

    if (profile.phone[0].number) {
      profile.phone[0].type = 'Mobile';
    }

    profile.userid = '';
    profile._profile = null;
    profile.status = 1;
    profile.type = 'local';
    profile.isNewContact = true;
    profile.adminName = userData.global.nameGiven + " " + userData.global.nameFamily;
    profile.adminEmail = userData.global.email && userData.global.email[0] ? userData.global.email[0].address : "";

    if ($scope.profile.location) {
      profile.locationId = $scope.profile.location.remote_id;
      profile.location = $scope.profile.location.name;
    }

    if ($scope.selectedOrganization){
      profile.organization = $scope.selectedOrganization;
    }

    profileService.saveContact(profile).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        if (isGhost){
          $scope.confirmTitle = gettextCatalog.getString("Name added to the list");
          $scope.confirmMessage = name + " " + gettextCatalog.getString("will be added to the contact list.  They will not be able to claim their account.");
        }
        else{
          $scope.confirmTitle = gettextCatalog.getString("Account Created!");
          $scope.confirmMessage = name + " " + gettextCatalog.getString("will receive an email to claim their account.");
        }
        $scope.editButtonText = gettextCatalog.getString('Edit New Account');
        $scope.editPath = '#/contact/' + data._id;
        $scope.accountConfirm = true;
        $scope.ghostWarning = false;
      }
      else {
        //If contact already exists and it was successfully returned, give the user the option to edit the contact
        if (data.contactExists && data.origContact){
          $scope.editContactId = data.origContact._profile;
          $scope.confirmTitle = gettextCatalog.getString("Contact already exists");
          $scope.confirmMessage = gettextCatalog.getString("There is already an account associated with ") + profile.email[0].address + "\n\n" + gettextCatalog.getString("Would you like to check them in?");
          $scope.editButtonText = gettextCatalog.getString('Check-in');
          $scope.editPath = '#/checkin/' + data.origContact._profile;
          $scope.accountConfirm = true;
          $scope.ghostWarning = false;
        }
        else{
          var msg = (data && data.message) ? 'Error: ' + data.message : 'An error occurred while attempting to save this profile. Please try again or contact an administrator.';
          alert(msg);
        }
      }
      $scope.createButtonDisabled = false;
    });
  };

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

  $scope.onSelect = function(item, qProp) {
    if (!item) {
      $scope.query[qProp] = undefined;
    }
    if (item.name && item.remote_id){
      $scope.selectedOrganization = item;
    }
  };

  $scope.resetAccount = function(){
    $scope.profile = {email:[{}], phone:[{}]};
    $scope.selectedOrganization = {};
    profile = {};
    $scope.accountConfirm = false;
    $scope.ghostConfirm = false;
    $location.path('/createaccount');
  };

  // Set the country based on the crisis chosen
  $scope.setCountry = function(item) {
    $scope.profile.address = new Array();
    $scope.profile.address[0] = {};
    $scope.profile.address[0].country = item.name;
  };

}
