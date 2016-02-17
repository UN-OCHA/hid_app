function ShowCountryListCtrl($scope, profileService) {

  var temp = $scope.temp;
  // console.log(temp);

  $scope.countries = [];
  $scope.customCountries = angular.forEach(temp.contacts, function(value, key){
    if(value.type == "local"){
      var list = value;
      list.addToList = false;
      if(list.localDailyDigest)
        list.addToList = true;
      this.push(list)
    }
   }, $scope.countries)

  $scope.addToList = function (list) {
    list.addToList = list.addToList === false ? true: false;
  }

  $scope.updateContact = function(){
    var contact = [];
    console.log("12345", $scope.countries);
    $scope.countries.forEach(function(contact){
      if(contact.addToList)  
        contact.localDailyDigest = true;
      else
        contact.localDailyDigest = false;

      var userid = $scope.userid;
      contact.userid = userid;
      // console.log(contact);
      profileService.saveContact(contact).then(function(data) {
        // console.log(data);
        if (data && data.status && data.status === 'ok') {
            $scope.flash.set('Updated', 'success');
        }
        else {
            $scope.flash.set('There was an error updating this profile.', 'danger');
        }
      });    
    });
    $scope.closeThisDialog();
  }
}
