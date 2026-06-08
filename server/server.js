import { setServers } from "dns";
setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import { runAgent } from "./agent/agentRunner.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// ======================================================
// USER MODEL
// ======================================================

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6, select: false }, // optional for Google users
    googleId: { type: String, default: null },
    avatar:   { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

const User = mongoose.model("User", userSchema);

// ======================================================
// HISTORY MODEL
// ======================================================

const historySchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    task:    { type: String, required: true },
    summary: { type: String, required: true },
    steps:   [{ site: String, url: String, title: String, status: String }],
  },
  { timestamps: true }
);

const History = mongoose.model("History", historySchema);

// ======================================================
// HELPERS
// ======================================================

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const userPayload = (u) => ({
  _id:      u._id,
  name:     u.name,
  email:    u.email,
  avatar:   u.avatar || null,
  googleId: u.googleId || null,
  createdAt: u.createdAt,
});

// ======================================================
// AUTH MIDDLEWARE
// ======================================================

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found" });
    next();
  } catch {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};

// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => res.json({ status: "ok" }));

// ======================================================
// AUTH ROUTES
// ======================================================

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Please fill in all fields" });

  try {
    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password });
    res.status(201).json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (err) {
    console.error("[REGISTER ERROR]", err.message);
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    if (err.code === 11000)
      return res.status(409).json({ message: "Email already registered" });
    res.status(500).json({ message: err.message || "Server error during registration" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Please provide email and password" });

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password)
      return res.status(401).json({ message: "This account uses Google sign-in. Please use Google to log in." });
    if (!(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (err) {
    console.error("[LOGIN ERROR]", err.message);
    res.status(500).json({ message: err.message || "Server error during login" });
  }
});

// POST /api/auth/google
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential)
    return res.status(400).json({ message: "Google credential required" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      // Brand new user — create via Google
      user = await User.create({ name, email, googleId, avatar: picture });
    } else if (!user.googleId) {
      // Existing email/password account — link Google to it
      user.googleId = googleId;
      user.avatar   = picture;
      await user.save();
    }

    res.json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (err) {
    console.error("[GOOGLE AUTH ERROR]", err.message);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", protect, (req, res) => {
  res.json({ user: userPayload(req.user) });
});

// ======================================================
// HISTORY ROUTES
// ======================================================

app.get("/api/history", protect, async (req, res) => {
  try {
    const history = await History.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("task summary steps createdAt");
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

app.delete("/api/history/:id", protect, async (req, res) => {
  try {
    const item = await History.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ message: "Not found" });
    await item.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
});

app.delete("/api/history", protect, async (req, res) => {
  try {
    await History.deleteMany({ userId: req.user._id });
    res.json({ message: "History cleared" });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear history" });
  }
});

// ======================================================
// AGENT (protected)
// ======================================================

app.post("/api/agent", protect, async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) return res.status(400).json({ error: "Task required" });

    console.log(`\n[NEW TASK] user=${req.user.email} | task=${task}`);
    const result = await runAgent(task);

    await History.create({
      userId:  req.user._id,
      task,
      summary: result.summary || "",
      steps:   result.steps   || [],
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// START
// ======================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running at http://localhost:${PORT}`);
      console.log(`📡 Auth:    POST   http://localhost:${PORT}/api/auth/register`);
      console.log(`📡 Auth:    POST   http://localhost:${PORT}/api/auth/login`);
      console.log(`📡 Auth:    POST   http://localhost:${PORT}/api/auth/google`);
      console.log(`📡 Agent:   POST   http://localhost:${PORT}/api/agent`);
      console.log(`📡 History: GET    http://localhost:${PORT}/api/history`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });