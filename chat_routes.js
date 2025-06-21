// dating_app/backend/chat_routes.js

const express = require('express');
const router = express.Router();
const Message = require('./message_model'); // Import the Message model
const User = require('./user_model'); // Import User model to validate matchedUser
const { authMiddleware } = require('./auth_routes'); // Import the authentication middleware
const Request = require('./request_model'); // Import Request model to check match status

/*
 * @route   GET /api/chat/messages/:matchedUserId
 * @desc    Get chat messages between the current user and a matched user
 * @access  Private (requires token)
 */
router.get('/messages/:matchedUserId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const matchedUserId = req.params.matchedUserId;

        // Verify that these two users are actually matched
        const isMatched = await Request.findOne({
            $or: [
                { sender: currentUserId, receiver: matchedUserId, status: 'accepted' },
                { sender: matchedUserId, receiver: currentUserId, status: 'accepted' }
            ]
        });

        if (!isMatched) {
            return res.status(403).json({ msg: 'Forbidden: You are not matched with this user.' });
        }

        // Fetch messages where either user is sender and the other is receiver
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: matchedUserId },
                { sender: matchedUserId, receiver: currentUserId }
            ]
        })
        .sort({ timestamp: 1 }) // Sort by timestamp ascending (oldest first)
        .select('-__v'); // Exclude the Mongoose version key

        res.json(messages);

    } catch (err) {
        console.error('Error fetching chat messages:', err.message);
        res.status(500).json({ msg: 'Server error fetching messages.' });
    }
});

/*
 * @route   POST /api/chat/send/:receiverId
 * @desc    Send a new chat message
 * @access  Private (requires token)
 */
router.post('/send/:receiverId', authMiddleware, async (req, res) => {
    try {
        const senderId = req.user.id;
        const receiverId = req.params.receiverId;
        const { text } = req.body;

        // Basic validation
        if (!text || text.trim() === '') {
            return res.status(400).json({ msg: 'Message text cannot be empty.' });
        }

        // Verify that these two users are actually matched
        const isMatched = await Request.findOne({
            $or: [
                { sender: senderId, receiver: receiverId, status: 'accepted' },
                { sender: receiverId, receiver: senderId, status: 'accepted' }
            ]
        });

        if (!isMatched) {
            return res.status(403).json({ msg: 'Forbidden: You can only send messages to matched users.' });
        }

        // Create and save the new message
        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            text: text.trim(),
            isRead: false, // NEW: Mark message as unread by default for the receiver
        });

        await newMessage.save();

        res.status(201).json({ msg: 'Message sent successfully!', message: newMessage });

    } catch (err) {
        console.error('Error sending message:', err.message);
        res.status(500).json({ msg: 'Server error sending message.' });
    }
});

/*
 * @route   POST /api/chat/messages/:messageId/markAsRead
 * @desc    Mark a specific message as read
 * @access  Private (requires token)
 */
router.post('/messages/:messageId/markAsRead', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const messageId = req.params.messageId;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ msg: 'Message not found.' });
        }

        // Ensure the current user is the receiver of this message and it's currently unread
        if (message.receiver.toString() !== currentUserId || message.isRead === true) {
            return res.status(400).json({ msg: 'You cannot mark this message as read.' });
        }

        message.isRead = true;
        await message.save();

        res.json({ msg: 'Message marked as read.', message });

    } catch (err) {
        console.error('Error marking message as read:', err.message);
        res.status(500).json({ msg: 'Server error marking message as read.' });
    }
});

/*
 * @route   POST /api/chat/messages/markAllAsRead/:matchedUserId
 * @desc    Mark all messages in a specific chat as read for the current user
 * @access  Private (requires token)
 */
router.post('/messages/markAllAsRead/:matchedUserId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const matchedUserId = req.params.matchedUserId;

        // Update all unread messages where the current user is the receiver and the sender is the matched user
        await Message.updateMany(
            { receiver: currentUserId, sender: matchedUserId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ msg: 'All messages marked as read.' });

    } catch (err) {
        console.error('Error marking all messages as read:', err.message);
        res.status(500).json({ msg: 'Server error marking all messages as read.' });
    }
});


module.exports = router;
