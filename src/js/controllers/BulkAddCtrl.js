function BulkAddCtrl($scope, $http, $timeout, profileService, operations) {
	var auth_token = "Letmeaddcontacts!"

	$scope.auth = true;

	$scope.operations = operations;

	function searchLocation (name, locations) {
		var retLocation = {};
		angular.forEach(locations, function(location) {
			if (location.name === name){
				retLocation = location;
				return location;
			}
		});
		return retLocation;
	}

	$scope.selectAllFn = function(){
		angular.forEach($scope.contacts, function(contact){
			contact._select = $scope.selectAll;
		});
	}

    $scope.transformOutput = function(){
    	$scope.contacts = [];

    	angular.forEach($scope.csv.result, function(input) {
    		var contact = {};

    		var	_nameArray = input['Name'].split(" ");
			contact.nameGiven = _nameArray.pop();
			contact.nameFamily = _nameArray.reduce(function(a,b){return a+" "+b});

			contact.jobtitle = input['Job Title'];
			contact.email = [{"address": input['Email']}];

			var phoneNumber = (input['Phone1ext'] ? input['Phone1ext'] : input['Phone2ext']) + " " + (input['Phone1'] ? input['Phone1'] : input['Phone2']);
			contact.phone = [{"number": phoneNumber, "type": "Mobile"}];


			var location = searchLocation(input['Operation'], $scope.operations);
			if (location) {
				contact.location = location.name;
				contact.locationId = location.remote_id;
			}

			contact.address = [{"country": input['Country']}];

			contact.userid = "";
			contact._profile = null;
			contact.status = 1;
			contact.type = "local";
			contact.isNewContact = true;
			contact.notify = true;

			contact.adminName = "Yaelle Link";
			contact.adminEmail = "linky@un.org";

			var acronym = input['Organization acronym'];
			$http.get("https://www.humanitarianresponse.info/api/v1.0/organizations?filter[acronym]="+acronym, {cache: true}).then(function(response){
				// console.log(response);
				if (response.data && response.data.data[0]){
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

    $scope.exportArray = function(){
    	var exportContacts = [];
    	angular.forEach($scope.contacts, function(contact){
    		if (contact._select){
    			var exportContact = angular.copy(contact);
    			delete exportContact.locationId;
    			delete exportContact.$$hashKey;
    			delete exportContact._select;
    			exportContact.email = exportContact.email[0].address;
    			exportContact.phone = exportContact.phone[0].number;
    			exportContact.address = exportContact.address[0].country;
    			exportContact.organization = JSON.stringify(exportContact.organization);
    			exportContact._response = JSON.stringify(exportContact._response);
    			exportContacts.push(exportContact);
    		}
    	});
    	return exportContacts;
    }
    $scope.exportHeader = function(){
    	return {

    	}
    }

    $scope.submitContacts = function(){
    	//from CreateAccountCtrl
    	angular.forEach($scope.contacts, function(contact){
    		$timeout( function(){
    			if (contact._select == true) {
    				profileService.saveContact(contact).then(function(data) {
    					contact._response = data;
    					if (data && data.status && data.status === 'ok') {
    						contact._status = 'done';
    					}
    					else if (data.contactExists && data.origContact){
    						contact._status = 'exists';
    					}
    					else {
    						contact._status = 'error';
    					}

    				});
        		}
        	}, 1000);
        
		});
	}

}
