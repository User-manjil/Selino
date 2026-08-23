const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const Comic = require("../models/comic");
const { authMiddleware, isBuyer, isSeller } = require("../middleware/auth");

// POST /api/orders - Checkout/Create Order (Buyers only)
router.post("/", authMiddleware, isBuyer, async (req, res) => {
    try {
        const { items, shippingAddress } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items in the order" });
        }
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country) {
            return res.status(400).json({ message: "Please provide a complete shipping address" });
        }

        let calculatedTotal = 0;
        let orderItems = [];

        // Validate items and verify stock
        for (const item of items) {
            const comic = await Comic.findById(item.comic);
            if (!comic) {
                return res.status(404).json({ message: `Comic with ID ${item.comic} not found` });
            }

            if (comic.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for "${comic.title}". Only ${comic.stock} available.` });
            }

            calculatedTotal += comic.price * item.quantity;
            orderItems.push({
                comic: comic._id,
                quantity: item.quantity,
                price: comic.price
            });
        }

        // Create the order
        const newOrder = await Order.create({
            buyer: req.user._id,
            items: orderItems,
            totalAmount: calculatedTotal,
            shippingAddress,
            status: "Paid", // Default to paid immediately for mock checkout
            paymentMethod: "Credit Card"
        });

        // Deduct stock for each comic
        for (const item of orderItems) {
            await Comic.findByIdAndUpdate(item.comic, {
                $inc: { stock: -item.quantity }
            });
        }

        // Populate order info for response
        const populatedOrder = await Order.findById(newOrder._id)
            .populate("items.comic", "title author imageUrl");

        res.status(201).json(populatedOrder);
    } catch (err) {
        console.error("Error creating order:", err);
        res.status(500).json({ message: "Server error while processing checkout", error: err.message });
    }
});

// GET /api/orders/buyer - View buyer's order history (Buyers only)
router.get("/buyer", authMiddleware, isBuyer, async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user._id })
            .populate("items.comic", "title author imageUrl publisher")
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error("Error fetching buyer orders:", err);
        res.status(500).json({ message: "Server error while fetching order history", error: err.message });
    }
});

// GET /api/orders/seller - View orders containing seller's items (Sellers only)
router.get("/seller", authMiddleware, isSeller, async (req, res) => {
    try {
        // Find all comics listed by this seller
        const sellerComics = await Comic.find({ seller: req.user._id });
        const sellerComicIds = sellerComics.map(c => c._id.toString());

        // Find orders containing any of those comics
        const orders = await Order.find({ "items.comic": { $in: sellerComicIds } })
            .populate("buyer", "name email")
            .populate("items.comic", "title author price seller")
            .sort({ createdAt: -1 });

        // Format sales stats specifically for this seller
        // We only want to show the items that belong to this seller in the response statistics
        let salesList = [];
        let totalEarnings = 0;
        let totalItemsSold = 0;

        for (const order of orders) {
            // Filter items in the order that belong to this seller
            const sellerItems = order.items.filter(item => {
                return item.comic && item.comic.seller && item.comic.seller.toString() === req.user._id.toString();
            });

            if (sellerItems.length > 0) {
                const orderSubtotal = sellerItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
                totalEarnings += orderSubtotal;
                
                const itemsCount = sellerItems.reduce((acc, curr) => acc + curr.quantity, 0);
                totalItemsSold += itemsCount;

                salesList.push({
                    orderId: order._id,
                    buyer: order.buyer,
                    items: sellerItems,
                    subtotal: orderSubtotal,
                    status: order.status,
                    shippingAddress: order.shippingAddress,
                    date: order.createdAt
                });
            }
        }

        res.json({
            sales: salesList,
            stats: {
                totalEarnings,
                totalItemsSold,
                totalOrders: salesList.length
            }
        });
    } catch (err) {
        console.error("Error fetching seller sales:", err);
        res.status(500).json({ message: "Server error while fetching sales records", error: err.message });
    }
});

module.exports = router;
