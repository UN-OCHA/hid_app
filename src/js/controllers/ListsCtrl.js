function ListsCtrl($scope, $location, userData, profileService) {
  $scope.lists = [];
  $scope.query = $location.search();
  $scope.queryCount = 0;
  $scope.totalCount = 0;
  $scope.listComplete = false;
  $scope.itemsPerPage = 30;
  $scope.listsPromise;
  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';

  $scope.unfollow = function(list) {
    profileService.unfollowList(list).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        list.isFollowing = false;
      }
      else {
        $scope.flash.set('An error occurred while unfollowing this contact list. Please reload and try the change again.', 'danger');
      }
    });
  }

  $scope.loadMoreLists = function(inview, inviewpart) {
    // Don't do anything if elem not completely visible
    if (!inview || inviewpart !== 'both') {
      return;
    }

    if ($scope.queryCount < $scope.totalCount) {
      $scope.submitSearch($scope.queryCount, $scope.itemsPerPage);
    }
    else {
      $scope.listComplete = true;
    }
  }

  $scope.submitSearch = function(skip, limit) {
    $scope.query.limit = limit;
    $scope.query.skip = skip;
    $scope.listsPromise = profileService.getLists($scope.query).then(function (response) {
      if (response.status == 200) {
        $scope.lists = $scope.lists.concat(response.data);
        $scope.totalCount = response.headers('X-Total-Count');
        $scope.queryCount = limit + skip;
        if ($scope.queryCount > $scope.totalCount) {
          $scope.queryCount = $scope.totalCount;
        }
        $scope.lists.forEach(function (list) {
          list.editAllowed = false;
          list.isFollowing = false;
          if (list.userid == userData.profile.userid || (list.editors && list.editors.indexOf(userData.profile._id) != -1)) {
            list.editAllowed = true;
          }
          if (list.users && list.users.indexOf(userData.profile.userid) != -1) {
            list.isFollowing = true;
          }
        });
      }
    });
  }

  $scope.submitSearch(0, $scope.itemsPerPage);
}

