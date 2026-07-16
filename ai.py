from ultralytics import YOLO

# Load model from Hugging Face
model = YOLO('huggingface://IndUSV/yolov8n-mobile-phone-detector/pytorch_model.bin')

# Run inference
results = model.predict(source='image.jpg', conf=0.5)
