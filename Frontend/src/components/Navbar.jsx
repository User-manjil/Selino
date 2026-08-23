import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import { ShoppingCart, LogOut, PlusCircle, User, BookOpen, LayoutDashboard } from "lucide-react";

const Navbar = () => {
    const { user, logout } = useAuth();
    const { getCartCount } = useCart();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className="bg-[#0f172a] border-b-4 border-black py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
                <BookOpen className="w-8 h-8 text-yellow-400 stroke-[2.5]" />
                <span className="comic-title text-3xl tracking-wide group-hover:scale-105 transition-transform duration-100">
                    COMICVERSE
                </span>
            </Link>

            {/* Nav Items */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <Link to="/" className="font-extrabold hover:text-yellow-400 text-sm md:text-base uppercase tracking-wider transition-colors duration-100 flex items-center gap-1">
                    Marketplace
                </Link>

                {/* Seller: Add Comic */}
                {user && user.role === "seller" && (
                    <Link to="/sell" className="comic-btn-cyan text-xs py-1.5 px-3 flex items-center gap-1 rounded-sm">
                        <PlusCircle className="w-4 h-4" />
                        <span>List Comic</span>
                    </Link>
                )}

                {/* Cart link (Buyers or guests) */}
                {(!user || user.role === "buyer") && (
                    <Link to="/cart" className="relative group p-2 flex items-center gap-1.5 hover:text-yellow-400 transition-colors">
                        <ShoppingCart className="w-6 h-6 stroke-[2]" />
                        <span className="hidden sm:inline font-extrabold uppercase text-sm tracking-wider">Cart</span>
                        {getCartCount() > 0 && (
                            <span className="absolute -top-1 -right-1 bg-yellow-400 text-black border-2 border-black font-black text-xs w-5 h-5 flex items-center justify-center rounded-full shadow-[1px_1px_0px_#000]">
                                {getCartCount()}
                            </span>
                        )}
                    </Link>
                )}

                {user ? (
                    <div className="flex items-center gap-3 border-l-2 border-slate-700 pl-4 md:pl-6">
                        {/* Profile/Dashboard link */}
                        <Link to="/dashboard" className="flex items-center gap-1.5 group">
                            <div className="bg-slate-800 p-1.5 rounded-full border border-slate-600 group-hover:border-yellow-400 transition-colors">
                                <User className="w-4 h-4 text-slate-300 group-hover:text-yellow-400" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-xs text-slate-400 leading-none">Hi, {user.name.split(" ")[0]}</span>
                                <span className="text-xs font-black uppercase text-yellow-400 flex items-center gap-0.5 tracking-wider mt-0.5">
                                    <LayoutDashboard className="w-3 h-3" />
                                    {user.role}
                                </span>
                            </div>
                        </Link>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-red-400 p-2 transition-colors duration-100"
                            title="Log Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 border-l-2 border-slate-700 pl-4">
                        <Link to="/login" className="comic-btn-yellow text-xs py-1.5 px-4 rounded-sm">
                            Log In
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
