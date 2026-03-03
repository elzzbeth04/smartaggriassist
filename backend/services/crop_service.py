import numpy as np
import joblib
import pandas as pd
import os

BASE_DIR = os.path.dirname(__file__)

model = joblib.load(os.path.join(BASE_DIR, "crop_model.pkl"))
le = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))

def recommendation_relative(N, P, K, temperature, humidity, ph, rainfall, ratio=0.5):
    features = pd.DataFrame([{
        "N": N,
        "P": P,
        "K": K,
        "temperature": temperature,
        "humidity": humidity,
        "ph": ph,
        "rainfall": rainfall
    }])

    probabilities = model.predict_proba(features)[0]
    sorted_indices = np.argsort(probabilities)[::-1]
    top_prob = probabilities[sorted_indices[0]]

    results = []

    for idx in sorted_indices:
        if probabilities[idx] / top_prob >= ratio:
            crop_name = le.inverse_transform([idx])[0]
            results.append({
                "crop": crop_name,
                "confidence": round(probabilities[idx] * 100, 2)
            })
        else:
            break

    return results