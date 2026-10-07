const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
    try {
        let token = null;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Authentication token missing or invalid" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "comicverse_jwt_secret_key_123!");
        
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        return res.status(401).json({ message: "Authentication failed. Token is invalid or expired." });
    }
};

const isSeller = (req, res, next) => {
    if (req.user && req.user.role === "seller") {
        next();
    } else {
        return res.status(403).json({ message: "Access denied. Seller role required." });
    }
};

const isBuyer = (req, res, next) => {
    if (req.user && req.user.role === "buyer") {
        next();
    } else {
        return res.status(403).json({ message: "Access denied. Buyer role required." });
    }
};

module.exports = { authMiddleware, isSeller, isBuyer };