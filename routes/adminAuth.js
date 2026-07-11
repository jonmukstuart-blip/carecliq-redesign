import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post(
    "/login",
    async (req, res) => {

        try {

            const email =
                String(
                    req.body.email || ""
                )
                .trim()
                .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );


            if (!email || !password) {

                return res.status(400).json({

                    message:
                        "Email and password are required"

                });

            }


            const configuredEmail =
                String(
                    process.env.ADMIN_EMAIL || ""
                )
                .trim()
                .toLowerCase();


           if (
    email !== configuredEmail ||
    !process.env.ADMIN_PASSWORD
) {

                return res.status(401).json({

                    message:
                        "Invalid administrator credentials"

                });

            }


            const passwordMatches =
    password === process.env.ADMIN_PASSWORD;


            if (!passwordMatches) {

                return res.status(401).json({

                    message:
                        "Invalid administrator credentials"

                });

            }


            const token =
                jwt.sign(

                    {
                        role: "admin",
                        email: configuredEmail
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn: "8h"
                    }

                );


            return res.json({

                message:
                    "Administrator login successful",

                token,

                user: {

                    email:
                        configuredEmail,

                    role:
                        "admin"

                }

            });

        }
        catch (error) {

            console.error(
                "Admin login failed:",
                error
            );

            return res.status(500).json({

                message:
                    "Administrator login failed"

            });

        }

    }
);


export default router;