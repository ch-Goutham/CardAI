import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export const runPaddleOCR = async (
    imagePath
) => {

    if (!process.env.PADDLE_OCR_URL) {
        throw new Error(
            "PADDLE_OCR_URL is not configured"
        );
    }

    const form = new FormData();

    form.append(
        "file",
        fs.createReadStream(imagePath)
    );

    try {

        console.log(
            "🔍 Sending image to PaddleOCR:",
            process.env.PADDLE_OCR_URL
        );

        const response =
            await axios.post(
                `${process.env.PADDLE_OCR_URL}/ocr`,
                form,
                {
                    headers: {
                        ...form.getHeaders()
                    },

                    maxBodyLength:
                        Infinity,

                    maxContentLength:
                        Infinity,

                    timeout:
                        120000
                }
            );

        console.log(
            "✅ PaddleOCR response received"
        );

        return response.data;

    } catch (error) {

        console.error(
            "❌ PaddleOCR request failed"
        );

        if (error.response) {

            console.error(
                "OCR status:",
                error.response.status
            );

            console.error(
                "OCR response:",
                error.response.data
            );
        }

        throw new Error(
            error.response?.data?.message ||
            error.message ||
            "PaddleOCR service failed"
        );
    }
};