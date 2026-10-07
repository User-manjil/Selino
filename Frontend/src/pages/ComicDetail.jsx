import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import { ArrowLeft, ShoppingCart, ShieldAlert, Edit, Trash2, Award, Mail, BookOpen } from "lucide-react";

const ComicDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user, API_URL } = useAuth();
    const { addToCart } = useCart();

    const [comic, setComic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const isOwner = user && user.role === "seller" && comic && comic.seller && (comic.seller._id === user.id || comic.seller === user.id || (comic.seller._id && comic.seller._id === user.id) || (typeof comic.seller === "string" && comic.seller === user.id));

    useEffect(() => {
        const fetchComicDetail = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/comics/${id}`);
                if (!response.ok) {
                    throw new Error("Comic book not found");
                }
                const data = await response.json();
                setComic(data);
            } catch (err) {
                console.error("Fetch comic details error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchComicDetail();
    }, [id]);

    const handleAddToCart = () => {
        if (!comic) return;
        addToCart(comic, quantity);
        alert(`Added ${quantity} copy/copies of "${comic.title}" to your cart!`);
    };

    const handleDeleteComic = async () => {
        if (!window.confirm("Are you sure you want to delete this comic listing?")) return;

        try {
            const response = await fetch(`${API_URL}/comics/${id}`, {
                method: "DELETE",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: "include"
            });

            if (response.ok) {
                alert("Listing deleted successfully!");
                navigate("/");
            } else {
                const data = await response.json();
                alert(data.message || "Failed to delete listing");
            }
        } catch (err) {
            console.error("Delete comic error:", err);
            alert("Error deleting listing. Please try again.");
        }
    };

    const getConditionDesc = (cond) => {
        switch (cond) {
            case "Mint": return "Perfect condition; brand new with zero defects. Extremely rare!";
            case "Near Mint": return "Almost perfect with only miniscule, near-invisible wear.";
            case "Very Fine": return "Sharp, bright and clean with minor surface level wear.";
            case "Fine": return "Above average condition, minor creases or light spine wear.";
            case "Very Good": return "Decent, read-through condition; minor cover creases and page yellowing.";
            case "Good": return "A typical read copy. Showing standard spine wear and cover creases.";
            case "Fair": return "Heavily worn copy, possible small rips or marked pages.";
            case "Poor": return "Damaged or severely worn, but fully readable comic copy.";
            default: return "Condition standard grading.";
        }
    };

    const getConditionColor = (cond) => {
        switch (cond) {
            case "Mint": return "bg-green-400 text-black";
            case "Near Mint": return "bg-emerald-300 text-black";
            case "Very Fine": return "bg-teal-300 text-black";
            case "Fine": return "bg-cyan-300 text-black";
            case "Very Good": return "bg-yellow-300 text-black";
            case "Good": return "bg-amber-300 text-black";
            case "Fair": return "bg-orange-300 text-black";
            case "Poor": return "bg-red-300 text-black";
            default: return "bg-slate-300 text-black";
        }
    };

    if (loading) {
        return (
            <div className="flex-grow halftone-bg flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 font-black uppercase text-slate-400 tracking-wider">Loading Comic details...</p>
            </div>
        );
    }

    if (error || !comic) {
        return (
            <div className="flex-grow halftone-bg py-12 px-6 flex justify-center items-center">
                <div className="max-w-md w-full bg-slate-900 border-4 border-black p-8 text-center rounded-sm shadow-[4px_4px_0px_#000]">
                    <ShieldAlert className="w-14 h-14 text-red-500 mx-auto mb-3 animate-bounce" />
                    <h2 className="text-xl font-black uppercase text-red-500 mb-2">Comic book not found</h2>
                    <p className="text-slate-400 text-sm mb-6">{error || "The comic you are looking for does not exist or has been removed."}</p>
                    <Link to="/" className="comic-btn-yellow text-xs rounded-sm inline-flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow halftone-bg py-8 px-4 md:px-12">
            {/* Back button */}
            <div className="mb-6 text-left">
                <Link to="/" className="inline-flex items-center gap-1.5 font-extrabold uppercase text-xs tracking-wider hover:text-yellow-400 transition-colors">
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Back to Marketplace</span>
                </Link>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start bg-slate-900 border-4 border-black p-6 md:p-8 rounded-sm shadow-[6px_6px_0px_#000000]">
                
                {/* Left: Cover Image */}
                <div className="lg:col-span-5 w-full max-w-md mx-auto aspect-[3/4] bg-slate-950 comic-border rounded-sm overflow-hidden">
                    <img
                        src={comic.imageUrl}
                        alt={comic.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop";
                        }}
                    />
                </div>

                {/* Right: Technical specifications and options */}
                <div className="lg:col-span-7 text-left flex flex-col justify-between h-full">
                    <div>
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="comic-badge bg-black text-[#fbbf24]">{comic.publisher}</span>
                            <span className="comic-badge bg-cyan-400 text-black">{comic.genre}</span>
                            <span className={`comic-badge ${getConditionColor(comic.condition)}`}>{comic.condition}</span>
                        </div>

                        {/* Title */}
                        <h1 className="comic-title text-3xl md:text-4xl lg:text-5xl leading-none mb-3">
                            {comic.title}
                        </h1>

                        <p className="text-lg font-bold text-slate-300 mb-6">
                            Created by: <span className="text-white font-extrabold">{comic.author}</span>
                        </p>

                        {/* Description block */}
                        <div className="mb-6 p-4 bg-slate-800/50 border-2 border-black rounded-sm">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-yellow-400" /> Comic Description
                            </h3>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                {comic.description || "No description provided for this comic book listing."}
                            </p>
                        </div>

                        {/* Condition assessment info */}
                        <div className="mb-6 p-4 bg-slate-800/30 border-2 border-black border-dashed rounded-sm flex items-start gap-3">
                            <Award className="w-6 h-6 text-yellow-400 shrink-0" />
                            <div>
                                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                                    Grade: {comic.condition} Assessment
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-semibold">
                                    {getConditionDesc(comic.condition)}
                                </p>
                            </div>
                        </div>

                        {/* Seller profile card */}
                        {comic.seller && (
                            <div className="mb-8 p-3.5 bg-slate-950 border border-slate-700/60 flex items-center gap-3 rounded-sm">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-yellow-400 border border-slate-600">
                                    {comic.seller.name ? comic.seller.name[0].toUpperCase() : "S"}
                                </div>
                                <div className="text-xs">
                                    <p className="text-slate-400">Listed by seller</p>
                                    <p className="text-slate-200 font-extrabold text-sm mt-0.5">{comic.seller.name || "Stan Lee"}</p>
                                    <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Mail className="w-3 h-3 text-cyan-400" />
                                        {comic.seller.email || "seller@comicverse.com"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Buy panel */}
                    <div className="pt-6 border-t border-slate-700/50">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            {/* Price */}
                            <div className="flex flex-col text-center sm:text-left self-stretch sm:self-auto">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Listed Price</span>
                                <span className="text-3xl md:text-4xl font-black text-yellow-400 mt-1 tracking-widest">
                                    Rs. {comic.price.toFixed(2)}
                                </span>
                            </div>

                            {/* Buy/Manage controls */}
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {isOwner ? (
                                    <div className="flex gap-2 w-full">
                                        <Link
                                            to={`/edit/${comic._id}`}
                                            className="comic-btn-cyan text-sm py-3 px-6 flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0 rounded-sm text-center"
                                        >
                                            <Edit className="w-4 h-4" />
                                            <span>Edit Listing</span>
                                        </Link>
                                        <button
                                            onClick={handleDeleteComic}
                                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold border-3 border-black box-shadow-[3px_3px_0px_#000] active:translate-y-0.5 px-4 py-3 rounded-sm cursor-pointer"
                                            title="Delete Listing"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    (!user || user.role === "buyer") && (
                                        <div className="flex items-center gap-3 w-full">
                                            {/* Quantity Picker */}
                                            {comic.stock > 0 && (
                                                <div className="flex items-center bg-slate-950 border-2 border-black rounded-sm overflow-hidden">
                                                    <button
                                                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                                        className="px-3.5 py-2 font-black text-slate-400 hover:bg-slate-800 hover:text-white"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="px-4 font-black text-sm text-white">{quantity}</span>
                                                    <button
                                                        onClick={() => setQuantity(prev => Math.min(comic.stock, prev + 1))}
                                                        className="px-3.5 py-2 font-black text-slate-400 hover:bg-slate-800 hover:text-white"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}

                                            {/* Add to Cart button */}
                                            <button
                                                onClick={handleAddToCart}
                                                disabled={comic.stock === 0}
                                                className={`flex-grow sm:flex-grow-0 text-sm font-black rounded-sm flex items-center justify-center gap-2 py-3 px-6 cursor-pointer ${
                                                    comic.stock === 0
                                                        ? "bg-slate-700 text-slate-500 border-3 border-slate-800 cursor-not-allowed"
                                                        : "comic-btn-yellow"
                                                }`}
                                            >
                                                <ShoppingCart className="w-5 h-5" />
                                                <span>{comic.stock === 0 ? "Sold Out" : "Add to Cart"}</span>
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Stock label */}
                        {!isOwner && (
                            <p className="text-xs text-slate-400 text-right mt-3 font-semibold">
                                {comic.stock === 0 ? (
                                    <span className="text-red-500 font-extrabold uppercase">Out of stock! This comic is unavailable.</span>
                                ) : comic.stock < 3 ? (
                                    <span className="text-amber-400 font-extrabold">Hurry! Only {comic.stock} copies left in stock.</span>
                                ) : (
                                    <span>{comic.stock} copies currently in stock.</span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComicDetail;
