import dotenv from "dotenv";
dotenv.config();
import dns from "node:dns";

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import multer from "multer";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import adminAuthRoutes from "./routes/adminAuth.js";
import { sendEmail } from "./utils/sendEmail.js";

import authRoutes from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 5000;


// =====================================
// FILE PATHS
// =====================================

const dataPath = path.join(
    __dirname,
    "data",
    "site.json"
);

const demoRequestsPath = path.join(
    __dirname,
    "data",
    "demo-requests.json"
);

async function connectDatabase() {

    try {

        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                serverSelectionTimeoutMS: 10000
            }
        );

        console.log(
            "CareCliQ database connected"
        );

        return true;

    }
    catch (error) {

        console.error(
            "CareCliQ database connection failed:",
            error.message
        );

        console.log(
            "CareCliQ will continue without authentication features"
        );

        return false;

    }

}
const uploadsPath = path.join(
    __dirname,
    "uploads"
);


// =====================================
// ENSURE REQUIRED DIRECTORIES EXIST
// =====================================

if (!fs.existsSync(uploadsPath)) {

    fs.mkdirSync(
        uploadsPath,
        {
            recursive: true
        }
    );

}

if (!fs.existsSync(demoRequestsPath)) {

    fs.writeFileSync(
        demoRequestsPath,
        "[]",
        "utf8"
    );

}


// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());

app.use(bodyParser.json());

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.use(
    "/uploads",
    express.static(uploadsPath)
);


// =====================================
// SERVE FRONTEND
// =====================================

app.use(
    express.static(
        path.join(
            __dirname,
            "../frontend"
        )
    )
);


// =====================================
// AUTH ROUTES
// =====================================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/admin-auth",
    adminAuthRoutes
);

// =====================================
// EMAIL TRANSPORTER
// =====================================

const mailTransporter =
    nodemailer.createTransport({

        host:
            process.env.SMTP_HOST,

        port:
            Number(
                process.env.SMTP_PORT
            ) || 465,

        secure:
            process.env.SMTP_SECURE === "true",

        auth: {

            user:
                process.env.SMTP_USER,

            pass:
                process.env.SMTP_PASS

        }

    });


// =====================================
// MULTER FILE UPLOAD
// =====================================

const storage =
    multer.diskStorage({

        destination:
            (req, file, callback) => {

                callback(
                    null,
                    uploadsPath
                );

            },

        filename:
            (req, file, callback) => {

                const safeOriginalName =
                    file.originalname.replace(
                        /[^a-zA-Z0-9.\-_]/g,
                        "-"
                    );

                const uniqueName =
                    `${Date.now()}-${safeOriginalName}`;

                callback(
                    null,
                    uniqueName
                );

            }

    });


const upload =
    multer({

        storage: storage,

        limits: {

            fileSize:
                20 * 1024 * 1024

        }

    });


// =====================================
// FILE UPLOAD ROUTE
// =====================================

app.post(
    "/api/upload",

    upload.single("file"),

    (req, res) => {

        if (!req.file) {

            return res.status(400).json({

                message:
                    "No file uploaded"

            });

        }

        return res.json({

            message:
                "Upload successful",

            url:
                `/uploads/${req.file.filename}`

        });

    }
);


// =====================================
// GET DEMO REQUESTS
// =====================================

app.get(
    "/api/demo-requests",

    async (req, res) => {

        try {

            const fileContent =
                await fs.promises.readFile(
                    demoRequestsPath,
                    "utf8"
                );

            const requests =
                JSON.parse(
                    fileContent || "[]"
                );

            return res.json(requests);

        }
        catch (error) {

            console.error(
                "Could not load demo requests:",
                error
            );

            return res.status(500).json({

                message:
                    "Could not load demo requests"

            });

        }

    }
);


// =====================================
// CREATE DEMO REQUEST
// =====================================

app.post(
    "/api/demo-requests",

    async (req, res) => {

        const clientType =
            String(
                req.body.clientType || ""
            ).trim();

        const fullName =
            String(
                req.body.fullName || ""
            ).trim();

        const organisation =
            String(
                req.body.organisation || ""
            ).trim();

        const email =
            String(
                req.body.email || ""
            ).trim();

        const phone =
            String(
                req.body.phone || ""
            ).trim();

        const message =
            String(
                req.body.message || ""
            ).trim();


        if (
            !clientType ||
            !fullName ||
            !email ||
            !message
        ) {

            return res.status(400).json({

                message:
                    "Client type, full name, email and message are required"

            });

        }


        const newRequest = {

            id:
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 9)}`,

            clientType:
                clientType,

            fullName:
                fullName,

            organisation:
                organisation,

            email:
                email,

            phone:
                phone,

            message:
                message,

            status:
                "new",

            createdAt:
                new Date().toISOString(),

            replies:
                [],

            lastReplySubject:
                "",

            lastReplyMessage:
                "",

            repliedAt:
                null

        };


        try {

            const fileContent =
                await fs.promises.readFile(
                    demoRequestsPath,
                    "utf8"
                );

            const requests =
                JSON.parse(
                    fileContent || "[]"
                );

            requests.unshift(
                newRequest
            );

            await fs.promises.writeFile(

                demoRequestsPath,

                JSON.stringify(
                    requests,
                    null,
                    2
                ),

                "utf8"

            );

            // =====================================
// SEND CLIENT DEMO CONFIRMATION
// =====================================

try {

    await sendEmail(

        email,

        "Your CareCliQ demo request has been received",

        `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#292524;">

            <h2 style="color:#be185d;">
                Demo request received
            </h2>

            <p>
                Hello ${fullName},
            </p>

            <p>
                Thank you for requesting a CareCliQ demo.
            </p>

            <p>
                Our team has received your request and will contact you soon to arrange your personalised walkthrough.
            </p>

            <div style="
                margin:24px 0;
                padding:18px;
                background:#fdf2f8;
                border-radius:14px;
            ">

                <p>
                    <strong>Client type:</strong>
                    ${clientType}
                </p>

                <p>
                    <strong>Organisation:</strong>
                    ${organisation || "Not provided"}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${email}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${phone || "Not provided"}
                </p>

            </div>

            <p>
                Kind regards,<br>
                The CareCliQ Team
            </p>

        </div>
        `

    );

}
catch (emailError) {

    console.error(
        "Demo confirmation email failed:",
        emailError.message
    );

}


// =====================================
// NOTIFY CARECLIQ INTERNALLY
// =====================================

const companyEmail =
    process.env.COMPANY_EMAIL ||
    process.env.SMTP_USER;


if (companyEmail) {

    try {

        await sendEmail(

            companyEmail,

            `New CareCliQ demo request from ${fullName}`,

            `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">

                <h2>
                    New demo request
                </h2>

                <p>
                    <strong>Name:</strong>
                    ${fullName}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${email}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${phone || "Not provided"}
                </p>

                <p>
                    <strong>Organisation:</strong>
                    ${organisation || "Not provided"}
                </p>

                <p>
                    <strong>Client type:</strong>
                    ${clientType}
                </p>

                <p>
                    <strong>Message:</strong>
                </p>

                <p>
                    ${message}
                </p>

            </div>
            `

        );

    }
    catch (emailError) {

        console.error(
            "Internal demo notification failed:",
            emailError.message
        );

    }

}
            return res.status(201).json({

                message:
                    "Demo request saved",

                request:
                    newRequest

            });

        }
        catch (error) {

            console.error(
                "Could not save demo request:",
                error
            );

            return res.status(500).json({

                message:
                    "Could not save demo request"

            });

        }

    }
);


// =====================================
// UPDATE DEMO REQUEST STATUS
// =====================================

app.patch(
    "/api/demo-requests/:id",

    async (req, res) => {

        const requestId =
            req.params.id;

        const allowedStatuses = [
            "new",
            "read",
            "replied",
            "closed"
        ];

        const requestedStatus =
            String(
                req.body.status || ""
            ).trim();


        if (
            !allowedStatuses.includes(
                requestedStatus
            )
        ) {

            return res.status(400).json({

                message:
                    "Invalid request status"

            });

        }


        try {

            const fileContent =
                await fs.promises.readFile(
                    demoRequestsPath,
                    "utf8"
                );

            const requests =
                JSON.parse(
                    fileContent || "[]"
                );

            const requestIndex =
                requests.findIndex(
                    request =>
                        request.id === requestId
                );


            if (requestIndex === -1) {

                return res.status(404).json({

                    message:
                        "Demo request was not found"

                });

            }


            requests[requestIndex] = {

                ...requests[requestIndex],

                status:
                    requestedStatus

            };


            await fs.promises.writeFile(

                demoRequestsPath,

                JSON.stringify(
                    requests,
                    null,
                    2
                ),

                "utf8"

            );

            return res.json({

                message:
                    "Demo request updated",

                request:
                    requests[requestIndex]

            });

        }
        catch (error) {

            console.error(
                "Could not update demo request:",
                error
            );

            return res.status(500).json({

                message:
                    "Could not update demo request"

            });

        }

    }
);

// =====================================
// REPLY TO DEMO REQUEST
// =====================================

app.post(
    "/api/demo-requests/:id/reply",

    async (req, res) => {

        const requestId =
            req.params.id;

        const subject =
            String(
                req.body.subject || ""
            ).trim();

        const replyMessage =
            String(
                req.body.message || ""
            ).trim();


        if (
            !subject ||
            !replyMessage
        ) {

            return res.status(400).json({

                message:
                    "Subject and reply message are required"

            });

        }


        try {

            const fileContent =
                await fs.promises.readFile(
                    demoRequestsPath,
                    "utf8"
                );

            const requests =
                JSON.parse(
                    fileContent || "[]"
                );

            const requestIndex =
                requests.findIndex(
                    request =>
                        request.id === requestId
                );


            if (requestIndex === -1) {

                return res.status(404).json({

                    message:
                        "Demo request was not found"

                });

            }


            const demoRequest =
                requests[requestIndex];


            if (!demoRequest.email) {

                return res.status(400).json({

                    message:
                        "This client has no email address"

                });

            }


            const companyName =
                process.env.COMPANY_NAME
                ||
                "CareCliQ";

            const companyEmail =
                process.env.COMPANY_EMAIL
                ||
                process.env.SMTP_USER;


            if (!companyEmail) {

                return res.status(500).json({

                    message:
                        "The company email is not configured"

                });

            }


            const clientName =
                demoRequest.fullName
                ||
                "there";


            const emailText =
`Hello ${clientName},

${replyMessage}

Kind regards,
${companyName}`;


            await mailTransporter.sendMail({

                from:
                    `"${companyName}" <${companyEmail}>`,

                to:
                    demoRequest.email,

                replyTo:
                    companyEmail,

                subject:
                    subject,

                text:
                    emailText

            });


            const replyRecord = {

                id:
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 9)}`,

                subject:
                    subject,

                message:
                    replyMessage,

                sentTo:
                    demoRequest.email,

                sentFrom:
                    companyEmail,

                sentAt:
                    new Date().toISOString()

            };


            const previousReplies =
                Array.isArray(
                    demoRequest.replies
                )
                    ? demoRequest.replies
                    : [];


            requests[requestIndex] = {

                ...demoRequest,

                status:
                    "replied",

                replies: [
                    ...previousReplies,
                    replyRecord
                ],

                lastReplySubject:
                    subject,

                lastReplyMessage:
                    replyMessage,

                repliedAt:
                    replyRecord.sentAt

            };


            await fs.promises.writeFile(

                demoRequestsPath,

                JSON.stringify(
                    requests,
                    null,
                    2
                ),

                "utf8"

            );


            return res.json({

                message:
                    "Reply sent successfully",

                request:
                    requests[requestIndex]

            });

        }
        catch (error) {

            console.error(
                "Demo reply failed:",
                error
            );

            return res.status(500).json({

                message:
                    "The reply could not be sent",

                error:
                    error.message

            });

        }

    }
);


// =====================================
// GET WEBSITE CONTENT
// =====================================

app.get(
    "/api/content",

    async (req, res) => {

        try {

            const fileContent =
                await fs.promises.readFile(
                    dataPath,
                    "utf8"
                );

            return res.json(
                JSON.parse(fileContent)
            );

        }
        catch (error) {

            console.error(
                "Could not load content:",
                error
            );

            return res.status(500).json({

                message:
                    "Could not load content"

            });

        }

    }
);


// =====================================
// SAVE WEBSITE CONTENT
// =====================================

app.post(
    "/api/content",

    async (req, res) => {

        try {

            await fs.promises.writeFile(

                dataPath,

                JSON.stringify(
                    req.body,
                    null,
                    2
                ),

                "utf8"

            );

            return res.json({

                message:
                    "Content saved successfully"

            });

        }
        catch (error) {

            console.error(
                "Could not save content:",
                error
            );

            return res.status(500).json({

                message:
                    "Could not save content"

            });

        }

    }
);


// =====================================
// HEALTH CHECK
// =====================================

app.get(
    "/api/health",

    (req, res) => {

        return res.json({

            status:
                "ok",

            message:
                "CareCliQ CMS is running"

        });

    }
);


// =====================================
// VERIFY EMAIL CONNECTION
// =====================================

mailTransporter
    .verify()
    .then(() => {

        console.log(
            "CareCliQ email service connected"
        );

    })
    .catch(error => {

        console.error(
            "CareCliQ email service failed:",
            error.message
        );

    });


// =====================================
// START SERVER
// =====================================

async function startServer() {

    await connectDatabase();

    app.listen(PORT, () => {

        console.log(
            `CareCliQ CMS running on port ${PORT}`
        );

    });

}

startServer();