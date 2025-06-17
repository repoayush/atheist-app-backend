// dating_app/backend/auth_routes.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user_model'); // Import the User model

// Middleware to protect routes (verify JWT token)
const authMiddleware = (req, res, next) => {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied.' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Attach user payload to request
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid.' });
    }
};

/*
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
    const { profilePic, profileName, username, bio, instagramUsername, instagramProfileLink, country, swipeImages, password } = req.body;

    // --- START DEBUGGING LOGS FOR REGISTRATION ---
    console.log('--- Incoming Registration Request Body ---');
    console.log('profilePic:', profilePic);
    console.log('profileName:', profileName);
    console.log('username:', username);
    console.log('bio:', bio);
    console.log('instagramUsername:', instagramUsername);
    console.log('instagramProfileLink:', instagramProfileLink);
    console.log('country:', country);
    console.log('swipeImages:', swipeImages);
    console.log('Type of swipeImages:', typeof swipeImages);
    if (Array.isArray(swipeImages)) {
        console.log('Is swipeImages an Array:', Array.isArray(swipeImages));
        console.log('Length of swipeImages:', swipeImages.length);
        swipeImages.forEach((img, index) => console.log(`  Swipe Image ${index}:`, img, `(Type: ${typeof img})`));
    } else {
        console.log('swipeImages is NOT an array.');
    }
    console.log('password: [HIDDEN]');
    console.log('------------------------------------------');
    // --- END DEBUGGING LOGS FOR REGISTRATION ---


    // Basic validation
    if (!profileName || !username || !country || !password || !swipeImages || !profilePic) {
        return res.status(400).json({ msg: 'Please enter all required fields: profilePic, profileName, username, country, password, and swipeImages.' });
    }

    // Explicitly validate swipeImages as an array of exactly 3 elements
    if (!Array.isArray(swipeImages) || swipeImages.length !== 3) {
        return res.status(400).json({ msg: 'Please provide exactly 3 swipe images.' });
    }

    try {
        // Check if username already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Username already exists. Please choose a different one.' });
        }

        // Create new user instance
        // Password hashing will be handled by the pre-save hook in user_model.js
        user = new User({
            profilePic,
            profileName,
            username,
            bio,
            instagramUsername,
            instagramProfileLink,
            country,
            swipeImages, // Assign the array directly
            password,
        });

        // Save user to database (triggers pre-save hook for password hashing)
        await user.save();

        // Generate JWT token
        const payload = {
            user: {
                id: user.id, // User ID from MongoDB
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' }, // Token expires in 5 hours
            (err, token) => {
                if (err) throw err;
                res.status(201).json({
                    msg: 'User registered successfully!',
                    token,
                    user: { // Send back relevant user data
                        _id: user.id, // MongoDB's _id (can also use user.id)
                        profilePic: user.profilePic,
                        profileName: user.profileName,
                        username: user.username,
                        bio: user.bio,
                        instagramUsername: user.instagramUsername,
                        instagramProfileLink: user.instagramProfileLink,
                        country: user.country,
                        swipeImages: user.swipeImages,
                    },
                });
            }
        );

    } catch (error) {
        console.error('Registration error:', error.message);
        // Log the full error object if it has one, for more details
        if (error.errors) {
            console.error('Validation errors:', error.errors);
        }
        res.status(500).json({ msg: 'Server error during registration.' });
    }
});


/*
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ msg: 'Please enter both username and password.' });
    }

    try {
        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials.' });
        }

        // Generate JWT token
        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.status(200).json({
                    msg: 'Logged in successfully!',
                    token,
                    user: { // Send back relevant user data
                        _id: user.id,
                        profilePic: user.profilePic,
                        profileName: user.profileName,
                        username: user.username,
                        bio: user.bio,
                        instagramUsername: user.instagramUsername,
                        instagramProfileLink: user.instagramProfileLink,
                        country: user.country,
                        swipeImages: user.swipeImages,
                    },
                });
            }
        );

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error during login.');
    }
});


// Export authMiddleware along with router
module.exports = {
    router,
    authMiddleware,
};
