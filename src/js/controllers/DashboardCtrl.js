function DashboardCtrl($scope, $route, $filter, $window, $location, profileService, globalProfileId, userData, operations) {
  var filter = $filter('filter');

  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.userCanCreateAccount = profileService.canCreateAccount();
  $scope.localContacts = filter(userData.contacts, function(d){ return d.type === "local"})

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

  $scope.cacheCustomLists();


  $scope.customContactsPromise = profileService.getLists().then(function(data) {
    if (data && data.status && data.status === 'ok') {
      $scope.customContacts = data.lists;
    }
  });

  $scope.unfollowContactList = function(list, index) {
    var updatedUsers = [];
    angular.forEach(list.users, function(user, key) {
      if (user != $scope.userData.profile.userid) {
        this.push(user);
      }
    }, updatedUsers);

    list.users = updatedUsers;

    profileService.saveList(list).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        list.users = updatedUsers;
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

  $scope.share = function (checkinName, network){
    var baseLink = "", params={}, size="";
    switch (network){
      case 'facebook':
        baseLink = "https://www.facebook.com/dialog/share?";
        params = {
          app_id: 593963747410690,
          caption: 'Humanitarian ID - always my latest details.',
          description: 'In a humanitarian crisis, an accurate contact list is critical to help ensure an effective response. You can "check-in" to a crisis and provide your locally relevant contact details. When you leave the crisis, you simply "check-out".',
          title: 'I\'ve just checked into '+checkinName+'!', //use name if using feed share
          picture: 'http://humanitarian.id/wp-content/uploads/2015/08/HID_fbshare.png',
          href: 'http://humanitarian.id',
          redirect_uri: 'http://humanitarian.id/close.html',
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
          title: 'I\'ve just been deployed to '+checkinName+'!',
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
}
