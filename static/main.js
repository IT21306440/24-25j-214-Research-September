$(document).ready(function () {
    let map = L.map('map').setView([7.8731, 80.7718], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    let marker = L.marker([7.8731, 80.7718], {
        icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [32, 32]
        })
    }).addTo(map);

    $("#year").change(function () {
        let year = $(this).val();
        $("#selectedYear").text(year);
        $("#bestLocation").text("Loading...");
        $("#loadingLocation").show();

        // ✅ Fetch best location for selected year
        $.post("/get_best_location", { year: year }, function (data) {
            if (data.error) {
                console.error("❌ Error fetching best location:", data.error);
                $("#bestLocation").text("No data available.");
            } else {
                $("#bestLocation").text(`Best Location: ${data.location}`);
                updateMap(data.latitude, data.longitude, data.location);
            }
            $("#loadingLocation").hide();
        }).fail(function () {
            console.error("❌ Failed to fetch best location.");
            $("#bestLocation").text("Error loading location.");
            $("#loadingLocation").hide();
        });

        $("#loadingChart").show();

        // ✅ Fetch available months for the selected year
        $.post("/get_months", { year: year }, function (data) {
            $("#month").empty();
            if (data.months && data.months.length > 0) {
                $.each(data.months, function (index, month) {
                    $("#month").append(new Option(month, month));
                });
            } else {
                $("#month").append(new Option("No data", ""));
            }
            $("#loadingChart").hide();
        }).fail(function () {
            console.error("❌ Failed to fetch available months.");
            $("#loadingChart").hide();
        });

        // ✅ Load irradiance data for the first available month
        setTimeout(() => {
            let selectedMonth = $("#month").val();
            if (selectedMonth) {
                loadIrradianceData(year, selectedMonth);
            }
        }, 500);
    });

    $("#month").change(function () {
        let year = $("#year").val();
        let month = $(this).val();
        if (year && month) {
            loadIrradianceData(year, month);
        }
    });

    function loadIrradianceData(year, month) {
        let location = $("#bestLocation").text().replace("Best Location: ", "").trim();
        
        if (!location || location === "Loading..." || location === "No data available.") {
            console.warn("⚠️ No valid location found, using default: 'Mannar'");
            location = "Mannar"; // Default fallback
        }
    
        $("#loadingChart").show();
    
        $.post("/get_irradiance_curve", { 
            year: year, 
            month: month, 
            location: location,  
            time_frame: "daily"  
        }, function (data) {
            console.log("✅ Irradiance Data:", data); // Debugging
            if (data.error) {
                console.error("❌ Error fetching irradiance:", data.error);
                $("#forecastChart").parent().html("<p class='text-danger'>No data available.</p>");
            } else {
                updateChart(data);
            }
            $("#loadingChart").hide();
        }).fail(function () {
            console.error("❌ Failed to fetch irradiance data.");
            $("#forecastChart").parent().html("<p class='text-danger'>No data available.</p>");
            $("#loadingChart").hide();
        });
    }
    

    function updateMap(lat, lon, locationName) {
        marker.setLatLng([lat, lon]);
        map.setView([lat, lon], 10);
        marker.bindPopup(`<b>${locationName}</b><br>High solar potential, ideal for solar power generation.`).openPopup();
    }

    let ctx = document.getElementById('forecastChart').getContext('2d');
    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: "Irradiance (W/m²)",
                data: [],
                borderColor: "blue",
                backgroundColor: "rgba(0, 0, 255, 0.2)",
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Date" } },
                y: { title: { display: true, text: "W/m²" } }
            }
        }
    });

    function updateChart(data) {
        if (!data || !data.dates || !data.irradiance || data.dates.length === 0) {
            console.warn("⚠️ No data available for irradiance chart.");
            $("#forecastChart").parent().html("<p class='text-danger'>No data available.</p>");
            return;
        }

        chart.data.labels = data.dates.map(date => new Date(date).toLocaleDateString('en-GB'));
        chart.data.datasets[0].data = data.irradiance;
        chart.update();
    }
});
