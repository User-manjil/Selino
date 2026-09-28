import React, { useState, useEffect } from "react";
import ComicCard from "../components/ComicCard";
import { useAuth } from "../context/authContext";
import { Search, SlidersHorizontal, BookOpen, AlertCircle } from "lucide-react";

const Marketplace = () => {
    const { token, API_URL } = useAuth();
    const [comics, setComics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters and search states
    const [search, setSearch] = useState("");
    const [genre, setGenre] = useState("");
    const [sort, setSort] = useState("newest");

    const genres = ["All", "Superhero", "Sci-Fi / Noir", "Fantasy", "Manga", "Mystery", "Action"];

    const fetchComics = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `${API_URL}/comics`;
            const params = [];
            if (search) params.push(`search=${encodeURIComponent(search)}`);
            if (genre && genre !== "All") params.push(`genre=${encodeURIComponent(genre)}`);
            
            if (params.length > 0) {
                url += `?${params.join("&")}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("Failed to load comic listings");
            }
            const data = await response.json();

            // Handle client sorting
            let sortedComics = [...data];
            if (sort === "price-asc") {
                sortedComics.sort((a, b) => a.price - b.price);
            } else if (sort === "price-desc") {
                sortedComics.sort((a, b) => b.price - a.price);
            } else {
                // newest (default sorted on backend by default anyway, but just in case)
                sortedComics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            setComics(sortedComics);
        } catch (err) {
            console.error("Fetch comics error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComics();
    }, [genre, sort]); // Fetch on filter or sort change

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchComics();
    };

    const handleDeleteComic = async (comicId) => {
        if (!window.confirm("Are you sure you want to delete this comic listing?")) return;

        try {
            const response = await fetch(`${API_URL}/comics/${comicId}`, {
                method: "DELETE",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: "include"
            });

            if (response.ok) {
                setComics(prev => prev.filter(c => c._id !== comicId));
                alert("Listing deleted successfully!");
            } else {
                const data = await response.json();
                alert(data.message || "Failed to delete listing");
            }
        } catch (err) {
            console.error("Delete comic error:", err);
            alert("Error deleting listing. Please try again.");
        }
    };

    return (
        <div className="flex-grow halftone-bg py-8 px-4 md:px-12">
            {/* Hero / Promo banner */}
            <div className="bg-[#f59e0b] text-black border-4 border-black p-6 md:p-10 mb-8 rounded-sm relative overflow-hidden shadow-[6px_6px_0px_#000000]">
                {/* Decorative dots/shapes for comic look */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-radial-dots pointer-events-none"></div>
                <div className="relative z-10 text-center md:text-left md:max-w-2xl">
                    <span className="comic-badge bg-black text-[#fbbf24] mb-3">SUPER DEAL</span>
                    <h1 className="comic-title text-4xl md:text-5xl lg:text-6xl font-black leading-none mb-3">
                        UNLEASH THE COMIC UNIVERSE!
                    </h1>
                    <p className="text-black font-extrabold uppercase text-sm md:text-base tracking-wide leading-relaxed">
                        Find rare classics, modern superhero stories, indie gems, and manga masterpieces. Collect them or list your own stash for sale!
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#1e293b] border-4 border-black p-4 mb-8 rounded-sm shadow-[4px_4px_0px_#000000]">
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    
                    {/* Search Field */}
                    <div className="relative w-full md:w-1/2 flex gap-2">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Search by title or creator..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-900 border-2 border-black p-2.5 pl-10 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-500 rounded-sm"
                            />
                            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        </div>
                        <button type="submit" className="comic-btn-yellow text-xs py-2.5 px-5 rounded-sm">
                            Search
                        </button>
                    </div>

                    {/* Sorting Field */}
                    <div className="w-full md:w-auto flex items-center gap-2 self-stretch md:self-auto justify-end">
                        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sort:</span>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="bg-slate-900 border-2 border-black p-2 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 rounded-sm cursor-pointer"
                        >
                            <option value="newest">Newest Listed</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </form>

                {/* Genre Filter Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Genres:</span>
                    {genres.map(g => (
                        <button
                            key={g}
                            onClick={() => setGenre(g === "All" ? "" : g)}
                            className={`font-black text-xs uppercase px-3 py-1.5 rounded-sm cursor-pointer border-2 border-black transition-all ${
                                (g === "All" && !genre) || genre === g
                                    ? "bg-cyan-400 text-black translate-y-0.5 shadow-sm"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comics Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 font-black uppercase text-slate-400 tracking-wider">Loading Comics...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900 border-4 border-black p-6 rounded-sm shadow-[4px_4px_0px_#000]">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
                    <h3 className="text-lg font-black uppercase text-red-500">Error Loading Marketplace</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-md">{error}</p>
                    <button onClick={fetchComics} className="comic-btn-yellow text-xs mt-4 rounded-sm">
                        Try Again
                    </button>
                </div>
            ) : comics.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900 border-4 border-black p-10 rounded-sm shadow-[4px_4px_0px_#000]">
                    <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-black uppercase text-slate-300">No Comics Found</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm text-center">
                        We couldn't find any comics fitting your query. Try clearing your filters or search terms!
                    </p>
                    {(search || genre) && (
                        <button
                            onClick={() => { setSearch(""); setGenre(""); }}
                            className="comic-btn-yellow text-xs mt-4 rounded-sm"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : (
                <div>
                    <h2 className="text-xl font-black uppercase text-left text-slate-300 tracking-wider mb-6 flex items-center gap-2">
                        <span className="w-2.5 h-6 bg-yellow-400 inline-block border border-black"></span>
                        Available Comics ({comics.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {comics.map(c => (
                            <ComicCard
                                key={c._id}
                                comic={c}
                                onDelete={handleDeleteComic}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
