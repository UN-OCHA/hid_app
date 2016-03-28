function KioskCtrl($scope, profileService, operations) {
  $scope.operations = [];
  angular.forEach(operations, function (value, key) {
    $scope.operations.push(value);
  });
  $scope.operations.sort(function (a, b) {
    return a.name && b.name ? String(a.name).localeCompare(b.name) : false;
  });
}

