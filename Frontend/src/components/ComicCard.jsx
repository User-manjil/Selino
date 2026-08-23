import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/cartContext";
import { useAuth } from "../context/authContext";
import { ShoppingCart, Edit, Trash2 } from "lucide-react";

const ComicCard = ({ comic, onDelete }) => {
    const { addToCart } = useCart();
    const { user } = useAuth();

    const isOwner = user && user.role === "seller" && comic.seller && (comic.seller._id === user.id || comic.seller === user.id);

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

    return (
        <div className="bg-[#1e293b] comic-border flex flex-col h-full rounded-sm overflow-hidden text-left">
            {/* Image Container */}
            <div className="relative aspect-[3/4] overflow-hidden bg-slate-900 border-b-3 border-black">
                <img
                    src={comic.imageUrl}
                    alt={comic.title}
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop";
                    }}
                />
                
                {/* Badges */}
                <div className="absolute top-2 left-2">
                    <span className="comic-badge bg-cyan-400 text-black">
                        {comic.genre}
                    </span>
                </div>
                <div className="absolute top-2 right-2">
                    <span className={`comic-badge ${getConditionColor(comic.condition)}`}>
                        {comic.condition}
                    </span>
                </div>
            </div>

            {/* Content info */}
            <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        {comic.publisher}
                    </span>
                    <Link to={`/comics/${comic._id}`} className="hover:text-yellow-400 transition-colors">
                        <h3 className="text-lg font-black uppercase leading-tight line-clamp-2 text-white">
                            {comic.title}
                        </h3>
                    </Link>
                    <p className="text-sm text-slate-300 font-semibold mt-1">
                        By {comic.author}
                    </p>
                    
                    {comic.seller && (
                        <p className="text-xs text-slate-400 mt-2">
                            Seller: <span className="text-slate-300 font-bold">{comic.seller.name || "Stan Lee"}</span>
                        </p>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-2xl font-black text-yellow-400 tracking-wider">
                            ${comic.price.toFixed(2)}
                        </span>
                        
                        {/* Stock status */}
                        {comic.stock === 0 ? (
                            <span className="text-xs text-red-500 font-extrabold uppercase border-2 border-red-500/30 px-1.5 py-0.5 rounded-sm">
                                Sold Out
                            </span>
                        ) : comic.stock < 3 ? (
                            <span className="text-xs text-amber-400 font-extrabold uppercase bg-amber-950/50 px-1.5 py-0.5 rounded-sm">
                                Only {comic.stock} left!
                            </span>
                        ) : (
                            <span className="text-xs text-slate-400 font-bold">
                                Stock: {comic.stock}
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    {isOwner ? (
                        <div className="flex gap-2 w-full mt-2">
                            <Link
                                to={`/edit/${comic._id}`}
                                className="comic-btn-cyan text-xs py-2 px-3 flex items-center justify-center gap-1 flex-1 text-center rounded-sm"
                            >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                            </Link>
                            <button
                                onClick={() => onDelete(comic._id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold border-2 border-black box-shadow-[2px_2px_0px_#000] active:translate-y-0.5 px-3 py-1 text-xs flex items-center justify-center rounded-sm cursor-pointer"
                                title="Delete Listing"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        (!user || user.role === "buyer") && (
                            <button
                                onClick={() => addToCart(comic, 1)}
                                disabled={comic.stock === 0}
                                className={`w-full text-xs font-black rounded-sm flex items-center justify-center gap-1.5 ${
                                    comic.stock === 0
                                        ? "bg-slate-700 text-slate-500 border-2 border-slate-800 cursor-not-allowed py-2"
                                        : "comic-btn-yellow py-2"
                                }`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                <span>{comic.stock === 0 ? "Out of Stock" : "Add to Cart"}</span>
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComicCard;
