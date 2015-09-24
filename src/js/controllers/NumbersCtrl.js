function NumbersCtrl($scope) {
    //Variable declaration
    var isChange=0;
    var location="World Numbers";
    var selected_Country;
    var country1;
    var country2;
    var country3;
    var unicount;
    var unique;
    var m1=0,m2=0,m3=0,m4=0,m5=0,m6=0,m7=0,m8=0,m9=0,m10=0,m11=0,m12=0;
    var m=[0,0,0,0,0,0,0,0,0,0,0,0];
    var API = "http://fis-ocha.cartodb.com/api/v1/sql?q=SELECT*FROM hid_checkins";
    var country;
    var count2;
    var count3;
    var count4;
    var time;
    var diffDays;
    var currtime; 
    var clientsChart;
    var updateTime;
    //3rd party functions
    function onlyUnique(value, index, self) { 
        return self.indexOf(value) === index;
    }
    function commaSeparateNumber(val){
        while (/(\d+)(\d{3})/.test(val.toString())){
          val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
        }
        return val;
    }
    //Getting JSON data
    $.getJSON(API, function (json) {
        function start() {
            isChange++;
            m=[0,0,0,0,0,0,0,0,0,0,0,0];
            country=new Array(json.rows.length);
            count2=0;
            count3=0;
            updateTime=new Date(json.rows[0].created_at);
            currtime=new Date();//Date(json.rows[0].last_updated); 
            selected_Country=$("#mySelect :selected").text();
            for(i=0;i<json.rows.length;i++)
            {

                if(json.rows[i].last_updated.substring(0,4)==currtime.getFullYear() && (json.rows[i].location_country==selected_Country || selected_Country=="World Numbers"))
                {  
                    country[count2++]=json.rows[i].origin_location; 
                    time=json.rows[i].last_updated;
                    if(time!=null)
                    {
                        time=new Date(time);
                        diffDays=Math.floor( currtime.getTime() / (3600*24*1000))-Math.floor( time.getTime() / (3600*24*1000));
                        m[time.getMonth()]++;
                    }
                    m1=m[0];m2=m[1];m3=m[2];m4=m[3];m5=m[4];m6=m[5];m7=m[6];m8=m[7];m9=m[8];m10=m[9];m11=m[10];m12=m[11];
                    if(diffDays <=7 && diffDays>=0)
                        count3++;

                }
            }
            unique = country.filter( onlyUnique );
            var count=unique.length;
            unicount=new Array(count);
            for(m=0;m<count;m++)
                unicount[m]=0;
            for(j=0;j<count2;j++) {
                for(k=0;k<count;k++) {
                    if(unique[k]==country[j] && unique[k]!=null  && unique[k]!="None" && unique[k]!="none" && unique[k]!='')
                        unicount[k]++;      
                }
            }
            callback();
        }
        var i=0;
        //Creating the drop down menu
        country_at=new Array(json.rows.length);
        count4=0;
        for(i=0;i<json.rows.length;i++)
            country_at[count4++]=json.rows[i].location_country; 
        var unique2= country_at.filter(onlyUnique);
        var select = document.getElementById("mySelect");  
        for(i=0;i<unique2.length;i++){  
            select.options[select.options.length] = new Option(unique2[i],i);  
        } 
        start();
        // On selecting a country
        $('#mySelect').change(function() {
          // make AJAX call to update the second select list
          $.ajax({
            success: function(data){ 
                start();
                
                }
            });
        });

    });
    function callback() {
        //Create Line graph using Chart.js
        var data = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug","Sept","Oct","Nov","Dec"],
        datasets: [
            {
                fillColor: "rgba(151,187,205,0.2)",
                strokeColor: "rgba(151,187,205,1)",
                pointColor: "rgba(151,187,205,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
                data: [m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12]
            },

        ]
        };
        if(isChange>1) //destroy older charts to improve efficiency
            clientsChart.destroy();
        var context = document.getElementById('clients').getContext('2d');
        clientsChart = new Chart(context).Line(data, {scaleFontColor: "#54b1c8"});
        clientsChart.update();

        //Finding top 3 countries
        var a = unicount.indexOf(Math.max.apply(Math, unicount));
        country1=unique[a];
        unicount[a]=0;
        var b = unicount.indexOf(Math.max.apply(Math, unicount));
        country2=unique[b];
        unicount[b]=0;
        var c = unicount.indexOf(Math.max.apply(Math, unicount));
        country3=unique[c];

        if(count2>0 )
        {
            $('.results1').html(country1);
            if(unicount.length >1 && country1!=country2 ) {
                $(".results2").show();
                $('.results2').html(country2);
            }
            else {
                $('.results2').html(" ");
                $('.results3').html(" ");
                $(".results2").hide();
                $(".results3").hide();
            }  
            if(unicount.length>2 && country2!=country3) {
              $(".results3").show();
              $('.results3').html(country3);
            }
            else {
                $('.results3').html(" ");
                $(".results3").hide();
            }
        }
        else {
            $('.results1').html("None");
            $(".results2").hide();
            $(".results3").hide();
            $('.results2').html(" ");
            $('.results3').html(" ");   
        }
    //Finding number of check-ins the past 48 hours
    $('.huge').html(count3);
    // Total number of check-ins for world or each country
    $('.result4').html("per month ("+commaSeparateNumber(count2)+" for "+updateTime.getFullYear()+ ")");
    var monthNames = [
      "January", "February", "March",
      "April", "May", "June", "July",
      "August", "September", "October",
      "November", "December"
    ];
    //displaying the date format
    var day = updateTime.getDate();
    var monthIndex = updateTime.getMonth();
    var year = updateTime.getFullYear();
    var append="";
    if(day==1)
        append="st";
    if(day=="2")
        append="nd";
    if(day=="3")
        append="rd";
    else append="th";
    $('.updateTime').html("as of: "+day+append+" "+monthNames[monthIndex]+" "+year);

    }   
}

