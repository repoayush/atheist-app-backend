// dating_app/backend/upload_routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer'); // For handling multipart/form-data
const cloudinary = require('cloudinary').v2; // Cloudinary SDK
const dotenv = require('dotenv'); // To load Cloudinary credentials

// Load environment variables (ensure this is called before using process.env variables)
dotenv.config();

// Configure Cloudinary with credentials from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for in-memory storage.
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Keep 5MB limit or adjust as needed, or remove as per previous discussion
    fileFilter: (req, file, cb) => { // <-- RE-ENABLED FILE FILTER
        console.log('File mimetype received by multer:', file.mimetype); // Log mimetype
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            // Provide a more specific error for non-image files
            cb(new Error('Invalid file type. Only image files are allowed!'), false);
        }
    }
});

/*
 * @route   POST /api/upload/image
 * @desc    Upload an image to Cloudinary
 * @access  Public (removed authMiddleware for registration uploads)
 * @middleware upload.single('image'): 'image' is the field name expected in the form-data
 */
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No image file uploaded.' });
        }

        console.log('Received file for Cloudinary upload:', {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Convert buffer to data URI scheme for Cloudinary upload
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'dating_app_images', // Optional: saves images in a specific folder in your Cloudinary account
            resource_type: "auto"
        });

        if (result && result.secure_url) {
            res.status(200).json({
                msg: 'Image uploaded successfully!',
                imageUrl: result.secure_url,
            });
        } else {
            console.error('Cloudinary upload response was incomplete or failed:', result);
            throw new Error('Cloudinary upload failed: Missing secure_url in response.');
        }

    } catch (error) {
        console.error('Image upload error in route:', error.message);
        // Ensure error response is always JSON
        res.status(500).json({ msg: error.message || 'Server error during image upload.' });
    }
});

module.exports = router;
