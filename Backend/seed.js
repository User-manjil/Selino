const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user");
const Comic = require("./models/comic");
const Order = require("./models/order");
require("dotenv").config();

const MONGO_DB_URL = process.env.MONGO_DB_URL || "mongodb://127.0.0.1:27017/selinoDB";

const seedData = async () => {
    try {
        console.log("Connecting to database at:", MONGO_DB_URL);
        await mongoose.connect(MONGO_DB_URL);
        console.log("Connected successfully. Cleaning database...");

        // Clear existing data
        await User.deleteMany({});
        await Comic.deleteMany({});
        await Order.deleteMany({});

        console.log("Database cleared. Creating accounts...");

        // Create Seller and Buyer accounts
        const hashedPassword = await bcrypt.hash("password123", 10);
        
        const seller = await User.create({
            name: "Stan Lee",
            email: "seller@comicverse.com",
            password: hashedPassword,
            role: "seller"
        });

        const buyer = await User.create({
            name: "Peter Parker",
            email: "buyer@comicverse.com",
            password: hashedPassword,
            role: "buyer"
        });

        console.log("Accounts created successfully:");
        console.log(`- Seller: ${seller.email} (password: password123)`);
        console.log(`- Buyer: ${buyer.email} (password: password123)`);

        // Seed Comics
        const comicsData = [
            {
                title: "The Amazing Spider-Man #1",
                author: "Stan Lee & Steve Ditko",
                publisher: "Marvel Comics",
                genre: "Superhero",
                description: "The historic first issue of Spider-Man's own title, following his origin story in Amazing Fantasy #15. Witness Peter Parker facing off against Chameleon and attempting to join the Fantastic Four!",
                condition: "Near Mint",
                price: 299.99,
                stock: 3,
                imageUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=600&auto=format&fit=crop",
                seller: seller._id
            },
            {
                title: "Action Comics #1 (Reprint)",
                author: "Jerry Siegel & Joe Shuster",
                publisher: "DC Comics",
                genre: "Superhero",
                description: "The comic book that started it all! The very first appearance of Superman, the Man of Steel. This special high-quality anniversary reprint brings the Golden Age of comics to your collection.",
                condition: "Mint",
                price: 49.99,
                stock: 10,
                imageUrl: "https://images.unsplash.com/photo-1608889174637-3c44f6326f2a?q=80&w=600&auto=format&fit=crop",
                seller: seller._id
            },
            {
                title: "Watchmen #1",
                author: "Alan Moore & Dave Gibbons",
                publisher: "DC Comics / Vertigo",
                genre: "Sci-Fi / Noir",
                description: "Who watches the Watchmen? The groundbreaking Hugo Award-winning series begins here. A murder mystery surrounding a retired superhero unravels a dark conspiracy that threatens the world.",
                condition: "Very Fine",
                price: 85.00,
                stock: 2,
                imageUrl: "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?q=80&w=600&auto=format&fit=crop",
                seller: seller._id
            },
            {
                title: "X-Men #1 (1963 Reprint)",
                author: "Stan Lee & Jack Kirby",
                publisher: "Marvel Comics",
                genre: "Superhero",
                description: "The Children of the Atom arise! Cyclops, Beast, Iceman, Angel, and Marvel Girl, under the guidance of Professor X, clash with their ultimate nemesis: Magneto, Master of Magnetism.",
                condition: "Fine",
                price: 75.00,
                stock: 5,
                imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop",
                seller: seller._id
            },
            {
                title: "The Sandman #1",
                author: "Neil Gaiman",
                publisher: "DC Comics / Vertigo",
                genre: "Fantasy",
                description: "Master of Dreams Morpheus is captured by occultists in 1916. After 72 years of imprisonment, he escapes to find his realm in ruin and begins a quest to reclaim his lost objects of power.",
                condition: "Very Good",
                price: 120.00,
                stock: 1,
                imageUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
                seller: seller._id
            },
            {
                title: "Batman: The Dark Knight Returns #1",
                author: "Frank Miller",
                publisher: "DC Comics",
                genre: "Superhero / Dark",
                description: "A legendary masterpiece that redefined Batman. Ten years after his retirement, a middle-aged Bruce Wayne dons the cowl once again to fight gangs, the police, and a changing world.",
                condition: "Near Mint",
                price: 150.00,
                stock: 2,
                imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop",
                seller: seller._id
            }
        ];

        await Comic.insertMany(comicsData);
        console.log(`Successfully seeded ${comicsData.length} comics!`);

        // Close connection
        await mongoose.connection.close();
        console.log("Database connection closed. Seeding completed successfully!");
    } catch (err) {
        console.error("Error during seeding process:", err);
        process.exit(1);
    }
};

seedData();
