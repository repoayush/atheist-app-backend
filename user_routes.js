// dating_app/backend/user_routes.js

const express = require('express');
const router = express.Router();
const User = require('./user_model');
const { authMiddleware } = require('./auth_routes'); // Import authMiddleware

/*
 * @route   GET /api/users/explore
 * @desc    Get users for the explore/swipe feature (excluding current user and blocked users)
 * @access  Private (requires token)
 */
router.get('/explore', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id; // ID of the logged-in user

        // Find the current user to get their blocked list
        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({ msg: 'Current user not found.' });
        }

        // --- START DEBUGGING LOGS FOR EXPLORE USERS ---
        console.log('--- Fetching Explore Users ---');
        console.log('Current User ID:', currentUserId);
        console.log('Current User Blocked Users (if any):', currentUser.blockedUsers); // Assuming a 'blockedUsers' array on User model
        // --- END DEBUGGING LOGS FOR EXPLORE USERS ---

        // Fetch users excluding the current user and any users they have blocked.
        // Also, exclude users who have blocked the current user (requires checking 'blockedBy' field or similar logic if implemented).
        // For simplicity, let's just exclude self for now and consider users not in matches/requests.
        // In a real app, you'd also filter out users the current user has already sent requests to,
        // received requests from (that are pending), or already matched with.
        const users = await User.find({
            _id: { $ne: currentUserId }, // Exclude the current user
            // In a real app, you'd add more complex filtering here:
            // _id: { $nin: currentUser.blockedUsers || [] }, // Exclude users blocked by current user
            // Add logic to exclude already requested/matched users.
        }).select('-password -__v -lastActive'); // Exclude sensitive/unnecessary fields

        // --- MORE DEBUGGING LOGS FOR EXPLORE USERS ---
        console.log('Fetched Users Count for Explore:', users.length);
        if (users.length > 0) {
            console.log('First fetched user username:', users[0].username);
        } else {
            console.log('No users found after filtering.');
        }
        console.log('------------------------------------------');
        // --- END DEBUGGING LOGS FOR EXPLORE USERS ---

        res.json(users);

    } catch (err) {
        console.error('Error fetching explore users:', err.message);
        // Log the full error stack for better debugging
        console.error(err.stack);
        res.status(500).json({ msg: 'Server Error' });
    }
});


/*
 * @route   GET /api/users/me
 * @desc    Get current logged-in user's profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // req.user.id is populated by authMiddleware
        const user = await User.findById(req.user.id).select('-password -__v');
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   GET /api/users/:userId
 * @desc    Get any user's profile by ID
 * @access  Private (requires token)
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const userIdToFetch = req.params.userId;
        // Populate all necessary fields for the frontend to display full profile
        const user = await User.findById(userIdToFetch).select('-password -__v');

        // --- START DEBUGGING LOGS FOR FETCHING SINGLE USER PROFILE ---
        console.log(`--- Fetching User Profile for ID: ${userIdToFetch} ---`);
        if (user) {
            console.log('Fetched User Data:');
            console.log('  profileName:', user.profileName);
            console.log('  username:', user.username);
            console.log('  bio:', user.bio);
            console.log('  profilePic:', user.profilePic);
            console.log('  swipeImages count:', user.swipeImages ? user.swipeImages.length : 0);
            if (user.swipeImages && user.swipeImages.length > 0) {
                user.swipeImages.forEach((img, index) => console.log(`    Swipe Image ${index}:`, img));
            }
            console.log('  country:', user.country);
            console.log('  instagramUsername:', user.instagramUsername);
            console.log('  instagramProfileLink:', user.instagramProfileLink);
        } else {
            console.log('User not found in database.');
        }
        console.log('----------------------------------------------------');
        // --- END DEBUGGING LOGS FOR FETCHING SINGLE USER PROFILE ---

        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user profile by ID:', err.message);
        console.error(err.stack); // Log the full error stack
        res.status(500).send('Server Error');
    }
});


/*
 * @route   PUT /api/users/me
 * @desc    Update current logged-in user's profile
 * @access  Private
 */
router.put('/me', authMiddleware, async (req, res) => {
    const updates = req.body; // Updates will contain fields like profileName, bio, etc.

    // Remove password and sensitive fields if they try to update them directly
    delete updates.password;
    delete updates.username; // Username updates should be handled separately if allowed
    delete updates._id;
    delete updates.createdAt;
    delete updates.__v;

    try {
        // Ensure that `swipeImages` is an array if it's being updated
        if (updates.swipeImages && !Array.isArray(updates.swipeImages)) {
            return res.status(400).json({ msg: 'swipeImages must be an array of image URLs.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates, updatedAt: Date.now() }, // Update provided fields and set updatedAt
            { new: true, runValidators: true } // Return the updated document and run schema validators
        ).select('-password -__v');

        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        res.json({ msg: 'Profile updated successfully!', user });
    } catch (err) {
        console.error(err.message);
        // Handle validation errors from Mongoose
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        res.status(500).send('Server Error');
    }
});

/*
 * @route   GET /api/users/search/:searchTerm
 * @desc    Search users by username or profile name
 * @access  Private
 */
router.get('/search/:searchTerm', authMiddleware, async (req, res) => {
    try {
        const searchTerm = req.params.searchTerm;
        const currentUserId = req.user.id;

        const users = await User.find({
            _id: { $ne: currentUserId }, // Exclude current user
            $or: [
                { username: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search
                { profileName: { $regex: searchTerm, $options: 'i' } },
            ],
        }).select('-password -__v -lastActive'); // Exclude sensitive fields

        if (users.length === 0) {
            return res.status(404).json({ msg: 'No users found matching your search.' });
        }

        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   DELETE /api/users/me
 * @desc    Delete current logged-in user's account
 * @access  Private
 */
router.delete('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; // ID of the logged-in user from token

        // Find the user and delete them
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        // TODO: Also delete associated data like:
        // - Chat messages where this user is sender or receiver
        // - Dating requests where this user is sender or receiver
        // - Matches where this user is involved
        // This requires implementing respective Mongoose models and deletion logic.

        res.json({ msg: 'Account deleted successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Implement routes for blocking and unblocking users if needed
// router.post('/block/:userId', authMiddleware, async (req, res) => { ... });
// router.post('/unblock/:userId', authMiddleware, async (req, res) => { ... });


module.exports = router;
