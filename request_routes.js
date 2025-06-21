// dating_app/backend/request_routes.js

const express = require('express');
const router = express.Router();
const User = require('./user_model'); // Import the User model
const Request = require('./request_model'); // Import the Request model (we'll define this next)
const { authMiddleware } = require('./auth_routes'); // Import the authentication middleware

/*
 * @route   POST /api/requests/send/:receiverId
 * @desc    Send a dating request to another user
 * @access  Private (requires token)
 */
router.post('/send/:receiverId', authMiddleware, async (req, res) => {
    try {
        const senderId = req.user.id; // The logged-in user
        const receiverId = req.params.receiverId; // The user to send request to

        // Prevent sending request to self
        if (senderId === receiverId) {
            return res.status(400).json({ msg: 'You cannot send a dating request to yourself.' });
        }

        // Check if both users exist
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            return res.status(404).json({ msg: 'Sender or receiver user not found.' });
        }

        // Check if a request already exists between these two users (pending or accepted)
        const existingRequest = await Request.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        });

        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(400).json({ msg: 'A pending request already exists with this user.' });
            } else if (existingRequest.status === 'accepted') {
                return res.status(400).json({ msg: 'You are already matched with this user.' });
            }
        }

        // Create new request
        const newRequest = new Request({
            sender: senderId,
            receiver: receiverId,
            status: 'pending', // Default status
        });

        await newRequest.save();

        res.status(201).json({ msg: 'Dating request sent successfully!', request: newRequest });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   POST /api/requests/accept/:requestId
 * @desc    Accept a received dating request
 * @access  Private (requires token)
 */
router.post('/accept/:requestId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const requestId = req.params.requestId;

        let request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({ msg: 'Dating request not found.' });
        }

        // Ensure the current user is the receiver of this request
        if (request.receiver.toString() !== currentUserId) {
            return res.status(401).json({ msg: 'Unauthorized: You can only accept requests sent to you.' });
        }

        // Only pending requests can be accepted
        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'This request is no longer pending.' });
        }

        // Update request status to 'accepted'
        request.status = 'accepted';
        request.acceptedAt = new Date(); // Record acceptance time
        await request.save();

        // Optionally, update both users' `matches` array
        // (You might decide to track matches via the 'accepted' status in Request model,
        // or have a separate 'Match' collection. For now, Request status suffices)

        res.json({
            msg: 'Dating request accepted! It\'s a match!',
            request,
            matchedWith: request.sender // Information about who they matched with
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   POST /api/requests/reject/:requestId
 * @desc    Reject a received dating request
 * @access  Private (requires token)
 */
router.post('/reject/:requestId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const requestId = req.params.requestId;

        let request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({ msg: 'Dating request not found.' });
        }

        // Ensure the current user is the receiver of this request
        if (request.receiver.toString() !== currentUserId) {
            return res.status(401).json({ msg: 'Unauthorized: You can only reject requests sent to you.' });
        }

        // Only pending requests can be rejected
        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'This request is no longer pending.' });
        }

        // Update request status to 'rejected'
        request.status = 'rejected';
        request.rejectedAt = new Date(); // Record rejection time
        await request.save();

        res.json({ msg: 'Dating request rejected.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   DELETE /api/requests/cancel/:requestId
 * @desc    Cancel a sent dating request
 * @access  Private (requires token)
 */
router.delete('/cancel/:requestId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const requestId = req.params.requestId;

        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({ msg: 'Dating request not found.' });
        }

        // Ensure the current user is the sender of this request
        if (request.sender.toString() !== currentUserId) {
            return res.status(401).json({ msg: 'Unauthorized: You can only cancel your own sent requests.' });
        }

        // Only pending requests can be cancelled
        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'This request cannot be cancelled (it\'s already accepted or rejected).' });
        }

        // Delete the request
        await request.deleteOne(); // Use deleteOne() for Mongoose 6+

        res.json({ msg: 'Dating request cancelled successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   GET /api/requests/sent
 * @desc    Get all dating requests sent by the current user
 * @access  Private (requires token)
 */
router.get('/sent', authMiddleware, async (req, res) => {
    try {
        const requests = await Request.find({ sender: req.user.id })
            // Updated populate to include all profile details for the receiver
            .populate('receiver', 'username profileName profilePic country bio instagramUsername instagramProfileLink swipeImages')
            .sort({ createdAt: -1 }); // Sort by newest first

        res.json(requests);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   GET /api/requests/received
 * @desc    Get all dating requests received by the current user
 * @access  Private (requires token)
 */
router.get('/received', authMiddleware, async (req, res) => {
    try {
        const requests = await Request.find({ receiver: req.user.id })
            .populate('sender', 'username profileName profilePic country') // Populate sender details
            .sort({ createdAt: -1 }); // Sort by newest first

        res.json(requests);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   GET /api/requests/matches
 * @desc    Get all mutual matches for the current user
 * @access  Private (requires token)
 */
router.get('/matches', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Find requests where current user is sender AND status is accepted
        const sentMatches = await Request.find({
            sender: currentUserId,
            status: 'accepted'
        }).populate('receiver', 'username profileName profilePic country bio instagramUsername instagramProfileLink swipeImages');

        // Find requests where current user is receiver AND status is accepted
        const receivedMatches = await Request.find({
            receiver: currentUserId,
            status: 'accepted'
        }).populate('sender', 'username profileName profilePic country bio instagramUsername instagramProfileLink swipeImages');

        // Combine and format results to a simple list of User objects
        const allMatches = [];
        sentMatches.forEach(match => {
            if (match.receiver) {
                // Attach the initiator status (simplified for now)
                const matchedUser = match.receiver.toObject();
                matchedUser.isInitiator = true; // Current user sent the request
                allMatches.push(matchedUser);
            }
        });
        receivedMatches.forEach(match => {
            if (match.sender) {
                // Attach the initiator status (simplified for now)
                const matchedUser = match.sender.toObject();
                matchedUser.isInitiator = false; // Current user received the request
                allMatches.push(matchedUser);
            }
        });

        res.json(allMatches);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * @route   POST /api/requests/unmatch/:matchedUserId
 * @desc    Unmatch a user (by changing request status or deleting)
 * @access  Private (requires token)
 */
router.post('/unmatch/:matchedUserId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const matchedUserId = req.params.matchedUserId;

        // Find the accepted request between these two users
        // It could be that current user sent or received the initial request
        const matchRequest = await Request.findOne({
            $or: [
                { sender: currentUserId, receiver: matchedUserId, status: 'accepted' },
                { sender: matchedUserId, receiver: currentUserId, status: 'accepted' }
            ]
        });

        if (!matchRequest) {
            return res.status(404).json({ msg: 'No active match found with this user.' });
        }

        // Change the status to 'unmatched' or 'cancelled_by_unmatch'
        // Or you could delete it, but keeping status for history might be useful
        matchRequest.status = 'unmatched';
        matchRequest.unmatchedAt = new Date();
        await matchRequest.save();

        res.json({ msg: 'User unmatched successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
