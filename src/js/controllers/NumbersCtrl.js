function NumbersCtrl($scope) {
    var isChange=0;
    var location="World Numbers";
    var selected_Country = 0;

    var unique;
    var unique_Org;
    
    var m=[0,0,0,0,0,0,0,0,0,0,0,0];

    var API = "https://fis-ocha.cartodb.com/api/v1/sql?q=SELECT*FROM hid_checkins";
    
    var time;
    var weekCount=0;

    var currtime; 
    var clientsChart;
    var updateTime;
    var countries = [];
    var org_names = [];
    var sortedWeeklyCountries = [];
    var sortedMonthlyCountries =[];
    var sortedSixMonthlyCountries = [];
    var sortedOrgWeek =[];
    var sortedOrgMonth =[];
    var sortedOrgSixMonth =[];
    var countWC= 0;
    var countOrgW =0;
    var countOrgM =0;
    var countOrgSixM=0;
    var countMC = 0;
    var countSMC = 0;
    var country;
    var count;
    var monthlyCount=0;
    var sixMonthlyCount=0;
    var globalCountries =[];
    var globalCount =0;

    $scope.globalFig = true;
    $scope.sixMonthlyCount =0;
    $scope.selCountry = 'World Numbers';
    $scope.weeklyCount = 0;
    $scope.top3Countries = [];
    
    $scope.weeklyCount = 0;
    $scope.monthlyCount = 0;
    $scope.sixMonthlyCount = 0;
    $scope.topn = [];
    $scope.monthlyDetails = [];
    $scope.sixMonthlyDetails = [];
    $scope.weeklyOrgDetails =[];
    $scope.monthlyOrgDetails=[];
    $scope.sixMonthlyOrgDetails=[];     
    $scope.globalCountries=[];
    $scope.orig = angular.copy($scope.data);

    function onlyUnique(value, index, self) { 
        return self.indexOf(value) === index;
    }

    function commaSeparateNumber(val){
        while (/(\d+)(\d{3})/.test(val.toString())){
          val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
        }
        return val;
    }

    function naturalCompare(a, b) {
        var ax = [], bx = [];

        a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
        b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
        
        while(ax.length && bx.length) {
            var an = ax.shift();
            var bn = bx.shift();
            var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
            if(nn) return nn;
        }

    return ax.length - bx.length;
    }

    function multipleCount(array, temp){
        var current = null;
        var cnt = 0;

        for (var i = 0; i < array.length; i++) {
            if (array[i] != current) {
                if (cnt > 0) {
                    temp[i] =  cnt + " " + current;
                }
                current = array[i];
                cnt = 1;
            } else {
                cnt++;
            }
        }

        return temp;
    }

    var a = function(callback)
    {
        $.ajax({
            url: API,
            dataType: 'json',
            async: false,
            success: callback
        });    
    };
    
    var myData;
    a(function(data) {
        myData= data;
    });


    function initialGraph (myData) {
        function start() {

            isChange++;
            m=[0,0,0,0,0,0,0,0,0,0,0,0];
            country=new Array(myData.rows.length);
            

            updateTime=new Date(myData.rows[0].created_at);
            currtime=new Date();
            selected_Country=$("#mySelect :selected").text();
            if(selected_Country =="World Numbers")
            {    
                $scope.globalFig = true;
            }
            else
            {
                $scope.globalFig = false;
            }
            var currentDate = new Date();
            var previousWeek = new Date(currentDate.getFullYear(), (currentDate.getMonth() + 1), currentDate.getDate() - 7);
            var previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())  
            for(var j = 0; j < myData.rows.length; j++)
            {
                countries[j] = myData.rows[j].location_country;
                org_names[j] = myData.rows[j].org_name;
            }
            unique = countries.filter( onlyUnique );
            unique_Org = org_names.filter(onlyUnique);


            $scope.sortedCountries = unique;
            $scope.sortedOrg = unique_Org;

            for(i=0;i<myData.rows.length;i++)
            {
                var currMonth = currtime.getMonth();
                var initialMonth = currMonth  + 6;

                if(myData.rows[i].location_country==selected_Country || selected_Country=="World Numbers")
                {   
                    if(myData.rows[i].last_updated.substring(5,7) == (currMonth + 1) && myData.rows[i].last_updated.substring(0,4) == currtime.getFullYear())
                    { 
                        time=myData.rows[i].last_updated;
                        if(time!=null){
                            time=new Date(time);
                            m[11]++;
                        }
                    }
                    while(initialMonth % 12 != (currMonth))
                    {
                        if(myData.rows[i].last_updated.substring(0,4) >= (currtime.getFullYear() - 1))
                        {
                            if(myData.rows[i].last_updated.substring(5,7) == initialMonth){
                                var lastUpdatedTime = myData.rows[i].last_updated;
                                if(lastUpdatedTime != null){
                                    m[initialMonth-1]++;
                                }   
                            }
                        }
                        initialMonth++;
                    }

                }
                
            }
            callback();
        }

        var i=0;
        country_at=new Array(myData.rows.length);
        count4=0;
        for(i=0;i<myData.rows.length;i++)
            country_at[count4++]=myData.rows[i].location_country;         
        var unique2= country_at.filter(onlyUnique);
        unique2=unique2.sort();
        var select = document.getElementById("mySelect");  
        for(i=0;i<unique2.length;i++){  
            select.options[select.options.length] = new Option(unique2[i],i);  
        } 
        start();
        $('#mySelect').change(function() {
          $.ajax({
            async: false,
            success: function(data){ 
                start();
                 
                }
            });
        });
    };

    function callback() {
        var currentMonth = new Date().getMonth(); 
        var labelsArray = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug","Sept","Oct","Nov","Dec"];

        var newLables = [];
        var length = 7;

        for(var i =0; i < length-1; i++){   
            if((currentMonth+6) > 12){
                currentMonth = 0;
            }
            newLables[i] = labelsArray[currentMonth+6];
            currentMonth++;
        }

        newLables.push(labelsArray[new Date().getMonth()]);
      
        var half_length = Math.floor((m.length-1) / 2);    

        m = m.splice(half_length, m.length);

        var data = {
            labels: newLables,
            datasets: [
                {
                    fillColor: "rgba(151,187,205,0.2)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor: "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    pointHighlightFill: "#fff",
                    pointHighlightStroke: "rgba(151,187,205,1)",
                    pointDotRadius : 150,
                    data: m
                },

            ]
        };
        if(isChange>1) 
        {
            clientsChart.destroy();
            update();
            getStatistics();
        }
        $scope.data = angular.copy($scope.orig);
        var context = document.getElementById('clients').getContext('2d');

        clientsChart = new Chart(context).Line(data, {scaleFontColor: "#54b1c8"});
        clientsChart.update();


        var monthNames = [
          "January", "February", "March",
          "April", "May", "June", "July",
          "August", "September", "October",
          "November", "December"
        ];
        var sel = selected_Country == 'World Numbers' ? 'Humanitarian ID' : selected_Country;
    }
    
    function update(){

        $scope.data = angular.copy($scope.orig);

        countWC = 0; 
        countMC = 0;
        countSMC = 0;
        countOrgW = 0; 
        countOrgM = 0;
        countOrgSixM = 0;

        weekCount =0;
        monthlyCount=0;
        sixMonthlyCount=0;

        sortedWeeklyCountries = [];
        sortedMonthlyCountries =[];
        sortedSixMonthlyCountries = [];
        sortedOrgWeek =[];
        sortedOrgMonth =[];
        sortedOrgSixMonth =[];
    
    }

 
    function getStatistics() {

        countWC= 0;
        countOrgW =0;
        countOrgM =0;
        countOrgSixM=0;
        countMC = 0;
        countSMC = 0;
        monthlyCount=0;
        sixMonthlyCount=0;

        var currentDate = new Date();
        var previousWeek = new Date(currentDate.getFullYear(), (currentDate.getMonth() + 1), currentDate.getDate() - 7);
        var previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())  
     
        for(var j = 0; j < myData.rows.length; j++)
        {
            countries[j] = myData.rows[j].location_country;
            org_names[j] = myData.rows[j].org_name;
        }
        unique = countries.filter( onlyUnique );
        unique_Org = org_names.filter(onlyUnique);
        $scope.sortedCountries = unique;
        $scope.sortedOrg = unique_Org;
        for(i=0;i<myData.rows.length;i++)
        {
            var currMonth = currentDate.getMonth();
            var initialMonth = currMonth+6;
            globalCountries[i] = myData.rows[i].location_country;
            if(myData.rows[i].location_country==selected_Country || selected_Country=="World Numbers")
            {
                if((myData.rows[i].last_updated.substring(0,4) >= previousWeek.getFullYear()) &&
                    (myData.rows[i].last_updated.substring(5,7) >= previousWeek.getMonth()) && 
                        (myData.rows[i].last_updated.substring(8,10) > previousWeek.getDate())){
                            weekCount++;
                            if(unique.indexOf(myData.rows[i].location_country) != -1){
                                countWC++;
                                sortedWeeklyCountries[countWC] = myData.rows[i].location_country;
                            }    
                            if(unique_Org.indexOf(myData.rows[i].org_name) != -1){
                                if(myData.rows[i].org_name !== "null"){
                                        countOrgW++;
                                        sortedOrgWeek[countOrgW] = myData.rows[i].org_name;
                                    }
                            }                   
                }
                if(myData.rows[i].last_updated.substring(5,7) == (currMonth + 1) && myData.rows[i].last_updated.substring(0,4) == currtime.getFullYear())
                { 
                    time=myData.rows[i].last_updated;
                    if(time!=null)
                    {
                        if(unique.indexOf(myData.rows[i].location_country) != -1){
                            countMC++;
                            countSMC++;
                            sortedMonthlyCountries[countMC] = myData.rows[i].location_country;
                            sortedSixMonthlyCountries[countSMC] = myData.rows[i].location_country;
                        }
                        if(unique_Org.indexOf(myData.rows[i].org_name) != -1){
                                if(myData.rows[i].org_name !== "null"){
                                    countOrgM++;
                                    countOrgSixM++;
                                    sortedOrgMonth[countOrgM] = myData.rows[i].org_name ;
                                    sortedOrgSixMonth[countOrgSixM] = myData.rows[i].org_name;
                                }
                        }       
                                    
                    }
                }
                while(initialMonth % 12 != (currMonth))
                {
                    if(myData.rows[i].last_updated.substring(0,4) >= (currentDate.getFullYear() - 1))
                    {
                        if(myData.rows[i].last_updated.substring(5,7) == initialMonth){
                            var lastUpdatedTime = myData.rows[i].last_updated;
                            if(lastUpdatedTime != null)
                            {
                                if(unique.indexOf(myData.rows[i].location_country) != -1){
                                    countSMC++;
                                    sortedSixMonthlyCountries[countSMC] = myData.rows[i].location_country;
                                }
                                if(unique_Org.indexOf(myData.rows[i].org_name) != -1){
                                    if(myData.rows[i].org_name !== "null" ){
                                        countOrgSixM++;
                                        sortedOrgSixMonth[countOrgSixM] = myData.rows[i].org_name;
                                    }
                                }       

                            }   

                        }
                    }
                initialMonth++;
                }

            }
        }
        

        var length = m.length;
        monthlyCount = m[length-1];
        sortedWeeklyCountries.sort();
        sortedMonthlyCountries.sort();
        sortedSixMonthlyCountries.sort();
        globalCountries.sort();
        sortedOrgWeek.sort();
        sortedOrgMonth.sort();
        sortedOrgSixMonth.sort();
 
        var sortedWeek=[];
        var sortedMonth =[];
        var sorted6Month = [];

        var sortedWeekOrgs =[];
        var sortedMonthOrgs =[];
        var sorted6MonthOrgs = [];

        var globalDupRem = [];

        sortedWeek = multipleCount(sortedWeeklyCountries, sortedWeek);
        sortedMonth = multipleCount(sortedMonthlyCountries, sortedMonth);
        sorted6Month = multipleCount(sortedSixMonthlyCountries, sorted6Month);

        sortedWeekOrgs = multipleCount(sortedOrgWeek, sortedWeekOrgs);
        sortedMonthOrgs = multipleCount(sortedOrgMonth, sortedMonthOrgs);
        sorted6MonthOrgs = multipleCount(sortedOrgSixMonth, sorted6MonthOrgs);
        globalDupRem = multipleCount(globalCountries, globalDupRem);
 

        sortedWeek = sortedWeek.filter(function(item){
            return item !== undefined;
        });

        sortedMonth = sortedMonth.filter(function(item){
            return item !== undefined;
        });

        sorted6Month = sorted6Month.filter(function(item){
            return item !== undefined;
        });

        sortedWeekOrgs = sortedWeekOrgs.filter(function(item){
            return item !== undefined;
        });

        sortedMonthOrgs = sortedMonthOrgs.filter(function(item){
            return item !== undefined;
        });

        sorted6MonthOrgs = sorted6MonthOrgs.filter(function(item){
            return item !== undefined;
        });

        globalDupRem = globalDupRem.filter(function(item){
            return item !== undefined;
        });

        sortedWeek = sortedWeek.sort(naturalCompare).reverse();
        sortedMonth = sortedMonth.sort(naturalCompare).reverse();
        sorted6Month = sorted6Month.sort(naturalCompare).reverse();

        sortedWeekOrgs = sortedWeekOrgs.sort(naturalCompare).reverse();
        sortedMonthOrgs = sortedMonthOrgs.sort(naturalCompare).reverse();
        sorted6MonthOrgs = sorted6MonthOrgs.sort(naturalCompare).reverse();
        var globalCountryCounts = globalDupRem.sort(naturalCompare).reverse();


        var finalOutput= [];
        var monthlyFinalOutput = [];
        var sixMonthlyOutput = [];


        var weeklyOrg = [];
        var monthOrg =[];
        var sixMonthlyOrg = [];

        var finalGlobalOutput1 = [];
        var finalGlobalOutput2 = [];
        var finalGlobalOutput3 = [];

        for(var i = 0; i < 3; i++){
            finalOutput[i] = sortedWeek[i];
            monthlyFinalOutput[i] = sortedMonth[i];
            sixMonthlyOutput[i] = sorted6Month[i];
            weeklyOrg[i] = sortedWeekOrgs[i];
            monthOrg[i] = sortedMonthOrgs[i];
            sixMonthlyOrg[i] = sorted6MonthOrgs[i];
        }


        for(var i = 0; i < 6; i++){
            if(i <= 2)
                finalGlobalOutput1[i] = globalCountryCounts[i];
            else 
                finalGlobalOutput2[i] = globalCountryCounts[i];
        }

        $scope.top3 =[];
        $scope.topn = [];
        $scope.monthlyDetails = [];
        $scope.sixMonthlyDetails = [];
        $scope.weeklyOrgDetails =[];
        $scope.monthlyOrgDetails =[];
        $scope.sixMonthlyOrgDetails =[];
        $scope.globalCountryDetails1=[];
        $scope.globalCountryDetails2=[];
        $scope.globalCountryDetails3=[];

        var regExp = /\(([^)]+)\)/;

        for(var i =0; i < finalOutput.length; i++)
        {    
            if(finalOutput[i] != undefined)
               $scope.topn.push({
                country: finalOutput[i].replace(/[0-9]/g, ''),
                count: finalOutput[i].replace(/\D/g, '')
            });
           if(monthlyFinalOutput[i] != undefined)
                $scope.monthlyDetails.push({
                    country: monthlyFinalOutput[i].replace(/[0-9]/g, ''),
                    count: monthlyFinalOutput[i].replace(/\D/g, '')
            });
            if(sixMonthlyOutput[i] != undefined)
                $scope.sixMonthlyDetails.push({
                    country: sixMonthlyOutput[i].replace(/[0-9]/g, ''),
                    count: sixMonthlyOutput[i].replace(/\D/g, '')
            });
            if(weeklyOrg[i] != undefined)
                $scope.weeklyOrgDetails.push({
                    orgName: regExp.exec(weeklyOrg[i].replace(/[0-9]/g, '')),
                    count: weeklyOrg[i].replace(/\D/g, '')
            });
            if(monthOrg[i] != undefined)
                $scope.monthlyOrgDetails.push({
                    orgName: regExp.exec(monthOrg[i].replace(/[0-9]/g, '')),
                    count: monthOrg[i].replace(/\D/g, '')
            });
            if(sixMonthlyOrg[i] != undefined)
                $scope.sixMonthlyOrgDetails.push({
                    orgName: regExp.exec(sixMonthlyOrg[i].replace(/[0-9]/g, '')),
                    count: sixMonthlyOrg[i].replace(/\D/g, '')
            });
        }

        for(var i=0; i < finalGlobalOutput1.length; i++){
            if(finalGlobalOutput1[i] != undefined)
                $scope.globalCountryDetails1.push({
                    countryName: finalGlobalOutput1[i].replace(/[0-9]/g, ''),
                    count: finalGlobalOutput1[i].replace(/\D/g, '')
                });
        }

        for(var i=0; i < finalGlobalOutput2.length; i++){
            if(finalGlobalOutput2[i] != undefined)
                $scope.globalCountryDetails2.push({
                    countryName: finalGlobalOutput2[i].replace(/[0-9]/g, ''),
                    count: finalGlobalOutput2[i].replace(/\D/g, '')
                });
        }

        for(var i=0; i < 3; i++){
            var country1 = 'Congo, The Democratic Republic of the';
            var country2 = 'Central African Republic';
            var country3 = 'occupied Palestinian territory';
            if($scope.globalCountryDetails2[i].countryName.toString().includes(country1))
                $scope.globalCountryDetails2[i].countryName = 'DRC';
             if($scope.globalCountryDetails2[i].countryName.toString().includes(country2))
                $scope.globalCountryDetails2[i].countryName = 'CAR';
             if($scope.globalCountryDetails2[i].countryName.toString().includes(country3))
                $scope.globalCountryDetails2[i].countryName = 'Palestine';
        }
       
   
        for(var i =0; i < m.length; i++)
            sixMonthlyCount += m[i];

        $scope.monthlyDetails.sort();

        $scope.weeklyCount = weekCount;
        $scope.monthlyCount = monthlyCount;
        $scope.sixMonthlyCount = sixMonthlyCount;
        $scope.globalCount = myData.rows.length;
    }

    initialGraph(myData);
    getStatistics();

}