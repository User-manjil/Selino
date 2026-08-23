import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { CartProvider } from "./context/cartContext";
import Navbar from "./components/Navbar";
import Marketplace from "./pages/Marketplace";
import ComicDetail from "./pages/ComicDetail";
import LoginRegister from "./pages/LoginRegister";
import SellComic from "./pages/SellComic";
import Dashboard from "./pages/Dashboard";
import Cart from "./pages/Cart";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#0b0f19] text-gray-100 selection:bg-yellow-400 selection:text-black">
            {/* Navbar Navigation */}
            <Navbar />

            {/* Main Application Router Container */}
            <main className="flex-grow flex flex-col">
              <Routes>
                <Route path="/" element={<Marketplace />} />
                <Route path="/comics/:id" element={<ComicDetail />} />
                <Route path="/login" element={<LoginRegister />} />
                <Route path="/register" element={<LoginRegister />} />
                <Route path="/sell" element={<SellComic />} />
                <Route path="/edit/:id" element={<SellComic />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cart" element={<Cart />} />
              </Routes>
            </main>

            {/* Retro Comic styled Footer */}
            <footer className="bg-slate-950 border-t-4 border-black py-8 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-widest mt-auto">
              <p>&copy; 2026 ComicVerse. Built with MERN Stack & Tailwind CSS v4.</p>
              <p className="text-[10px] text-yellow-500 mt-2 hover:scale-105 transition-transform duration-100 inline-block cursor-default">
                POW! BANG! COLLECT THEM ALL!
              </p>
            </footer>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;