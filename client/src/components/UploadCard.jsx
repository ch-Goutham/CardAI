import { useState } from "react";

const UploadCard = ({
    onExtract,
    loading
}) => {

    const [file, setFile] =
        useState(null);

    const handleFileChange =
        (event) => {

            const selectedFile =
                event.target.files?.[0];

            if (!selectedFile) {
                setFile(null);
                return;
            }

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (
                !allowedTypes.includes(
                    selectedFile.type
                )
            ) {
                alert(
                    "Please select JPG, PNG or WEBP image."
                );

                event.target.value = "";
                setFile(null);

                return;
            }

            if (
                selectedFile.size >
                5 * 1024 * 1024
            ) {
                alert(
                    "Image size must be less than 5 MB."
                );

                event.target.value = "";
                setFile(null);

                return;
            }

            setFile(selectedFile);
        };


    const handleSubmit =
        async (event) => {

            event.preventDefault();

            if (!file) {
                alert(
                    "Please select a visiting card image."
                );

                return;
            }

            await onExtract(file);
        };


    return (
        <form
            className="upload-card"
            onSubmit={handleSubmit}
        >

            <h2>
                Upload Visiting Card
            </h2>

            <p>
                Upload JPG, PNG or WEBP
            </p>

            <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={loading}
            />

            {file && (
                <p className="file-name">
                    {file.name}
                </p>
            )}

            <button
                type="submit"
                disabled={
                    loading || !file
                }
            >
                {loading
                    ? "Extracting..."
                    : "Extract Information"}
            </button>

        </form>
    );
};

export default UploadCard;