import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier

# ======================
# Load Dataset
# ======================

crop = pd.read_csv("../data/Crop_recommendation.csv")

X = crop.drop(columns=["label"])
y = crop["label"]

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

print("Model trained successfully!")

# ======================
# Save model & encoder
# ======================

joblib.dump(model, "crop_model.pkl")
joblib.dump(le, "label_encoder.pkl")

print("Model saved successfully!")