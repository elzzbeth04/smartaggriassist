import tensorflow as tf
import numpy as np
import json
from tensorflow.keras.preprocessing import image

# Load model
model = tf.keras.models.load_model("leaf_disease_model.keras")

# Load class mapping
with open("class_indices.json", "r") as f:
    class_indices = json.load(f)

# Reverse mapping
class_names = {v: k for k, v in class_indices.items()}

def predict_image(img_path):
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = img_array / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    prediction = model.predict(img_array)

    predicted_index = np.argmax(prediction)
    confidence = np.max(prediction)

    print("Predicted Disease:", class_names[predicted_index])
    print("Confidence:", round(float(confidence) * 100, 2), "%")

# Example
predict_image(r"D:\leafimages\download.jpg")