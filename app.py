from flask import Flask, render_template, request, jsonify
import pandas as pd
import os
import torch
import torchvision
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
from flask import Flask, request, jsonify, render_template
import io
from collections import OrderedDict


app = Flask(__name__)

# ✅ Define Data Path
DATA_PATH = "C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data"

# ✅ Function to Load CSV with Safe Error Handling
def load_csv(filename):
    filepath = os.path.join(DATA_PATH, filename)
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)

        # Convert Date column if it exists
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce", infer_datetime_format=True)
        
        return df
    else:
        print(f"⚠️ Warning: {filename} not found!")
        return None


# ✅ Load Data
best_locations_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//best_location_per_year.csv")
forecast_results_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//merged_forecast_2025_2027.csv")
electricity_demand_df = load_csv("electricity_demand.csv")
charging_vs_discharging_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//charging_vs_discharging_comparison.csv")
battery_revenue_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//charging_vs_discharging_comparison.csv")
optimized_daily_power_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//optimized_daily_power_release1.csv")
optimized_hourly_power_df = load_csv("optimized_hourly_power_release.csv")
demand_forecast_df = load_csv("hybrid_lstm_xgb_2yr_forecast.csv")
peak_demand_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//New folder//hybrid_lstm_xgb_3yr_forecast_for_Peak1.csv")
day_peak_demand_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//New folder//hybrid_lstm_xgb_2yr_forecast for Day Peak.csv")
off_peak_demand_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//New folder//hybrid_lstm_xgb_3yr_forecast_for_Off_Peak.csv")
future_solar_irradiance_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//NewRandunifinal_combined_solar_irradiance.csv")  # Load future solar irradiance data
forecasted_solar_power_df = load_csv("C://Users//94772//Desktop//projects//Research Final Full System//Frontend//Frontend//data//total_forecasted_solar_power_mwNew.csv")

# ✅ Ensure `available_years` is properly initialized
available_years = sorted(best_locations_df["Year"].unique().tolist()) if best_locations_df is not None else []

@app.route('/')
def index():
    return render_template('index.html', years=available_years)

@app.route('/battery')
def battery():
    return render_template('battery.html')

@app.route('/integrated')
def integrated():
    return render_template('integrated.html')


@app.route('/demand')
def demand():
    return render_template('demand.html')


@app.route('/maintainance')
def maintainance():
    return render_template('maintainance.html')

# ✅ Add Home Route to Fix 404 Error
@app.route("/dust")
def dust():
    return render_template("dust.html")  # Serve the upload page instead of text


# ✅ Add Upload Page Route
@app.route("/upload")
def upload_page():
    return render_template("dust.html")




@app.route('/get_available_locations', methods=['POST'])
def get_available_locations():
    if forecast_results_df is not None and "Location" in forecast_results_df.columns:
        locations = sorted(forecast_results_df["Location"].unique().tolist())  # Sort for better UI
        return jsonify({"locations": locations})
    return jsonify({"error": "No locations available"}), 500

@app.route('/get_months', methods=['POST'])
def get_available_months():
    year = int(request.form.get('year'))
    if forecast_results_df is not None and "Date" in forecast_results_df.columns:
        months = forecast_results_df[forecast_results_df["Date"].dt.year == year]["Date"].dt.strftime("%B").unique().tolist()
        return jsonify({"months": months})
    return jsonify({"error": "Forecast data not available"}), 500

@app.route('/get_available_years', methods=['POST'])
def get_available_years():
    if best_locations_df is not None:
        years = sorted(best_locations_df["Year"].unique().tolist())
    else:
        years = []
    return jsonify({"years": years})


@app.route('/get_future_locations', methods=['POST'])
def get_future_locations():
    if future_solar_irradiance_df is None:
        return jsonify({"error": "Future solar irradiance data not available"}), 500

    # Debugging: Print available columns
    print("Available columns in future_solar_irradiance_df:", future_solar_irradiance_df.columns)

    if "Location" not in future_solar_irradiance_df.columns:
        return jsonify({"error": "Column 'Location' missing in future_solar_irradiance dataset"}), 500

    locations = sorted(future_solar_irradiance_df["Location"].dropna().unique().tolist())
    
    if not locations:
        return jsonify({"error": "No future locations available"}), 500
    
    return jsonify({"locations": locations})



@app.route('/get_best_location', methods=['POST'])
def get_best_location():
    year = request.form.get('year')

    if not year:
        return jsonify({"error": "Year parameter is missing"}), 400

    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year format"}), 400

    # ✅ Updated best locations dataset
    best_locations = {
        2025: {"Location": "Monaragala", "Forecasted Solar Irradiance": 5426.560108},
        2026: {"Location": "Munalthivu_Puththalam", "Forecasted Solar Irradiance": 5458.789756},
        2027: {"Location": "Hambantota", "Forecasted Solar Irradiance": 5445.905002},
    }

    # ✅ Updated location coordinates (Added new locations)
    location_coordinates = {
        "Siyabalanduwa": {"lat": 6.8102, "lon": 81.5861},
        "Vavuniya": {"lat": 8.7515, "lon": 80.4976},
        "Mannar": {"lat": 8.9776, "lon": 79.9045},
        "Trincomali": {"lat": 8.5874, "lon": 81.2152},
        "Kilinochchi": {"lat": 9.3961, "lon": 80.3982},
        "Polonnaruwa": {"lat": 7.9403, "lon": 81.0188},
        "Hambantota": {"lat": 6.1246, "lon": 81.1185},
        "Matara": {"lat": 5.9549, "lon": 80.5519},
        "Monaragala": {"lat": 6.8724, "lon": 81.3487},
        "Munalthivu_Puththalam": {"lat": 8.0362, "lon": 79.8406},
    }

    # ✅ Check if the requested year exists in best locations
    if year not in best_locations:
        return jsonify({"error": f"No location data available for {year}"}), 404

    best_location = best_locations[year]
    location_name = best_location["Location"]
    forecasted_irradiance = best_location["Forecasted Solar Irradiance"]

    # ✅ Ensure the location has coordinates
    if location_name not in location_coordinates:
        return jsonify({"error": f"Coordinates not found for {location_name}"}), 500

    return jsonify({
        "location": location_name,
        "latitude": location_coordinates[location_name]["lat"],
        "longitude": location_coordinates[location_name]["lon"],
        "forecasted_irradiance": forecasted_irradiance
    })


@app.route('/get_irradiance_curve', methods=['POST'])
def get_irradiance_curve():
    year = request.form.get('year')
    month = request.form.get('month')
    time_frame = request.form.get('time_frame')

    if not year or not month or not time_frame:
        return jsonify({"error": "Missing year, month, or time frame parameter"}), 400

    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year format"}), 400

    # ✅ Ensure the datasets are loaded
    if best_locations_df is None or future_solar_irradiance_df is None:
        return jsonify({"error": "Required datasets not loaded"}), 500

    # ✅ Get the best location for the selected year
    best_location_row = best_locations_df[best_locations_df["Year"] == year]

    if best_location_row.empty:
        return jsonify({"error": f"No best location found for {year}"}), 404

    best_location = best_location_row.iloc[0]["Location"]  # Extract best location for the year

    # ✅ Debugging: Ensure required columns exist in `future_solar_irradiance_df`
    required_columns = ["Date", "Forecasted Solar Irradiance", "Location"]
    for col in required_columns:
        if col not in future_solar_irradiance_df.columns:
            return jsonify({"error": f"Missing column '{col}' in future_solar_irradiance dataset"}), 500

    # ✅ Convert 'Date' column to datetime
    future_solar_irradiance_df["Date"] = pd.to_datetime(future_solar_irradiance_df["Date"], errors="coerce")
    future_solar_irradiance_df["Year"] = future_solar_irradiance_df["Date"].dt.year
    future_solar_irradiance_df["Month"] = future_solar_irradiance_df["Date"].dt.strftime("%B")  # Convert month to string

    # ✅ Filter data for the selected year, month, and best location
    filtered_data = future_solar_irradiance_df[
        (future_solar_irradiance_df["Year"] == year) &
        (future_solar_irradiance_df["Month"] == month) &
        (future_solar_irradiance_df["Location"] == best_location)
    ]

    if filtered_data.empty:
        return jsonify({"error": f"No irradiance data found for {best_location} in {month} {year}"}), 404

    # ✅ Ensure data is sorted correctly
    filtered_data = filtered_data.sort_values(by="Date")

    return jsonify({
        "year": year,
        "month": month,
        "location": best_location,
        "dates": filtered_data["Date"].astype(str).tolist(),
        "irradiance": filtered_data["Forecasted Solar Irradiance"].tolist()
    })


@app.route('/get_solar_irradiance', methods=['POST'])
def get_solar_irradiance():
    year = request.form.get('year')
    month = request.form.get('month')
    location = request.form.get('location')
    time_frame = request.form.get('time_frame')  


    if not year or not month or not location or not time_frame:
        return jsonify({"error": "Missing year, month, location, or time frame parameter"}), 400

    year = int(year)

    if forecast_results_df is None:
        return jsonify({"error": "Solar irradiance data not available"}), 500

    if "Date" not in forecast_results_df.columns or "Forecasted Solar Irradiance" not in forecast_results_df.columns or "Location" not in forecast_results_df.columns:
        return jsonify({"error": "Required columns missing in dataset"}), 500

    forecast_results_df["Date"] = pd.to_datetime(forecast_results_df["Date"], errors="coerce")


    forecast_results_df["Location"] = forecast_results_df["Location"].str.lower().str.strip()
    location = location.lower().strip()  # ✅ Convert input to lowercase

    # ✅ Filter data for selected year, month, and location
    filtered_data = forecast_results_df[
    (forecast_results_df["Date"].dt.year == year) & 
    (forecast_results_df["Date"].dt.strftime("%B") == month) & 
    (forecast_results_df["Location"] == location)
]

    if time_frame == "daily":
        result_data = filtered_data[["Date", "Forecasted Solar Irradiance"]].copy()
    elif time_frame == "monthly":
        result_data = filtered_data.groupby(filtered_data["Date"].dt.month)["Forecasted Solar Irradiance"].mean().reset_index()
        result_data["Date"] = result_data["Date"].apply(lambda x: f"Month {x}")
    else:
        return jsonify({"error": "Invalid time frame"}), 400

    print(f"Irradiance Data: {result_data}")  # Debugging

    return jsonify({
        "dates": result_data["Date"].astype(str).tolist(),
        "irradiance": result_data["Forecasted Solar Irradiance"].tolist()
    })




@app.route('/get_future_solar_irradiance', methods=['POST'])
def get_future_solar_irradiance():
    year = request.form.get('year')
    month = request.form.get('month')  # ✅ Get month from the request
    location = request.form.get('location')

    print("📡 Received request for future solar irradiance:", {"year": year, "month": month, "location": location})

    if not year or not location or not month:
        return jsonify({"error": "Missing year, month, or location parameter"}), 400

    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year format"}), 400

    if future_solar_irradiance_df is None:
        return jsonify({"error": "Future solar irradiance data not available"}), 500

    # ✅ Ensure correct column names
    required_columns = ["Date", "Forecasted Solar Irradiance", "Location"]
    missing_columns = [col for col in required_columns if col not in future_solar_irradiance_df.columns]
    if missing_columns:
        return jsonify({"error": f"Missing columns in dataset: {missing_columns}"}), 500

    # ✅ Convert 'Date' column to datetime
    future_solar_irradiance_df["Date"] = pd.to_datetime(future_solar_irradiance_df["Date"], errors="coerce")
    future_solar_irradiance_df["Year"] = future_solar_irradiance_df["Date"].dt.year
    future_solar_irradiance_df["Month"] = future_solar_irradiance_df["Date"].dt.strftime("%B")  # Month name

    # ✅ Filter data for the selected year, month, and location
    filtered_data = future_solar_irradiance_df[
        (future_solar_irradiance_df["Year"] == year) &
        (future_solar_irradiance_df["Month"] == month) &
        (future_solar_irradiance_df["Location"] == location)
    ]

    if filtered_data.empty:
        return jsonify({"error": f"No data found for {location} in {month} {year}"}), 404

    # ✅ Ensure Data is sorted correctly
    filtered_data = filtered_data.sort_values(by="Date")

    return jsonify({
        "year": year,
        "month": month,
        "location": location,
        "dates": filtered_data["Date"].astype(str).tolist(),  # Return full Date values
        "forecasted_irradiance": filtered_data["Forecasted Solar Irradiance"].tolist()
    })


@app.route('/get_forecasted_solar_power', methods=['POST'])
def get_forecasted_solar_power():
    year = request.form.get('year')
    month = request.form.get('month')

    if not year or not month:
        return jsonify({"error": "Missing year or month parameter"}), 400

    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year format"}), 400

    if forecasted_solar_power_df is None:
        return jsonify({"error": "Forecasted solar power data not available"}), 500

    # ✅ Convert 'Date' column to datetime if not already
    if "Date" not in forecasted_solar_power_df.columns:
        return jsonify({"error": "Missing 'Date' column in dataset"}), 500

    # ✅ Extract Year and Month from Date
    forecasted_solar_power_df["Year"] = forecasted_solar_power_df["Date"].dt.year
    forecasted_solar_power_df["Month"] = forecasted_solar_power_df["Date"].dt.strftime("%B")

    # ✅ Filter Data by Year and Month
    filtered_data = forecasted_solar_power_df[
        (forecasted_solar_power_df["Year"] == year) & (forecasted_solar_power_df["Month"] == month)
    ]

    if filtered_data.empty:
        return jsonify({"error": f"No forecasted solar power data available for {month} {year}"}), 404

    # ✅ Sort by Date for correct visualization
    filtered_data = filtered_data.sort_values(by="Date")

    return jsonify({
        "dates": filtered_data["Date"].astype(str).tolist(),
        "solar_power": filtered_data["forecasted_solar_power_mw"].tolist()
    })



@app.route('/get_all_peak_demand', methods=['POST'])
def get_all_peak_demand():
    year = request.form.get('year')
    month = request.form.get('month')

    if not year or not month:
        return jsonify({"error": "Year and Month are required"}), 400

    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year format"}), 400

    # Convert month name to number
    month_mapping = {
        "January": 1, "February": 2, "March": 3, "April": 4,
        "May": 5, "June": 6, "July": 7, "August": 8,
        "September": 9, "October": 10, "November": 11, "December": 12
    }
    month_num = month_mapping.get(month)
    if month_num is None:
        return jsonify({"error": "Invalid month"}), 400

    # Convert Date column to datetime for filtering
    for df in [peak_demand_df, day_peak_demand_df, off_peak_demand_df]:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

    # Filter data for the selected year and month
    peak_filtered = peak_demand_df[
        (peak_demand_df["Date"].dt.year == year) & (peak_demand_df["Date"].dt.month == month_num)
    ]
    day_peak_filtered = day_peak_demand_df[
        (day_peak_demand_df["Date"].dt.year == year) & (day_peak_demand_df["Date"].dt.month == month_num)
    ]
    off_peak_filtered = off_peak_demand_df[
        (off_peak_demand_df["Date"].dt.year == year) & (off_peak_demand_df["Date"].dt.month == month_num)
    ]

    if peak_filtered.empty or day_peak_filtered.empty or off_peak_filtered.empty:
        return jsonify({"error": f"No demand data available for {month} {year}"}), 404

    return jsonify({
        "dates": peak_filtered["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "peak_demand": peak_filtered.iloc[:, 1].tolist(),  # Peak demand values
        "day_peak_demand": day_peak_filtered.iloc[:, 1].tolist(),  # Day peak demand values
        "off_peak_demand": off_peak_filtered.iloc[:, 1].tolist(),  # Off-peak demand values
    })



@app.route('/get_power_data', methods=['POST'])
def get_power_data():
    global optimized_daily_power_df  # ✅ Ensure global scope

    date_str = request.form.get('date')  # Expecting "YYYY-MM-DD"
    time_frame = request.form.get('time_frame')

    if not date_str or not time_frame:
        return jsonify({"error": "Missing date or time frame parameter"}), 400

    # ✅ Ensure the dataset is loaded
    if optimized_daily_power_df is None:
        return jsonify({"error": "Power data not available"}), 500

    # ✅ Check for required columns
    required_columns = ["Date", "Optimized_Daily_MW"]
    missing_columns = [col for col in required_columns if col not in optimized_daily_power_df.columns]
    if missing_columns:
        return jsonify({"error": f"Required columns missing in dataset: {missing_columns}"}), 500

    # ✅ Convert 'Date' column to datetime format
    optimized_daily_power_df["Date"] = pd.to_datetime(optimized_daily_power_df["Date"], errors="coerce")

    # ✅ Convert input date to datetime
    try:
        selected_date = pd.to_datetime(date_str, format='%Y-%m-%d', errors='coerce')
        if pd.isnull(selected_date):
            raise ValueError
    except ValueError:
        return jsonify({"error": "Invalid date format. Expected format: YYYY-MM-DD"}), 400

    # ✅ Filtering based on time frame
    if time_frame == "daily":
        filtered_data = optimized_daily_power_df[optimized_daily_power_df["Date"] == selected_date]
    elif time_frame == "monthly":
        filtered_data = optimized_daily_power_df[optimized_daily_power_df["Date"].dt.month == selected_date.month]
        filtered_data = filtered_data.groupby(filtered_data["Date"].dt.date)["Optimized_Daily_MW"].sum().reset_index()
        filtered_data["Date"] = filtered_data["Date"].astype(str)
    elif time_frame == "yearly":
        filtered_data = optimized_daily_power_df[optimized_daily_power_df["Date"].dt.year == selected_date.year]
        filtered_data = filtered_data.groupby(filtered_data["Date"].dt.month)["Optimized_Daily_MW"].sum().reset_index()
        filtered_data["Date"] = filtered_data["Date"].apply(lambda x: f"Month {x}")
    else:
        return jsonify({"error": "Invalid time frame"}), 400

    if filtered_data.empty:
        return jsonify({"error": f"No data available for {selected_date.date()}"}), 404

    return jsonify({
        "dates": filtered_data["Date"].astype(str).tolist(),
        "power_release": filtered_data["Optimized_Daily_MW"].tolist()
    })


@app.route('/get_optimized_daily_power', methods=['POST'])
def get_optimized_daily_power():
    global optimized_daily_power_df  # Ensure global scope

    month = request.form.get('month', 'All')  # Default to "All"

    if optimized_daily_power_df is None:
        return jsonify({"error": "Daily power release data not available"}), 500

    # ✅ Rename "Day" to "Date" if needed (Only if it exists)
    if "Day" in optimized_daily_power_df.columns and "Date" not in optimized_daily_power_df.columns:
        optimized_daily_power_df = optimized_daily_power_df.rename(columns={"Day": "Date"})

    # ✅ Convert "Date" to datetime format safely (Avoid duplicate conversions)
    if not pd.api.types.is_datetime64_any_dtype(optimized_daily_power_df["Date"]):
        optimized_daily_power_df["Date"] = pd.to_datetime(optimized_daily_power_df["Date"], errors="coerce")

    # ✅ Drop invalid dates
    optimized_daily_power_df = optimized_daily_power_df.dropna(subset=["Date"])

    # ✅ Extract Month Name
    optimized_daily_power_df["Month"] = optimized_daily_power_df["Date"].dt.strftime("%B")

    # ✅ Filter by month (case-insensitive)
    filtered_data = optimized_daily_power_df if month.lower() == "all" else \
        optimized_daily_power_df[optimized_daily_power_df["Month"].str.lower() == month.lower()]

    if filtered_data.empty:
        return jsonify({"error": f"No data available for {month}"}), 404

    return jsonify({
        "dates": filtered_data["Date"].astype(str).tolist(),
        "power_release": filtered_data["Optimized_Daily_MW"].tolist()
    })




@app.route('/get_charging_vs_discharging', methods=['POST'])
def get_charging_vs_discharging():
    month = request.form.get('month', 'January')  # Default to January

    if charging_vs_discharging_df is None:
        return jsonify({"error": "Battery charging/discharging data not available"}), 500

    # Ensure required columns exist
    required_columns = ["Date", "Charging_Cost (USCts/kWh)", "Discharging_Revenue (USCts/kWh)"]
    missing_columns = [col for col in required_columns if col not in charging_vs_discharging_df.columns]

    if missing_columns:
        return jsonify({"error": f"Missing required columns: {missing_columns}"}), 500

    # Convert 'Date' column to datetime format
    charging_vs_discharging_df["Date"] = pd.to_datetime(charging_vs_discharging_df["Date"], errors="coerce")
    charging_vs_discharging_df["Month"] = charging_vs_discharging_df["Date"].dt.strftime("%B")

    # ✅ Aggregate by Date instead of plotting every hour
    daily_data = charging_vs_discharging_df.groupby(charging_vs_discharging_df["Date"].dt.date).agg({
        "Charging_Cost (USCts/kWh)": "sum",
        "Discharging_Revenue (USCts/kWh)": "sum"
    }).reset_index()

    # Filter data based on the selected month
    if month.lower() != "all":
        daily_data["Month"] = pd.to_datetime(daily_data["Date"]).dt.strftime("%B")
        filtered_data = daily_data[daily_data["Month"].str.lower() == month.lower()]
    else:
        filtered_data = daily_data

    # ✅ If no data found, fallback to **January**
    if filtered_data.empty:
        print(f"⚠️ No data found for {month}. Falling back to January.")
        fallback_data = daily_data[daily_data["Month"] == "January"]
        if fallback_data.empty:
            return jsonify({"dates": ["No Data"], "charging_cost": [0], "discharging_revenue": [0]})

        filtered_data = fallback_data

    return jsonify({
        "dates": filtered_data["Date"].astype(str).tolist(),
        "charging_cost": filtered_data["Charging_Cost (USCts/kWh)"].tolist(),
        "discharging_revenue": filtered_data["Discharging_Revenue (USCts/kWh)"].tolist()
    })



@app.route('/get_battery_revenue', methods=['POST'])
def get_battery_revenue():
    year = request.form.get('year')
    month = request.form.get('month', 'January')  # Default to January if not selected

    if not year:
        return jsonify({"error": "Year parameter is missing"}), 400

    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year format"}), 400

    if battery_revenue_df is None:
        return jsonify({"error": "Battery revenue data not available"}), 500

    # Ensure required column exists
    required_columns = ["Date", "Net_Profit (USCts/kWh)"]
    missing_columns = [col for col in required_columns if col not in battery_revenue_df.columns]

    if missing_columns:
        return jsonify({"error": f"Missing required columns: {missing_columns}"}), 500

    # Convert 'Date' column to datetime format
    battery_revenue_df["Date"] = pd.to_datetime(battery_revenue_df["Date"], errors="coerce")
    battery_revenue_df["Year"] = battery_revenue_df["Date"].dt.year
    battery_revenue_df["Month"] = battery_revenue_df["Date"].dt.strftime("%B")

    # Filter data based on selected year and month
    filtered_data = battery_revenue_df[(battery_revenue_df["Year"] == year) & (battery_revenue_df["Month"] == month)]

    # ✅ If no data found, fallback to **January**
    if filtered_data.empty:
        print(f"⚠️ No data found for {month}. Falling back to January.")
        fallback_data = battery_revenue_df[battery_revenue_df["Month"] == "January"]
        if fallback_data.empty:
            return jsonify({"dates": ["No Data"], "revenue": [0]})

        filtered_data = fallback_data

    # Aggregate daily revenue
    daily_revenue = filtered_data.groupby(filtered_data["Date"].dt.date)["Net_Profit (USCts/kWh)"].sum().reset_index()

    return jsonify({
        "dates": daily_revenue["Date"].astype(str).tolist(),
        "revenue": daily_revenue["Net_Profit (USCts/kWh)"].tolist()
    })





@app.route('/get_optimized_hourly_power', methods=['POST'])
def get_optimized_hourly_power():
    if optimized_hourly_power_df is None:
        return jsonify({"error": "Hourly power release data not available"}), 500

    return jsonify({
        "dates": optimized_hourly_power_df["Hour"].tolist(),
        "power_release": optimized_hourly_power_df["Optimized_Hourly_MW"].tolist()
    })




# Model Configuration
MODEL_PATH = "models//efficientnet_v2_l_dust_detector.pth"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
NUM_CLASSES = 2  # Change according to your dataset
CLASS_NAMES = {0: "Clean", 1: "Dusty"}  # Mapping class indices to labels

# Load Model Function
def build_model():
    model_weights = torchvision.models.EfficientNet_V2_L_Weights.DEFAULT
    model = torchvision.models.efficientnet_v2_l(weights=model_weights).to(DEVICE)

    # Modify classifier
    model.classifier = nn.Sequential(
        nn.Flatten(),
        nn.Dropout(p=0.5, inplace=True),
        nn.Linear(in_features=1280, out_features=256, bias=True),
        nn.BatchNorm1d(256),
        nn.ReLU(),
        nn.Linear(in_features=256, out_features=NUM_CLASSES, bias=True)
    ).to(DEVICE)

    return model

# Load Model
model = build_model()
state_dict = torch.load(MODEL_PATH, map_location=DEVICE)

# Fix if using DataParallel
new_state_dict = OrderedDict()
for k, v in state_dict.items():
    name = k.replace("module.", "")  # Remove `module.` prefix
    new_state_dict[name] = v

model.load_state_dict(new_state_dict)
model.eval()

# Image Preprocessing
def transform_image(image):
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor()
    ])
    return transform(image).unsqueeze(0).to(DEVICE)



# Prediction API
@app.route("/predict", methods=["POST"])
def predict():
    try:
        # Get image from request
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files["file"]
        image = Image.open(io.BytesIO(file.read()))

        # Preprocess Image
        image_tensor = transform_image(image)

        # Get Prediction
        with torch.no_grad():
            outputs = model(image_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            pred_class = torch.argmax(probs, dim=1).item()
            confidence = probs[0][pred_class].item()

        # Response
        return jsonify({
            "predicted_class": CLASS_NAMES[pred_class],
            "confidence": float(confidence)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



graphs_folder = "static//inverter_fault_graphs"

def get_available_graphs():
    graphs = []
    for filename in os.listdir(graphs_folder):
        if filename.endswith(".png"):
            parts = filename.split("_")
            inverter = parts[1]  # Extract inverter ID
            date = parts[-1].replace(".png", "")  # Extract date
            graphs.append({"inverter": inverter, "date": date, "file": filename})
    return graphs

@app.route('/inverter', methods=['GET', 'POST'])
def inverter():
    graphs = get_available_graphs()
    inverters = sorted(set(g['inverter'] for g in graphs))
    dates = sorted(set(g['date'] for g in graphs))
    
    selected_inverter = request.form.get('inverter')
    selected_date = request.form.get('date')
    
    filtered_graphs = [g for g in graphs if (not selected_inverter or g['inverter'] == selected_inverter) and
                                                 (not selected_date or g['date'] == selected_date)]
    
    return render_template('inverter.html', inverters=inverters, dates=dates, graphs=filtered_graphs, 
                           selected_inverter=selected_inverter, selected_date=selected_date)

# ✅ Run Flask App
if __name__ == '__main__':
    app.run(debug=True)