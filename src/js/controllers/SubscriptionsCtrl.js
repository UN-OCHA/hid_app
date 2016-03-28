function SubscriptionsCtrl($scope, profileService, ngDialog, gettextCatalog) {
    profileService.getSubscriptions($scope.profile_selected).then(function(response) {
        if (response.status == 200) {
            $scope.subscriptions = response.data;
            $scope.subscriptions.forEach(function(subscription) {
                subscription.service.editAllowed = false;
            });
        }
    });

    $scope.unsubscribeDialog = function(service) {
        $scope.service = service;
        $scope.title = gettextCatalog.getString("Confirm unsubscription");
        $scope.message = gettextCatalog.getString("Are you sure you want to unsubscribe from {{name}} ?", { name: service.name });
        ngDialog.openConfirm({
            template: 'partials/confirm.html',
            scope: $scope,
        }).then(function() {
            profileService.unsubscribeService(service, $scope.profile_selected).then(function(response) {
                var index = -1;
                for (var i = 0; i < $scope.subscriptions.length; i++) {
                    if ($scope.subscriptions[i].service._id === service._id) {
                        index = i;
                    }
                }
                if (index != -1) {
                    $scope.subscriptions.splice(index, 1);
                }
            }, function(message) {
                alert('There was an error unsubscribing: ' + message);
            });
        });
    }

    $scope.addSubscriptionDialog = function () {
      ngDialog.open({
        template: 'partials/subscriptionsAdd.html',
        showClose: false,
        scope: $scope,
        controller: 'SubscriptionsAddCtrl',
      });
    }

}

function SubscriptionsAddCtrl($scope, profileService, ngDialog) {
  $scope.services = [];
  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';
  $scope.query = {};
  $scope.userEmails = [];

  $scope.subscribeDialog = function(service) {
    profileService.getProfileById($scope.profile_selected._id).then(function (data) {
      if (data && data.contacts) {
        data.contacts.forEach(function (item) {
          if (item.email && item.email.length) {
            item.email.forEach(function (email) {
              if ($scope.userEmails.indexOf(email.address) === -1) {
                $scope.userEmails.push(email.address);
              }
            });
          }
        });
        ngDialog.open({
          template: 'partials/subscribeService.html',
          showClose: false,
          scope: $scope,
          controller: ['$scope', 'profileService', function ($scope, profileService) {
            $scope.service = service;
            $scope.email = '';
            $scope.subscribe = function () {
              profileService.subscribeService(service, $scope.email, $scope.profile_selected).then(function (response) {
                if (response.status === 204) {
                  $scope.subscriptions.push({'email': $scope.email, 'service': service});
                  $scope.closeThisDialog();
                  service.subscribed = true;
                }
              }, function (message) {
                alert(message);
              });
            };
          }]
        });
      }
    });
  }

  $scope.submitSearch = function() {
    $scope.query.status = true;
    $scope.servicesPromise = profileService.getServices($scope.query).then(function (response) {
      if (response.status == 200) {
        $scope.services = response.data;
        $scope.services.forEach(function (service) {
          service.subscribed = false;
          if ($scope.profile_selected.subscriptions) {
            $scope.profile_selected.subscriptions.forEach(function (sub) {
              if (sub.service === service._id) {
                service.subscribed = true;
              }
            });
          }
        });

      }
    });
  }
}

