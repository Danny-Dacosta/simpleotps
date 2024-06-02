const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function generateOtp(length = 6) {
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
}

app.post("/send-otp", async (req, res) => {
  const { email, filename } = req.body;
  const otp = generateOtp();

  const { data, error } = await supabase
    .from("otps")
    .insert([{ email, otp, created_at: new Date() }]);

  if (error) {
    return res.status(500).send("Failed to store OTP.");
  }

  const mailOptions = {
    from: "Secure Backup and Restore <dcubedacosta@gmail.com>",
    to: email,
    subject: `Email Authentication for file ${filename}`,
    text: `Your OTP for verification is ${otp}. It will expire in 5 minutes.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.status(500).send("Failed to send OTP.");
    } else {
      res.status(200).send("OTP sent successfully.");
    }
  });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const { data, error } = await supabase
    .from("otps")
    .select("*")
    .eq("email", email)
    .eq("otp", otp)
    .single();

  if (error || !data) {
    return res.status(400).send("Invalid OTP.");
  }

  const now = new Date();
  const otpCreationTime = new Date(data.created_at);
  const timeDifference = (now - otpCreationTime) / 1000;

  if (timeDifference > 300) {
    await supabase.from("otps").delete().eq("email", email).eq("otp", otp);

    return res.status(400).send("OTP expired.");
  } else {
    await supabase.from("otps").delete().eq("email", email).eq("otp", otp);

    return res.status(200).send("OTP verified successfully.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
