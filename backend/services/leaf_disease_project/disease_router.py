from fastapi import APIRouter, UploadFile, File
import tensorflow as tf
import numpy as np
from PIL import Image
import json
from io import BytesIO
import os
from .disease_info import DISEASE_INFO
router = APIRouter()

# -------- Load Model --------
model_path = os.path.join(
    os.path.dirname(__file__),
    "leaf_disease_model.keras"
)

model = tf.keras.models.load_model(model_path)

# -------- Load Class Mapping --------
with open(os.path.join(os.path.dirname(__file__), "class_indices.json")) as f:
    class_indices = json.load(f)

class_names = {v: k for k, v in class_indices.items()}


def preprocess_image(img: Image.Image):
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


@router.post("/api/predict-disease")
async def predict_disease(image: UploadFile = File(...)):
    contents = await image.read()
    img = Image.open(BytesIO(contents)).convert("RGB")

    processed = preprocess_image(img)

    prediction = model.predict(processed)
    predicted_index = int(np.argmax(prediction))
    confidence = float(np.max(prediction))

    disease_key = class_names[predicted_index]

    info = DISEASE_INFO.get(
    disease_key,
    {
        "description": "No detailed information available for this disease.",
        "treatment": "Consult a local agricultural expert for guidance."
    }
)

    return {
    "disease": disease_key.replace("___", " "),
    "confidence": confidence,
    "description": info["description"],
    "treatment": info["treatment"]
}