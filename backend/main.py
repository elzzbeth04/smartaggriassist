from fastapi import FastAPI
from pydantic import BaseModel
class FertilizerRequest(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    soil: str
    crop: str
    nitrogen: float
    phosphorous: float
    potassium: float
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from services.post_processing import clamp_price, smooth_price_trend
from services.price_predictor import train_price_model, predict_future_prices
from services.volatility import calculate_volatility
from services.profit import calculate_profit_range
from services.market_score import calculate_market_score
from services.explainability import generate_explanation
from services.supply_estimator import estimate_supply_from_acreage
from services.demand_estimator import estimate_demand_from_prices
from services.fertilizer_service import predict_fertilizer




app = FastAPI(title="SmartAgriAssist Market Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict-fertilizer")
def fertilizer_endpoint(request: FertilizerRequest):
    fertilizer = predict_fertilizer(request.dict())
    return {"fertilizer": fertilizer}

@app.get("/")
def health_check():
    return {"status": "Backend running"}

@app.get("/available-crops")
def get_available_crops():
    price_df = pd.read_csv("data/prices.csv")

    crops = sorted(price_df["crop"].unique().tolist())

    return {"crops": crops}


@app.post("/market-analysis")
def market_analysis(request: dict):
    crops = request.get("crops", [])
    market = request.get("market", "Kolar")
    land_size = request.get("land_size", 1)

    # Load static datasets
    price_df = pd.read_csv("data/prices.csv")
    yield_df = pd.read_csv("data/yield.csv")
    cost_df = pd.read_csv("data/cost.csv")
    acreage_df = pd.read_csv("data/acreage.csv")


    results = []

    for crop in crops:
        # -----------------------------
        # 1. Train ML model
        # -----------------------------
        model = train_price_model(
            csv_path="data/prices.csv",
            crop=crop,
            market=market
        )

        forecast = predict_future_prices(model, months_ahead=3)

        # Extract price info
        raw_prices = forecast["yhat"].tail(4).tolist()

        clamped_prices = [clamp_price(p) for p in raw_prices]
        price_trend = clamped_prices

        price_low = clamp_price(forecast["yhat_lower"].iloc[-1])
        price_high = clamp_price(forecast["yhat_upper"].iloc[-1])


        # -----------------------------
        # 2. Volatility (historical)
        # -----------------------------
        hist_prices = price_df[
            (price_df["crop"] == crop) &
            (price_df["market"] == market)
        ]["price"].tolist()

        volatility_index = calculate_volatility(hist_prices)

        if volatility_index > 0.3:
            volatility_label = "High"
        elif volatility_index > 0.15:
            volatility_label = "Medium"
        else:
            volatility_label = "Low"

        # -----------------------------
        # 2.1 Confidence level
        # -----------------------------
        if volatility_label == "High":
            confidence = "Low"
        elif volatility_label == "Medium":
            confidence = "Medium"
        else:
            confidence = "High"

        # -----------------------------
        # 3. Profit range
        # -----------------------------
        yield_per_acre = int(yield_df[yield_df["crop"] == crop]["yield_per_acre"].values[0])
        cost_per_acre = int(cost_df[cost_df["crop"] == crop]["cost_per_acre"].values[0])

        profit_range = calculate_profit_range(
            price_low,
            price_high,
            yield_per_acre,
            cost_per_acre,
            land_size
        )

        profit_range = (
        float(profit_range[0]),
        float(profit_range[1])
        )

        # -----------------------------
        # 4. Supply & demand
        # -----------------------------
        
        supply_label, supply_index = estimate_supply_from_acreage(
            acreage_df=acreage_df,
            crop=crop,
            market=market
        )

        
        demand_label, demand_index = estimate_demand_from_prices(hist_prices)

        # -----------------------------
        # 5. Market score
        # -----------------------------
        market_score = calculate_market_score(
            profit_range,
            demand_index,
            supply_index,
            volatility_index
        )

        market_score = float(market_score)

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
