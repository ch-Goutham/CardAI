import mongoose from "mongoose";

const visitingCardSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "",
        },

        company: {
            type: String,
            default: "",
        },

        designation: {
            type: String,
            default: "",
        },

        phone: {
            type: String,
            default: "",
        },

        alternatePhone: {
            type: String,
            default: "",
        },

        email: {
            type: String,
            default: "",
        },

        website: {
            type: String,
            default: "",
        },

        linkedin: {
            type: String,
            default: "",
        },

        address: {
            type: String,
            default: "",
        },

        notes: {
            type: String,
            default: "",
        },

        rawOCR: {
            type: Array,
            default: [],
        },

        confidence: {
            type: Object,
            default: {},
        },

        image: {
            filename: String,
            originalName: String,
            url: String,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "VisitingCard",
    visitingCardSchema
);