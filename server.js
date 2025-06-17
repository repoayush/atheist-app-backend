// frontend/backend/server.js

const express = require('express');
const dotenv = require('dotenv'); // Import dotenv
const connectDB = require('./db'); // Import the database connection
const { router: authRoutes } = require('./auth_routes'); // Correctly import the router from auth_routes
const userRoutes = require('./user_routes'); // Import user routes
const requestRoutes = require('./request_routes'); // Import request routes
const uploadRoutes = require('./upload_routes'); // Import the new upload routes
const cors = require('cors'); // Import cors middleware

// Load environment variables from .env file
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Body parser for JSON data
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// Routes
app.use('/api/auth', authRoutes); // Authentication routes (login, register)
app.use('/api/users', userRoutes); // User-related routes (explore, profile, search, block, unmatch, delete)
app.use('/api/requests', requestRoutes); // Dating request and match-related routes
app.use('/api/upload', uploadRoutes); // Image upload routes

// Basic route for testing server
app.get('/', (req, res) => {
    res.send('Dating App Backend API is running!');
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
