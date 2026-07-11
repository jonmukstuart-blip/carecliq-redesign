import User from "../models/User.js";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import crypto from "crypto";

import {sendEmail} from "../utils/sendEmail.js";



// REGISTER

export async function register(req, res) {

  try {

    const fullName =
      String(req.body.fullName || "").trim();

    const organisation =
      String(req.body.organisation || "").trim();

    const role =
      String(req.body.role || "").trim();

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const phone =
      String(req.body.phone || "").trim();

    const password =
      String(req.body.password || "");


    if (
      !fullName ||
      !email ||
      !password
    ) {

      return res.status(400).json({

        message:
          "Full name, email and password are required"

      });

    }


    if (password.length < 8) {

      return res.status(400).json({

        message:
          "Password must be at least 8 characters"

      });

    }


    const exists =
      await User.findOne({
        email
      });


    if (exists) {

      return res.status(409).json({

        message:
          "Email already registered"

      });

    }


    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );


    const user =
      await User.create({

        fullName,
        organisation,
        role,
        email,
        phone,

        password:
          hashedPassword

      });

      try {

  await sendEmail(

    user.email,

    "Welcome to CareCliQ",

    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#292524;">

      <h2 style="color:#be185d;">
        Welcome to CareCliQ
      </h2>

      <p>
        Hello ${user.fullName},
      </p>

      <p>
        Your CareCliQ account has been created successfully.
      </p>

      <div style="
        margin:24px 0;
        padding:18px;
        background:#fdf2f8;
        border-radius:14px;
      ">

        <p style="margin:6px 0;">
          <strong>Email:</strong> ${user.email}
        </p>

        <p style="margin:6px 0;">
          <strong>Organisation:</strong> ${user.organisation || "Not provided"}
        </p>

        <p style="margin:6px 0;">
          <strong>Role:</strong> ${user.role || "User"}
        </p>

      </div>

      <p style="margin:30px 0;">
        <a
          href="${process.env.FRONTEND_URL || "http://127.0.0.1:5500"}/login.html"
          style="
            display:inline-block;
            padding:14px 24px;
            background:#be185d;
            color:#ffffff;
            text-decoration:none;
            border-radius:12px;
            font-weight:700;
          "
        >
          Sign in to CareCliQ
        </a>
      </p>

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
    "Account confirmation email failed:",
    emailError.message
  );

}

    return res.status(201).json({

      message:
        "Account created successfully",

      userId:
        user._id,

      user: {

        id:
          user._id,

        fullName:
          user.fullName,

        organisation:
          user.organisation,

        role:
          user.role,

        email:
          user.email,

        phone:
          user.phone

      }

    });

  }
  catch (error) {

    console.error(
      "Registration failed:",
      error
    );

    return res.status(500).json({

      message:
        error.message ||
        "Account creation failed"

    });

  }

}

// LOGIN

export async function login(req, res) {

  try {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");


    if (
      !email ||
      !password
    ) {

      return res.status(400).json({

        message:
          "Email and password are required"

      });

    }


    const user =
      await User.findOne({
        email
      });


    if (!user) {

      return res.status(401).json({

        message:
          "Invalid email or password"

      });

    }


    const match =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!match) {

      return res.status(401).json({

        message:
          "Invalid email or password"

      });

    }


    user.lastLogin =
      new Date();

    await user.save();


    const token =
      jwt.sign(

        {
          id:
            user._id,

          email:
            user.email,

          role:
            user.role
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            "7d"
        }

      );


    return res.json({

      message:
        "Login successful",

      token,

      user: {

        id:
          user._id,

        fullName:
          user.fullName,

        organisation:
          user.organisation,

        role:
          user.role,

        email:
          user.email,

        phone:
          user.phone

      }

    });

  }
  catch (error) {

    console.error(
      "Login failed:",
      error
    );

    return res.status(500).json({

      message:
        error.message ||
        "Login failed"

    });

  }

}

// FORGOT PASSWORD

export async function forgotPassword(req, res) {

  try {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();


    if (!email) {

      return res.status(400).json({

        message:
          "Email address is required"

      });

    }


    const user =
      await User.findOne({
        email
      });


    // Always return the same response for security
    if (!user) {

      return res.json({

        message:
          "Reset instructions sent"

      });

    }


    const token =
      crypto
        .randomBytes(32)
        .toString("hex");


    user.resetPasswordToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");


    user.resetPasswordExpires =
      Date.now() + 30 * 60 * 1000;


    await user.save();


    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://127.0.0.1:5500";


    const link =
      `${frontendUrl}/login.html?view=reset&token=${encodeURIComponent(token)}`;


    await sendEmail(

      email,

      "Reset your CareCliQ password",

      `
        <h2>CareCliQ Password Reset</h2>

        <p>
          Click the button below to reset your password.
        </p>

        <p>
          <a href="${link}">
            Reset Password
          </a>
        </p>

        <p>
          This link expires in 30 minutes.
        </p>
      `

    );


    return res.json({

      message:
        "Reset instructions sent"

    });

  }
  catch (error) {

    console.error(
      "Forgot password failed:",
      error
    );


    return res.status(500).json({

      message:
        error.message ||
        "Unable to send reset instructions"

    });

  }

}
// RESET PASSWORD

export async function resetPassword(req,res){

try{


const {

token,

password

}=req.body;

if (
  !token ||
  !password
) {

  return res.status(400).json({

    message:
      "Reset token and password are required"

  });

}


if (password.length < 8) {

  return res.status(400).json({

    message:
      "Password must be at least 8 characters"

  });

}



const hashedToken =

crypto

.createHash("sha256")

.update(token)

.digest("hex");



const user =

await User.findOne({

resetPasswordToken:hashedToken,

resetPasswordExpires:{
$gt:Date.now()
}

});



if(!user){

return res.status(400).json({

message:"Invalid or expired token"

});

}



user.password =
await bcrypt.hash(password,12);



user.resetPasswordToken=undefined;

user.resetPasswordExpires=undefined;


await user.save();



res.json({

message:"Password updated"

});


}

catch(error){

res.status(500).json({

message:error.message

});

}

}