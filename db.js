// frontend/backend/db.js

const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const dotenv = require('dotenv'); // Import dotenv to load environment variables

// Load environment variables from .env file
dotenv.config();

// Function to connect to the database
const connectDB = async () => {
    try {
        // Get MongoDB URI from environment variables
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in .env file.');
        }

        // Connect to MongoDB using Mongoose
        await mongoose.connect(mongoURI, {
            // These options are recommended for new connections, though some might be default in newer Mongoose versions
            useNewUrlParser: true, // Use the new URL parser
            useUnifiedTopology: true, // Use the new server discovery and monitoring engine
            // useCreateIndex: true, // Deprecated in Move v6.0, not needed for new versions
            // useFindAndModify: false, // Deprecated in Mongoose v6.0, not needed for new versions
        });

        console.log('MongoDB Connected...'); // Log success
    } catch (err) {
        console.error('MongoDB Connection Failed:', err.message); // Log error
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB; // Export the connection function
