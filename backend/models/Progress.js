const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
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
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one progress entry per student-chapter combination
progressSchema.index({ studentId: 1, chapterId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
