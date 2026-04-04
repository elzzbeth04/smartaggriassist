import os
import json
from tensorflow.keras.preprocessing.image import ImageDataGenerator

base_path = os.path.join(
    "dataset",
    "New Plant Diseases Dataset(Augmented)",
    "New Plant Diseases Dataset(Augmented)"
)

train_dir = os.path.join(base_path, "train")

datagen = ImageDataGenerator()

generator = datagen.flow_from_directory(train_dir)

class_indices = generator.class_indices

with open("class_indices.json", "w") as f:
    json.dump(class_indices, f)

print("Class indices saved!")