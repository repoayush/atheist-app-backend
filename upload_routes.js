// dating_app/backend/upload_routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer'); // For handling multipart/form-data
const cloudinary = require('cloudinary').v2; // Cloudinary SDK
const dotenv = require('dotenv'); // To load Cloudinary credentials
// const { authMiddleware } = require('./auth_routes'); // Import the authentication middleware - REMOVED FOR PUBLIC UPLOAD

// Load environment variables (ensure this is called before using process.env variables)
dotenv.config();

// Configure Cloudinary with credentials from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for in-memory storage.
// This means the file is stored as a Buffer in memory before being sent to Cloudinary.
// This avoids writing temporary files to the server's disk, which is generally cleaner
// and necessary when deploying to serverless environments or platforms like Render
// where file system writes might be volatile or restricted.
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    // --- REMOVED fileSize LIMIT ---
    // limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB (adjust as needed)
    // --- TEMPORARILY COMMENTING OUT fileFilter FOR DEBUGGING ---
    // fileFilter: (req, file, cb) => {
    //     // Accept only image files
    //     if (file.mimetype.startsWith('image/')) {
    //         cb(null, true);
    //     } else {
    //         cb(new Error('Only image files are allowed!'), false);
    //     }
    // }
    // --- END TEMPORARY COMMENT OUT ---
});

/*
 * @route   POST /api/upload/image
 * @desc    Upload an image to Cloudinary
 * @access  Public (removed authMiddleware for registration uploads)
 * @middleware upload.single('image'): 'image' is the field name expected in the form-data
 */
router.post('/image', upload.single('image'), async (req, res) => { // authMiddleware REMOVED
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No image file uploaded.' });
        }

        // --- Log received file details for debugging ---
        console.log('Received file:', {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            encoding: req.file.encoding,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        // --- END Log ---

        // Convert buffer to data URI scheme for Cloudinary upload
        // Example: data:image/jpeg;base64,...
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'dating_app_images', // Optional: saves images in a specific folder in your Cloudinary account
            resource_type: "auto" // Automatically detect if it's an image or video (though here we filter for images)
        });

        if (result && result.secure_url) {
            // Send the secure URL of the uploaded image back to the frontend
            res.status(200).json({
                msg: 'Image uploaded successfully!',
                imageUrl: result.secure_url,
            });
        } else {
            console.error('Cloudinary upload response:', result);
            throw new Error('Cloudinary upload failed: Missing secure_url.');
        }

    } catch (error) {
        console.error('Image upload error:', error.message);
        // Ensure that the error response is always JSON
        res.status(500).json({ msg: error.message || 'Server error during image upload.' });
    }
});

module.exports = router;
