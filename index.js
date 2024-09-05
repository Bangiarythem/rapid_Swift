const express = require('express');
const router = express.Router();
const User = require('./users');
const Booking = require('./booking');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const WebSocket = require('ws');

// Initialize WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const userLocation = data.userLocation; 

            if (data.action === 'bookCab') {
                console.log('Booking request received:', data);
                ws.send(JSON.stringify({
                    type: 'bookingResponse',
                    message: 'Cab booked successfully!',
                    bookingDetails: {
                        location: data.location,
                        destination: data.destination,
                        cabType: data.cabType
                    }
                }));
            } else if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
                const cabs = getRandomCabs(userLocation.lat, userLocation.lng);
                const updateMessage = {
                    type: 'update',
                    userLocation: userLocation,
                    cabs: cabs
                };

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(updateMessage));
                    }
                });
            } else {
                console.warn('Invalid user location data:', userLocation);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// GET home page
router.get('/', (req, res) => {
    res.render('index', { title: 'Entry' });
});

// GET register page for users
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

// POST register handler for users
router.post('/register', [
    body('name').not().isEmpty().trim().escape().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 5 }).trim().withMessage('Password must be at least 5 characters long')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/register');
    }

    try {
        const { name, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) {
            req.flash('error_msg', 'User already exists');
            return res.redirect('/register');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ name, email, password: hashedPassword });
        await user.save();
        req.flash('success_msg', 'Registration successful');
        res.redirect('/register');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST login handler for users
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('password').exists().trim().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/register');
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'Invalid Credentials');
            return res.redirect('/register');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid Credentials');
            return res.redirect('/register');
        }
        req.flash('success_msg', 'Login successful');
        res.redirect('/book-cab');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// GET book cab page
router.get('/book-cab', (req, res) => {
    res.render('book-cab', { title: 'Book a Cab' });
});

// POST book cab handler
router.post('/book-cab', async (req, res) => {
    try {
        const { userEmail, destination, cabType } = req.body;

        // Find the user by email
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Define available cab types and rates
        const cabs = [
            { id: 1, type: 'standard', rate: 10 },
            { id: 2, type: 'premium', rate: 20 },
            { id: 3, type: 'luxury', rate: 30 }
        ];

        // Find the selected cab based on the cab type provided
        const selectedCab = cabs.find(cab => cab.type === cabType);
        if (!selectedCab) {
            return res.status(400).json({ message: 'Invalid cab type' });
        }

        // Create a new booking in the database
        const newBooking = new Booking({
            user: user._id,
            userEmail: userEmail,
            destination: destination,
            cabType: cabType,
            status: 'Pending'
        });

        await newBooking.save();

        // Respond with a success message and the calculated fare
        res.json({ message: 'Booking successful', fare: selectedCab.rate, booking: newBooking });
    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ message: 'An error occurred while processing your booking' });
    }
});




const session = require('express-session');
const flash = require('connect-flash');

const app = express();

// Set up session middleware
app.use(session({
    secret: 'ullalal', // Replace with your secret key
    resave: false,
    saveUninitialized: true
}));

// Set up flash messages middleware
app.use(flash());

// Other middlewares and routes

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: false }));


// Render profile page with flash messages
router.get('/profile', async (req, res) => {
    try {
        // Fetch the specific user from the database
        const user = await User.findOne(); // Adjust based on your actual user identification method
  
        if (!user) {
            return res.status(404).send('User not found');
        }
  
        // Get flash messages
        const messages = {
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        };

        // Render profile page with user data and flash messages
        res.render('profile', { user, messages });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Handle profile updates
router.post('/profile', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('profile', { 
            user: req.body, 
            errors: errors.array() 
        });
    }

    try {
        const { name, email, password } = req.body;
        const user = await User.findOne(); // Adjust based on your actual user identification method

        user.name = name;
        user.email = email;

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        req.flash('success_msg', 'Profile updated successfully!');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while updating the profile');
        res.redirect('/profile');
    }
});

app.use('/', router);

module.exports = router;
