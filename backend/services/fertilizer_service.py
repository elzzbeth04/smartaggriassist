import pandas as pd
import joblib

# Load once
fert_model = joblib.load("services/fert_model.pkl")
le_soil = joblib.load("services/le_soil.pkl")
le_crop = joblib.load("services/le_crop.pkl")
le_fert = joblib.load("services/le_fert.pkl")

def predict_fertilizer(data: dict):
    soil_encoded = le_soil.transform([data["soil"]])[0]
    crop_encoded = le_crop.transform([data["crop"]])[0]

    input_df = pd.DataFrame([{
        "Temperature": data["temperature"],
        "Humidity": data["humidity"],
        "Moisture": data["moisture"],
        "Soil Type": soil_encoded,
        "Crop Type": crop_encoded,
        "Nitrogen": data["nitrogen"],
        "Potassium": data["potassium"],
        "Phosphorous": data["phosphorous"]
    }])

    prediction = fert_model.predict(input_df)
    fertilizer = le_fert.inverse_transform(prediction)[0]

    return fertilizer