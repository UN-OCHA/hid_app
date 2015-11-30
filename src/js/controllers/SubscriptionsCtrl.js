function SubscriptionsCtrl($scope, profileService, ngDialog) {
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
        ngDialog.openConfirm({
            template: 'partials/unsubscribeService.html',
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
}

