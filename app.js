const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const socketIo = require('socket.io');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

mongoose.set('debug', true);

const bookingsRouter = require('./routes/booking');
const User = require('./routes/users'); // Import the User model

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Helper function to generate random cab locations
function getRandomCabs(userLat, userLng, numCabs = 10) {
    const cabs = [];
    for (let i = 0; i < numCabs; i++) {
        const latOffset = (Math.random() - 0.5) * 0.02; // Random offset
        const lngOffset = (Math.random() - 0.5) * 0.02; // Random offset
        cabs.push({
            lat: userLat + latOffset,
            lng: userLng + lngOffset
        });
    }
    return cabs;
}

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a secure key
    resave: false,
    saveUninitialized: false
}));

// Flash middleware
app.use(flash());

// Pass flash messages to views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Initialize Passport and restore session
app.use(passport.initialize());
app.use(passport.session());

// Passport strategy for local authentication
passport.use(new LocalStrategy(
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'Incorrect email.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Incorrect password.' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.email); // Serialize user by email
});

passport.deserializeUser(async (email, done) => {
  try {
    const user = await User.findOne({ email });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// // WebSocket connection handler
// wss.on('connection', (ws) => {
//     console.log('New WebSocket connection');

//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message);
//             const userLocation = data.userLocation; 

//             if (data.action === 'bookCab') {
//                 console.log('Booking request received:', data);
//                 ws.send(JSON.stringify({
//                     type: 'bookingResponse',
//                     message: 'Cab booked successfully!',
//                     bookingDetails: {
//                         location: data.location,
//                         destination: data.destination,
//                         cabType: data.cabType
//                     }
//                 }));
//             } else if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
//                 const cabs = getRandomCabs(userLocation.lat, userLocation.lng);
//                 const updateMessage = {
//                     type: 'update',
//                     userLocation: userLocation,
//                     cabs: cabs
//                 };

//                 wss.clients.forEach(client => {
//                     if (client.readyState === WebSocket.OPEN) {
//                         client.send(JSON.stringify(updateMessage));
//                     }
//                 });
//             } else {
//                 console.warn('Invalid user location data:', userLocation);
//             }
//         } catch (error) {
//             console.error('Error handling WebSocket message:', error);
//         }
//     });

//     ws.on('close', () => {
//         console.log('WebSocket connection closed');
//     });

//     ws.on('error', (error) => {
//         console.error('WebSocket error:', error);
//     });
// });


// const io = socketIo(server);

// io.on('connection', (socket) => {
//     console.log('New Socket.IO client connected');

//     setInterval(() => {
//         const cabs = [
//             { lat: 37.7749, lng: -122.4194 },
//             { lat: 37.7749, lng: -122.4294 }
//         ];
//         socket.emit('updateCabs', cabs);
//     }, 5000); // Every 5 seconds

//     socket.on('bookCab', (data) => {
//         console.log('Cab booking request received:', data);
//         socket.emit('bookCabResponse', { success: true, message: 'Cab booked successfully!' });
//     });

//     socket.on('disconnect', () => {
//         console.log('Socket.IO client disconnected');
//     });
// });

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Ola', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/api', bookingsRouter);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


module.exports = app;
