// Initial chart setup
let demandChart = new Chart(document.getElementById('demandChart'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Demand (MW)',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            fill: false
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time (15-min intervals)'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Demand (MW)'
                },
                beginAtZero: true
            }
        },
        animation: false,
        elements: {
            point: {
                radius: 0
            }
        }
    }
});

// Debounce function to limit rapid updates
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load available years
function loadYears() {
    console.log("Loading years...");
    fetch('/get_available_years1', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Years data received:", data);
        const yearSelect = document.getElementById('yearSelect');
        const currentValue = yearSelect.value; // Retain current selection
        yearSelect.innerHTML = '<option value="">Select Year</option>';
        if (data.years && Array.isArray(data.years)) {
            data.years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
            if (currentValue) {
                yearSelect.value = currentValue; // Restore previous selection
                loadMonths();
            }
        } else {
            console.warn('No valid years data received:', data);
        }
    })
    .catch(error => {
        console.error('Error loading years:', error);
        fetch('/get_available_years1', { method: 'POST' })
            .then(resp => resp.text())
            .then(text => console.log('Raw response:', text));
    });
}

// Load available months for selected year
function loadMonths() {
    const yearSelect = document.getElementById('yearSelect');
    const year = yearSelect.value;
    console.log("Loading months for year:", year);
    const monthSelect = document.getElementById('monthSelect');
    const daySelect = document.getElementById('daySelect');
    const currentMonth = monthSelect.value; // Retain current selection

    if (!year) {
        monthSelect.innerHTML = '<option value="">Select Month</option>';
        daySelect.innerHTML = '<option value="">Select Day</option>';
        return;
    }

    fetch('/get_months1', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `year=${year}`
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Months data received:", data);
        monthSelect.innerHTML = '<option value="">Select Month</option>';
        if (data.error) {
            console.error(data.error);
            daySelect.innerHTML = '<option value="">Select Day</option>';
            return;
        }
        if (data.months && Array.isArray(data.months)) {
            data.months.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = month;
                monthSelect.appendChild(option);
            });
            console.log("Month dropdown populated with:", monthSelect.options);
            // Restore the previous selection if it exists and is valid
            if (currentMonth && data.months.includes(currentMonth)) {
                monthSelect.value = currentMonth;
                loadDays();
            } else {
                daySelect.innerHTML = '<option value="">Select Day</option>';
            }
        } else {
            console.warn('No valid months data received:', data);
            daySelect.innerHTML = '<option value="">Select Day</option>';
        }
    })
    .catch(error => {
        console.error('Error loading months:', error);
        fetch('/get_months1', { method: 'POST', body: `year=${year}` })
            .then(resp => resp.text())
            .then(text => console.log('Raw response from /get_months1:', text));
        daySelect.innerHTML = '<option value="">Select Day</option>';
    });
}

// Load available days for selected month
function loadDays() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');
    const year = yearSelect.value;
    const month = monthSelect.value;
    console.log("Loading days for year:", year, "month:", month);
    const daySelect = document.getElementById('daySelect');

    if (!year || !month) {
        daySelect.innerHTML = '<option value="">Select Day</option>';
        return;
    }

    fetch('/get_days1', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `year=${year}&month=${month}`
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Days data received:", data);
        daySelect.innerHTML = '<option value="">Select Day</option>';
        if (data.error) {
            console.error(data.error);
            return;
        }
        if (data.days && Array.isArray(data.days)) {
            data.days.forEach(day => {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day;
                daySelect.appendChild(option);
            });
            console.log("Day dropdown populated with:", daySelect.options);
            // Automatically select the first day if available
            if (daySelect.options.length > 1) {
                daySelect.selectedIndex = 1; // Select the first day
                console.log("Auto-selected day:", daySelect.value);
                debouncedUpdateChart();
            }
        } else {
            console.warn('No valid days data received:', data);
        }
    })
    .catch(error => {
        console.error('Error loading days:', error);
        fetch('/get_days1', { method: 'POST', body: `year=${year}&month=${month}` })
            .then(resp => resp.text())
            .then(text => console.log('Raw response from /get_days1:', text));
    });
}

// Update chart with selected date (debounced to prevent rapid updates)
const debouncedUpdateChart = debounce(function updateChart() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    const day = document.getElementById('daySelect').value;
    const loadingDiv = document.getElementById('loading');

    console.log("Updating chart for year:", year, "month:", month, "day:", day);
    if (!year || !month || !day) {
        demandChart.data.labels = [];
        demandChart.data.datasets[0].data = [];
        demandChart.update();
        loadingDiv.style.display = 'none';
        return;
    }

    loadingDiv.style.display = 'block';

    fetch('/get_demand_curve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `year=${year}&month=${month}&day=${day}`
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Chart data received:", data);
        if (data.error) {
            console.error(data.error);
            demandChart.data.labels = [];
            demandChart.data.datasets[0].data = [];
        } else {
            const maxDataPoints = 1000;
            if (data.timestamps.length > maxDataPoints) {
                const step = Math.floor(data.timestamps.length / maxDataPoints);
                data.timestamps = data.timestamps.filter((_, i) => i % step === 0);
                data.demand_mw = data.demand_mw.filter((_, i) => i % step === 0);
            }
            demandChart.data.labels = data.timestamps;
            demandChart.data.datasets[0].data = data.demand_mw;
        }
        demandChart.update();
        loadingDiv.style.display = 'none';
    })
    .catch(error => {
        console.error('Error:', error);
        loadingDiv.style.display = 'none';
    });
}, 500);

// Initial load and event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadYears();
    const yearSelect = document.getElementById('yearSelect');
    yearSelect.addEventListener('change', loadMonths);
    const monthSelect = document.getElementById('monthSelect');
    monthSelect.addEventListener('change', loadDays);
    const daySelect = document.getElementById('daySelect');
    daySelect.addEventListener('change', debouncedUpdateChart);
});