const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    items: [
        {
            comic: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "comic",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
        default: "Pending"
    },
    trackingHistory: [
        {
            status: {
                type: String,
                required: true
            },
            note: {
                type: String,
                default: ""
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true }
    },
    paymentMethod: {
        type: String,
        enum: ["COD", "Khalti", "eSewa"],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("order", OrderSchema);
