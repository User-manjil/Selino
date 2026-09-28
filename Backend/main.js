const express = require('express')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')
const connectionDB = require("./connection")
require('dotenv').config()

const Port = process.env.PORT || 4000
const app = express()

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Database Connection
connectionDB()

// Routes
const authRoutes = require("./routes/auth")
const comicRoutes = require("./routes/comics")
const orderRoutes = require("./routes/orders")

app.use("/api/auth", authRoutes)
app.use("/api/comics", comicRoutes)
app.use("/api/orders", orderRoutes)

app.get('/', (req, res) => {
    res.json({ message: "Welcome to ComicVerse API" })
})

app.listen(Port, () => {
    console.log(`The server is running at http://localhost:${Port}`)
})