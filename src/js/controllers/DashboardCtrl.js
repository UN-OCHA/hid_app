function DashboardCtrl($scope, $route, $filter, $window, $location, $timeout, profileService, globalProfileId, userData, operations) {
  var filter = $filter('filter');

  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.userCanCreateAccount = profileService.canCreateAccount();
  $scope.localContacts = filter(userData.contacts, function(d){ return d.type === "local"})

  $scope.operations = operations;

  // Exclude operations for which the user is already checked in.
  var availOperations = angular.copy(operations);

  // Convert list into a sorted array
  $scope.availOperations = [];
  angular.forEach(availOperations, function (value, key) {
    $scope.availOperations.push(value);
  });
  $scope.availOperations.sort(function (a, b) {
    return a.name && b.name ? String(a.name).localeCompare(b.name) : false;
  });

  $timeout(function(){
    $scope.cacheCustomLists();
  }, 2000);
  var allDisasters = {};
  $scope.disasterOptions = [];
  angular.forEach($scope.availOperations, function (oper, opId) {
    if (oper.disasters) {
      angular.forEach(oper.disasters, function (dstr) {
        if (dstr.remote_id && dstr.name && !this.hasOwnProperty(dstr.remote_id)) {
          this[dstr.remote_id] = dstr;
        }
      },allDisasters);
    }
  });
  angular.forEach(allDisasters, function (val, key){
    this.push(val);
  },$scope.disasterOptions);


  $scope.customContactsPromise = profileService.getLists().then(function(data) {
    if (data && data.status && data.status === 'ok') {
      $scope.customContacts = data.lists;
      if ($scope.customContacts.length > 0) {
        var del = [];
        angular.forEach($scope.customContacts, function (value, key) {
          $scope.customContacts[key].isEditor = false;
          $scope.customContacts[key].isFollower = false;
          if (value.editors && value.editors.length) {
            $scope.customContacts[key].isEditor = value.editors.indexOf($scope.userData.profile._id) == -1 ? false : true;
          }
          if (value.users && value.users.length) {
            $scope.customContacts[key].isFollower = value.users.indexOf($scope.userData.profile.userid) == -1 ? false : true;
            if (!$scope.customContacts[key].isFollower) {
              del.push(key);
            }
          }
        });
        $scope.customContacts = $scope.customContacts.filter(function (value, index) {
          if (del.indexOf(index) == -1) {
            return value;
          }
        });
        $scope.customContacts = $scope.customContacts.sort(function (a, b) {
          var aname = a.name.toUpperCase();
          var bname = b.name.toUpperCase();
          if (aname > bname)
            return 1;
          if (aname < bname)
            return -1;
          return 0;
        });
      }
    }
  });

  $scope.unfollowContactList = function(list, index) {
    profileService.unfollowList(list).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        $scope.customContacts.splice(index, 1);
      }
      else {
        alert('An error occurred while unfollowing this contact list. Please reload and try the change again.');
      }
    });
  }

  // TODO: Handle validation in a later ticket.
  $scope.addCustomContactList = function(list) {
    profileService.saveList(list).then(function(data) {
      if (data && data.status && data.list && data.status === 'ok') {
        // Add the newly created list to the model then clear it.
        $scope.customContacts.push(data.list);
        $scope.list = {};
      }
      else {
        alert('An error occurred while saving this contact list. Please reload and try the change again.');
      }
    });
  }

  $scope.checkout = function (cid) {
    var contact = {
      _id: cid,
      _profile: $scope.userData.profile._id,
      userid: $scope.userData.profile.userid,
      status: 0
    };
    profileService.saveContact(contact).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        profileService.clearData();
        $route.reload();
      }
      else {
        alert('error');
      }
    });
  };

  $scope.qlOpen = -1;

  $scope.share = function (checkinName, network){
    var baseLink = "", params={}, size="";
    var title = 'I\'ve just checked into '+checkinName+'!';
    if (checkinName == 'Humanitarian ID') {
      title = 'I have joined Humanitarian ID !';
    }
    switch (network){
      case 'facebook':
        baseLink = "https://www.facebook.com/dialog/share?";
        params = {
          app_id: 593963747410690,
          caption: 'Humanitarian ID - always my latest details.',
          description: 'In a humanitarian crisis, an accurate contact list is critical to help ensure an effective response. You can "check-in" to a crisis and provide your locally relevant contact details. When you leave the crisis, you simply "check-out".',
          title: title,
          picture: 'http://about.humanitarian.id/wp-content/uploads/2015/08/HID_fbshare.png',
          href: 'http://humanitarian.id',
          redirect_uri: 'http://about.humanitarian.id/close.html',
          // locale: 'en_US',
          display: 'iframe',
          sdk: 'joey'//,
          // version: 'v2.2'
        }
        size = 'width=550,height=650';
        break;
      case 'linkedin':
        baseLink = "http://www.linkedin.com/shareArticle?";
        params = {
          mini: true,
          url: 'http://humanitarian.id',
          title: title,
          summary: 'In a humanitarian crisis, an accurate contact list is critical to help ensure an effective response. You can "check-in" to a crisis and provide your locally relevant contact details. When you leave the crisis, you simply "check-out".',
          source: 'Humanitarian ID'
        }
        size = 'width=550,height=500';
        break;
    }
    //use utils.encodeURL
    angular.forEach(params,function(value,key){
      baseLink += encodeURIComponent(key) + '=' + encodeURIComponent(value) + '&';
    });
    baseLink = baseLink.substring(0, baseLink.length-1); //chop off last "&"
    
    $window.open(baseLink, 'sharer', size);
  };

  $scope.toOperation = function() {
    $location.path('/list/' + $scope.item.remote_id);
  };

  $scope.toDisaster = function() {
    $location.path('/list/global').search("disasters.remote_id", $scope.item.remote_id);
  };
}
