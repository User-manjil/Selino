const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Order = require("../models/order");
const Comic = require("../models/comic");
const { authMiddleware, isBuyer, isSeller } = require("../middleware/auth");

// POST /api/orders - Checkout/Create Order (Buyers only)
router.post("/", authMiddleware, isBuyer, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;
        const supportedPaymentMethods = ["COD", "Khalti", "eSewa"];

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items in the order" });
        }
        if (!supportedPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: "Please select COD, Khalti, or eSewa" });
        }
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country) {
            return res.status(400).json({ message: "Please provide a complete shipping address" });
        }
        if (paymentMethod === "Khalti" && !process.env.KHALTI_SECRET_KEY) {
            return res.status(503).json({ message: "Khalti is not configured. Add KHALTI_SECRET_KEY to the backend environment." });
        }
        if (paymentMethod === "eSewa" && !process.env.ESEWA_SECRET_KEY) {
            return res.status(503).json({ message: "eSewa is not configured. Add ESEWA_SECRET_KEY to the backend environment." });
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

        // Create the order with initial tracking entry
        const newOrder = await Order.create({
            buyer: req.user._id,
            items: orderItems,
            totalAmount: calculatedTotal,
            shippingAddress,
            status: "Pending",
            paymentMethod,
            trackingHistory: [
                {
                    status: "Pending",
                    note: "Order placed successfully. Awaiting confirmation from seller.",
                    timestamp: new Date()
                }
            ]
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

        if (paymentMethod === "COD") {
            return res.status(201).json({ order: populatedOrder, payment: { gateway: "COD" } });
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const callbackUrl = `${frontendUrl}/dashboard?payment=${paymentMethod.toLowerCase()}&order=${newOrder._id}`;

        if (paymentMethod === "Khalti") {
            const khaltiResponse = await fetch("https://a.khalti.com/api/v2/epayment/initiate/", {
                method: "POST",
                headers: {
                    "Authorization": `Key ${process.env.KHALTI_SECRET_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    return_url: callbackUrl,
                    website_url: frontendUrl,
                    amount: Math.round(calculatedTotal * 100),
                    purchase_order_id: newOrder._id.toString(),
                    purchase_order_name: `Selino order ${newOrder._id}`
                })
            });
            const khaltiData = await khaltiResponse.json();
            if (!khaltiResponse.ok || !khaltiData.payment_url) {
                return res.status(502).json({ message: khaltiData.detail || "Unable to start Khalti payment" });
            }

            return res.status(201).json({
                order: populatedOrder,
                payment: { gateway: "Khalti", redirectUrl: khaltiData.payment_url }
            });
        }

        const transactionUuid = `${newOrder._id}-${Date.now()}`;
        const productCode = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
        const totalAmount = calculatedTotal.toFixed(2);
        const signature = crypto
            .createHmac("sha256", process.env.ESEWA_SECRET_KEY)
            .update(`total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`)
            .digest("base64");

        return res.status(201).json({
            order: populatedOrder,
            payment: {
                gateway: "eSewa",
                action: process.env.ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
                fields: {
                    amount: totalAmount,
                    tax_amount: "0",
                    total_amount: totalAmount,
                    transaction_uuid: transactionUuid,
                    product_code: productCode,
                    product_service_charge: "0",
                    product_delivery_charge: "0",
                    success_url: callbackUrl,
                    failure_url: `${frontendUrl}/cart?payment=failed`,
                    signed_field_names: "total_amount,transaction_uuid,product_code",
                    signature
                }
            }
        });
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

// GET /api/orders/track/:id - Public order tracking by order ID (buyer must be logged in)
router.get("/track/:id", authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("items.comic", "title author imageUrl publisher")
            .populate("buyer", "name email");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only the buyer who owns this order or a seller whose comics are in the order can view
        const isBuyerOwner = order.buyer._id.toString() === req.user._id.toString();
        let isSellerInvolved = false;

        if (req.user.role === "seller") {
            const sellerComics = await Comic.find({ seller: req.user._id });
            const sellerComicIds = sellerComics.map(c => c._id.toString());
            isSellerInvolved = order.items.some(item =>
                item.comic && sellerComicIds.includes(item.comic._id.toString())
            );
        }

        if (!isBuyerOwner && !isSellerInvolved) {
            return res.status(403).json({ message: "You are not authorized to view this order" });
        }

        res.json(order);
    } catch (err) {
        console.error("Error fetching order tracking:", err);
        res.status(500).json({ message: "Server error while fetching order tracking", error: err.message });
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
            .populate("items.comic", "title author price seller imageUrl")
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
                    trackingHistory: order.trackingHistory,
                    shippingAddress: order.shippingAddress,
                    paymentMethod: order.paymentMethod,
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

// PUT /api/orders/:id/status - Update order status (Sellers only - admin seller)
router.put("/:id/status", authMiddleware, isSeller, async (req, res) => {
    try {
        const { status, note } = req.body;
        const validStatuses = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Verify this seller has comics in this order
        const sellerComics = await Comic.find({ seller: req.user._id });
        const sellerComicIds = sellerComics.map(c => c._id.toString());

        const populatedOrder = await Order.findById(req.params.id).populate("items.comic", "seller");
        const hasSellerItems = populatedOrder.items.some(item =>
            item.comic && item.comic.seller && sellerComicIds.includes(item.comic.seller.toString())
        );

        if (!hasSellerItems) {
            return res.status(403).json({ message: "You can only update orders containing your comics" });
        }

        // Update status and add to tracking history
        order.status = status;
        order.trackingHistory.push({
            status,
            note: note || `Order status updated to ${status}`,
            timestamp: new Date()
        });

        await order.save();

        // Return updated order with populated data
        const updatedOrder = await Order.findById(order._id)
            .populate("buyer", "name email")
            .populate("items.comic", "title author imageUrl price seller");

        res.json(updatedOrder);
    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ message: "Server error while updating order status", error: err.message });
    }
});

module.exports = router;
