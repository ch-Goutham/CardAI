import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import {
    fileURLToPath
} from "url";

import connectDB from "./config/db.js";

import cardRoutes
    from "./routes/cardRoutes.js";


dotenv.config();

console.log("========== GOOGLE ENV CHECK ==========");
console.log(
    "GOOGLE_CLIENT_EMAIL:",
    process.env.GOOGLE_CLIENT_EMAIL
);

console.log(
    "GOOGLE_PRIVATE_KEY exists:",
    Boolean(process.env.GOOGLE_PRIVATE_KEY)
);

console.log(
    "GOOGLE_PRIVATE_KEY length:",
    process.env.GOOGLE_PRIVATE_KEY?.length || 0
);

console.log(
    "GOOGLE_SHEET_ID:",
    process.env.GOOGLE_SHEET_ID
);

console.log("======================================");


const app =
    express();

const PORT =
    process.env.PORT || 5000;


const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


app.use(
    cors({
        origin:
            "http://localhost:5173"
    })
);


app.use(
    express.json({
        limit: "10mb"
    })
);


app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);


app.use(
    "/api/cards",
    cardRoutes
);


app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Visiting Card API is running"
        });
    }
);


app.use(
    (error, req, res, next) => {

        console.error(
            error
        );

        res.status(500).json({

            success: false,

            message:
                error.message ||
                "Server error"
        });
    }
);


const startServer =
    async () => {

        await connectDB();

        app.listen(
            PORT,
            () => {

                console.log(
                    `🚀 Server running on http://localhost:${PORT}`
                );
            }
        );
    };


startServer();