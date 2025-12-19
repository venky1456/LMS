const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/analytics/summary
// @desc    Get platform-wide analytics (Admin only)
// @access  Private/Admin
router.get('/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalUsers, totalStudents, totalMentors, totalCourses, totalChapters, totalChapterCompletions] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'mentor' }),
        Course.countDocuments(),
        Chapter.countDocuments(),
        Progress.countDocuments(),
      ]);

    // Calculate total course completions (student has completed all chapters of a course)
    const chaptersByCourse = await Chapter.aggregate([
      {
        $group: {
          _id: '$courseId',
          totalChapters: { $sum: 1 },
        },
      },
    ]);

    const chaptersByCourseMap = {};
    chaptersByCourse.forEach((entry) => {
      chaptersByCourseMap[entry._id.toString()] = entry.totalChapters;
    });

    const progressByStudentCourse = await Progress.aggregate([
      {
        $group: {
          _id: { courseId: '$courseId', studentId: '$studentId' },
          completedChapters: { $sum: 1 },
        },
      },
    ]);

    let totalCourseCompletions = 0;
    progressByStudentCourse.forEach((entry) => {
      const courseId = entry._id.courseId.toString();
      const totalForCourse = chaptersByCourseMap[courseId] || 0;
      if (totalForCourse > 0 && entry.completedChapters >= totalForCourse) {
        totalCourseCompletions += 1;
      }
    });

    res.json({
      totalUsers,
      totalStudents,
      totalMentors,
      totalCourses,
      totalChapters,
      totalChapterCompletions,
      // For AdminPanel usage
      totalCompletions: totalCourseCompletions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/analytics/students/progress
// @desc    Get all students with their progress (Admin only)
// @access  Private/Admin
router.get('/students/progress', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseId, progressStatus, completionLevel } = req.query;

    // Get all students
    let students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Get all courses for reference
    const courses = await Course.find().populate('mentorId', 'name email');

    // Get all progress entries
    let progressQuery = {};
    if (courseId) {
      progressQuery.courseId = courseId;
    }
    const allProgress = await Progress.find(progressQuery)
      .populate('courseId', 'title')
      .populate('chapterId', 'title sequenceOrder');

    // Get all certificates
    const certificates = await Certificate.find().populate('courseId', 'title');

    // Build student progress data
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        // Get courses assigned to this student
        const assignedCourses = courses.filter((course) =>
          course.assignedStudents.some(
            (id) => id.toString() === student._id.toString()
          )
        );

        // Calculate progress for each course
        const courseProgress = await Promise.all(
          assignedCourses.map(async (course) => {
            const totalChapters = await Chapter.countDocuments({
              courseId: course._id,
            });

            const completedChapters = await Progress.countDocuments({
              studentId: student._id,
              courseId: course._id,
            });

            const completionPercentage =
              totalChapters > 0
                ? Math.round((completedChapters / totalChapters) * 100)
                : 0;

            // Get current chapter (first incomplete chapter)
            const allChapters = await Chapter.find({
              courseId: course._id,
            }).sort({ sequenceOrder: 1 });

            const completedChapterIds = (
              await Progress.find({
                studentId: student._id,
                courseId: course._id,
              })
            ).map((p) => p.chapterId.toString());

            const currentChapter =
              allChapters.find(
                (ch) => !completedChapterIds.includes(ch._id.toString())
              ) || allChapters[allChapters.length - 1];

            // Check certificate status
            const hasCertificate = certificates.some(
              (cert) =>
                cert.studentId.toString() === student._id.toString() &&
                cert.courseId._id.toString() === course._id.toString()
            );

            return {
              courseId: course._id,
              courseTitle: course.title,
              mentorName: course.mentorId?.name || 'Unknown',
              totalChapters,
              completedChapters,
              completionPercentage,
              currentChapter: currentChapter
                ? {
                    title: currentChapter.title,
                    sequenceOrder: currentChapter.sequenceOrder,
                  }
                : null,
              certificateStatus: hasCertificate ? 'Issued' : 'Not Issued',
            };
          })
        );

        // Apply filters
        let shouldInclude = true;

        if (courseId) {
          shouldInclude = courseProgress.some(
            (cp) => cp.courseId.toString() === courseId
          );
        }

        if (progressStatus) {
          if (progressStatus === 'in-progress') {
            shouldInclude = courseProgress.some(
              (cp) => cp.completionPercentage > 0 && cp.completionPercentage < 100
            );
          } else if (progressStatus === 'completed') {
            shouldInclude = courseProgress.some(
              (cp) => cp.completionPercentage === 100
            );
          } else if (progressStatus === 'not-started') {
            shouldInclude = courseProgress.some(
              (cp) => cp.completionPercentage === 0
            );
          }
        }

        if (completionLevel) {
          const avgCompletion =
            courseProgress.length > 0
              ? courseProgress.reduce(
                  (sum, cp) => sum + cp.completionPercentage,
                  0
                ) / courseProgress.length
              : 0;

          if (completionLevel === 'high' && avgCompletion < 70) {
            shouldInclude = false;
          } else if (completionLevel === 'medium' && (avgCompletion < 30 || avgCompletion >= 70)) {
            shouldInclude = false;
          } else if (completionLevel === 'low' && avgCompletion >= 30) {
            shouldInclude = false;
          }
        }

        if (!shouldInclude) return null;

        return {
          id: student._id,
          name: student.name,
          email: student.email,
          signupDate: student.createdAt,
          accountStatus: student.isActive ? 'Active' : 'Blocked',
          courses: courseProgress,
          totalCourses: courseProgress.length,
          avgCompletion:
            courseProgress.length > 0
              ? Math.round(
                  courseProgress.reduce(
                    (sum, cp) => sum + cp.completionPercentage,
                    0
                  ) / courseProgress.length
                )
              : 0,
        };
      })
    );

    // Filter out null entries
    const filteredStudents = studentsWithProgress.filter((s) => s !== null);

    res.json({
      students: filteredStudents,
      total: filteredStudents.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/analytics/mentors/activity
// @desc    Get mentor activity and contributions (Admin only)
// @access  Private/Admin
router.get('/mentors/activity', protect, authorize('admin'), async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' })
      .select('-password')
      .sort({ createdAt: -1 });

    const mentorActivity = await Promise.all(
      mentors.map(async (mentor) => {
        // Get courses created by this mentor
        const courses = await Course.find({ mentorId: mentor._id })
          .populate('assignedStudents', 'name email');

        // Calculate statistics for each course
        const courseStats = await Promise.all(
          courses.map(async (course) => {
            const totalChapters = await Chapter.countDocuments({
              courseId: course._id,
            });

            // Get progress for all students in this course
            const progressEntries = await Progress.find({
              courseId: course._id,
            });

            const studentProgress = {};
            progressEntries.forEach((entry) => {
              const studentId = entry.studentId.toString();
              if (!studentProgress[studentId]) {
                studentProgress[studentId] = 0;
              }
              studentProgress[studentId]++;
            });

            const enrolledStudents = course.assignedStudents.length;
            const activeStudents = Object.keys(studentProgress).length;

            // Calculate average completion
            let avgCompletion = 0;
            if (enrolledStudents > 0 && totalChapters > 0) {
              const totalCompletion = Object.values(studentProgress).reduce(
                (sum, completed) => sum + completed,
                0
              );
              avgCompletion = Math.round(
                (totalCompletion / (enrolledStudents * totalChapters)) * 100
              );
            }

            return {
              courseId: course._id,
              courseTitle: course.title,
              createdAt: course.createdAt,
              isActive: course.isActive,
              totalChapters,
              enrolledStudents,
              activeStudents,
              avgCompletion,
            };
          })
        );

        // Calculate total statistics
        const totalCourses = courses.length;
        const totalStudents = courses.reduce(
          (sum, course) => sum + course.assignedStudents.length,
          0
        );
        const activeCourses = courses.filter((c) => c.isActive).length;

        // Determine activity status
        const recentActivity = courses.some(
          (course) =>
            new Date(course.updatedAt || course.createdAt) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        const activityStatus = recentActivity ? 'Active' : 'Inactive';

        return {
          id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          isApproved: mentor.isApproved,
          isActive: mentor.isActive,
          signupDate: mentor.createdAt,
          activityStatus,
          totalCourses,
          activeCourses,
          totalStudents,
          courses: courseStats,
        };
      })
    );

    res.json({
      mentors: mentorActivity,
      total: mentorActivity.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


