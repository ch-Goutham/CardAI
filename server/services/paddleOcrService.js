import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export const runPaddleOCR = async (imagePath) => {
    const form = new FormData();

    form.append(
        "file",
        fs.createReadStream(imagePath)
    );

    const response = await axios.post(
        `${process.env.PADDLE_OCR_URL}/ocr`,
        form,
        {
            headers: {
                ...form.getHeaders()
            },

            maxBodyLength: Infinity,

            timeout: 120000
        }
    );

    return response.data;
};