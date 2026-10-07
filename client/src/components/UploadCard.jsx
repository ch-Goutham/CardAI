import { useState } from "react";

const UploadCard = ({
    onExtract,
    loading
}) => {

    const [file, setFile] =
        useState(null);

    const handleSubmit =
        async (event) => {

            event.preventDefault();

            if (!file) {
                alert(
                    "Please select a visiting card image"
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
                onChange={(event) =>
                    setFile(
                        event.target.files?.[0] ||
                        null
                    )
                }
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