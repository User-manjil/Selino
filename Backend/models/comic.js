const mongoose = require("mongoose");

const ComicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    publisher: {
        type: String,
        default: "Unknown",
        trim: true
    },
    genre: {
        type: String,
        default: "Superhero",
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    condition: {
        type: String,
        enum: ["Mint", "Near Mint", "Very Fine", "Fine", "Very Good", "Good", "Fair", "Poor"],
        default: "Fine"
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        default: 1,
        min: 0
    },
    imageUrl: {
        type: String,
        default: "https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop"
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("comic", ComicSchema);
