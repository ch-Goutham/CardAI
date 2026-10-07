from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
import os
import uuid
import json

app = Flask(__name__)

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# Load lightweight PaddleOCR models
print("Initializing PaddleOCR...")

ocr = PaddleOCR(
    lang="en",
    text_detection_model_name="PP-OCRv5_mobile_det",
    text_recognition_model_name="en_PP-OCRv5_mobile_rec",
)

print("PaddleOCR initialized successfully")


@app.get("/")
def health():
    return jsonify({
        "success": True,
        "message": "PaddleOCR service running"
    })


@app.post("/ocr")
def extract_ocr():

    if "file" not in request.files:
        return jsonify({
            "success": False,
            "message": "Image file is required"
        }), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({
            "success": False,
            "message": "Invalid file"
        }), 400

    extension = os.path.splitext(file.filename)[1]

    filename = f"{uuid.uuid4()}{extension}"

    image_path = os.path.join(
        TEMP_DIR,
        filename
    )

    file.save(image_path)

    try:

        print("Starting OCR:", image_path)

        result = ocr.predict(image_path)

        print("OCR prediction completed")

        pages = []

        for page in result:

            try:

                data = page.json

                if isinstance(data, str):
                    data = json.loads(data)

                pages.append(data)

            except Exception as error:

                print(
                    "Failed to parse OCR page:",
                    repr(error)
                )

        return jsonify({
            "success": True,
            "pages": pages
        })

    except Exception as error:

        print(
            "❌ PaddleOCR error:",
            repr(error)
        )

        return jsonify({
            "success": False,
            "message": "OCR failed",
            "error": str(error)
        }), 500

    finally:

        if os.path.exists(image_path):
            os.remove(image_path)


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                8000
            )
        )
    )