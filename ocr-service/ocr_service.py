
import os

# Work around the reported PaddlePaddle PIR/oneDNN inference error
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"

from flask import Flask, request, jsonify
from PIL import Image, ImageOps, UnidentifiedImageError
from paddleocr import PaddleOCR

import gc
import uuid
import logging
import threading
import numpy as np


# --------------------------------------------------
# Flask configuration
# --------------------------------------------------

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

MAX_IMAGE_SIZE = 1600
MAX_IMAGE_PIXELS = 25_000_000

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --------------------------------------------------
# Lazy model initialization
# Load only when the first OCR request arrives
# --------------------------------------------------


ocr_engine = None
ocr_lock = threading.Lock()


def get_ocr_engine():
    global ocr_engine

    if ocr_engine is None:
        with ocr_lock:
            if ocr_engine is None:
                logger.info("Initializing PaddleOCR mobile models")

                ocr_engine = PaddleOCR(
                    text_detection_model_name="PP-OCRv5_mobile_det",
                    text_recognition_model_name="PP-OCRv5_mobile_rec",
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    text_recognition_batch_size=1,
                    text_det_limit_side_len=960,
                    text_det_limit_type="max",
                    enable_mkldnn=False,
                    cpu_threads=1,
                    device="cpu",
                )

                logger.info("PaddleOCR initialized successfully")

    return ocr_engine



# --------------------------------------------------
# Helpers to normalize PaddleOCR results
# --------------------------------------------------

def to_python_list(value):
    if value is None:
        return []

    if hasattr(value, "tolist"):
        return value.tolist()

    return value


def normalize_box(box):
    """
    Convert a PaddleOCR bounding box into:
    [left, top, right, bottom]

    Supports both four-coordinate boxes and polygons.
    """
    box = to_python_list(box)

    if not isinstance(box, (list, tuple)):
        return None

    try:
        # Format: [x1, y1, x2, y2]
        if len(box) == 4 and all(
            isinstance(point, (int, float, np.number))
            for point in box
        ):
            return [int(round(float(point))) for point in box]

        # Format: polygon [[x1,y1], [x2,y2], ...]
        points = np.asarray(box, dtype=float)

        if points.ndim == 2 and points.shape[1] >= 2:
            points = points[:, :2]

            left = int(np.floor(points[:, 0].min()))
            top = int(np.floor(points[:, 1].min()))
            right = int(np.ceil(points[:, 0].max()))
            bottom = int(np.ceil(points[:, 1].max()))

            return [left, top, right, bottom]

    except (TypeError, ValueError, IndexError):
        logger.warning("Skipping invalid OCR bounding box")

    return None


def extract_result_data(result_item):
    """
    Extract text, confidence and boxes from PaddleOCR 3.x output.
    """
    raw = getattr(result_item, "json", result_item)

    if callable(raw):
        raw = raw()

    if hasattr(raw, "to_dict"):
        raw = raw.to_dict()

    if not isinstance(raw, dict):
        return [], [], []

    # Some versions wrap the actual result in a "res" object.
    raw = raw.get("res", raw)

    if not isinstance(raw, dict):
        return [], [], []

    texts = to_python_list(raw.get("rec_texts", [])) or []
    scores = to_python_list(raw.get("rec_scores", [])) or []

    boxes = to_python_list(raw.get("rec_boxes", [])) or []

    # Fall back to polygon coordinates if rec_boxes is unavailable.
    if len(boxes) == 0:
        boxes = (
            to_python_list(raw.get("rec_polys", []))
            or to_python_list(raw.get("dt_polys", []))
            or []
        )

    output_texts = []
    output_scores = []
    output_boxes = []

    for index, raw_text in enumerate(texts):
        text = str(raw_text).strip()

        if not text:
            continue

        try:
            score = float(scores[index])
            score = max(0.0, min(score, 1.0))
        except (IndexError, TypeError, ValueError):
            score = 0.0

        box = normalize_box(boxes[index]) if index < len(boxes) else None

        output_texts.append(text)
        output_scores.append(score)

        if box is None:
            output_boxes.append([0, 0, 0, 0])
        else:
            output_boxes.append(box)

    return output_texts, output_scores, output_boxes


# --------------------------------------------------
# Health endpoint
# --------------------------------------------------

@app.get("/")
def health():
    return jsonify({
        "success": True,
        "message": "PaddleOCR service is running",
        "engine": "PaddleOCR PP-OCRv5 mobile",
        "model_loaded": ocr_engine is not None
    }), 200


# --------------------------------------------------
# OCR endpoint
# --------------------------------------------------

@app.post("/ocr")
def extract_ocr():
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "message": "Image file is required in the 'file' field"
        }), 400

    uploaded_file = request.files["file"]

    if not uploaded_file.filename:
        return jsonify({
            "success": False,
            "message": "No file selected"
        }), 400

    extension = os.path.splitext(uploaded_file.filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "success": False,
            "message": "Only JPG, JPEG, PNG and WEBP images are allowed"
        }), 400

    image_path = os.path.join(
        TEMP_DIR,
        f"{uuid.uuid4().hex}.jpg"
    )

    image = None
    rgb_image = None

    try:
        logger.info("Opening uploaded image")

        image = Image.open(uploaded_file.stream)
        image = ImageOps.exif_transpose(image)

        width, height = image.size

        if (
            width <= 0
            or height <= 0
            or width * height > MAX_IMAGE_PIXELS
        ):
            return jsonify({
                "success": False,
                "message": "Image dimensions are too large"
            }), 400

        # Resize before OCR to reduce image memory consumption.
        image.thumbnail(
            (MAX_IMAGE_SIZE, MAX_IMAGE_SIZE),
            Image.Resampling.LANCZOS
        )

        rgb_image = image.convert("RGB")

        image.close()
        image = None

        rgb_image.save(
            image_path,
            format="JPEG",
            quality=85,
            optimize=True
        )

        rgb_image.close()
        rgb_image = None

        logger.info("Running PaddleOCR inference")

        engine = get_ocr_engine()

        # PaddleOCR 3.x prediction API.
        results = engine.predict(image_path)

        texts = []
        scores = []
        boxes = []

        for result_item in results:
            page_texts, page_scores, page_boxes = (
                extract_result_data(result_item)
            )

            texts.extend(page_texts)
            scores.extend(page_scores)
            boxes.extend(page_boxes)

        logger.info(
            "PaddleOCR extracted %d text items",
            len(texts)
        )

        # Keep the existing Node.js response structure.
        return jsonify({
            "success": True,
            "pages": [
                {
                    "res": {
                        "rec_texts": texts,
                        "rec_scores": scores,
                        "rec_boxes": boxes
                    }
                }
            ]
        }), 200

    except UnidentifiedImageError:
        return jsonify({
            "success": False,
            "message": "The uploaded file is not a valid image"
        }), 400

    except Exception:
        logger.exception("PaddleOCR processing failed")

        return jsonify({
            "success": False,
            "message": "OCR failed"
        }), 500

    finally:
        if image is not None:
            try:
                image.close()
            except Exception:
                pass

        if rgb_image is not None:
            try:
                rgb_image.close()
            except Exception:
                pass

        if os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                logger.warning("Could not remove temporary image")

        gc.collect()


# --------------------------------------------------
# Handle oversized uploads
# --------------------------------------------------

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "success": False,
        "message": "Image exceeds the 10 MB upload limit"
    }), 413


# --------------------------------------------------
# Start the server
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        debug=False,
        threaded=False
    )
