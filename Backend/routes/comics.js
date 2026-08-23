const express = require("express");
const router = express.Router();
const Comic = require("../models/comic");
const { authMiddleware, isSeller } = require("../middleware/auth");

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

// POST /api/comics - Create a comic (Sellers only)
router.post("/", authMiddleware, isSeller, async (req, res) => {
    try {
        const { title, author, publisher, genre, description, condition, price, stock, imageUrl } = req.body;

        if (!title || !author || !price) {
            return res.status(400).json({ message: "Title, author, and price are required" });
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
            imageUrl: imageUrl || undefined,
            seller: req.user._id
        });

        res.status(201).json(newComic);
    } catch (err) {
        console.error("Error listing comic:", err);
        res.status(500).json({ message: "Server error while listing comic", error: err.message });
    }
});

// PUT /api/comics/:id - Update a comic (Seller owner only)
router.put("/:id", authMiddleware, isSeller, async (req, res) => {
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
        if (imageUrl) comic.imageUrl = imageUrl;

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

        await Comic.deleteOne({ _id: req.params.id });
        res.json({ message: "Comic listing deleted successfully" });
    } catch (err) {
        console.error("Error deleting comic:", err);
        res.status(500).json({ message: "Server error while deleting comic", error: err.message });
    }
});

module.exports = router;
