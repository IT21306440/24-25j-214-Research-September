$(document).ready(function () {
    let chartInstances = {}; // Store chart instances

    let yearFilter = $("#yearFilter");
    let monthFilter = $("#monthFilter");

    const months = ["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    months.forEach(month => {
        monthFilter.append(new Option(month, month));
    });

    //  Fetch available years dynamically
    $.post("/get_available_years", function (data) {
        if (data.years) {
            data.years.forEach(year => {
                yearFilter.append(new Option(year, year));
            });
            yearFilter.val(data.years[0]); // Default to first available year
            loadCharts(data.years[0], "January");
        }
    });

    yearFilter.change(function () {
        loadCharts(yearFilter.val(), monthFilter.val());
    });

    monthFilter.change(function () {
        loadCharts(yearFilter.val(), monthFilter.val());
    });

    function loadCharts(year, month) {
        fetchChartData("/get_charging_vs_discharging", "chargingVsDischargingChart",
            "Charging Cost & Discharging Revenue (USCts/kWh)", year, month, "charging_cost", "discharging_revenue");

        fetchChartData("/get_battery_revenue", "batteryRevenueChart",
            "Net Profit (USCts/kWh)", year, month, "revenue");

        fetchChartData("/get_optimized_daily_power", "optimizedDailyPowerChart",
            "Optimized Daily Power Release (kWh)", year, month, "power_release");
    }

    function fetchChartData(apiEndpoint, chartId, label, year, month, datasetKey1, datasetKey2 = null) {
        $.post(apiEndpoint, { year: year, month: month }, function (data) {
            if (!data.dates || data.dates.length === 0) {
                console.warn(`⚠️ No data for ${month}, falling back to January.`);
                $.post(apiEndpoint, { year: year, month: "January" }, function (fallbackData) {
                    updateChart(chartId, label, fallbackData.dates || ["No Data"], fallbackData[datasetKey1] || [0], datasetKey2 ? fallbackData[datasetKey2] || [0] : null);
                });
                return;
            }
            updateChart(chartId, label, data.dates, data[datasetKey1], datasetKey2 ? data[datasetKey2] : null);
        });
    }

    function updateChart(chartId, label, labels, dataset1, dataset2 = null) {
        let ctx = document.getElementById(chartId).getContext("2d");
        if (chartInstances[chartId]) chartInstances[chartId].destroy();
        
        let datasets = [];

        //  Set specific labels for each chart separately
        if (chartId === "chargingVsDischargingChart") {
            datasets = [
                {
                    label: "Charging Cost (USCts/kWh)",  // ✅ Manually Set Name for Charging Cost Chart
                    data: dataset1,
                    borderColor: "blue",
                    backgroundColor: "rgba(0, 0, 255, 0.2)",
                    fill: true
                },
                {
                    label: "Discharging Revenue (USCts/kWh)",  // ✅ Manually Set Name for Discharging Revenue Chart
                    data: dataset2,
                    borderColor: "red",
                    backgroundColor: "rgba(255, 0, 0, 0.2)",
                    fill: true
                }
            ];
        } else if (chartId === "batteryRevenueChart") {
            datasets = [
                {
                    label: "Net Profit (USCts/kWh)",  // ✅ Manually Set Name for Battery Revenue Chart
                    data: dataset1,
                    borderColor: "green",
                    backgroundColor: "rgba(0, 255, 0, 0.2)",
                    fill: true
                }
            ];
        } else if (chartId === "optimizedDailyPowerChart") {
            datasets = [
                {
                    label: "Optimized Daily Power Release (MWh)",  // ✅ Manually Set Name for Power Release Chart
                    data: dataset1,
                    borderColor: "purple",
                    backgroundColor: "rgba(128, 0, 128, 0.2)",
                    fill: true
                }
            ];
        }

        chartInstances[chartId] = new Chart(ctx, {
            type: "line",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: "Date" },
                        ticks: { maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        title: { display: true, text: label },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { labels: { font: { size: 14 } } }
                }
            }
        });
    }
});
