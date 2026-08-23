import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { BookOpen, DollarSign, ShoppingBag, TrendingUp, User, MapPin, ClipboardList, ShieldAlert, Edit, Trash2 } from "lucide-react";

const Dashboard = () => {
    const { user, token, API_URL } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("listings"); // listings or sales (seller specific)

    // Seller States
    const [myListings, setMyListings] = useState([]);
    const [salesData, setSalesData] = useState({ sales: [], stats: { totalEarnings: 0, totalItemsSold: 0, totalOrders: 0 } });
    const [sellerLoading, setSellerLoading] = useState(true);

    // Buyer States
    const [myOrders, setMyOrders] = useState([]);
    const [buyerLoading, setBuyerLoading] = useState(true);

    const [error, setError] = useState(null);

    // Redirect if guest
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    const fetchSellerData = async () => {
        if (!user || user.role !== "seller") return;
        setSellerLoading(true);
        setError(null);
        try {
            // 1. Fetch sales
            const salesResponse = await fetch(`${API_URL}/orders/seller`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!salesResponse.ok) throw new Error("Failed to load sales database");
            const sales = await salesResponse.json();
            setSalesData(sales);

            // 2. Fetch listings
            const listingsResponse = await fetch(`${API_URL}/comics?sellerId=${user.id || user._id}`);
            if (!listingsResponse.ok) throw new Error("Failed to load active listings");
            const listings = await listingsResponse.json();
            setMyListings(listings);
        } catch (err) {
            console.error("Seller dashboard error:", err);
            setError(err.message);
        } finally {
            setSellerLoading(false);
        }
    };

    const fetchBuyerData = async () => {
        if (!user || user.role !== "buyer") return;
        setBuyerLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/orders/buyer`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to load order history");
            const data = await response.json();
            setMyOrders(data);
        } catch (err) {
            console.error("Buyer dashboard error:", err);
            setError(err.message);
        } finally {
            setBuyerLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            if (user.role === "seller") {
                fetchSellerData();
            } else if (user.role === "buyer") {
                fetchBuyerData();
            }
        }
    }, [user]);

    const handleDeleteComic = async (comicId) => {
        if (!window.confirm("Are you sure you want to delete this comic listing?")) return;

        try {
            const response = await fetch(`${API_URL}/comics/${comicId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                setMyListings(prev => prev.filter(c => c._id !== comicId));
                // Update stats locally by refetching
                fetchSellerData();
                alert("Listing deleted successfully!");
            } else {
                const data = await response.json();
                alert(data.message || "Failed to delete listing");
            }
        } catch (err) {
            console.error("Delete comic error:", err);
            alert("Error deleting listing");
        }
    };

    if (!user) return null;

    return (
        <div className="flex-grow halftone-bg py-8 px-4 md:px-12 text-left">
            {/* Header profile info */}
            <div className="bg-[#1e293b] border-4 border-black p-6 mb-8 rounded-sm shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-yellow-400 text-black border-3 border-black font-black text-2xl flex items-center justify-center rounded-sm shadow-[2px_2px_0px_#000]">
                        {user.name[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase">{user.name}</h1>
                        <p className="text-xs text-slate-400 font-semibold">{user.email} &bull; Member since 2026</p>
                    </div>
                </div>
                <div className="flex flex-col items-start md:items-end">
                    <span className="comic-badge bg-black text-[#fbbf24]">{user.role} Account</span>
                    {user.role === "seller" && (
                        <Link to="/sell" className="comic-btn-cyan text-xs py-1.5 px-4 mt-2.5 rounded-sm inline-block">
                            List New Comic
                        </Link>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-950/50 border-2 border-red-500 text-red-200 text-sm font-bold p-4 mb-6 rounded-sm flex items-start gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span>Error: {error}</span>
                </div>
            )}

            {/* SELLER DASHBOARD VIEW */}
            {user.role === "seller" && (
                <div>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        {/* total earnings */}
                        <div className="bg-slate-900 border-4 border-black p-5 rounded-sm shadow-[3px_3px_0px_#000] flex items-center gap-4">
                            <div className="bg-green-500/20 p-3 border border-green-500/50 rounded-sm">
                                <DollarSign className="w-8 h-8 text-green-400" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">Total Revenue</span>
                                <span className="text-2xl font-black text-white">${salesData.stats.totalEarnings.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* items sold */}
                        <div className="bg-slate-900 border-4 border-black p-5 rounded-sm shadow-[3px_3px_0px_#000] flex items-center gap-4">
                            <div className="bg-cyan-500/20 p-3 border border-cyan-500/50 rounded-sm">
                                <ShoppingBag className="w-8 h-8 text-cyan-400" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">Comics Sold</span>
                                <span className="text-2xl font-black text-white">{salesData.stats.totalItemsSold} copies</span>
                            </div>
                        </div>

                        {/* sales transactions */}
                        <div className="bg-slate-900 border-4 border-black p-5 rounded-sm shadow-[3px_3px_0px_#000] flex items-center gap-4">
                            <div className="bg-purple-500/20 p-3 border border-purple-500/50 rounded-sm">
                                <TrendingUp className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block">Sales Invoices</span>
                                <span className="text-2xl font-black text-white">{salesData.stats.totalOrders} orders</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b-4 border-black font-black uppercase text-xs tracking-wider mb-6 bg-slate-950">
                        <button
                            onClick={() => setActiveTab("listings")}
                            className={`py-3.5 px-6 border-r-2 border-black cursor-pointer ${
                                activeTab === "listings" ? "bg-slate-900 text-yellow-400" : "text-slate-400 hover:text-white"
                            }`}
                        >
                            Active Listings ({myListings.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("sales")}
                            className={`py-3.5 px-6 cursor-pointer ${
                                activeTab === "sales" ? "bg-slate-900 text-yellow-400" : "text-slate-400 hover:text-white"
                            }`}
                        >
                            Sales History ({salesData.sales.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    {sellerLoading ? (
                        <div className="text-center py-10 font-bold uppercase text-slate-400 tracking-wider">
                            Retrieving statistics...
                        </div>
                    ) : activeTab === "listings" ? (
                        /* LISTINGS TAB */
                        myListings.length === 0 ? (
                            <div className="bg-slate-900 border-4 border-black p-8 text-center rounded-sm shadow-[4px_4px_0px_#000]">
                                <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <h3 className="text-lg font-black uppercase text-slate-400">No active listings</h3>
                                <p className="text-slate-500 text-xs mt-1">Get started by listing your first comic book for sale!</p>
                                <Link to="/sell" className="comic-btn-yellow text-xs mt-4 rounded-sm inline-block">
                                    List Comic
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-slate-900 border-4 border-black rounded-sm shadow-[4px_4px_0px_#000] overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-950 text-slate-400 text-xs font-black uppercase tracking-wider border-b-2 border-black">
                                        <tr>
                                            <th className="p-4 text-left">Comic Cover</th>
                                            <th className="p-4 text-left">Title & Author</th>
                                            <th className="p-4 text-left">Publisher/Genre</th>
                                            <th className="p-4 text-left">Grade</th>
                                            <th className="p-4 text-left">Price</th>
                                            <th className="p-4 text-left">Stock</th>
                                            <th className="p-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {myListings.map(c => (
                                            <tr key={c._id} className="hover:bg-slate-800/40">
                                                <td className="p-4">
                                                    <img
                                                        src={c.imageUrl}
                                                        alt={c.title}
                                                        className="w-10 h-14 object-cover border-2 border-black rounded-sm"
                                                    />
                                                </td>
                                                <td className="p-4 font-bold text-white">
                                                    <Link to={`/comics/${c._id}`} className="hover:underline">{c.title}</Link>
                                                    <span className="block text-xs font-medium text-slate-400 mt-0.5">By {c.author}</span>
                                                </td>
                                                <td className="p-4 text-xs">
                                                    <span className="font-extrabold uppercase text-slate-400 block">{c.publisher}</span>
                                                    <span className="text-cyan-400 font-semibold">{c.genre}</span>
                                                </td>
                                                <td className="p-4 text-xs font-black uppercase">
                                                    <span className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-sm text-yellow-400">{c.condition}</span>
                                                </td>
                                                <td className="p-4 font-black text-yellow-400">${c.price.toFixed(2)}</td>
                                                <td className="p-4">
                                                    {c.stock === 0 ? (
                                                        <span className="text-xs text-red-500 font-extrabold uppercase bg-red-950/20 px-1.5 py-0.5 rounded-sm border border-red-500/20">Sold Out</span>
                                                    ) : (
                                                        <span className="font-semibold text-white">{c.stock} pcs</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <Link to={`/edit/${c._id}`} className="comic-btn-cyan text-[11px] py-1 px-2.5 rounded-sm flex items-center gap-1">
                                                            <Edit className="w-3.5 h-3.5" /> Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteComic(c._id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] border border-black px-2.5 py-1 rounded-sm cursor-pointer flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        /* SALES HISTORIES TAB */
                        salesData.sales.length === 0 ? (
                            <div className="bg-slate-900 border-4 border-black p-8 text-center rounded-sm shadow-[4px_4px_0px_#000]">
                                <ClipboardList className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <h3 className="text-lg font-black uppercase text-slate-400">No sales history yet</h3>
                                <p className="text-slate-500 text-xs mt-1">When buyers purchase your listed comics, records will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {salesData.sales.map((order, idx) => (
                                    <div key={order.orderId || idx} className="bg-slate-900 border-4 border-black p-5 rounded-sm shadow-[4px_4px_0px_#000] flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-3 text-sm flex-grow">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="comic-badge bg-green-500 text-black">INVOICE PAID</span>
                                                <span className="text-xs text-slate-400 font-bold">Order ID: #{order.orderId}</span>
                                                <span className="text-xs text-slate-400 font-bold">&bull; {new Date(order.date).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {/* Items listed */}
                                            <div className="divide-y divide-slate-800">
                                                {order.items.map((item, itemIdx) => (
                                                    <div key={itemIdx} className="py-2 flex items-center gap-3">
                                                        <div className="w-8 h-11 bg-slate-950 border border-slate-700 shrink-0">
                                                            {item.comic && (
                                                                <img
                                                                    src={item.comic.imageUrl}
                                                                    alt={item.comic.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-extrabold text-white">{item.comic ? item.comic.title : "Deleted Comic"}</p>
                                                            <p className="text-xs text-slate-400">Qty: {item.quantity} &bull; Price: ${item.price.toFixed(2)} each</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Buyer / Shipping / Subtotal */}
                                        <div className="md:w-72 md:border-l border-slate-800 md:pl-6 text-xs flex flex-col justify-between shrink-0">
                                            <div>
                                                <h4 className="font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-yellow-400" /> Buyer Profile
                                                </h4>
                                                <p className="font-bold text-white">{order.buyer ? order.buyer.name : "Unknown Buyer"}</p>
                                                <p className="text-slate-400">{order.buyer ? order.buyer.email : "No contact details"}</p>

                                                <h4 className="font-black uppercase text-slate-400 tracking-wider mt-4 mb-1.5 flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Shipping Destination
                                                </h4>
                                                <p className="text-slate-300 font-medium leading-normal">
                                                    {order.shippingAddress.street}, <br/>
                                                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}, <br/>
                                                    {order.shippingAddress.country}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                                <span className="font-black uppercase text-slate-400">Seller Earnings:</span>
                                                <span className="text-lg font-black text-yellow-400">${order.subtotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* BUYER DASHBOARD VIEW */}
            {user.role === "buyer" && (
                <div>
                    <h2 className="text-xl font-black uppercase text-slate-300 tracking-wider mb-6 flex items-center gap-2">
                        <span className="w-2.5 h-6 bg-yellow-400 inline-block border border-black"></span>
                        Purchase Order History ({myOrders.length})
                    </h2>

                    {buyerLoading ? (
                        <div className="text-center py-10 font-bold uppercase text-slate-400 tracking-wider">
                            Retrieving orders...
                        </div>
                    ) : myOrders.length === 0 ? (
                        <div className="bg-slate-900 border-4 border-black p-8 text-center rounded-sm shadow-[4px_4px_0px_#000]">
                            <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                            <h3 className="text-lg font-black uppercase text-slate-400">No orders purchased yet</h3>
                            <p className="text-slate-500 text-xs mt-1">Browse our marketplace catalog and buy some awesome comic books!</p>
                            <Link to="/" className="comic-btn-yellow text-xs mt-4 rounded-sm inline-block">
                                Explore Marketplace
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {myOrders.map(order => (
                                <div key={order._id} className="bg-slate-900 border-4 border-black p-5 rounded-sm shadow-[4px_4px_0px_#000] flex flex-col md:flex-row justify-between gap-6">
                                    <div className="space-y-3 flex-grow text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="comic-badge bg-green-400 text-black">PAID & COMPLETED</span>
                                            <span className="text-xs text-slate-400 font-bold">Order ID: #{order._id}</span>
                                            <span className="text-xs text-slate-400 font-bold">&bull; {new Date(order.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        {/* Items */}
                                        <div className="divide-y divide-slate-800 mt-2">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="py-2 flex items-center gap-3">
                                                    <div className="w-9 h-12 bg-slate-950 border border-slate-700 shrink-0">
                                                        {item.comic && (
                                                            <img
                                                                src={item.comic.imageUrl}
                                                                alt={item.comic.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-white">{item.comic ? item.comic.title : "Unavailable Comic"}</p>
                                                        <p className="text-xs text-slate-400">Qty: {item.quantity} &bull; Price: ${item.price.toFixed(2)} each</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Shipping details and total */}
                                    <div className="md:w-64 md:border-l border-slate-800 md:pl-6 text-xs flex flex-col justify-between shrink-0">
                                        <div>
                                            <h4 className="font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Shipping Destination
                                            </h4>
                                            <p className="text-slate-300 font-medium leading-normal">
                                                {order.shippingAddress.street}, <br/>
                                                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}, <br/>
                                                {order.shippingAddress.country}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                            <span className="font-black uppercase text-slate-400">Total Charged:</span>
                                            <span className="text-xl font-black text-yellow-400">${order.totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
