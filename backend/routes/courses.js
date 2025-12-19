const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Progress = require('../models/Progress');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/courses
// @desc    Create a new course (Mentor only)
// @access  Private/Mentor
router.post('/', protect, authorize('mentor'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const course = await Course.create({
      title,
      description,
      mentorId: req.user._id,
    });

    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/courses/my
// @desc    Get courses created by mentor or assigned to student
// @access  Private/Mentor or Student
router.get('/my', protect, async (req, res) => {
  try {
    if (req.user.role === 'mentor') {
      const courses = await Course.find({ mentorId: req.user._id })
        .populate('mentorId', 'name email')
        .populate('assignedStudents', 'name email')
        .sort({ createdAt: -1 });
      res.json(courses);
    } else if (req.user.role === 'student') {
      const courses = await Course.find({ assignedStudents: req.user._id })
        .populate('mentorId', 'name email')
        .sort({ createdAt: -1 });
      res.json(courses);
    } else {
      // Admin can see all courses
      const courses = await Course.find()
        .populate('mentorId', 'name email')
        .populate('assignedStudents', 'name email')
        .sort({ createdAt: -1 });
      res.json(courses);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('mentorId', 'name email')
      .populate('assignedStudents', 'name email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access permissions
    if (req.user.role === 'student') {
      if (!course.assignedStudents.some(student => student._id.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'Access denied. Course not assigned to you' });
      }
    } else if (req.user.role === 'mentor') {
      if (course.mentorId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Not your course' });
      }
    }

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course (Mentor only - own courses)
// @access  Private/Mentor
router.put('/:id', protect, authorize('mentor'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    const { title, description } = req.body;
    if (title) course.title = title;
    if (description) course.description = description;

    await course.save();

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course (Mentor only - own courses)
// @access  Private/Mentor
router.delete('/:id', protect, authorize('mentor'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    // Delete associated chapters and progress
    await Chapter.deleteMany({ courseId: course._id });
    await Progress.deleteMany({ courseId: course._id });

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/courses/:id/assign
// @desc    Assign course to students (Mentor or Admin)
// @access  Private/Mentor or Admin
router.post('/:id/assign', protect, authorize('mentor', 'admin'), async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of student IDs' });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Mentor can only assign their own courses, admin can assign any course
    if (req.user.role === 'mentor' && course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to assign this course' });
    }

    // Verify all IDs are valid students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
      isActive: true,
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some student IDs are invalid or inactive' });
    }

    // Update assigned students (avoid duplicates)
    const uniqueStudentIds = [...new Set([...course.assignedStudents.map(id => id.toString()), ...studentIds])];
    course.assignedStudents = uniqueStudentIds;
    await course.save();

    const updatedCourse = await Course.findById(course._id)
      .populate('mentorId', 'name email')
      .populate('assignedStudents', 'name email');

    res.json({ message: 'Course assigned successfully', course: updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/courses/:id/assign
// @desc    Reassign course to students - replace existing assignments (Admin only)
// @access  Private/Admin
router.put('/:id/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'Please provide an array of student IDs' });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // If studentIds is empty, just clear assignments
    if (studentIds.length === 0) {
      course.assignedStudents = [];
      await course.save();
      return res.json({ message: 'Course assignments cleared', course });
    }

    // Verify all IDs are valid students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
      isActive: true,
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some student IDs are invalid or inactive' });
    }

    // Replace assigned students
    course.assignedStudents = studentIds;
    await course.save();

    const updatedCourse = await Course.findById(course._id)
      .populate('mentorId', 'name email')
      .populate('assignedStudents', 'name email');

    res.json({ message: 'Course reassigned successfully', course: updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/courses/:id/activate
// @desc    Activate/Deactivate course (Admin only)
// @access  Private/Admin
router.put('/:id/activate', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.isActive = isActive !== undefined ? isActive : true;
    await course.save();

    const updatedCourse = await Course.findById(id)
      .populate('mentorId', 'name email')
      .populate('assignedStudents', 'name email');

    res.json({
      message: `Course ${isActive ? 'activated' : 'deactivated'} successfully`,
      course: updatedCourse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course (Mentor for own courses, Admin for any course)
// @access  Private/Mentor or Admin
router.delete('/:id', protect, authorize('mentor', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Mentor can only delete their own courses, admin can delete any course
    if (req.user.role === 'mentor' && course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    // Delete associated chapters and progress
    await Chapter.deleteMany({ courseId: course._id });
    await Progress.deleteMany({ courseId: course._id });

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
