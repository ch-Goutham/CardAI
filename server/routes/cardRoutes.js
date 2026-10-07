import express from "express";

import upload from "../middleware/uploadMiddleware.js";

import {
    extractCardInformation,
    saveVisitingCard,
    getVisitingCards,
    getVisitingCard,
    updateVisitingCard,
    deleteVisitingCard,
    downloadExcel
} from "../controllers/cardController.js";


const router = express.Router();


// ==========================================
// Extract visiting card using PaddleOCR
// ==========================================

router.post(
    "/extract",
    upload.single("visitingCard"),
    extractCardInformation
);


// ==========================================
// Save extracted/corrected contact
// ==========================================

router.post(
    "/save",
    saveVisitingCard
);


// ==========================================
// Get all saved contacts
// ==========================================

router.get(
    "/",
    getVisitingCards
);


// ==========================================
// Download Excel
// ==========================================

router.get(
    "/excel/download",
    downloadExcel
);


// ==========================================
// Get single contact
// ==========================================

router.get(
    "/:id",
    getVisitingCard
);


// ==========================================
// Update contact
// ==========================================

router.put(
    "/:id",
    updateVisitingCard
);


// ==========================================
// Delete contact
// ==========================================

router.delete(
    "/:id",
    deleteVisitingCard
);


export default router;