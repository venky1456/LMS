const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/progress/:chapterId/complete
// @desc    Mark chapter as complete (Student only)
// @access  Private/Student
router.post('/:chapterId/complete', protect, authorize('student'), async (req, res) => {
  try {
    const { chapterId } = req.params;
    const studentId = req.user._id;

    // Get chapter and verify it exists
    const chapter = await Chapter.findById(chapterId).populate('courseId');
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const course = chapter.courseId;

    // Verify student is assigned to the course
    if (!course.assignedStudents.some(id => id.toString() === studentId.toString())) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Check if chapter is already completed
    const existingProgress = await Progress.findOne({ studentId, chapterId });
    if (existingProgress) {
      return res.status(400).json({ message: 'Chapter already completed' });
    }

    // Get all chapters for the course, ordered by sequence
    const allChapters = await Chapter.find({ courseId: course._id })
      .sort({ sequenceOrder: 1 });

    // Find current chapter index
    const currentChapterIndex = allChapters.findIndex(
      ch => ch._id.toString() === chapterId
    );

    // Check if previous chapters are completed (except for first chapter)
    if (currentChapterIndex > 0) {
      const previousChapters = allChapters.slice(0, currentChapterIndex);
      const previousChapterIds = previousChapters.map(ch => ch._id);

      const completedPreviousChapters = await Progress.countDocuments({
        studentId,
        chapterId: { $in: previousChapterIds },
        courseId: course._id,
      });

      if (completedPreviousChapters !== previousChapters.length) {
        return res.status(403).json({ 
          message: 'You must complete previous chapters in sequence before completing this chapter' 
        });
      }
    }

    // Create progress entry
    const progress = await Progress.create({
      studentId,
      courseId: course._id,
      chapterId,
    });

    res.status(201).json({ message: 'Chapter marked as complete', progress });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Chapter already completed' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/progress/my
// @desc    Get student's progress (Student only)
// @access  Private/Student
router.get('/my', protect, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get all progress entries for the student
    const progressEntries = await Progress.find({ studentId })
      .populate('courseId', 'title description')
      .populate('chapterId', 'title sequenceOrder')
      .sort({ completedAt: -1 });

    // Group by course
    const progressByCourse = {};

    progressEntries.forEach(entry => {
      const courseId = entry.courseId._id.toString();
      if (!progressByCourse[courseId]) {
        progressByCourse[courseId] = {
          course: entry.courseId,
          chapters: [],
          totalChapters: 0,
          completedChapters: 0,
          completionPercentage: 0,
        };
      }
      progressByCourse[courseId].chapters.push(entry.chapterId);
      progressByCourse[courseId].completedChapters++;
    });

    // Calculate completion percentages
    for (const courseId in progressByCourse) {
      const course = progressByCourse[courseId].course;
      const totalChapters = await Chapter.countDocuments({ courseId: course._id });
      progressByCourse[courseId].totalChapters = totalChapters;
      progressByCourse[courseId].completionPercentage = totalChapters > 0
        ? Math.round((progressByCourse[courseId].completedChapters / totalChapters) * 100)
        : 0;
    }

    res.json(progressByCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/progress/course/:courseId
// @desc    Get student's progress for a specific course
// @access  Private/Student
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    // Get course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // If student, verify enrollment
    if (req.user.role === 'student' && 
        !course.assignedStudents.some(id => id.toString() === studentId.toString())) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Get all chapters for the course
    const allChapters = await Chapter.find({ courseId })
      .sort({ sequenceOrder: 1 });

    // Get completed chapters for student
    const completedChapters = await Progress.find({
      studentId: req.user.role === 'student' ? studentId : req.query.studentId || studentId,
      courseId,
    }).populate('chapterId');

    const completedChapterIds = completedChapters.map(entry => 
      entry.chapterId._id.toString()
    );

    // Map chapters with completion status
    const chaptersWithProgress = allChapters.map(chapter => ({
      ...chapter.toObject(),
      isCompleted: completedChapterIds.includes(chapter._id.toString()),
      isLocked: req.user.role === 'student' ? (() => {
        const chapterIndex = allChapters.findIndex(ch => ch._id.toString() === chapter._id.toString());
        if (chapterIndex === 0) return false; // First chapter is never locked
        const previousChapter = allChapters[chapterIndex - 1];
        return !completedChapterIds.includes(previousChapter._id.toString());
      })() : false,
    }));

    const totalChapters = allChapters.length;
    const completedCount = completedChapterIds.length;
    const completionPercentage = totalChapters > 0 
      ? Math.round((completedCount / totalChapters) * 100) 
      : 0;

    res.json({
      course,
      chapters: chaptersWithProgress,
      progress: {
        totalChapters,
        completedChapters: completedCount,
        completionPercentage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/progress/course/:courseId/students
// @desc    Get progress for all students in a course (Mentor/Admin)
// @access  Private/Mentor or Admin
router.get('/course/:courseId/students', protect, authorize('mentor', 'admin'), async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate('assignedStudents', 'name email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // If mentor, ensure they own the course (admin bypasses this via authorize)
    if (req.user.role === 'mentor' &&
        course.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view progress for this course' });
    }

    const totalChapters = await Chapter.countDocuments({ courseId });

    // Get all progress entries for this course
    const progressEntries = await Progress.find({ courseId })
      .populate('studentId', 'name email');

    // Group progress by studentId
    const progressByStudent = {};
    progressEntries.forEach((entry) => {
      const studentId = entry.studentId._id.toString();
      if (!progressByStudent[studentId]) {
        progressByStudent[studentId] = 0;
      }
      progressByStudent[studentId] += 1;
    });

    const students = course.assignedStudents.map((student) => {
      const completedChapters = progressByStudent[student._id.toString()] || 0;
      const completionPercentage = totalChapters > 0
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

      return {
        id: student._id,
        name: student.name,
        email: student.email,
        completedChapters,
        totalChapters,
        completionPercentage,
      };
    });

    res.json({
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
      },
      totalChapters,
      students,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
