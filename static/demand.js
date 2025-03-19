$(document).ready(function () {
    let chartInstances = {}; // Store chart instances

    //  Populate year and month dropdowns
    let yearFilter = $("#yearFilter");
    let monthFilter = $("#monthFilter");

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
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
            loadChartsAndCards(data.years[0], "March"); // Load charts and cards with first year & default month
        } else {
            console.error(" No years available.");
        }
    }).fail(function () {
        console.error(" Failed to fetch available years.");
    });

    //  Update charts and cards when filters are changed
    yearFilter.change(function () {
        let selectedYear = $(this).val();
        let selectedMonth = monthFilter.val();
        loadChartsAndCards(selectedYear, selectedMonth);
    });

    monthFilter.change(function () {
        let selectedYear = yearFilter.val();
        let selectedMonth = $(this).val();
        loadChartsAndCards(selectedYear, selectedMonth);
    });

    //  Function to fetch data and update charts & cards
    function loadChartsAndCards(year, month) {
        $.post("/get_all_peak_demand", { year: year, month: month }, function (data) {
            if (data.error) {
                console.error(` API Error: `, data.error);
                return;
            }

            let labels = data.dates;
            let peakDemand = data.peak_demand;
            let dayPeakDemand = data.day_peak_demand;
            let offPeakDemand = data.off_peak_demand;

            //  Update Cards with Average Values
            $("#avgPeak").text(averageValue(peakDemand));
            $("#avgDayPeak").text(averageValue(dayPeakDemand));
            $("#avgOffPeak").text(averageValue(offPeakDemand));

            //  Update Charts
            updateChart("peakDemandChart", "Peak Demand (MW)", labels, peakDemand);
            updateChart("dayPeakChart", "Day Peak Demand (MW)", labels, dayPeakDemand);
            updateChart("offPeakChart", "Off-Peak Demand (MW)", labels, offPeakDemand);

        }).fail(function () {
            console.error(` Failed to fetch demand data`);
        });
    }

    //  Function to calculate average value for demand cards
    function averageValue(dataArray) {
        if (!dataArray || dataArray.length === 0) return 0;
        let sum = dataArray.reduce((a, b) => a + b, 0);
        return (sum / dataArray.length).toFixed(2); // Return 2 decimal places
    }

    //  Function to update or create a chart
    function updateChart(chartId, label, labels, dataset) {
        let ctx = document.getElementById(chartId).getContext("2d");

        //  Destroy old chart instance before creating a new one
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
