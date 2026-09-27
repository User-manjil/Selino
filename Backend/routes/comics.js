const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Comic = require("../models/comic");
const { authMiddleware, isSeller } = require("../middleware/auth");

// Configure multer storage for comic cover images
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `comic-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only .jpg, .jpeg, .png, .gif and .webp image files are allowed!"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/comics - Get all comics with optional filter/search
router.get("/", async (req, res) => {
    try {
        const { search, genre, condition, minPrice, maxPrice, sellerId } = req.query;
        let query = {};

        // Search by title or author
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { author: { $regex: search, $options: "i" } }
            ];
        }

        // Filter by genre
        if (genre) {
            query.genre = genre;
        }

        // Filter by condition
        if (condition) {
            query.condition = condition;
        }

        // Filter by seller ID
        if (sellerId) {
            query.seller = sellerId;
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const comics = await Comic.find(query).populate("seller", "name email").sort({ createdAt: -1 });
        res.json(comics);
    } catch (err) {
        console.error("Error fetching comics:", err);
        res.status(500).json({ message: "Server error while fetching comics", error: err.message });
    }
});

// GET /api/comics/:id - Get comic by ID
router.get("/:id", async (req, res) => {
    try {
        const comic = await Comic.findById(req.params.id).populate("seller", "name email");
        if (!comic) {
            return res.status(404).json({ message: "Comic not found" });
        }
        res.json(comic);
    } catch (err) {
        console.error("Error fetching comic detail:", err);
        res.status(500).json({ message: "Server error while fetching comic detail", error: err.message });
    }
});

// POST /api/comics - Create a comic (Sellers only) - supports file upload
router.post("/", authMiddleware, isSeller, upload.single("coverImage"), async (req, res) => {
    try {
        const { title, author, publisher, genre, description, condition, price, stock, imageUrl } = req.body;

        if (!title || !author || !price) {
            return res.status(400).json({ message: "Title, author, and price are required" });
        }

        // Determine the image URL: uploaded file takes priority, then provided URL, then default
        let finalImageUrl;
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`;
        } else if (imageUrl) {
            finalImageUrl = imageUrl;
        }

        const newComic = await Comic.create({
            title,
            author,
            publisher: publisher || "Unknown",
            genre: genre || "Superhero",
            description: description || "",
            condition: condition || "Fine",
            price: Number(price),
            stock: Number(stock) !== undefined ? Number(stock) : 1,
            imageUrl: finalImageUrl || undefined,
            seller: req.user._id
        });

        res.status(201).json(newComic);
    } catch (err) {
        console.error("Error listing comic:", err);
        res.status(500).json({ message: "Server error while listing comic", error: err.message });
    }
});

// PUT /api/comics/:id - Update a comic (Seller owner only) - supports file upload
router.put("/:id", authMiddleware, isSeller, upload.single("coverImage"), async (req, res) => {
    try {
        const comic = await Comic.findById(req.params.id);
        if (!comic) {
            return res.status(404).json({ message: "Comic not found" });
        }

        // Verify that current user is the seller of the comic
        if (comic.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized. You can only update your own listings." });
        }

        const { title, author, publisher, genre, description, condition, price, stock, imageUrl } = req.body;

        comic.title = title || comic.title;
        comic.author = author || comic.author;
        comic.publisher = publisher || comic.publisher;
        comic.genre = genre || comic.genre;
        comic.description = description !== undefined ? description : comic.description;
        comic.condition = condition || comic.condition;
        comic.price = price !== undefined ? Number(price) : comic.price;
        comic.stock = stock !== undefined ? Number(stock) : comic.stock;

        // Handle image update: uploaded file takes priority
        if (req.file) {
            // Delete old uploaded file if it was a local upload
            if (comic.imageUrl && comic.imageUrl.startsWith("/uploads/")) {
                const oldPath = path.join(__dirname, "..", comic.imageUrl);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            comic.imageUrl = `/uploads/${req.file.filename}`;
        } else if (imageUrl) {
            comic.imageUrl = imageUrl;
        }

        const updatedComic = await comic.save();
        res.json(updatedComic);
    } catch (err) {
        console.error("Error updating comic:", err);
        res.status(500).json({ message: "Server error while updating comic", error: err.message });
    }
});

// DELETE /api/comics/:id - Delete a comic (Seller owner only)
router.delete("/:id", authMiddleware, isSeller, async (req, res) => {
    try {
        const comic = await Comic.findById(req.params.id);
        if (!comic) {
            return res.status(404).json({ message: "Comic not found" });
        }

        // Verify that current user is the seller of the comic
        if (comic.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized. You can only delete your own listings." });
        }

        // Delete uploaded image file if it was a local upload
        if (comic.imageUrl && comic.imageUrl.startsWith("/uploads/")) {
            const filePath = path.join(__dirname, "..", comic.imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Comic.deleteOne({ _id: req.params.id });
        res.json({ message: "Comic listing deleted successfully" });
    } catch (err) {
        console.error("Error deleting comic:", err);
        res.status(500).json({ message: "Server error while deleting comic", error: err.message });
    }
});

module.exports = router;
