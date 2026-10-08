import { useEffect, useRef, useState } from "react";

const UploadCard = ({ onExtract, loading, onOpenRecords }) => {
    const [file, setFile] = useState(null);
    const [source, setSource] = useState("upload");
    const [dragging, setDragging] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraStatus, setCameraStatus] = useState("starting");
    const [cameraError, setCameraError] = useState("");
    const [cameraRequest, setCameraRequest] = useState(0);
    const inputRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!cameraOpen) return undefined;

        let cancelled = false;
        let stream;
        const video = videoRef.current;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError("Camera access is unavailable. Use a secure connection or upload an image instead.");
                setCameraStatus("error");
                return;
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: { ideal: "environment" },
                    },
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                if (!video) {
                    throw new Error("The camera preview could not be initialized.");
                }

                video.srcObject = stream;
                await video.play();
                if (!cancelled) setCameraStatus("ready");
            } catch (error) {
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }
                if (cancelled) return;

                const message = error.name === "NotAllowedError" || error.name === "PermissionDeniedError"
                    ? "Camera permission was denied. Allow camera access in your browser settings, or upload an image instead."
                    : error.name === "NotFoundError" || error.name === "DevicesNotFoundError"
                        ? "No camera was found. Connect a camera or upload an image instead."
                        : "The camera could not be started. Check that it is not being used by another app, or upload an image instead.";
                setCameraError(message);
                setCameraStatus("error");
            }
        };

        startCamera();

        return () => {
            cancelled = true;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            if (video) video.srcObject = null;
        };
    }, [cameraOpen, cameraRequest]);

    const selectFile = (selectedFile) => {
        if (!selectedFile) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            alert("Please select a JPG, PNG or WEBP image.");
            setFile(null);
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            alert("Image size must be less than 5 MB.");
            setFile(null);
            return;
        }

        setFile(selectedFile);
    };

    const handleFileChange = (event) => {
        selectFile(event.target.files?.[0]);
        event.target.value = "";
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        selectFile(event.dataTransfer.files?.[0]);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video?.videoWidth || !video.videoHeight) {
            setCameraError("The camera is not ready yet. Please try again.");
            return;
        }

        const maxDimension = 2000;
        const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const context = canvas.getContext("2d");
        if (!context) {
            setCameraError("Could not capture the camera image. Please try again.");
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) {
                setCameraError("Could not create an image from the camera. Please try again.");
                return;
            }

            const capturedFile = new File([blob], "camera-visiting-card.jpg", {
                type: "image/jpeg",
            });
            if (capturedFile.size > 5 * 1024 * 1024) {
                setCameraError("The captured image is over 5 MB. Move closer to the card and try again.");
                return;
            }

            setFile(capturedFile);
            setSource("camera");
            setCameraOpen(false);
        }, "image/jpeg", 0.85);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!file) {
            alert("Please select a visiting card image.");
            return;
        }
        await onExtract(file);
    };

    return (
        <form className="upload-card" onSubmit={handleSubmit}>
            <div className="upload-tabs" role="tablist" aria-label="Upload options">
                <button
                    className={source === "camera" ? "upload-tab active" : "upload-tab"}
                    type="button"
                    onClick={() => {
                        setSource("camera");
                        setCameraStatus("starting");
                        setCameraError("");
                        setCameraOpen(true);
                    }}
                    disabled={loading}
                >
                    <span aria-hidden="true">▧</span> Camera
                </button>
                <button
                    className={source === "upload" ? "upload-tab active" : "upload-tab"}
                    type="button"
                    role="tab"
                    aria-selected={source === "upload"}
                    onClick={() => setSource("upload")}
                    disabled={loading}
                >
                    <span aria-hidden="true">▧</span> Upload Image
                </button>
                <button
                    className="upload-tab"
                    type="button"
                    onClick={onOpenRecords}
                    disabled={loading}
                >
                    <span aria-hidden="true">▤</span> Content
                </button>
            </div>

            <label
                className={`upload-dropzone${dragging ? " is-dragging" : ""}`}
                htmlFor="visiting-card-image"
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    id="visiting-card-image"
                    className="upload-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture={source === "camera" ? "environment" : undefined}
                    onChange={handleFileChange}
                    disabled={loading}
                />
                <span className="upload-icon" aria-hidden="true">
                    {loading ? (
                        <span className="upload-spinner" />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" />
                        </svg>
                    )}
                </span>
                <strong>
                    {loading
                        ? "Reading your visiting card..."
                        : file
                            ? file.name
                            : "Click or drag to upload a visiting card"}
                </strong>
                <span className="upload-help">
                    {file
                        ? "Choose a different image or continue to extract details"
                        : "Select a JPG, PNG or WEBP image (max 5 MB)"}
                </span>
                {file && (
                    <span className="upload-selected" aria-hidden="true">
                        Image selected
                    </span>
                )}
            </label>

            {file && (
                <button
                    className="upload-submit"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Extracting details..." : "Extract Information"}
                    {!loading && <span aria-hidden="true">→</span>}
                </button>
            )}

            {cameraOpen && (
                <div
                    className="camera-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setCameraOpen(false);
                        }
                    }}
                >
                    <section
                        className="camera-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="camera-title"
                    >
                        <header className="camera-modal-header">
                            <div>
                                <h2 id="camera-title">Scan a visiting card</h2>
                                <p>Position the card clearly inside the frame.</p>
                            </div>
                            <button
                                className="camera-close"
                                type="button"
                                aria-label="Close camera"
                                onClick={() => setCameraOpen(false)}
                            >
                                ×
                            </button>
                        </header>

                        {cameraStatus !== "error" ? (
                            <div className="camera-preview-wrap">
                                <video
                                    ref={videoRef}
                                    className="camera-preview"
                                    autoPlay
                                    playsInline
                                    muted
                                />
                                <div className="camera-card-guide" aria-hidden="true" />
                                {cameraStatus === "starting" && (
                                    <span className="camera-status">Starting camera…</span>
                                )}
                            </div>
                        ) : (
                            <p className="camera-error" role="alert">{cameraError}</p>
                        )}

                        {cameraStatus === "ready" && cameraError && (
                            <p className="camera-error" role="alert">{cameraError}</p>
                        )}

                        <footer className="camera-modal-actions">
                            <button
                                className="camera-cancel"
                                type="button"
                                onClick={() => setCameraOpen(false)}
                            >
                                Cancel
                            </button>
                            {cameraStatus === "ready" && (
                                <button
                                    className="camera-capture"
                                    type="button"
                                    onClick={handleCapture}
                                >
                                    Capture card
                                </button>
                            )}
                            {cameraStatus === "error" && (
                                <button
                                    className="camera-capture"
                                    type="button"
                                    onClick={() => {
                                        setCameraStatus("starting");
                                        setCameraError("");
                                        setCameraRequest((request) => request + 1);
                                    }}
                                >
                                    Try again
                                </button>
                            )}
                        </footer>
                    </section>
                </div>
            )}
        </form>
    );
};

export default UploadCard;
