function DashboardCtrl($scope, $route, $filter, $window, $location, $timeout, profileService, globalProfileId, userData, operations, ngDialog, gettextCatalog) {
  var filter = $filter('filter');

  $scope.logoutPath = '/#logout';
  $scope.globalProfileId = globalProfileId;
  $scope.userData = userData;
  $scope.userCanCreateAccount = profileService.canCreateAccount();
  $scope.localContacts = filter(userData.contacts, function(d){ return d.type === "local"});
  $scope.isAdmin = userData.profile && userData.profile.roles ? userData.profile.roles.indexOf('admin') != -1 : false;
  $scope.isManager = profileService.hasRole('manager');

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


  $scope.customContactsPromise = profileService.getListsForUser(userData.profile).then(function(data) {
    if (data) {
      $scope.customContacts = data;
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
            if (!$scope.customContacts[key].isFollower && $scope.customContacts[key].userid != $scope.userData.profile.userid) {
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

  $scope.subscriptionsPromise = profileService.getSubscriptions(userData.profile).then(function (response) {
    if (response.status == 200) {
      $scope.subscriptions = response.data;
      $scope.subscriptions.forEach(function (subscription) {
        subscription.service.editAllowed = false;
        if (userData.profile.roles.indexOf('admin') != -1 || service.userid == userData.profile.userid) {
          subscription.service.editAllowed = true;
        }
      });
    }
  });

  $scope.unsubscribeDialog = function (service) {
    $scope.service = service;
    $scope.title = gettextCatalog.getString("Confirm unsubscription");
    $scope.message = gettextCatalog.getString("Are you sure you want to unsubscribe from {{name}} ?", { name: service.name });
    ngDialog.openConfirm({
      template: 'partials/confirm.html',
      scope: $scope
    }).then(function () {
      profileService.unsubscribeService(service, userData.profile).then(function (response) {
        var index = -1;
        for (var i = 0; i < $scope.subscriptions.length; i++) {
          if ($scope.subscriptions[i].service._id === service._id) {
            index = i;
          }
        }
        $scope.subscriptions.splice(index, 1);
      }, function (message) {
        alert('There was an error unsubscribing: ' + message);
      });
    });
  }

  $scope.servicesSearch = function () {
    $location.path('/services').search('q', $scope.servicesText);
  }

  $scope.listsSearch = function () {
    $location.path('/lists').search('q', $scope.listsText);
  }

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
  
  $scope.FBShare = function(){
    FB.ui(
    {
      method: 'share',
      href: 'http://humanitarian.id',
      app_id: 593963747410690,
      redirect_uri: 'http://about.humanitarian.id/close.html',
      display: 'iframe',
      caption: 'Humanitarian ID - always my latest details.',
      description: 'In a humanitarian crisis, an accurate contact list is critical to help ensure an effective response. You can "check-in" to a crisis and provide your locally relevant contact details. When you leave the crisis, you simply "check-out".',
      picture: 'http://about.humanitarian.id/wp-content/uploads/2015/08/HID_fbshare.png',
    });
  }


  $scope.share = function (checkinName, network){
    var baseLink = "", params={}, size="";
    var title = 'I\'ve just checked into '+checkinName+'!';
    if (checkinName == 'Humanitarian ID') {
      title = 'I have joined Humanitarian ID !';
    }
    switch (network){
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

  $scope.toOperation = function(country) {
    $location.path('/list/' + country.remote_id);
  };

  $scope.toDisaster = function(disaster) {
    $location.path('/list/global').search("disasters.remote_id", disaster.remote_id);
  };
}
