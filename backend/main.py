from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from services.leaf_disease_project.disease_router import router as disease_router
# =========================
# SERVICE IMPORTS
# =========================

# From File 1 (extra modules)
from services.crop_service import recommendation_relative
from services.fertilizer_service import predict_fertilizer

# Common services (used in File 2 logic)
from services.post_processing import clamp_price
from services.price_predictor import train_price_model, predict_future_prices
from services.volatility import calculate_volatility
from services.profit import calculate_profit_range
from services.market_score import calculate_market_score
from services.explainability import generate_explanation
from services.supply_estimator import estimate_supply_from_acreage
from services.demand_estimator import estimate_demand_from_prices

# =========================
# APP INITIALIZATION
# =========================
app = FastAPI(title="SmartAgriAssist Market Backend")
app.include_router(disease_router)
# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# REQUEST MODELS 
# =========================

class FertilizerRequest(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    soil: str
    crop: str
    nitrogen: float
    phosphorous: float
    potassium: float


class CropRequest(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float


# =========================
# HEALTH CHECK
# =========================

@app.get("/")
def health_check():
    return {"status": "Backend running"}


# =========================
# 🌱 CROP RECOMMENDATION 
# =========================

@app.post("/predict")
def crop_recommendation(data: CropRequest):
    crop = recommendation_relative(
        data.N,
        data.P,
        data.K,
        data.temperature,
        data.humidity,
        data.ph,
        data.rainfall
    )
    return {"crop": crop}


# =========================
# 🌾 FERTILIZER RECOMMENDATION
# =========================

@app.post("/predict-fertilizer")
def fertilizer_endpoint(request: FertilizerRequest):
    fertilizer = predict_fertilizer(request.dict())
    return {"fertilizer": fertilizer}


# =========================
# 📊 AVAILABLE CROPS 
# =========================

@app.get("/available-crops")
def get_available_crops():
    price_df = pd.read_csv("data/prices.csv")
    crops = sorted(price_df["crop"].unique().tolist())
    return {"crops": crops}


# =========================
# 📈 MARKET ANALYSIS
# =========================

@app.post("/market-analysis")
def market_analysis(request: dict):
    crops = request.get("crops", [])
    land_size = request.get("land_size", 1)

    # Load datasets
    price_df = pd.read_csv("data/prices.csv")
    apy_df = pd.read_csv("data/apy_cleaned.csv")
    cost_df = pd.read_csv("data/cost_cleaned.csv")

    results = []

    for crop in crops:

        crop = crop.strip().title()

        # -------------------------------
        # Historical Data Cleaning
        # -------------------------------
        hist_df = price_df[price_df["crop"] == crop]

        hist_df = hist_df[(hist_df["price"] > 50) & (hist_df["price"] < 20000)]

        hist_df = hist_df.groupby("date")["price"].mean().reset_index()

        hist_prices = hist_df["price"].tolist()

        # -------------------------------
        # Model Training
        # -------------------------------
        model = train_price_model(
            csv_path="data/prices.csv",
            crop=crop
        )

        forecast = predict_future_prices(model, months_ahead=3)

        # -------------------------------
        # Price Trend (Past + Future)
        # -------------------------------
        hist = hist_prices[-3:] if len(hist_prices) >= 3 else hist_prices
        future = forecast["yhat"].iloc[-1]

        raw_prices = hist + [future]
        price_trend = [clamp_price(p) for p in raw_prices]

        price_low = clamp_price(forecast["yhat_lower"].iloc[-1])
        price_high = clamp_price(forecast["yhat_upper"].iloc[-1])

        # -------------------------------
        # Volatility
        # -------------------------------
        if len(hist_prices) < 2:
            volatility_index = 0.2
        else:
            volatility_index = calculate_volatility(hist_prices)

        if volatility_index > 0.3:
            volatility_label = "High"
        elif volatility_index > 0.15:
            volatility_label = "Medium"
        else:
            volatility_label = "Low"

        # -------------------------------
        # Confidence
        # -------------------------------
        if volatility_label == "High":
            confidence = "Low"
        elif volatility_label == "Medium":
            confidence = "Medium"
        else:
            confidence = "High"

        # -------------------------------
        # Profit Calculation
        # -------------------------------
        yield_data = apy_df[apy_df["Crop"] == crop]

        if len(yield_data) == 0:
            yield_per_acre = 20
        else:
            yield_per_hectare = yield_data["Yield"].mean()
            yield_per_acre = yield_per_hectare / 2.471

        cost_data = cost_df[cost_df["crop"] == crop]

        if len(cost_data) == 0:
            cost_per_acre = 20000
        else:
            cost_per_acre = cost_data["cost_per_acre"].mean()

        profit_range = calculate_profit_range(
            price_low,
            price_high,
            yield_per_acre,
            cost_per_acre,
            land_size
        )

        profit_range = (float(profit_range[0]), float(profit_range[1]))

        # -------------------------------
        # Supply & Demand
        # -------------------------------
        supply_label, supply_index = estimate_supply_from_acreage(
            apy_df=apy_df,
            crop=crop
        )

        demand_label, demand_index = estimate_demand_from_prices(hist_prices)

        # -------------------------------
        # Market Score
        # -------------------------------
        market_score = calculate_market_score(
            profit_range,
            demand_index,
            supply_index,
            volatility_index
        )

        market_score = float(market_score)

        # -------------------------------
        # Explanation
        # -------------------------------
        explanation = generate_explanation(
            crop=crop,
            demand=demand_label,
            supply=supply_label,
            volatility=volatility_label,
            profit_range=profit_range,
            market_score=market_score
        )

        results.append({
            "crop": crop,
            "price_trend": price_trend,
            "profit_range": profit_range,
            "volatility": volatility_label,
            "confidence": confidence,
            "supply": supply_label,
            "demand": demand_label,
            "market_score": market_score,
            "explanation": explanation
        })

    return {"comparison": results}