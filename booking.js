
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  bookingCode: {
    type: String,
    unique: true,
    default: function() {
      return uuidv4(); // Generate a unique identifier by default
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  cabType: {
    type: String,
    enum: ['standard', 'premium', 'luxury'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  }
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

module.exports = Booking;
