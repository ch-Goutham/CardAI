import os
import uuid
import json

# Disable oneDNN / MKL-DNN before importing Paddle
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_use_onednn"] = "0"

from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
import cv2


app = Flask(__name__)

TEMP_DIR = "temp_uploads"

os.makedirs(TEMP_DIR, exist_ok=True)


# Initialize PaddleOCR
ocr = PaddleOCR(
    lang="en",
    device="cpu",
    enable_mkldnn=False,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    cpu_threads=4
)


def convert_value(value):
    """
    Convert numpy values into normal Python values.
    """

    if hasattr(value, "tolist"):
        return value.tolist()

    return value


def extract_from_result(result):
    """
    Normalize PaddleOCR output into:

    [
        {
            "text": "...",
            "confidence": 0.98,
            "box": [[x,y], ...]
        }
    ]
    """

    output = []

    try:

        for page in result:

            # PaddleOCR 3.x result objects expose json
            if hasattr(page, "json"):

                data = page.json

                if callable(data):
                    data = data()

            elif isinstance(page, dict):

                data = page

            else:

                data = {}

            if isinstance(data, str):
                data = json.loads(data)

            res = data.get("res", data)

            texts = (
                res.get("rec_texts")
                or res.get("texts")
                or []
            )

            scores = (
                res.get("rec_scores")
                or res.get("scores")
                or []
            )

            boxes = (
                res.get("rec_polys")
                or res.get("rec_boxes")
                or res.get("dt_polys")
                or []
            )

            for index, text in enumerate(texts):

                text = str(text).strip()

                if not text:
                    continue

                score = 0

                if index < len(scores):

                    score = float(
                        convert_value(scores[index])
                    )

                box = []

                if index < len(boxes):

                    box = convert_value(
                        boxes[index]
                    )

                output.append({
                    "text": text,
                    "confidence": round(score, 4),
                    "box": box
                })

    except Exception as error:

        print(
            "Result parsing error:",
            str(error)
        )

    return output


def preprocess_image(image_path):

    image = cv2.imread(image_path)

    if image is None:

        raise ValueError(
            "Unable to read uploaded image"
        )

    height, width = image.shape[:2]

    # Upscale small images
    if width < 1200:

        scale = 1200 / width

        image = cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC
        )

    # Improve contrast
    lab = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2LAB
    )

    l, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    l = clahe.apply(l)

    enhanced = cv2.merge(
        (l, a, b)
    )

    enhanced = cv2.cvtColor(
        enhanced,
        cv2.COLOR_LAB2BGR
    )

    processed_path = os.path.join(
        TEMP_DIR,
        f"processed-{uuid.uuid4()}.jpg"
    )

    cv2.imwrite(
        processed_path,
        enhanced
    )

    return processed_path


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

    extension = os.path.splitext(
        file.filename
    )[1]

    filename = (
        str(uuid.uuid4()) +
        extension
    )

    original_path = os.path.join(
        TEMP_DIR,
        filename
    )

    file.save(original_path)

    processed_path = None

    try:

        print("📸 Processing:", file.filename)

        processed_path = preprocess_image(
            original_path
        )

        print("🔍 Running PaddleOCR...")

        result = ocr.predict(
            processed_path
        )

        lines = extract_from_result(
            result
        )

        print(
            f"✅ OCR extracted {len(lines)} lines"
        )

        return jsonify({
            "success": True,
            "lines": lines
        })

    except Exception as error:

        print(
            "PaddleOCR error:",
            str(error)
        )

        return jsonify({
            "success": False,
            "message": "OCR failed",
            "error": str(error)
        }), 500

    finally:

        if os.path.exists(original_path):

            os.remove(original_path)

        if (
            processed_path
            and os.path.exists(processed_path)
        ):

            os.remove(processed_path)


if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=8000,
        debug=True
    )