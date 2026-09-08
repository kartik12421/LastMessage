const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2
  },
  description: {
    type: String,
    default: 'A community for anonymous discussions.'
  }
}, { timestamps: true });

module.exports = mongoose.model('Community', communitySchema);
