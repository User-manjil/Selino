import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { ArrowLeft, BookOpen, PlusCircle, Save, HelpCircle, Image } from "lucide-react";

const SellComic = () => {
    const { id } = useParams(); // present if editing
    const isEditMode = !!id;
    const navigate = useNavigate();
    const { token, user, API_URL } = useAuth();

    // Check if seller
    useEffect(() => {
        if (user && user.role !== "seller") {
            alert("Only Sellers can list or edit comic books!");
            navigate("/");
        }
    }, [user, navigate]);

    // Predefined covers list to make form easy to fill
    const presetCovers = [
        { name: "Spider-Man Cover", url: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=600&auto=format&fit=crop" },
        { name: "Superman Cover", url: "https://images.unsplash.com/photo-1608889174637-3c44f6326f2a?q=80&w=600&auto=format&fit=crop" },
        { name: "Batman Cover", url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop" },
        { name: "Dark Sci-Fi Cover", url: "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?q=80&w=600&auto=format&fit=crop" },
        { name: "Fantasy Book Cover", url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop" },
        { name: "General Comic Books Pile", url: "https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop" }
    ];

    // Form states
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [publisher, setPublisher] = useState("Marvel Comics");
    const [genre, setGenre] = useState("Superhero");
    const [condition, setCondition] = useState("Fine");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("1");
    const [imageUrl, setImageUrl] = useState(presetCovers[5].url);
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Fetch comic details if edit mode
    useEffect(() => {
        if (!isEditMode) return;

        const fetchComic = async () => {
            setFetching(true);
            try {
                const response = await fetch(`${API_URL}/comics/${id}`);
                if (!response.ok) throw new Error("Could not fetch comic listing detail");
                
                const data = await response.json();
                
                // Confirm owner
                if (data.seller && data.seller._id !== user.id && data.seller !== user.id) {
                    alert("Unauthorized! You cannot edit this listing.");
                    navigate("/");
                    return;
                }

                setTitle(data.title);
                setAuthor(data.author);
                setPublisher(data.publisher);
                setGenre(data.genre);
                setCondition(data.condition);
                setPrice(data.price.toString());
                setStock(data.stock.toString());
                setImageUrl(data.imageUrl);
                setDescription(data.description);
            } catch (err) {
                console.error("Fetch comic to edit error:", err);
                alert(err.message || "Failed to load comic for editing");
                navigate("/");
            } finally {
                setFetching(false);
            }
        };

        fetchComic();
    }, [id, isEditMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title || !author || !price || !stock) {
            alert("Please fill in all required fields!");
            return;
        }

        if (Number(price) <= 0 || Number(stock) < 0) {
            alert("Price must be greater than 0 and stock cannot be negative.");
            return;
        }

        setLoading(true);

        const comicData = {
            title,
            author,
            publisher,
            genre,
            condition,
            price: Number(price),
            stock: Number(stock),
            imageUrl,
            description
        };

        try {
            const url = isEditMode ? `${API_URL}/comics/${id}` : `${API_URL}/comics`;
            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(comicData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to save comic listing");
            }

            alert(isEditMode ? "Comic listing updated successfully!" : "Comic listed successfully for sale!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Save comic error:", err);
            alert(err.message || "An error occurred while saving the listing.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex-grow halftone-bg flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 font-black uppercase text-slate-400 tracking-wider">Fetching listing info...</p>
            </div>
        );
    }

    return (
        <div className="flex-grow halftone-bg py-8 px-4 md:px-12">
            {/* Back link */}
            <div className="mb-6 text-left">
                <Link to={isEditMode ? `/comics/${id}` : "/dashboard"} className="inline-flex items-center gap-1.5 font-extrabold uppercase text-xs tracking-wider hover:text-yellow-400 transition-colors">
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Cancel & Go Back</span>
                </Link>
            </div>

            {/* Layout Box */}
            <div className="max-w-4xl mx-auto bg-slate-900 border-4 border-black p-6 md:p-8 rounded-sm shadow-[6px_6px_0px_#000000] text-left">
                <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-4">
                    <BookOpen className="w-8 h-8 text-yellow-400 stroke-[2.5]" />
                    <h2 className="comic-title text-2xl md:text-3xl font-black">
                        {isEditMode ? "EDIT COMIC LISTING" : "LIST COMIC FOR SALE"}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Left: Input fields (8 cols) */}
                    <div className="md:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Comic Title *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Secret Wars #1"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    required
                                />
                            </div>

                            {/* Author */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Writer / Artist *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Jim Shooter, Mike Zeck"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Publisher */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Publisher
                                </label>
                                <select
                                    value={publisher}
                                    onChange={(e) => setPublisher(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 rounded-sm cursor-pointer"
                                >
                                    <option value="Marvel Comics">Marvel Comics</option>
                                    <option value="DC Comics">DC Comics</option>
                                    <option value="Image Comics">Image Comics</option>
                                    <option value="Dark Horse">Dark Horse</option>
                                    <option value="IDW Publishing">IDW Publishing</option>
                                    <option value="Vertigo">Vertigo / DC</option>
                                    <option value="Other">Other / Indie</option>
                                </select>
                            </div>

                            {/* Genre */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Genre
                                </label>
                                <select
                                    value={genre}
                                    onChange={(e) => setGenre(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 rounded-sm cursor-pointer"
                                >
                                    <option value="Superhero">Superhero</option>
                                    <option value="Sci-Fi / Noir">Sci-Fi / Noir</option>
                                    <option value="Fantasy">Fantasy</option>
                                    <option value="Manga">Manga</option>
                                    <option value="Mystery">Mystery</option>
                                    <option value="Action">Action</option>
                                    <option value="Horror">Horror</option>
                                </select>
                            </div>

                            {/* Condition */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1 flex items-center gap-1">
                                    Grade Condition
                                </label>
                                <select
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 rounded-sm cursor-pointer"
                                >
                                    <option value="Mint">Mint (10.0 - 9.9)</option>
                                    <option value="Near Mint">Near Mint (9.8 - 9.0)</option>
                                    <option value="Very Fine">Very Fine (8.5 - 7.0)</option>
                                    <option value="Fine">Fine (6.5 - 5.5)</option>
                                    <option value="Very Good">Very Good (5.0 - 3.5)</option>
                                    <option value="Good">Good (3.0 - 1.8)</option>
                                    <option value="Fair">Fair (1.5 - 1.0)</option>
                                    <option value="Poor">Poor (0.5)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Price */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Listing Price ($ USD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="29.99"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    required
                                />
                            </div>

                            {/* Stock */}
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                    Inventory / Stock Count *
                                </label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Image Cover URL */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                Cover Image URL
                            </label>
                            <input
                                type="url"
                                placeholder="Paste external image address..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-300 tracking-wider mb-1">
                                Comic Description / Issues Notes
                            </label>
                            <textarea
                                placeholder="Details about storage condition, key issues inside, page coloring, grading certifications (like CGC) if applicable..."
                                rows="4"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Right: Presets & Cover Mockup (4 cols) */}
                    <div className="md:col-span-4 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1">
                                <Image className="w-4 h-4 text-cyan-400" /> Cover Art Preset
                            </h3>
                            
                            {/* Preset Buttons Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                {presetCovers.map((preset, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setImageUrl(preset.url)}
                                        className={`p-2 rounded-sm border text-[10px] font-black uppercase text-left transition-all hover:bg-slate-800 ${
                                            imageUrl === preset.url
                                                ? "bg-slate-800 border-yellow-400 text-yellow-400"
                                                : "bg-slate-950 border-slate-700 text-slate-400"
                                        }`}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>

                            {/* Cover Preview Card */}
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                                Artwork Preview
                            </h3>
                            <div className="aspect-[3/4] bg-slate-950 border-3 border-black rounded-sm overflow-hidden flex items-center justify-center relative shadow-[3px_3px_0px_#000]">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt="Artwork Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop";
                                        }}
                                    />
                                ) : (
                                    <HelpCircle className="w-12 h-12 text-slate-700" />
                                )}
                            </div>
                        </div>

                        {/* Submit Actions */}
                        <div className="pt-6 mt-6 border-t border-slate-800">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full comic-btn-yellow py-3.5 flex items-center justify-center gap-1.5 rounded-sm font-black text-sm uppercase cursor-pointer"
                            >
                                {isEditMode ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                <span>{loading ? "SAVING..." : isEditMode ? "SAVE CHANGES" : "PUBLISH LISTING"}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SellComic;
