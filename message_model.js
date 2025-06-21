// dating_app/backend/message_model.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User model
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User model
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true, // Trim whitespace from the message text
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    // NEW: Field to track if the message has been read by the receiver
    isRead: {
        type: Boolean,
        default: false, // Messages are unread by default when sent
    },
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
});

module.exports = mongoose.model('Message', MessageSchema);
