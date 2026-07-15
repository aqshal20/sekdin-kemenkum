const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4
});

transporter.verify(function(error, success) {
  if (error) {
    console.error("SMTP Error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});
