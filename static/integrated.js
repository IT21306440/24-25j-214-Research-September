$(document).ready(function () {
    let map = L.map('map').setView([7.8731, 80.7718], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    let marker = L.marker([7.8731, 80.7718], {
        icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [32, 32]
        })
    }).addTo(map);

    let chartInstances = {};

    //  Load dropdowns and initial data on page load
    $.when(loadAvailableLocations(), loadDropdowns(), loadFutureLocations()).done(function () {
        setTimeout(loadData, 500); //  Ensure data loads even if dropdowns reset
    });
    
    
    
    

    $("#year, #month, #location, #timeFrame, #futureLocation").change(function () {
        let year = $("#year").val();
        let month = $("#month").val();
        let location = $("#location").val();
        
        console.log(" Selected Location:", location);  //  Debugging line
        
        loadData();  //  Ensure data updates when location changes
        loadSolarPowerForecast(year, month);  //  Reload solar power forecast
    });
    
    
 
    //  Restore last selected values from localStorage (if available)
$("#year").val(localStorage.getItem("selectedYear") || $("#year option:first").val());
$("#month").val(localStorage.getItem("selectedMonth") || $("#month option:first").val());
$("#location").val(localStorage.getItem("selectedLocation") || $("#location option:first").val());
$("#futureLocation").val(localStorage.getItem("selectedFutureLocation") || $("#futureLocation option:first").val());
$("#timeFrame").val(localStorage.getItem("selectedTimeFrame") || $("#timeFrame option:first").val());


    

    

    function loadData() {
        let year = $("#year").val();
        let month = $("#month").val();
        let location = $("#location").val();
        let futureLocation = $("#futureLocation").val();
        let timeFrame = $("#timeFrame").val();


        //  Save user-selected values to localStorage
localStorage.setItem("selectedYear", year);
localStorage.setItem("selectedMonth", month);
localStorage.setItem("selectedLocation", location);
localStorage.setItem("selectedFutureLocation", futureLocation);
localStorage.setItem("selectedTimeFrame", timeFrame);

    
        //  Validate input parameters
        if (!year || !month || !location || !timeFrame) {
            console.error(" Missing parameters:", { year, month, location, timeFrame });
            return;
        }
    
        console.log(`📡 Fetching Solar Irradiance for: ${location}, Year: ${year}, Month: ${month}, Time Frame: ${timeFrame}`);
    
        resetChart("solarIrradianceChart");
        
        let monthMapping = {
            "January": "01", "February": "02", "March": "03", "April": "04",
            "May": "05", "June": "06", "July": "07", "August": "08",
            "September": "09", "October": "10", "November": "11", "December": "12"
        };
    
        //  Convert month name to number
        let formattedMonth = monthMapping[month] || "01"; 
        let dateString = `${year}-${formattedMonth}-01`; // Use the first day of the month
        console.log("📡 Fetching Power Data for Date:", dateString, " Time Frame:", timeFrame);
    
        //  Standardize Location Input (Trim spaces and lowercase for consistency)
        location = location.trim().toLowerCase();
    
        // Fetch Solar Irradiance Data
        //  Standardize Location Input (Trim spaces & lowercase)
        location = location.trim().toLowerCase();

//  Fetch Solar Irradiance Data
        $.post("/get_solar_irradiance", { year, month, location, time_frame: timeFrame }, function (data) {

            if (data.error) {
                console.error(" Error fetching solar irradiance:", data.error);
                $("#solarIrradianceChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                updateChart("solarIrradianceChart", `Solar Irradiance Forecast (${location})`, data.dates, data.irradiance, "orange", "rgba(255, 165, 0, 0.3)");
            }
        }).fail(function (xhr) {
            console.error(" Failed to fetch solar irradiance data. Status:", xhr.status, "Response:", xhr.responseText);
        });
    
        // ✅ Fetch Future Solar Irradiance if a future location is selected
        if (futureLocation) {
            console.log(` Fetching Future Solar Irradiance for: ${futureLocation}, Year: ${year}, Month: ${month}`);
    
            $.post("/get_future_solar_irradiance", { year, month, location: futureLocation }, function (data) {
                if (data.error) {
                    console.error(" Error fetching future solar irradiance:", data.error);
                    $("#futureSolarIrradianceChart").parent().html("<p class='text-danger'>No data available.</p>");
                } else {
                    updateChart("futureSolarIrradianceChart", "Future Solar Irradiance (W/m²)", data.dates, data.forecasted_irradiance);
                }
            }).fail(function () {
                console.error(" Failed to fetch future solar irradiance data.");
            });
        }
    
        //  Fetch Electricity Demand Data
        $.post("/get_all_peak_demand", { year, month }, function (data) {
            if (data.error) {
                console.error(" Error fetching peak demand data:", data.error);
                $("#electricityDemandChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                updatePeakDemandChart(data.dates, data.peak_demand, data.day_peak_demand, data.off_peak_demand);
            }
        }).fail(function () {
            console.error(" Failed to fetch peak demand data.");
        });
    
        //  Fetch Battery Revenue Data
        $.post("/get_battery_revenue", { year }, function (data) {
            if (data.error || !data.dates || data.dates.length === 0) {
                console.error(" Error fetching battery revenue:", data.error);
                $("#batteryRevenueChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                console.log(" Battery Revenue Data Received:", data);
                updateChart("batteryRevenueChart", "Battery Revenue (USCts/kWh)", data.dates, data.revenue);
            }
        }).fail(function (xhr) {
            console.error(" Failed to fetch battery revenue data. Status:", xhr.status, "Response:", xhr.responseText);
        });
    
        //  Fetch Forecasted Solar Power Data
        loadSolarPowerForecast(year, month);
    
        // Ensure correct date format "YYYY-MM-DD"
        console.log("📡 Fetching Power Data for Date:", dateString, " Time Frame:", timeFrame);
    
        //  Fetch Optimized Power Data
        $.post("/get_power_data", { date: dateString, time_frame: timeFrame }, function (data) {
            if (data.error) {
                console.error(" Error fetching optimized power data:", data.error);
                $("#optimizedDailyPowerChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                console.log(" Optimized Power Data Received:", data);
                updateChart("optimizedDailyPowerChart", "Optimized Daily Power Release (MWh)", data.dates, data.power_release);
            }
        }).fail(function (xhr) {
            console.error(" Failed to fetch optimized power data. Status:", xhr.status, "Response:", xhr.responseText);
        });
    }
    
    

    function loadDropdowns() {
        //  Fetch Available Years
        $.post("/get_available_years", function (data) {
            $("#year").empty();
            if (data.years && data.years.length > 0) {
                data.years.forEach(year => {
                    $("#year").append(`<option value="${year}">${year}</option>`);
                });
            } else {
                $("#year").append(`<option disabled>No Data</option>`);
            }
        });

        //  Populate Months
        let months = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        $("#month").empty();
        months.forEach(month => {
            $("#month").append(`<option value="${month}">${month}</option>`);
        });
    }

    function loadData() {
        let year = $("#year").val();
        let month = $("#month").val();
        let location = $("#location").val();
        let futureLocation = $("#futureLocation").val();
        let timeFrame = $("#timeFrame").val();

        if (!year || !month || !location || !timeFrame) return;
        console.log(`📡 Fetching Solar Irradiance for: ${location}, Year: ${year}, Month: ${month}`);
       //  Ensure correct mapping of month names to numbers
        let monthMapping = {
            "January": "01", "February": "02", "March": "03", "April": "04",
            "May": "05", "June": "06", "July": "07", "August": "08",
            "September": "09", "October": "10", "November": "11", "December": "12"
        };

        //  Convert month name to number (fixing the issue)
        let formattedMonth = monthMapping[month] || "01"; // Default to January if not found
        let dateString = `${year}-${formattedMonth}-01`; // Use first day of the month
        console.log("📡 Fetching Power Data for Date:", dateString, " Time Frame:", timeFrame);
        $("#loadingChart").show();

        //  Update Map for Best Location
        $.post("/get_best_location", { year: year }, function (data) {
            if (data.error) {
                console.error("Error fetching best location:", data.error);
            } else {
                marker.setLatLng([data.latitude, data.longitude]);
                map.setView([data.latitude, data.longitude], 10);
                marker.bindPopup(`<b>${data.location}</b><br>Recommended location`).openPopup();
            }
        }).fail(function () {
            console.error("Failed to fetch best location.");
        });

        //  Fetch Solar Irradiance Data for the selected location & time frame
        $.post("/get_irradiance_curve", { year, month, location, time_frame: timeFrame }, function (data) {
            if (data.error) {
                console.error("Error fetching solar irradiance:", data.error);
            } else {
                updateChart("solarIrradianceChart", "Solar Irradiance (W/m²)", data.dates, data.irradiance);
            }
        });

        if (futureLocation) {
            console.log(`📡 Fetching Future Solar Irradiance for: ${futureLocation}, Year: ${year}, Month: ${month}`);
        
            $.post("/get_future_solar_irradiance", { year: year, month: month, location: futureLocation }, function (data) {
                if (data.error) {
                    console.error(" Error fetching future solar irradiance:", data.error);
                    $("#futureSolarIrradianceChart").parent().html("<p class='text-danger'>No data available.</p>");
                } else {
                    updateChart("futureSolarIrradianceChart", "Future Solar Irradiance (W/m²)", data.dates, data.forecasted_irradiance);
                }
            }).fail(function () {
                console.error(" Failed to fetch future solar irradiance data.");
            });
        }
        
        

        //  Fetch Electricity Demand Data
        $.post("/get_all_peak_demand", { year: year, month: month }, function (data) {

            if (data.error) {
                console.error(" Error fetching peak demand data:", data.error);
                $("#electricityDemandChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                updatePeakDemandChart(data.dates, data.peak_demand, data.day_peak_demand, data.off_peak_demand);
            }
        }).fail(function () {
            console.error(" Failed to fetch peak demand data.");
        });
        

        //  Fetch Battery Revenue Data
        $.post("/get_battery_revenue", { year: year }, function (data) {
            if (data.error || !data.dates || data.dates.length === 0) {
                console.error(" Error fetching battery revenue:", data.error);
                $("#batteryRevenueChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                console.log(" Battery Revenue Data Received:", data);
                updateChart("batteryRevenueChart", "Battery Revenue (USCts/kWh)", data.dates, data.revenue);

            }
        }).fail(function (xhr) {
            console.error(" Failed to fetch battery revenue data. Status:", xhr.status, "Response:", xhr.responseText);
        });
        
        //  Fetch Forecasted Solar Power Data
        loadSolarPowerForecast(year, month);

        //  Fetch Optimized Daily Power Data
        //  Ensure correct date format "YYYY-MM-DD"
        
        //  Fix: Send correct parameter names matching Flask endpoint
        $.post("/get_power_data", { date: dateString, time_frame: timeFrame }, function (data) {
            if (data.error) {
                console.error(" Error fetching optimized power data:", data.error);
                $("#optimizedDailyPowerChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                console.log(" Optimized Power Data Received:", data);
                updateChart("optimizedDailyPowerChart", "Optimized Daily Power Release (MWh)", data.dates, data.power_release);
            }
        }).fail(function (xhr) {
            console.error(" Failed to fetch optimized power data. Status:", xhr.status, "Response:", xhr.responseText);
        });

        
    }





    // ✅ Function to fetch and update the new solar power forecast chart
function loadSolarPowerForecast(year, month) {
    $.post("/get_forecasted_solar_power", { year, month }, function (data) {
        if (data.error) {
            console.error(" Error fetching forecasted solar power:", data.error);
            $("#solarPowerForecastChart").parent().html("<p class='text-danger'>No data available.</p>");
        } else {
            updateChart("solarPowerForecastChart", "Total Forecasted Solar Power (MW)", data.dates, data.solar_power);
        }
    }).fail(function () {
        console.error(" Failed to fetch forecasted solar power data.");
    });
}



    function loadFutureLocations() {
    $.post("/get_future_locations", function (data) {
        let futureLocationDropdown = $("#futureLocation");
        futureLocationDropdown.empty();

        if (data.error) {
            console.error(" Error fetching future locations:", data.error);
            futureLocationDropdown.append(`<option disabled>${data.error}</option>`);
            return;
        }

        if (data.locations && data.locations.length > 0) {
            futureLocationDropdown.append(`<option value="" disabled selected>Select Future Location</option>`);
            data.locations.forEach(location => {
                futureLocationDropdown.append(`<option value="${location}">${location}</option>`);
            });
        } else {
            futureLocationDropdown.append(`<option disabled>No Data Available</option>`);
        }
    }).fail(function () {
        console.error(" Failed to fetch future locations.");
        $("#futureLocation").append(`<option disabled>Error Loading</option>`);
    });
}

    

    function updatePeakDemandChart(labels, peakData, dayPeakData, offPeakData) {
        if (!labels || labels.length === 0) {
            console.warn(" No data available for demand chart.");
            $("#electricityDemandChart").parent().html("<p class='text-danger'>No data available.</p>");
            return;
        }
    
        let chartContainer = $("#electricityDemandChart").parent(); 
        chartContainer.html(`<canvas id="electricityDemandChart"></canvas>`); //  Reset canvas
    
        let ctx = document.getElementById("electricityDemandChart").getContext("2d");
    
        //  Ensure the old chart instance is properly destroyed
        if (window.demandChart instanceof Chart) {
            window.demandChart.destroy();
        }
    
        // ✅ Create new multi-line chart with improved clarity
        window.demandChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Peak Demand (MW)",
                        data: peakData,
                        borderColor: "red",
                        backgroundColor: "rgba(255, 0, 0, 0.1)",
                        fill: true,
                        borderWidth: 4,  //  Thicker line
                        pointRadius: 1,   //  Bigger dots
                        pointHoverRadius: 8,
                        pointBackgroundColor: "red",
                    },
                    {
                        label: "Day Peak Demand (MW)",
                        data: dayPeakData,
                        borderColor: "blue",
                        backgroundColor: "rgba(0, 0, 255, 0.1)",
                        fill: true,
                        borderWidth: 4,  
                        pointRadius: 1,  
                        pointHoverRadius: 8,
                        pointBackgroundColor: "blue",
                    },
                    {
                        label: "Off-Peak Demand (MW)",
                        data: offPeakData,
                        borderColor: "green",
                        backgroundColor: "rgba(0, 255, 0, 0.1)",
                        fill: true,
                        borderWidth: 4,  
                        pointRadius: 1,  
                        pointHoverRadius: 8,
                        pointBackgroundColor: "green",
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, //  Allows better scaling
                scales: {
                    x: { 
                        title: { display: true, text: "Date", font: { size: 16 } },
                        ticks: { maxRotation: 45, minRotation: 45, font: { size: 14 } }
                    },
                    y: { 
                        title: { display: true, text: "Electricity Demand (MW)", font: { size: 16 } }, 
                        beginAtZero: true,
                        ticks: { font: { size: 14 } }
                    }
                },
                plugins: {
                    legend: {
                        labels: { font: { size: 16 } } //  Bigger legend text
                    }
                }
            }
        });
    }
    
    
    
    
    
    
    

    function loadBestLocation() {
        let year = $("#year").val();
    
        if (!year) {
            console.warn("⚠️ No year selected for best location.");
            return;
        }
    
        console.log(`📡 Fetching best location for Year: ${year}`);
    
        $.post("/get_best_location", { year: year }, function (data) {
            if (data.error) {
                console.error(" Error fetching best location:", data.error);
                $("#bestLocation").text("No data available.");
                $("#bestLocationDetails").html("<p class='text-danger'>No data found for the selected year.</p>");
            } else {
                $("#bestLocation").text(` ${data.location}`);
                $("#bestLocationDetails").html(`
                    <p><strong> Forecasted Solar Irradiance:</strong> ${data.forecasted_irradiance.toFixed(2)} W/m²</p>
                    <p><strong> Location:</strong> ${data.location}</p>
                `);
                updateMap(data.latitude, data.longitude, data.location);
            }
        }).fail(function () {
            console.error(" Failed to fetch best location.");
            $("#bestLocation").text("Error loading location.");
            $("#bestLocationDetails").html("<p class='text-danger'>Error retrieving location details.</p>");
        });
    }
    
    //  Call this function when the year dropdown changes
    $("#year").change(function () {
        loadBestLocation();
    });
    


    function loadAvailableLocations() {
        $.post("/get_available_locations", function (data) {
            let locationDropdown = $("#location");
            locationDropdown.empty(); // Clear existing options
    
            if (data.locations && data.locations.length > 0) {
                data.locations.forEach(location => {
                    locationDropdown.append(`<option value="${location}">${location}</option>`);
                });
            } else {
                locationDropdown.append(`<option disabled>No Data</option>`);
            }
        }).fail(function () {
            console.error(" Failed to fetch available locations.");
            $("#location").append(`<option disabled>Error Loading</option>`);
        });
    }
    

    //  Function to Reset a Chart Before Updating
function resetChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy(); // Destroy the old chart instance
    }
    let ctx = document.getElementById(chartId).getContext("2d");
    chartInstances[chartId] = new Chart(ctx, { type: "line", data: { labels: [], datasets: [] } }); // Reset with an empty chart
}


    

    function updateChart(chartId, label, labels, dataset) {
        if (!labels || labels.length === 0) {
            console.warn("No data available for", chartId);
            $("#" + chartId).parent().html(`<p class='text-danger'>No data available.</p>`);
            return;
        }

        let ctx = document.getElementById(chartId).getContext("2d");

        //  Destroy old chart before rendering new data
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
        }

        chartInstances[chartId] = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: dataset,
                    borderColor: "blue",
                    backgroundColor: "rgba(0, 0, 255, 0.2)",
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: "Date" } },
                    y: { beginAtZero: true, title: { display: true, text: label } }
                }
            }
        });
    }
});

















