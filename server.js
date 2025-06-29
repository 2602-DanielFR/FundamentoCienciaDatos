const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Configure your email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "<correo>", // <-- replace with your email
    pass: "<contraseña>", // <-- use an app password, not your main password
  },
});

app.post("/notify", async (req, res) => {
  const { name, emotion, value, timestamp } = req.body;
  console.log(
    `[ALERT] ${timestamp} - ${name}: ${emotion} (${(value * 100).toFixed(1)}%)`
  );

  // Send email
  try {
    await transporter.sendMail({
      from: '"Face Alert" <correo>', // sender address
      to: "<sender>", // list of receivers
      subject: `Emotion Alert: ${name}`,
      text: `At ${timestamp}, ${name} showed ${emotion} (${(
        value * 100
      ).toFixed(1)}%)`,
    });
    res.status(200).json({ message: "Alert received and email sent" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Alert received but email failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
