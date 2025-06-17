// dating_app/backend/server.js

// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Import route files
const authRoutes = require('./auth_routes');
const userRoutes = require('./user_routes');
const requestRoutes = require('./request_routes');
const chatRoutes = require('./chat_routes'); // <-- NEW: Import chat routes
const uploadRoutes = require('./upload_routes'); // <-- NEW: Import upload routes

// Load environment variables from .env file
dotenv.config();

// Initialize the Express application
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// Define the MongoDB connection URI.
// This will be read from your .env file.
const MONGODB_URI = process.env.MONGODB_URI;

// Check if MONGODB_URI is defined
if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in the .env file!');
    console.error('Please ensure your .env file in the backend directory has MONGODB_URI="your_connection_string"');
    process.exit(1); // Exit the process if URI is missing
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    // These options (useNewUrlParser, useUnifiedTopology) are deprecated
    // and have been removed as they are no longer necessary in Mongoose v6.x and above.
    // They were causing the "Warning: useNewUrlParser is a deprecated option" messages.
    // No other options are strictly required for a basic connection unless you have
    // specific needs (e.g., replica set names, TLS/SSL certificates).
})
.then(() => {
    console.log('MongoDB connected successfully!');
})
.catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error('Possible causes:');
    console.error('1. Incorrect username or password in your MONGODB_URI in .env.');
    console.error('2. Your current IP address is not whitelisted in MongoDB Atlas Network Access.');
    console.error('3. Typo in the database name or cluster name in the URI.');
    // Optional: Exit process on failed connection if database is critical
    // process.exit(1);
});

// Basic route for testing the server
app.get('/', (req, res) => {
    res.send('Dating App Backend is running!');
});

// Use API routes
app.use('/api/auth', authRoutes.router); // Routes for user authentication (register, login)
app.use('/api/users', userRoutes); // Routes for user profiles and search
app.use('/api/requests', requestRoutes); // Routes for sending/managing requests and matches
app.use('/api/chat', chatRoutes); // <-- NEW: Add chat routes
app.use('/api/upload', uploadRoutes); // <-- NEW: Add upload routes

// Define the port for the server to listen on
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access it at http://localhost:${PORT}`);
});
