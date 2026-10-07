import { google } from "googleapis";

const getSheetsClient = () => {
    if (
        !process.env.GOOGLE_CLIENT_EMAIL ||
        !process.env.GOOGLE_PRIVATE_KEY
    ) {
        throw new Error(
            "Google Sheets credentials are not configured"
        );
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,

            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(
                /\\n/g,
                "\n"
            )
        },

        scopes: [
            "https://www.googleapis.com/auth/spreadsheets"
        ]
    });

    return google.sheets({
        version: "v4",
        auth
    });
};

export const appendContactToSheet = async (contact) => {
    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            throw new Error(
                "GOOGLE_SHEET_ID is missing in .env"
            );
        }

        console.log("📊 Google Sheets");
        console.log("Sheet ID:", sheetId);
        console.log(
            "Client email:",
            process.env.GOOGLE_CLIENT_EMAIL
        );

        const sheets = getSheetsClient();

        const row = [
            new Date().toLocaleString("en-IN"),
            contact.name || "",
            contact.company || "",
            contact.designation || "",
            contact.phone || "",
            contact.alternatePhone || "",
            contact.email || "",
            contact.website || "",
            contact.linkedin || "",
            contact.address || "",
            contact.notes || ""
        ];

        console.log("📝 Row:", row);

        const response =
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,

                range: "Sheet1!A:K",

                valueInputOption: "USER_ENTERED",

                insertDataOption: "INSERT_ROWS",

                requestBody: {
                    values: [row]
                }
            });

        console.log("✅ Google Sheets append successful");

        return {
            ...response.data,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
        };

    } catch (error) {

        console.error("==============================");
        console.error("❌ GOOGLE SHEETS ERROR");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Status:", error.response?.status);
        console.error(
            "Response:",
            error.response?.data
        );
        console.error("==============================");

        throw error;
    }
};