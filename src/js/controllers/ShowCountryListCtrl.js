function ShowCountryListCtrl($scope, profileService) {

  var temp = $scope.countryList;
  var profile = $scope.temp;
  $scope.countries = [];
  $scope.customCountries = angular.forEach(temp , function(value, key){
      var list = value;
      list.addToList = false;
      
      if(profile.profile.dailyDigest.indexOf(value.locationId) != -1){
        list.addToList = true;
      }  
      this.push(list)
   }, $scope.countries)



 
  $scope.addToList = function (list) {
    list.addToList = list.addToList === false ? true: false;
  }

  $scope.updateContact = function(){
    var globalProfile = $scope.temp.contacts[0];
    globalProfile.dailyDigest = [];

    $scope.countries.forEach(function(country){
      if(country.addToList){
        globalProfile.dailyDigest.push(country.locationId);
      }
    });

      var userid = $scope.userid;
      var _profile =   $scope._profile;
      globalProfile.userid = userid;
      profileService.saveContact(globalProfile).then(function(data) {
        if (data && data.status && data.status === 'ok') {
            $scope.flash.set('Updated', 'success');
        }
        else {
            $scope.flash.set('There was an error updating this profile.', 'danger');
        }

      });    
    $scope.closeThisDialog();
  }
}
