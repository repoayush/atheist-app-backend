// frontend/backend/request_model.js

const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'unmatched'], // Define possible statuses
        default: 'pending',
    },
    // Timestamps for tracking request lifecycle
    createdAt: {
        type: Date,
        default: Date.now,
    },
    acceptedAt: {
        type: Date,
    },
    rejectedAt: {
        type: Date,
    },
    unmatchedAt: {
        type: Date,
    },
});

module.exports = mongoose.model('Request', RequestSchema);
