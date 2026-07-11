import nodemailer from "nodemailer";

const transporter =
nodemailer.createTransport({

  host:
    process.env.SMTP_HOST,

  port:
    Number(
      process.env.SMTP_PORT
    ) || 587,

  secure:
    process.env.SMTP_SECURE === "true",

  auth: {

    user:
      process.env.SMTP_USER,

    pass:
      process.env.SMTP_PASS

  }

});


export async function sendEmail(
  to,
  subject,
  html
) {

  if (
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {

    throw new Error(
      "SMTP_USER or SMTP_PASS is missing from .env"
    );

  }


  return transporter.sendMail({

    from:
      `"${process.env.COMPANY_NAME || "CareCliQ"}" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER}>`,

    to,

    subject,

    html

  });

}