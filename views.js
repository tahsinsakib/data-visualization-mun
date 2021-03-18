// COMP 4304, Term Project, Name: Tahsin Ahmed Sakib, Student no: 201653763,  Submitted on: 07/12/2020


let dispatch = d3.dispatch("load", "countrychange");

d3.csv("data/final/owid-covid-data.csv",  // leaving this here in case the data fails to be imported from the web
                                       // then it can be imported from the local storage as well
//d3.csv("https://covid.ourworldindata.org/data/owid-covid-data.csv",
                                // importing the whole OWID covid-19 dataset from the web so that we can
                                // use it to get the latest updated covid-19 data
    function(data)
    {
        dispatch.call("load", this, data);  // loading all our views
    }
);


//lets draw our choropleth/world  map

dispatch.on("load.map",  // uses namespace "map"
    function(data)
    {
        let width = 650;
        let height = 350;
        let svg = d3.select("#mapsection")  // creating our svg to draw our map
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height);

        let worldProj = d3.geoMercator()  // projection function for our world map
                            .scale(100)
                            .center([0,10])
                            .translate([width*0.5, height*0.5]);

        let path = d3.geoPath()
                        .projection(worldProj);

        let colorScale = d3.scaleThreshold()  // using this scale to represent country colors
                                              // on the map corresponding to a given attribute
                                              // which in this instance will be total covid-19 cases
                            .domain([1000, 10000, 100000, 500000, 1000000, 5000000, 8000000, 20000000])
                            .range(d3.schemeGreens[7]);

        let geoMap = svg.append("g")
                        .attr("id", "geomap");

        let filteredDataset = data.filter(d=>d.date=="2020-12-04");  // filtering covid dataset to get latest data
                                                                     // for december 4th 2020
        let filteredCases = filteredDataset.map(({iso_code, total_cases}) => ({iso_code, total_cases}));
                                                 /* this allows me to make an array of iso_code for a country mapped
                                                 to the covid-19 cases in that country */

        d3.json("data/final/world.geojson",  // importing .geojson file to draw world map
            function(json)
            {
                for (let feature of json.features)  // some wrangling to integrate data
                                                    // values into the json itself so that
                                                    // it is easier to represent the choropleth
                                                    // colors with corresponding data
                {
                    // setting value variable for each country in .geojson after filtering the data according to iso code
                    // and looking up the covid cases value from the dataset using that code
                    let d = parseInt(filteredCases.filter(d=>d["iso_code"]==feature.id)[0]["total_cases"]);
                    feature.properties.value = d;
                }

                geoMap.selectAll("path")  // drawing each country on the world map
                        .data(json.features)
                        .enter()
                        .append("path")
                        .attr("d", path)
                            .style("stroke", "black")  // initial black borders which change after clicking events
                            .style("fill", d => d.properties.value ? colorScale(d.properties.value):"lightgrey")
                            .attr("class", "Country")
                            .attr("id", d=>d.id)  // setting unique ID for each country to
                                                  // facilitate dispatcher's callbacks
                            .style("opacity", 0.8)
                            .on("click", mouseClick)  // focuses a country and triggers dispatcher when clicked
                            .append("title")  // tooltip to quickly look at country name and its total number of cases
                                .text(d=>"country: "+d.properties.name+"\ncovid cases: "+d.properties.value);
            }

        );

        let mouseClick = function(d)  // handler function for when we click on a country map
        {
            dispatch.call("countrychange", this, d.id);
                                                // clicking event on a country map calls dispatcher
                                                // to trigger change in registered event listeners
        };

        // whenever the change event is triggered through dispatcher such as change of selection
        // of country from the drop-down menu, it is reflected on the world map by focusing the country
        dispatch.on("countrychange.map",
            function(id)
            {     
                geoMap.selectAll(".Country")  // making countries other than the one clicked un-focused
                    .transition()
                        .duration(200)
                    .style("opacity", 0.7)
                    .style("stroke", "transparent");  

                // focusing on clicked country using higher opacity and red border color
                geoMap.select("#"+id)
                    .transition()
                        .duration(200)
                    .style("opacity", 1.2)
                    .style("stroke", "red");
                
                // outputing country data to console whenever a country map is clicked or selected from dropdown menu
                console.log("Country data for " + data.filter(d=>d["iso_code"]==id)[0]["location"] + ":");
                console.log(data.filter(d=>d["iso_code"]==id).map(({location, date, total_cases, new_cases, total_deaths, new_deaths}) => ({location, date, total_cases, new_cases, total_deaths, new_deaths})));
            }
        );
        
        // adding a title to the choropleth
        svg.append("text")
            .attr("x", width-220)
            .attr("y", height-30)
            .attr("text-anchor", "middle")  
            .style("font-size", "12px")
            .text("Figure 1: Choropleth representing total covid-19 cases as of December 4th, 2020.");
        
        // the followling code resets the borders and opacities of the map to
        // reset to the world map's default state, if the user clicks inside
        // the map but outside the land area (e.g. ocean)
        let mapElem = document.getElementById('geomap');  // selecteing geo map element
        let mapSecElem = document.getElementById('mapsection');  // selecting the section it is in
        document.addEventListener('click',
            function(event)
            {
                let isClickInsideMap = mapElem.contains(event.target);
                let isClickInsideMapSec = mapSecElem.contains(event.target);
                if(!isClickInsideMap && isClickInsideMapSec)
                {
                    d3.selectAll(".Country")
                        .transition()
                            .duration(200)
                        .style("opacity", 0.8)
                        .style("stroke", "black");
                }
            }
        );
    }
);


//lets draw the linechart following the dropdown menus

dispatch.on("load.menu",  /*d3 dispatcher uses namespace "menu" instead of "line" or
                            "linechart" because we are co-ordinating only the value
                            of the currently selected country from the drop-down
                            menu with the currently selected country or "path"
                            element on the geo map. And the implementation of
                            co-ordination between selected country from the
                            menu and the line chart drawing is done below manually
                            without having to use d3 dispatcher. Also, I co-ordinated
                            the attributes' dropdown menu with the line chart as well.*/
    function(data)
    {
        let margin = {top: 20, right: 20, bottom: 100, left: 50};  // margins to manipulate drawing
                                                                   // space within the linechart svg
        let width = 960 - margin.left - margin.right;  // svg width
        let height = 500 - margin.top - margin.bottom;  // svg height

        let parseDate = d3.timeParse("%Y-%m-%d");  /*parser to parse date strings in
                                                    given format (yyyy-mm-dd) to turn
                                                    into js Date objects that will later
                                                    be used to draw on the x-axis of the linechart*/

        let xScale = d3.scaleTime()  // scale for the x axis is set to represent a d3 time scale
                        .range([0, width]);
        let yScale = d3.scaleLinear()  // scale for the y axis is for linear data
                        .range([height-10, 0]);

        let currAttr;  // this variable will store the attribute name which will be presented in the chart

        let lineXY = d3.line()  // this function will be used later to draw the two data lines
                        .x(function(d) { return xScale(d.date); })
                        .y(function(d) { return yScale(d[currAttr]); });

        let sel = d3.select("#myselection");  // dropdown menu for country list
        let sel2 = d3.select("#myselection2");  // dropdown menu for attribute list
        currAttr = sel2.property("value");  // assigning the currently selected attribute
                                            // name to the currAttr variable

        // lets draw the svg to draw the linechart in
        let svg = d3.select("#linesection")
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform","translate(" + margin.left + "," + margin.top + ")");

        // title for our line chart
        svg.append("text")
            .attr("x", 380)
            .attr("y", 30)
            .attr("text-anchor", "middle")  
            .style("font-size", "14px")
            .text("Figure 2: Line chart illustrating comparison between the US and another country in several covid-19 attributes.");

        data.forEach(  // parsing the date strings into js Date objects and
                       // storing back into the owid "data" we received
            function(d)
            {
                d.date = parseDate(d.date);
            }
        );

        xScale.domain(d3.extent(data, d=>d.date)); // setting the x axis's domain
                                                    // ranging between first date of 
                                                    // the outbreak and the latest in the .csv

        // setting the domain for total covid cases from 0 cases to 16 million cases
        yScale.domain([0, 16000000]);

        let countries = d3.map(data, d=>d.location).keys();  // country names in an array
        sel.selectAll('option')  // putting country names into the dropdown menu
            .data(countries)
            .enter()
            .append('option')
            .text(d=>d)
            .attr("value", d=>d);
        
        sel.property("value", countries[23]);  // setting Brazil as the default value for dropdown menu
                                               // because that's the first country we compare to USA

        let colorSc = d3.scaleOrdinal()  // color scale to be used to represent each country with a unique color
                        .domain(countries)
                        .range(d3.schemeSet3);

        // this function draws a line on the chart given a country's index in our countries array
        function drawLine(countryIndex)
        {
            // adding a tooltip which shows country name when mouse cursor is on the line
            // and the tooltip shows up at the base of the line
            let tooltip = svg.append("g")
                            .style("display", "none");
                            tooltip.append("text")
                                .attr("x", 20)
                                .attr("y", height-25)
                                .attr("id", "toolTip" + countryIndex)
                                .style("font-size", "14px")
                                .style("fill", "black")
                                .attr("font-weight", "bold")
                                .text("Country: " + countries[countryIndex]);

            // drawing a line and setting its color and mouseover and mouseout events
            let lineDrawn = svg.append("path")
                                .datum(data.filter(d=>d.location==countries[countryIndex]))
                                .attr("class", "Line")
                                .attr("d", lineXY)
                                .attr("stroke", colorSc(countries[countryIndex]))
                                    .style("stroke-width", 3)
                                    .style("fill", "none")
                                .on("mouseover",
                                    function()
                                    {
                                        tooltip.style("display", null);
                                    }
                                )
                                .on("mouseout",
                                    function()
                                    {
                                        tooltip.style("display", "none");
                                    }
                                );

            return lineDrawn;
        }

        let line0 = drawLine(180);  // default fixed line on the chart drawn which is of USA
        let line = drawLine(23);    // default line of first country to be compared to USA which is Brazil
        
        // lets draw our x axis
        let xAxis = svg.append("g")
                        .attr("class", "Axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(xScale)
                            .tickFormat(d3.timeFormat("%Y-%m-%d")))  // formatting dates for x axis in original form
                        .selectAll("text")	
                            .style("text-anchor", "end")
                            .attr("dx", "-.1em")
                            .attr("dy", ".5em")
                            .attr("transform", "rotate(-30)");  // rotating the text to make it look nicer
        
        // lets draw our y axis
        let yAxis = svg.append("g")
                        .attr("class", "Axis")
                        .call(d3.axisLeft(yScale)
                            .tickFormat(d3.formatPrefix(",.0", 1e6)));  // formatting our y values to fit them better (e.g. "M"=millions)

        // labels for our line chart's axes
        svg.append("text")
            .attr("x", 250)
            .attr("y", 60)
            .attr("id", "fig2title")
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .attr("font-weight", "bold")
            .text("X-axis: Date of data collection, Y-axis: Total cases");

        // this function updates the changeable line with new data when a new country is selected from 1st dropdown menu
        function updateLines(countrySel)
        {
            line.datum(data.filter(d=>d.location==countrySel))
                        .transition()
                            .duration(1000)
                        .attr("d", lineXY)
                        .attr("stroke", colorSc(countrySel));
            
            //updating US data with new attribute in case the selection in 2nd dropdown is changed
            line0.datum(data.filter(d=>d.location=="United States"))
                        .transition()
                            .duration(1000)
                        .attr("d", lineXY);
        }

        // this function updates the line chart with new data when a new attribute is selected from 2nd dropdown menu
        function updateLineAttr(attrSel)
        {
            currAttr = attrSel;
            updateLines(sel.property("value"));
        }
        
        sel.on("change",  // handle when the selection from 1st dropdown is changed
            function(d)
            {
                let newCountry = d3.select(this).property("value");
                updateLines(newCountry);  // line chart updated as well
                let iso = data.filter(d=>d["location"]==newCountry)[0]["iso_code"];  // getting iso code for the country
                dispatch.call("countrychange", this, iso);  // triggers dispatch call to reflect change on choropleth
            }
        );
        
        // when we click on a country on the map we see changes reflected in the dropdown menu's selection and the line chart
        dispatch.on("countrychange.menu",
            function(iso)
            {
                let countryName = data.filter(d=>d["iso_code"]==iso)[0]["location"];
                sel.property("value", countryName);
                updateLines(countryName);

                // changing the country name in the tooltip when it is changed from either the map or dropdown menu
                let tooltip = document.getElementById("toolTip23");  // tooltip that needs to change if we select a new country
                tooltip.innerHTML = "Country: " + countryName;
            }
        );
        
        // when we change the attribute from the 2nd dropdown menu the line changes accordingly
        sel2.on("change",
            function(d)
            {
                let newAttrib = d3.select(this).property("value");
                let newAttrLabel;

                // following conditional block ensures the y scale and y axis are updated to accommodate new attribute
                if(newAttrib=="total_cases")
                {
                    yScale.domain([0, 16000000]);
                    yAxis.transition()
                                .duration(1000)
                            .call(d3.axisLeft(yScale)
                                .tickFormat(d3.formatPrefix(",.0", 1e6)));

                    newAttrLabel = "Total cases";
                }
                else if(newAttrib=="new_cases")
                {
                    yScale.domain([0, 235000]);
                    yAxis.transition()
                                .duration(1000)
                            .call(d3.axisLeft(yScale));  

                    newAttrLabel = "New cases";
                }
                else if(newAttrib=="total_deaths")
                {
                    yScale.domain([0, 280000]);
                    yAxis.transition()
                                .duration(1000)
                            .call(d3.axisLeft(yScale));
                                                            
                    newAttrLabel = "Total deaths";
                }
                else if(newAttrib=="new_deaths")
                {
                    yScale.domain([0, 3200]);
                    yAxis.transition()
                                .duration(1000)
                            .call(d3.axisLeft(yScale));
                                                            
                    newAttrLabel = "New deaths";
                }

                updateLineAttr(newAttrib);

                // updating the label for y axis when we switch to a new attribute
                let titleElem = document.getElementById("fig2title");
                titleElem.innerHTML = "X-axis: Date of data collection, Y-axis: " + newAttrLabel;
            }
        );

    }
);

// finally, lets draw the bar graph using plotly
dispatch.on("load.bar",
    function(data)
    {
        d3.csv("data/final/economic-decline-in-the-second-quarter-of-2020.csv",  // downloaded from OWID website
            function(gdpdata)
            {
                d3.select("#barsection")  // creating our div to contain the bar graph
                    .append("div")
                    .attr('id', "ourdiv");
                let countries = [];  // country names including groups such as G7, EU etc
                let unempRates = [];  // unemployment rates
                let colors = [];  // colors depending on percentage
                let colorScale = d3.scaleLinear()  // linear scale for percentages data
                                    .domain([-30,+10])
                                    .range(["red", d3.rgb(55,101,174)]);
                for(let obj of gdpdata)
                {
                    countries.push(obj.Entity);  // country or group name
                    unempRates.push(obj["GDP growth from previous year, 2020 Q2"]);
                    colors.push(colorScale(obj["GDP growth from previous year, 2020 Q2"]));
                }

                let dataSet = [  // bar graph data for plotly
                                {
                                    type: 'bar',
                                    x: countries,
                                    y: unempRates,
                                    hovertemplate: '%{y}',
                                    marker: {
                                        color: colors
                                    },
                                    name: "GDP growth"
                                }
                            ];
                let layout = { 
                    title: "Figure 3: Barchart showing economic growth in 2020 from last year's 2nd quarter",
                    xaxis: {
                        title: {
                            text:"Country or Entity",
                            font: {
                                color:"purple"
                            }
                        }
                    },
                    yaxis: {
                        title: "GDP growth in percentages(%)"
                    }
                };
                Plotly.newPlot('ourdiv', dataSet, layout);  // putting the plot into our div container

                dispatch.on("countrychange.bar",  // co-ordinating with map and dropdown menu
                                                  // to highlight country bar with cyan color
                                                  // if that country exists in the GDP dataset
                    function(countryID)
                    {
                        let countryName = data.filter(d=>d["iso_code"]==countryID)[0]["location"];
                        let selectionIndex = countries.indexOf(countryName);
                        let colors1 = [...colors];  // copying the colors into new array so
                                                    // that when we reset, cyan color is moved too
                        colors1[selectionIndex] = "cyan";
                        Plotly.restyle('ourdiv',
                            {
                                marker: {
                                    color: colors1
                                }
                            }
                        );
                    }
                );
                
                // this allows us to reset the bar to its original color
                // when we click anywhere on the bargraph
                let ourPlot = document.getElementById("ourdiv");
                ourPlot.on("plotly_click",
                    function(d)
                    {
                        Plotly.restyle('ourdiv',
                            {
                                marker: {
                                    color: colors
                                }
                            }
                        );
                    }
                );

            }
        );
    }
);