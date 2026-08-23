import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { BookOpen, User, Lock, Mail, ChevronRight, AlertCircle, ShoppingBag, Store } from "lucide-react";

const LoginRegister = () => {
    const navigate = useNavigate();
    const { login, register } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("buyer"); // buyer or seller

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                if (!email || !password) throw new Error("Please fill in all fields");
                await login(email, password);
                alert("Logged in successfully!");
            } else {
                if (!name || !email || !password) throw new Error("Please fill in all fields");
                await register(name, email, password, role);
                alert("Account created successfully!");
            }
            navigate("/"); // redirect to home
        } catch (err) {
            console.error("Auth error:", err);
            setError(err.message || "An authentication error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow halftone-bg py-16 px-4 flex justify-center items-center">
            <div className="w-full max-w-md bg-slate-900 border-4 border-black rounded-sm shadow-[8px_8px_0px_#000000] overflow-hidden">
                
                {/* Comic style header */}
                <div className="bg-[#a855f7] border-b-4 border-black p-6 text-center text-white relative">
                    <div className="absolute top-2 left-2 w-3 h-3 bg-black rounded-full"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 bg-black rounded-full"></div>
                    <BookOpen className="w-10 h-10 text-yellow-400 mx-auto mb-2 drop-shadow-[2px_2px_0px_#000]" />
                    <h2 className="comic-title text-2xl font-black">
                        {isLogin ? "JOIN THE CRUSADE!" : "RECRUIT NEW HERO!"}
                    </h2>
                    <p className="text-xs uppercase font-extrabold tracking-wider mt-1 text-purple-100">
                        {isLogin ? "Log in to your account to buy or sell" : "Create a profile to begin your collection"}
                    </p>
                </div>

                {/* Forms tab toggle */}
                <div className="flex border-b-4 border-black text-center bg-slate-950 font-black text-xs uppercase tracking-widest">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); }}
                        className={`w-1/2 py-3 border-r-2 border-black transition-colors cursor-pointer ${
                            isLogin ? "bg-slate-900 text-yellow-400 font-extrabold" : "bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); }}
                        className={`w-1/2 py-3 transition-colors cursor-pointer ${
                            !isLogin ? "bg-slate-900 text-yellow-400 font-extrabold" : "bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                    >
                        Register
                    </button>
                </div>

                {/* Form area */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-950/50 border-2 border-red-500 text-red-200 text-xs font-bold p-3 mb-4 rounded-sm flex items-start gap-2 text-left leading-normal">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        {/* Name Field (Register only) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Name / Alias
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Stan Lee"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-black p-2.5 pl-10 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                        required
                                    />
                                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="hero@comicverse.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 pl-10 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    required
                                />
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 pl-10 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    required
                                />
                                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        {/* Role selector (Register only) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2">
                                    Select your Role
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Buyer card option */}
                                    <label className={`border-2 border-black p-3 rounded-sm flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                        role === "buyer" 
                                            ? "bg-cyan-950/40 border-cyan-400 text-cyan-300" 
                                            : "bg-slate-950 hover:bg-slate-800 text-slate-400"
                                    }`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="buyer"
                                            checked={role === "buyer"}
                                            onChange={() => setRole("buyer")}
                                            className="sr-only"
                                        />
                                        <ShoppingBag className="w-6 h-6 mb-1.5" />
                                        <span className="font-extrabold uppercase text-xs">Buyer</span>
                                        <span className="text-[10px] opacity-70 mt-0.5">Collect comics</span>
                                    </label>

                                    {/* Seller card option */}
                                    <label className={`border-2 border-black p-3 rounded-sm flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                        role === "seller" 
                                            ? "bg-purple-950/40 border-purple-400 text-purple-300" 
                                            : "bg-slate-950 hover:bg-slate-800 text-slate-400"
                                    }`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="seller"
                                            checked={role === "seller"}
                                            onChange={() => setRole("seller")}
                                            className="sr-only"
                                        />
                                        <Store className="w-6 h-6 mb-1.5" />
                                        <span className="font-extrabold uppercase text-xs">Seller</span>
                                        <span className="text-[10px] opacity-70 mt-0.5">Sell listings</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full comic-btn-yellow py-3 flex items-center justify-center gap-1 w-full text-center rounded-sm font-black text-sm uppercase cursor-pointer"
                            >
                                <span>{loading ? "AUTHENTICATING..." : isLogin ? "LOG IN NOW" : "CREATE MY PROFILE"}</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>

                    {/* Notice box */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
                        <p className="text-xs text-slate-500 font-medium">
                            {isLogin 
                                ? "Need an account? Toggle Register at the top to sign up." 
                                : "Already have a profile? Toggle Sign In to access it."
                            }
                        </p>
                        <p className="text-[11px] text-slate-500/80 font-bold mt-2 uppercase tracking-wide">
                            Sample accounts are ready! <br/> 
                            Email: <span className="text-yellow-500">buyer@comicverse.com</span> or <span className="text-cyan-400">seller@comicverse.com</span> <br/>
                            Password: <span className="text-slate-400">password123</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginRegister;
