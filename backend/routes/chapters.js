const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/courses/:courseId/chapters
// @desc    Create a new chapter (Mentor only)
// @access  Private/Mentor
router.post('/:courseId/chapters', protect, authorize('mentor'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, image, videoLink, sequenceOrder } = req.body;

    if (!title || !description || !videoLink || !sequenceOrder) {
      return res.status(400).json({ 
        message: 'Title, description, videoLink, and sequenceOrder are required' 
      });
    }

    // Verify course exists and belongs to mentor
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add chapters to this course' });
    }

    const chapter = await Chapter.create({
      courseId,
      title,
      description,
      image: image || '',
      videoLink,
      sequenceOrder,
    });

    res.status(201).json(chapter);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A chapter with this sequence order already exists for this course' 
      });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/courses/:courseId/chapters
// @desc    Get all chapters for a course
// @access  Private
router.get('/:courseId/chapters', protect, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access permissions
    if (req.user.role === 'student') {
      if (!course.assignedStudents.some(student => student.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Access denied. Course not assigned to you' });
      }
    } else if (req.user.role === 'mentor') {
      if (course.mentorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your course' });
      }
    }

    const chapters = await Chapter.find({ courseId })
      .sort({ sequenceOrder: 1 });

    res.json(chapters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/chapters/:id
// @desc    Get single chapter by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).populate('courseId');

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const course = chapter.courseId;

    // Check access permissions
    if (req.user.role === 'student') {
      if (!course.assignedStudents.some(student => student.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Access denied. Course not assigned to you' });
      }
    } else if (req.user.role === 'mentor') {
      if (course.mentorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your course' });
      }
    }

    res.json(chapter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/chapters/:id
// @desc    Update chapter (Mentor only)
// @access  Private/Mentor
router.put('/:id', protect, authorize('mentor'), async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).populate('courseId');

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const course = chapter.courseId;

    if (course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this chapter' });
    }

    const { title, description, image, videoLink, sequenceOrder } = req.body;
    if (title) chapter.title = title;
    if (description) chapter.description = description;
    if (image !== undefined) chapter.image = image;
    if (videoLink) chapter.videoLink = videoLink;
    if (sequenceOrder) chapter.sequenceOrder = sequenceOrder;

    await chapter.save();

    res.json(chapter);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A chapter with this sequence order already exists for this course' 
      });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/chapters/:id
// @desc    Delete chapter (Mentor only)
// @access  Private/Mentor
router.delete('/:id', protect, authorize('mentor'), async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).populate('courseId');

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const course = chapter.courseId;

    if (course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this chapter' });
    }

    await Chapter.findByIdAndDelete(req.params.id);

    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
