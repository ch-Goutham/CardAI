import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import cardRoutes from "./routes/cardRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ===============================
// CORS
// ===============================

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://card-ai-client.vercel.app"
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);


// ===============================
// BODY PARSER
// ===============================

app.use(
    express.json({
        limit: "10mb"
    })
);


// ===============================
// STATIC UPLOADS
// ===============================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


// ===============================
// API ROUTES
// ===============================

app.use(
    "/api/cards",
    cardRoutes
);


// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Visiting Card API is running"
    });

});


// ===============================
// ERROR HANDLER
// ===============================

app.use(
    (error, req, res, next) => {

        console.error(error);

        res.status(500).json({
            success: false,
            message:
                error.message ||
                "Server error"
        });

    }
);


// ===============================
// START SERVER
// ===============================

const startServer = async () => {

    try {

        await connectDB();

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `🚀 Server running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "❌ Failed to start server:",
            error
        );

        process.exit(1);

    }

};

startServer();  