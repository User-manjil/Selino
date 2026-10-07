import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/cartContext";
import { useAuth } from "../context/authContext";
import { ShoppingCart, Trash2, ArrowLeft, WalletCards, ShieldAlert, CheckCircle, MapPin } from "lucide-react";

const Cart = () => {
    const navigate = useNavigate();
    const { user, token, API_URL } = useAuth();
    const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();

    const [loading, setLoading] = useState(false);

    // Shipping Form inputs
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    const [country, setCountry] = useState("United States");

    const [paymentMethod, setPaymentMethod] = useState("COD");

    const handleCheckout = async (e) => {
        e.preventDefault();

        // Guard: guest must login first
        if (!user) {
            alert("You must log in to complete your purchase!");
            navigate("/login");
            return;
        }

        // Guard: Sellers cannot purchase
        if (user.role === "seller") {
            alert("Sellers cannot buy items! Please register or log in with a Buyer account.");
            return;
        }

        if (!street || !city || !state || !zip) {
            alert("Please fill in all shipping details!");
            return;
        }

        setLoading(true);

        const orderData = {
            items: cart.map(item => ({
                comic: item.comic._id,
                quantity: item.quantity
            })),
            shippingAddress: {
                street,
                city,
                state,
                zip,
                country
            },
            paymentMethod
        };

        try {
            const response = await fetch(`${API_URL}/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: "include",
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to process order checkout");
            }

            clearCart();
            if (data.payment.gateway === "eSewa") {
                const form = document.createElement("form");
                form.method = "POST";
                form.action = data.payment.action;
                Object.entries(data.payment.fields).forEach(([name, value]) => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                });
                document.body.appendChild(form);
                form.submit();
                return;
            }
            alert("Order placed successfully! You can pay when your order is delivered.");
            navigate("/dashboard");
        } catch (err) {
            console.error("Checkout process error:", err);
            alert(err.message || "An error occurred during checkout. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="flex-grow halftone-bg py-16 px-6 flex justify-center items-center">
                <div className="max-w-md w-full bg-slate-900 border-4 border-black p-8 text-center rounded-sm shadow-[4px_4px_0px_#000]">
                    <ShoppingCart className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h2 className="text-xl font-black uppercase text-slate-300 mb-2">Your Shopping Cart is Empty</h2>
                    <p className="text-slate-500 text-xs mb-6">You haven't added any comic books to your cart yet. Explore our shelves and grab some issues!</p>
                    <Link to="/" className="comic-btn-yellow text-xs rounded-sm inline-flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Explore Comics
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow halftone-bg py-8 px-4 md:px-12 text-left">
            {/* Header info */}
            <h2 className="text-xl font-black uppercase text-slate-300 tracking-wider mb-6 flex items-center gap-2">
                <span className="w-2.5 h-6 bg-yellow-400 inline-block border border-black"></span>
                Shopping Cart Review ({cart.length} item{cart.length > 1 ? "s" : ""})
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Panel: Cart items lists (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                    {cart.map((item, idx) => (
                        <div key={item.comic._id || idx} className="bg-slate-900 border-4 border-black p-4 rounded-sm shadow-[3px_3px_0px_#000] flex gap-4 items-center relative">
                            {/* Comic cover thumbnail */}
                            <div className="w-16 sm:w-20 aspect-[3/4] bg-slate-950 border-2 border-black rounded-sm overflow-hidden shrink-0">
                                <img
                                    src={item.comic.imageUrl}
                                    alt={item.comic.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Details info */}
                            <div className="flex-grow min-w-0 pr-8">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                                    {item.comic.publisher} &bull; {item.comic.genre}
                                </span>
                                <h3 className="font-extrabold text-sm sm:text-base text-white truncate uppercase mt-0.5">
                                    {item.comic.title}
                                </h3>
                                <p className="text-xs text-slate-300 mt-0.5">By {item.comic.author}</p>
                                <span className="comic-badge bg-cyan-400 text-black text-[9px] py-0 px-1 mt-2.5">{item.comic.condition}</span>
                                
                                <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
                                    {/* Price counter */}
                                    <span className="font-black text-yellow-400 text-base">
                                        Rs. {item.comic.price.toFixed(2)} each
                                    </span>
                                    
                                    {/* Quantity picker */}
                                    <div className="flex items-center bg-slate-950 border border-black rounded-sm overflow-hidden scale-90 sm:scale-100">
                                        <button
                                            onClick={() => updateQuantity(item.comic._id, item.quantity - 1)}
                                            className="px-2.5 py-1 font-black text-slate-400 hover:bg-slate-800 hover:text-white"
                                        >
                                            -
                                        </button>
                                        <span className="px-3 font-black text-xs text-white">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.comic._id, item.quantity + 1)}
                                            className="px-2.5 py-1 font-black text-slate-400 hover:bg-slate-800 hover:text-white"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Delete/Trash absolute action */}
                            <button
                                onClick={() => removeFromCart(item.comic._id)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                                title="Remove item"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}

                    <div className="text-left">
                        <Link to="/" className="inline-flex items-center gap-1.5 font-bold uppercase text-xs text-slate-400 hover:text-yellow-400 transition-colors">
                            <ArrowLeft className="w-4 h-4 stroke-[2]" />
                            <span>Continue Shopping</span>
                        </Link>
                    </div>
                </div>

                {/* Right Panel: Checkout details & summaries (5 cols) */}
                <div className="lg:col-span-5 bg-slate-900 border-4 border-black p-5 rounded-sm shadow-[4px_4px_0px_#000] space-y-6">
                    <h3 className="comic-title text-xl font-black border-b-2 border-slate-800 pb-3">ORDER SUMMARY</h3>
                    
                    {/* Items invoice list */}
                    <div className="space-y-2 text-xs font-semibold">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-slate-300">
                                <span className="truncate pr-4">{item.comic.title} (x{item.quantity})</span>
                                <span className="font-bold text-white shrink-0">Rs. {(item.comic.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-sm font-black">
                            <span className="text-slate-400 uppercase">Est. Subtotal:</span>
                            <span className="text-yellow-400 text-lg">Rs. {getCartTotal().toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Authentication warning for checkout */}
                    {!user ? (
                        <div className="bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs p-4 rounded-sm leading-relaxed space-y-3">
                            <p className="font-bold flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-amber-500" /> Authentication Required
                            </p>
                            <p>You need to sign in to place an order. Click below to continue.</p>
                            <Link to="/login" className="comic-btn-yellow text-xs py-2 w-full text-center rounded-sm inline-block uppercase">
                                Log In to Checkout
                            </Link>
                        </div>
                    ) : user.role === "seller" ? (
                        <div className="bg-red-950/30 border border-red-500/30 text-red-400 text-xs p-4 rounded-sm flex items-start gap-2 leading-relaxed">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                            <p>
                                <strong>Notice:</strong> Your current logged-in role is <strong>Seller</strong>. Sellers are not authorized to purchase comics. Please register a Buyer account to checkout.
                            </p>
                        </div>
                    ) : (
                        /* Checkout Form (Buyers only) */
                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div className="border-t border-slate-800 pt-4">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1">
                                    <MapPin className="w-4 h-4 text-cyan-400" /> Shipping Details
                                </h4>

                                <div className="space-y-3">
                                    {/* Street */}
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Street Address *"
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            className="w-full bg-slate-950 border-2 border-black p-2 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* City */}
                                        <input
                                            type="text"
                                            placeholder="City *"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full bg-slate-950 border-2 border-black p-2 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                            required
                                        />
                                        {/* State */}
                                        <input
                                            type="text"
                                            placeholder="State *"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className="w-full bg-slate-950 border-2 border-black p-2 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Zip Code */}
                                        <input
                                            type="text"
                                            placeholder="ZIP Code *"
                                            value={zip}
                                            onChange={(e) => setZip(e.target.value)}
                                            className="w-full bg-slate-950 border-2 border-black p-2 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                            required
                                        />
                                        {/* Country */}
                                        <select
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            className="w-full bg-slate-950 border-2 border-black p-2 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 rounded-sm cursor-pointer"
                                        >
                                            <option value="Nepal">Nepal</option>
                                            <option value="United States">United States</option>
                                            <option value="Canada">Canada</option>
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Australia">Australia</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1">
                                    <WalletCards className="w-4 h-4 text-purple-400" /> Payment Method
                                </h4>

                                <div className="space-y-3">
                                    {[
                                        ["COD", "Cash on Delivery", "Pay when your comics arrive."],
                                        ["eSewa", "eSewa", "You will be redirected to eSewa to pay securely in NPR."]
                                    ].map(([value, label, description]) => (
                                        <label key={value} className={`flex items-start gap-3 border-2 p-3 cursor-pointer rounded-sm ${paymentMethod === value ? "border-yellow-400 bg-slate-800" : "border-black bg-slate-950"}`}>
                                            <input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 accent-yellow-400" />
                                            <span>
                                                <strong className="block text-xs text-white uppercase">{label}</strong>
                                                <span className="block text-[11px] text-slate-400 mt-1">{description}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Place order trigger */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full comic-btn-yellow py-3.5 flex items-center justify-center gap-1.5 rounded-sm font-black text-sm uppercase cursor-pointer"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>{loading ? "PROCESSING..." : "CONFIRM PURCHASE"}</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Cart;
