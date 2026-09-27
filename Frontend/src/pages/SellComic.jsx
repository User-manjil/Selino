import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { ArrowLeft, BookOpen, PlusCircle, Save, HelpCircle, Image, Upload, X } from "lucide-react";

const SellComic = () => {
    const { id } = useParams(); // present if editing
    const isEditMode = !!id;
    const navigate = useNavigate();
    const { token, user, API_URL } = useAuth();
    const fileInputRef = useRef(null);

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

    // Image upload states
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageSource, setImageSource] = useState("preset"); // "preset", "url", "upload"

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
                setDescription(data.description);

                // Determine image source type
                if (data.imageUrl && data.imageUrl.startsWith("/uploads/")) {
                    setImageSource("upload");
                    setImagePreview(`http://localhost:4000${data.imageUrl}`);
                    setImageUrl("");
                } else {
                    const isPreset = presetCovers.some(p => p.url === data.imageUrl);
                    setImageSource(isPreset ? "preset" : "url");
                    setImageUrl(data.imageUrl);
                }
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            alert("Only .jpg, .jpeg, .png, .gif and .webp image files are allowed!");
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB!");
            return;
        }

        setImageFile(file);
        setImageSource("upload");
        setImageUrl(""); // Clear URL when uploading

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveUpload = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageSource("preset");
        setImageUrl(presetCovers[5].url);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

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

        try {
            const url = isEditMode ? `${API_URL}/comics/${id}` : `${API_URL}/comics`;
            const method = isEditMode ? "PUT" : "POST";

            let response;

            if (imageFile) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append("title", title);
                formData.append("author", author);
                formData.append("publisher", publisher);
                formData.append("genre", genre);
                formData.append("condition", condition);
                formData.append("price", price);
                formData.append("stock", stock);
                formData.append("description", description);
                formData.append("coverImage", imageFile);

                response = await fetch(url, {
                    method,
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                });
            } else {
                // Use JSON for URL-based images
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

                response = await fetch(url, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(comicData)
                });
            }

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

    // Determine the preview image to show
    const getPreviewImage = () => {
        if (imageSource === "upload" && imagePreview) return imagePreview;
        if (imageUrl) return imageUrl;
        return null;
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

                    {/* Right: Image Upload, Presets & Cover Mockup (4 cols) */}
                    <div className="md:col-span-4 flex flex-col justify-between">
                        <div>
                            {/* Image Source Tabs */}
                            <div className="flex border-2 border-black rounded-sm overflow-hidden mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setImageSource("upload"); setImageUrl(""); }}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                        imageSource === "upload"
                                            ? "bg-yellow-400 text-black"
                                            : "bg-slate-950 text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <Upload className="w-3 h-3 inline mr-1" />
                                    Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setImageSource("url"); setImageFile(null); setImagePreview(null); }}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-x border-black transition-colors cursor-pointer ${
                                        imageSource === "url"
                                            ? "bg-yellow-400 text-black"
                                            : "bg-slate-950 text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <Image className="w-3 h-3 inline mr-1" />
                                    URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setImageSource("preset"); setImageFile(null); setImagePreview(null); setImageUrl(presetCovers[5].url); }}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                        imageSource === "preset"
                                            ? "bg-yellow-400 text-black"
                                            : "bg-slate-950 text-slate-400 hover:text-white"
                                    }`}
                                >
                                    Presets
                                </button>
                            </div>

                            {/* Upload Panel */}
                            {imageSource === "upload" && (
                                <div className="mb-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="cover-upload"
                                    />
                                    
                                    {imageFile || imagePreview ? (
                                        <div className="relative">
                                            <div className="bg-green-950/30 border border-green-500/40 p-2.5 rounded-sm flex items-center gap-2 text-xs">
                                                <Upload className="w-4 h-4 text-green-400 shrink-0" />
                                                <span className="text-green-300 font-bold truncate">
                                                    {imageFile ? imageFile.name : "Previously uploaded image"}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveUpload}
                                                    className="ml-auto text-slate-400 hover:text-red-400 shrink-0 cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full mt-2 bg-slate-950 border border-slate-700 py-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white hover:border-yellow-400 rounded-sm transition-colors cursor-pointer"
                                            >
                                                Change File
                                            </button>
                                        </div>
                                    ) : (
                                        <label
                                            htmlFor="cover-upload"
                                            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-yellow-400 bg-slate-950 rounded-sm p-6 cursor-pointer transition-colors group"
                                        >
                                            <Upload className="w-8 h-8 text-slate-500 group-hover:text-yellow-400 mb-2 transition-colors" />
                                            <span className="text-xs font-black uppercase text-slate-400 group-hover:text-yellow-400 transition-colors">
                                                Click to Upload Cover
                                            </span>
                                            <span className="text-[10px] text-slate-500 mt-1">
                                                JPG, PNG, GIF, WebP • Max 5MB
                                            </span>
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* URL Input Panel */}
                            {imageSource === "url" && (
                                <div className="mb-4">
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                                        Image URL
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="Paste external image address..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-black p-2.5 text-white font-bold text-sm focus:outline-none focus:border-yellow-400 placeholder-slate-600 rounded-sm"
                                    />
                                </div>
                            )}

                            {/* Preset Panel */}
                            {imageSource === "preset" && (
                                <div className="mb-4">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1">
                                        <Image className="w-4 h-4 text-cyan-400" /> Cover Art Preset
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {presetCovers.map((preset, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setImageUrl(preset.url)}
                                                className={`p-2 rounded-sm border text-[10px] font-black uppercase text-left transition-all hover:bg-slate-800 cursor-pointer ${
                                                    imageUrl === preset.url
                                                        ? "bg-slate-800 border-yellow-400 text-yellow-400"
                                                        : "bg-slate-950 border-slate-700 text-slate-400"
                                                }`}
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cover Preview Card */}
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                                Artwork Preview
                            </h3>
                            <div className="aspect-[3/4] bg-slate-950 border-3 border-black rounded-sm overflow-hidden flex items-center justify-center relative shadow-[3px_3px_0px_#000]">
                                {getPreviewImage() ? (
                                    <img
                                        src={getPreviewImage()}
                                        alt="Artwork Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop";
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-600">
                                        <HelpCircle className="w-12 h-12" />
                                        <span className="text-[10px] font-bold mt-1 uppercase">No Image</span>
                                    </div>
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
