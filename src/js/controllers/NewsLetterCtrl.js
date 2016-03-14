function NewsLetterCtrl($scope, $location, $route, $routeParams, profileService, userData, ngDialog, gettextCatalog){
  $scope.alerts = [];
  $scope.services = [];
  $scope.temp = [];
  $scope.countryName 
  $scope.spinTpl = contactsId.sourcePath + '/partials/busy2.html';
  $scope.query = $location.search();
  $scope.userEmails = [];
  $scope.isCheckingIn = false;

  userData.contacts.forEach(function (item) {
    if (item.email && item.email.length) {
      item.email.forEach(function (email) {
        if ($scope.userEmails.indexOf(email.address) === -1) {
          $scope.userEmails.push(email.address);
        }
      });
    }
  });

  $scope.subscribeToNewsLetter = function(){
    $scope.query.status = true;
    $scope.servicesPromise = profileService.getServices($scope.query).then(function (response) {
      if (response.status == 200) {
        response.data.forEach(function (service) {
          if(service.name == 'Humanitarian ID News'){
            $scope.email =  userData.global.email[0].address;
            profileService.subscribeService(service, $scope.email, userData.profile).then(function (response) {
              if (response.status === 204) {
                service.subscribed = true;
              }
            }, function (message) {
              $scope.flash.set(message, 'danger');
            });
          }
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
          if(service.length != 0){
            var index = $scope.services.indexOf(service);
            $scope.services.splice(0, index);
          }
          if (userData.profile.subscriptions) {
            userData.profile.subscriptions.forEach(function (sub) {
              if (sub.service === service._id) {
                service.subscribed = true;
              }
            });
          }
        }); 
      }
    });
  }

  $scope.subscribeDialog = function(service) {
    ngDialog.open({
      template: 'partials/subscribeService.html',
      showClose: false,
      scope: $scope,
      controller: ['$scope', 'profileService', function ($scope, profileService) {
        $scope.service = service;
        $scope.email = '';
        $scope.subscribe = function () {
          profileService.subscribeService(service, $scope.email, userData.profile).then(function (response) {
            if (response.status === 204) {
              $scope.closeThisDialog();
              service.subscribed = true;
            }
          }, function (message) {
            $scope.flash.set(message, 'danger');
          });
        };
      }]
    });
  }

  $scope.unsubscribeDialog = function (service) {
    $scope.title = gettextCatalog.getString("Confirm unsubscription");
    $scope.message = gettextCatalog.getString("Are you sure you want to unsubscribe from {{name}} ?", { name: service.name });
    ngDialog.openConfirm({
      template: 'partials/confirm.html',
      scope: $scope,
    }).then(function () {
      profileService.unsubscribeService(service, userData.profile).then(function (response) {
        service.subscribed = false;
      }, function (message) {
        $scope.flash.set('There was an error unsubscribing: ' + message, 'danger');
      });
    });
  }

  $scope.submitSearch();  
  $scope.subscribeToNewsLetter();


}
