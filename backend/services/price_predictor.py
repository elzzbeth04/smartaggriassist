import pandas as pd
#from prophet import Prophet


def train_price_model(csv_path, crop, market):
    """
    Trains a Prophet model for a given crop and market
    """

    # 1. Read CSV
    df = pd.read_csv(csv_path)

    # 2. Filter required crop & market
    df = df[(df["crop"] == crop) & (df["market"] == market)]

    # 3. Select & rename columns for Prophet
    df = df[["date", "price"]]
    df.columns = ["ds", "y"]

    # 4. Convert date column
    df["ds"] = pd.to_datetime(df["ds"])

    # 5. Create and train model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False
    )

    model.fit(df)

    return model


def predict_future_prices(model, months_ahead=3):
    """
    Predict future prices using trained model
    """

    future = model.make_future_dataframe(periods=months_ahead, freq="ME")
    forecast = model.predict(future)

    return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]
