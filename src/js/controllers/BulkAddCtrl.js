function BulkAddCtrl($scope, $http) {
	var auth_token = "Letmeaddcontacts!"

	$scope.auth = true;

    $scope.transformOutput = function(){
    	$scope.contacts = [];

    	angular.forEach($scope.csv.result, function(input) {
    		var contact = {};

    		var	_nameArray = input['Name'].split(" ");
			contact.nameGiven = _nameArray.pop();
			contact.nameFamily = _nameArray.reduce(function(a,b){return a+" "+b});

			contact.jobtitle = input['Job Title'];
			contact.email = [{"address": input['email']}];

			var phoneNumber = (input['Phone1ext'] ? input['Phone1ext'] : input['Phone2ext']) + " " + (input['Phone1'] ? input['Phone1'] : input['Phone2']);
			contact.phone = [{"number": phoneNumber, "type": "Mobile"}];

			contact.location = $scope.location;
			contact.address = [{"country": $scope.location}];
			contact.locationId = $scope.location_id;

			contact.userid = "";
			contact._profile = null;
			contact.status = 1;
			contact.type = "local";
			contact.isNewContact = true;
			contact.notify = true;

			contact.adminName = "Yaelle Link";
			contact.adminEmail = "linky@un.org";

			var acronym = input['Organization acronym'];
			$http.get("https://www.humanitarianresponse.info/api/v1.0/organizations?filter[acronym]="+acronym).then(function(response){
				console.log(response);
				if (response.data){
					contact.organization = {
						"name": response.data.data[0].label,
						"org_type_name": response.data.data[0].type.label,
						"org_type_remote_id": "hrinfo_org_type_"+response.data.data[0].type.id,
						"remote_id": "hrinfo_org_"+response.data.data[0].id
					};

					$scope.contacts.push(contact);
				}
			});

		});

    }



}
