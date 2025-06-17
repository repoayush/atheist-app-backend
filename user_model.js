// dating_app/backend/user_model.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

// Define the User Schema
const userSchema = new mongoose.Schema({
    // Profile Picture - URL to the image hosted externally
    profilePic: {
        type: String,
        default: 'https://placehold.co/150x150/cccccc/ffffff?text=Profile', // Default placeholder image
    },
    // Profile Name (Full Name/Display Name)
    profileName: {
        type: String,
        required: [true, 'Profile name is required'],
        trim: true,
        minlength: [3, 'Profile name must be at least 3 characters long'],
        maxlength: [50, 'Profile name cannot exceed 50 characters'],
    },
    // Unique Username for login and searching
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true, // Ensures usernames are unique
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, or dots'],
    },
    // User's Biography
    bio: {
        type: String,
        trim: true,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: '',
    },
    // Instagram Username (only visible to matched users)
    instagramUsername: {
        type: String,
        trim: true,
        default: '',
    },
    // Instagram Profile Link (only visible to matched users)
    instagramProfileLink: {
        type: String,
        trim: true,
        default: '',
    },
    // User's Country
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        maxlength: [50, 'Country name cannot exceed 50 characters'],
    },
    // Images for swipe cards (URLs to externally hosted images)
    swipeImages: {
        type: [String], // Array of strings (URLs)
        validate: {
            validator: function(v) {
                // Allows 0 to 3 images. You can make it required to have exactly 3 later.
                return v.length <= 3;
            },
            message: props => `${props.value.length} swipe images provided, but max 3 are allowed!`
        },
        default: [], // Default to an empty array
    },
    // Password for login (hashed)
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
    },
    // NEW FIELD: isVerified for special accounts
    isVerified: {
        type: Boolean,
        default: false, // By default, users are not verified
    },
    // Date when the user account was created
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Last time the user's profile was updated
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Pre-save hook to hash the password before saving a new user or updating password
userSchema.pre('save', async function(next) {
    // Only hash the password if it's new or has been modified
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
        this.password = await bcrypt.hash(this.password, salt); // Hash the password
        next();
    } catch (error) {
        next(error); // Pass any error to the next middleware
    }
});

// Method to compare entered password with the hashed password in the database
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;
