import os
import json
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models

# ==========================
# 1️⃣ Dataset Paths
# ==========================

base_path = os.path.join(
    "dataset",
    "New Plant Diseases Dataset(Augmented)",
    "New Plant Diseases Dataset(Augmented)"
)

train_dir = os.path.join(base_path, "train")
valid_dir = os.path.join(base_path, "valid")

print("Training path:", train_dir)
print("Validation path:", valid_dir)

# ==========================
# 2️⃣ STRONG Data Augmentation
# ==========================

train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=40,
    zoom_range=0.3,
    horizontal_flip=True,
    brightness_range=[0.6, 1.4],
    shear_range=0.2,
    width_shift_range=0.2,
    height_shift_range=0.2
)

valid_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    train_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical'
)

valid_generator = valid_datagen.flow_from_directory(
    valid_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical'
)

# ==========================
# 3️⃣ Save Class Labels
# ==========================

class_indices = train_generator.class_indices
with open("class_indices.json", "w") as f:
    json.dump(class_indices, f)

print("✅ Class indices saved!")

# ==========================
# 4️⃣ Load Pretrained Model
# ==========================

base_model = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(224, 224, 3)
)

base_model.trainable = False  # Feature extraction phase

# ==========================
# 5️⃣ Build Model
# ==========================

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.5),
    layers.Dense(train_generator.num_classes, activation='softmax')
])

# ==========================
# 6️⃣ Compile Model
# ==========================

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# ==========================
# 7️⃣ Initial Training
# ==========================

print("🚀 Starting Initial Training...")
model.fit(
    train_generator,
    validation_data=valid_generator,
    epochs=5
)

# ==========================
# 8️⃣ Fine-Tuning Phase
# ==========================

print("🚀 Starting Fine-Tuning...")

base_model.trainable = True

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-5),  # Very small LR
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.fit(
    train_generator,
    validation_data=valid_generator,
    epochs=3
)

# ==========================
# 9️⃣ Save Final Model
# ==========================

model.save("leaf_disease_model.keras")

print("✅ Final model saved successfully!")