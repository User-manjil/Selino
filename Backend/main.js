const express = require('express')
const cors = require('cors')
const connectionDB = require("./connection")
require('dotenv').config()

const Port = process.env.PORT || 4000
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

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