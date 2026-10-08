from flask import Flask, request, jsonify
from paddleocr import PaddleOCR

import os
import uuid
import json


app = Flask(__name__)


# =========================================================
# Temporary upload directory
# =========================================================

TEMP_DIR = "temp_uploads"

os.makedirs(
    TEMP_DIR,
    exist_ok=True
)


# =========================================================
# Initialize PaddleOCR
# =========================================================

print("Initializing PaddleOCR...")

ocr = PaddleOCR(
    lang="en",
    text_detection_model_name="PP-OCRv5_mobile_det",
    text_recognition_model_name="en_PP-OCRv5_mobile_rec",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    enable_mkldnn=False,
)

print("PaddleOCR initialized successfully")


# =========================================================
# Health check
# =========================================================

@app.get("/")
def health():

    return jsonify({
        "success": True,
        "message": "PaddleOCR service running"
    })


# =========================================================
# OCR endpoint
# =========================================================

@app.post("/ocr")
def extract_ocr():

    # -----------------------------------------------------
    # Check uploaded file
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # Create temporary filename
    # -----------------------------------------------------

    extension = os.path.splitext(
        file.filename
    )[1].lower()


    allowed_extensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ]


    if extension not in allowed_extensions:

        return jsonify({
            "success": False,
            "message":
                "Only JPG, JPEG, PNG and WEBP images are allowed"
        }), 400


    filename = (
        f"{uuid.uuid4()}"
        f"{extension}"
    )


    image_path = os.path.join(
        TEMP_DIR,
        filename
    )


    # -----------------------------------------------------
    # Save uploaded image
    # -----------------------------------------------------

    file.save(image_path)


    try:

        print(
            "Starting OCR:",
            image_path
        )


        # -------------------------------------------------
        # Run PaddleOCR
        # -------------------------------------------------

        result = ocr.predict(
            image_path
        )


        print(
            "OCR prediction completed"
        )


        # -------------------------------------------------
        # Convert OCR result to JSON
        # -------------------------------------------------

        pages = []


        for page in result:

            try:

                data = page.json


                if isinstance(
                    data,
                    str
                ):

                    data = json.loads(
                        data
                    )


                pages.append(
                    data
                )


            except Exception as error:

                print(
                    "Failed to parse OCR page:",
                    repr(error)
                )


        print(
            f"OCR pages extracted: {len(pages)}"
        )


        # -------------------------------------------------
        # Return OCR response
        # -------------------------------------------------

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

            "message":
                "OCR failed",

            "error":
                str(error)

        }), 500


    finally:

        # -------------------------------------------------
        # Delete temporary image
        # -------------------------------------------------

        if os.path.exists(
            image_path
        ):

            try:

                os.remove(
                    image_path
                )

            except Exception as error:

                print(
                    "Failed to remove temporary file:",
                    repr(error)
                )


# =========================================================
# Local development
# =========================================================

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