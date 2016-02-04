function ListsCtrl($scope, $location, userData, profileService) {
  $scope.lists = [];
  $scope.query = $location.search();

  $scope.unfollow = function(list) {
    profileService.unfollowList(list).then(function(data) {
      if (data && data.status && data.status === 'ok') {
        list.isFollowing = false;
      }
      else {
        alert('An error occurred while unfollowing this contact list. Please reload and try the change again.');
      }
    });
  }

  $scope.submitSearch = function() {
    $scope.listsPromise = profileService.getLists($scope.query).then(function (response) {
      if (response.status == 200) {
        $scope.lists = response.data;
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

  $scope.submitSearch();
}

