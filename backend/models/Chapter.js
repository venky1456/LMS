const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a chapter title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a chapter description'],
    trim: true,
  },
  image: {
    type: String,
    default: '',
  },
  videoLink: {
    type: String,
    required: [true, 'Please provide a video link'],
    trim: true,
  },
  sequenceOrder: {
    type: Number,
    required: true,
    min: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure unique sequence order per course
chapterSchema.index({ courseId: 1, sequenceOrder: 1 }, { unique: true });

module.exports = mongoose.model('Chapter', chapterSchema);
