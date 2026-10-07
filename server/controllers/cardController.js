import VisitingCard from "../models/VisitingCard.js";

import {
    createExcelBuffer
} from "../services/excelService.js";

import {
    runPaddleOCR
} from "../services/paddleOcrService.js";

import {
    extractContact
} from "../services/cardExtractor.js";


// =====================================================
// NORMALIZE PADDLEOCR RESPONSE
// =====================================================

// =====================================================
// NORMALIZE PADDLEOCR RESPONSE
// =====================================================

const normalizeOCRResult = (ocrResult) => {

    const normalizedLines = [];

    if (
        !ocrResult ||
        !ocrResult.success
    ) {
        return normalizedLines;
    }

    const pages = Array.isArray(
        ocrResult.pages
    )
        ? ocrResult.pages
        : [];

    console.log(
        "📄 PaddleOCR pages:",
        pages.length
    );

    pages.forEach(
        (page, pageIndex) => {

            let pageData = page;

            // -------------------------------------------------
            // Parse JSON string if necessary
            // -------------------------------------------------

            if (
                typeof pageData === "string"
            ) {
                try {

                    pageData =
                        JSON.parse(
                            pageData
                        );

                } catch (error) {

                    console.error(
                        `❌ Failed to parse page ${pageIndex}:`,
                        error.message
                    );

                    return;
                }
            }

            if (
                !pageData ||
                typeof pageData !== "object"
            ) {
                return;
            }

            // -------------------------------------------------
            // IMPORTANT:
            // PaddleOCR 3.x response contains:
            //
            // page = {
            //     res: {
            //         rec_texts: [],
            //         rec_scores: [],
            //         rec_polys: [],
            //         rec_boxes: []
            //     }
            // }
            // -------------------------------------------------

            if (
                pageData.res &&
                typeof pageData.res === "object"
            ) {
                pageData = pageData.res;
            }

            console.log(
                `📄 Page ${pageIndex + 1} keys:`,
                Object.keys(pageData)
            );

            // -------------------------------------------------
            // OCR TEXT
            // -------------------------------------------------

            const texts =
                Array.isArray(
                    pageData.rec_texts
                )
                    ? pageData.rec_texts
                    : [];

            // -------------------------------------------------
            // OCR CONFIDENCE
            // -------------------------------------------------

            const scores =
                Array.isArray(
                    pageData.rec_scores
                )
                    ? pageData.rec_scores
                    : [];

            // -------------------------------------------------
            // OCR POLYGONS
            // -------------------------------------------------

            const polygons =
                Array.isArray(
                    pageData.rec_polys
                )
                    ? pageData.rec_polys
                    : Array.isArray(
                        pageData.dt_polys
                    )
                        ? pageData.dt_polys
                        : [];

            // -------------------------------------------------
            // OCR RECTANGULAR BOXES
            // -------------------------------------------------

            const boxes =
                Array.isArray(
                    pageData.rec_boxes
                )
                    ? pageData.rec_boxes
                    : [];

            console.log(
                `📝 Texts found on page ${pageIndex + 1}:`,
                texts.length
            );

            // -------------------------------------------------
            // NORMALIZE OCR RESULTS
            // -------------------------------------------------

            texts.forEach(
                (value, index) => {

                    const text =
                        String(
                            value ?? ""
                        ).trim();

                    if (!text) {
                        return;
                    }

                    const score =
                        Number(
                            scores[index] ?? 0
                        );

                    let box = null;

                    if (
                        polygons[index]
                    ) {

                        box =
                            polygons[index];

                    } else if (
                        boxes[index]
                    ) {

                        box =
                            boxes[index];
                    }

                    normalizedLines.push({

                        text,

                        confidence:
                            Number.isFinite(
                                score
                            )
                                ? score
                                : 0,

                        box,

                        page:
                            pageIndex + 1

                    });

                }
            );

        }
    );

    return normalizedLines;
};


// =====================================================
// EXTRACT VISITING CARD
// =====================================================

export const extractCardInformation = async (
    req,
    res
) => {

    try {

        // -------------------------------------------------
        // Validate upload
        // -------------------------------------------------

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Please upload a visiting card image"

            });
        }


        console.log(
            "================================="
        );

        console.log(
            "📸 Uploaded:",
            req.file.originalname
        );

        console.log(
            "📁 File path:",
            req.file.path
        );


        // -------------------------------------------------
        // STEP 1: PaddleOCR
        // -------------------------------------------------

        console.log(
            "🔍 Calling PaddleOCR..."
        );

        const ocrResult =
            await runPaddleOCR(
                req.file.path
            );


        console.log(
            "✅ PaddleOCR response received"
        );

        console.log(
            "OCR success:",
            ocrResult?.success
        );


        // IMPORTANT:
        // Print complete response for debugging
        console.log(
            "FULL OCR RESPONSE:",
            JSON.stringify(
                ocrResult,
                null,
                2
            )
        );


        // -------------------------------------------------
        // Check OCR success
        // -------------------------------------------------

        if (
            !ocrResult ||
            !ocrResult.success
        ) {

            return res.status(500).json({

                success: false,

                message:
                    "PaddleOCR failed",

                error:
                    ocrResult?.error ||
                    "Unknown OCR error"

            });
        }


        // -------------------------------------------------
        // STEP 2: Normalize OCR
        // -------------------------------------------------

        const ocrLines =
            normalizeOCRResult(
                ocrResult
            );


        console.log(
            "📝 Normalized OCR lines:",
            ocrLines.length
        );


        // -------------------------------------------------
        // No OCR text
        // -------------------------------------------------

        if (!ocrLines.length) {

            return res.status(422).json({

                success: false,

                message:
                    "No readable text found on the card",

                ocr: []

            });
        }


        // -------------------------------------------------
        // DEBUG OCR TEXT
        // -------------------------------------------------

        console.log(
            "📝 OCR TEXT:"
        );


        ocrLines.forEach(
            (line, index) => {

                console.log(
                    `${index + 1}. ${line.text} | confidence: ${line.confidence}`
                );

            }
        );


        // -------------------------------------------------
        // STEP 3: Contact extraction
        // -------------------------------------------------

        console.log(
            "🧠 Running contact extraction..."
        );

        let extracted;


        try {

            extracted =
                extractContact(
                    ocrLines
                );


            console.log(
                "✅ Contact extraction successful"
            );


            console.log(
                "📦 Extracted data:",
                JSON.stringify(
                    extracted?.data || {},
                    null,
                    2
                )
            );


        } catch (extractError) {

            console.error(
                "❌ cardExtractor.js ERROR:"
            );

            console.error(
                extractError
            );


            return res.status(500).json({

                success: false,

                message:
                    "OCR succeeded but contact extraction failed",

                error:
                    extractError.message,

                stack:
                    extractError.stack

            });
        }


        // -------------------------------------------------
        // STEP 4: Return extracted information
        // -------------------------------------------------

        return res.json({

            success: true,

            data:
                extracted?.data || {},

            confidence:
                extracted?.confidence || {},

            candidates:
                extracted?.candidates || {},

            ocr:
                ocrLines,

            image: {

                filename:
                    req.file.filename,

                originalName:
                    req.file.originalname,

                url:
                    `/uploads/${req.file.filename}`

            }

        });


    } catch (error) {

        console.error(
            "❌ Extraction error:"
        );

        console.error(
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to extract visiting card",

            error:
                error.message

        });
    }
};


// =====================================================
// SAVE VISITING CARD
// =====================================================

export const saveVisitingCard = async (
    req,
    res
) => {

    try {

        const {
            name,
            company,
            designation,
            phone,
            alternatePhone,
            email,
            website,
            linkedin,
            address,
            notes,
            rawOCR,
            confidence,
            image
        } = req.body;


        const contact =
            await VisitingCard.create({

                name:
                    name || "",

                company:
                    company || "",

                designation:
                    designation || "",

                phone:
                    phone || "",

                alternatePhone:
                    alternatePhone || "",

                email:
                    email || "",

                website:
                    website || "",

                linkedin:
                    linkedin || "",

                address:
                    address || "",

                notes:
                    notes || "",

                rawOCR:
                    rawOCR || [],

                confidence:
                    confidence || {},

                image:
                    image || {}

            });


        return res.status(201).json({

            success: true,

            message:
                "Contact saved successfully",

            data:
                contact

        });


    } catch (error) {

        console.error(
            "❌ Save contact error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to save contact",

            error:
                error.message

        });
    }
};


// =====================================================
// GET ALL VISITING CARDS
// =====================================================

export const getVisitingCards = async (
    req,
    res
) => {

    try {

        const contacts =
            await VisitingCard.find()
                .sort({
                    createdAt: -1
                })
                .lean();


        return res.json({

            success: true,

            count:
                contacts.length,

            data:
                contacts

        });


    } catch (error) {

        console.error(
            "❌ Get contacts error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch contacts",

            error:
                error.message

        });
    }
};


// =====================================================
// GET SINGLE VISITING CARD
// =====================================================

export const getVisitingCard = async (
    req,
    res
) => {

    try {

        const card =
            await VisitingCard.findById(
                req.params.id
            );


        if (!card) {

            return res.status(404).json({

                success: false,

                message:
                    "Visiting card not found"

            });
        }


        return res.json({

            success: true,

            data:
                card

        });


    } catch (error) {

        console.error(
            "❌ Get card error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch card",

            error:
                error.message

        });
    }
};


// =====================================================
// UPDATE VISITING CARD
// =====================================================

export const updateVisitingCard = async (
    req,
    res
) => {

    try {

        const card =
            await VisitingCard.findByIdAndUpdate(

                req.params.id,

                req.body,

                {
                    new: true,
                    runValidators: true
                }

            );


        if (!card) {

            return res.status(404).json({

                success: false,

                message:
                    "Visiting card not found"

            });
        }


        return res.json({

            success: true,

            message:
                "Visiting card updated",

            data:
                card

        });


    } catch (error) {

        console.error(
            "❌ Update card error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update card",

            error:
                error.message

        });
    }
};


// =====================================================
// DELETE VISITING CARD
// =====================================================

export const deleteVisitingCard = async (
    req,
    res
) => {

    try {

        const card =
            await VisitingCard.findByIdAndDelete(
                req.params.id
            );


        if (!card) {

            return res.status(404).json({

                success: false,

                message:
                    "Visiting card not found"

            });
        }


        return res.json({

            success: true,

            message:
                "Visiting card deleted"

        });


    } catch (error) {

        console.error(
            "❌ Delete card error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to delete card",

            error:
                error.message

        });
    }
};


// =====================================================
// DOWNLOAD EXCEL
// =====================================================

export const downloadExcel = async (
    req,
    res
) => {

    try {

        console.log(
            "📊 Generating Excel from MongoDB..."
        );


        const contacts =
            await VisitingCard.find()
                .sort({
                    createdAt: -1
                })
                .lean();


        if (!contacts.length) {

            return res.status(404).json({

                success: false,

                message:
                    "No visiting cards found"

            });
        }


        const excelBuffer =
            createExcelBuffer(
                contacts
            );


        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );


        res.setHeader(
            "Content-Disposition",
            'attachment; filename="visiting-cards.xlsx"'
        );


        console.log(
            `✅ Excel generated for ${contacts.length} contacts`
        );


        return res.send(
            excelBuffer
        );


    } catch (error) {

        console.error(
            "❌ Excel generation error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to generate Excel file",

            error:
                error.message

        });
    }
};