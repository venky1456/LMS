const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  certificateNumber: {
    type: String,
    unique: true,
    required: true,
  },
});

// Ensure one certificate per student-course combination
certificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
