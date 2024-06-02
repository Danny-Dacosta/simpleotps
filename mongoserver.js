const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

mongoose.connect("mongodb://localhost:27017/otp_demo", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const Otp = mongoose.model("Otp", {
  email: String,
  otp: String,
  createdAt: { type: Date, expires: 300, default: Date.now },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function generateOtp(length = 6) {
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
}

app.post("/send-otp", async (req, res) => {
  const { email, filename } = req.body;
  const otp = generateOtp();

  const newOtp = new Otp({ email, otp });
  await newOtp.save();

  const mailOptions = {
    from: process.env.SMTP_USER,
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

  const existingOtp = await Otp.findOne({ email, otp }).exec();

  if (!existingOtp) {
    res.status(400).send("Invalid OTP.");
  } else {
    await Otp.deleteOne({ email, otp }).exec();
    res.status(200).send("OTP verified successfully.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
