const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { authMiddleware } = require("../middleware/auth");

const COOKIE_EXPIRES_DAYS = 30;
const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000 // 30 days in milliseconds
});

// Register a new user
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "buyer"
        });

        // Generate Token (30 days validity)
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET || "comicverse_jwt_secret_key_123!",
            { expiresIn: `${COOKIE_EXPIRES_DAYS}d` }
        );

        // Set HTTP-only cookie
        res.cookie("token", token, getCookieOptions());

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                id: newUser._id,
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Server error during registration", error: err.message });
    }
});

// Login user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide both email and password" });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate Token (30 days validity)
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "comicverse_jwt_secret_key_123!",
            { expiresIn: `${COOKIE_EXPIRES_DAYS}d` }
        );

        // Set HTTP-only cookie
        res.cookie("token", token, getCookieOptions());

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login", error: err.message });
    }
});

// Logout user
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax"
    });
    res.json({ message: "Logged out successfully" });
});

// Get profile
router.get("/profile", authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
});

module.exports = router;
