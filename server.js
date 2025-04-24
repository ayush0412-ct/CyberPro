const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// MongoDB Schemas
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  password: String
}));

const Leaderboard = mongoose.model('Leaderboard', new mongoose.Schema({
  name: String,
  score: Number,
  time: Number,
  submittedAt: { type: Date, default: Date.now }
}));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).send("Email already registered!");
  }

  const newUser = new User({ name, email, password });
  await newUser.save();
  res.status(200).send("Account created! Please login.");
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });

  if (user) {
    res.status(200).send("Login successful!");
  } else {
    res.status(401).send("Invalid credentials");
  }
});

// 🎯 Save leaderboard + Send email
app.post("/submit-score", async (req, res) => {
  const { name, email, score, time } = req.body;

  const entry = new Leaderboard({ name, score, time });
  await entry.save();

  // Send email if email is provided
  if (email) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Cyber Crossword Game Results",
      text: `Hello ${name},\n\nThanks for playing!\nYour score: ${score}/6\nTime taken: ${time} seconds\n\n— Cyber Game Team`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Email sent to", email);
    } catch (err) {
      console.error("❌ Failed to send email:", err);
    }
  }

  res.status(200).send("Score submitted and email sent if provided.");
});

// Optional: Get leaderboard (if you want to show it on frontend later)
app.get("/leaderboard", async (req, res) => {
  const results = await Leaderboard.find().sort({ score: -1, time: 1 }).limit(10);
  res.json(results);
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
