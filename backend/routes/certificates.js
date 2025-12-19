const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Progress = require('../models/Progress');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Generate unique certificate number
const generateCertificateNumber = () => {
  return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// @route   GET /api/certificates/:courseId
// @desc    Generate and download certificate (Student only, after 100% completion)
// @access  Private/Student
router.get('/:courseId', protect, authorize('student'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    // Get course
    const course = await Course.findById(courseId).populate('mentorId', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify student is enrolled
    if (!course.assignedStudents.some(id => id.toString() === studentId.toString())) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Get all chapters for the course
    const totalChapters = await Chapter.countDocuments({ courseId });
    if (totalChapters === 0) {
      return res.status(400).json({ message: 'Course has no chapters yet' });
    }

    // Get completed chapters
    const completedChapters = await Progress.countDocuments({
      studentId,
      courseId,
    });

    const completionPercentage = Math.round((completedChapters / totalChapters) * 100);

    // Check if 100% completed
    if (completionPercentage < 100) {
      return res.status(403).json({ 
        message: `Certificate available only after 100% completion. Current progress: ${completionPercentage}%` 
      });
    }

    // Get or create certificate
    let certificate = await Certificate.findOne({ studentId, courseId });
    if (!certificate) {
      certificate = await Certificate.create({
        studentId,
        courseId,
        certificateNumber: generateCertificateNumber(),
      });
    }

    // Get student info
    const student = await User.findById(studentId);

    // Generate PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${course.title.replace(/\s+/g, '-')}-${student.name.replace(/\s+/g, '-')}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Certificate design
    doc.fontSize(30)
       .font('Helvetica-Bold')
       .text('Certificate of Completion', { align: 'center' });

    doc.moveDown();
    doc.fontSize(16)
       .font('Helvetica')
       .text('This is to certify that', { align: 'center' });

    doc.moveDown();
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(student.name, { align: 'center' });

    doc.moveDown();
    doc.fontSize(16)
       .font('Helvetica')
       .text('has successfully completed the course', { align: 'center' });

    doc.moveDown();
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(course.title, { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Certificate Number: ${certificate.certificateNumber}`, { align: 'center' });

    doc.moveDown();
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Date of Issue: ${certificate.issuedAt.toLocaleDateString()}`, { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Mentor: ${course.mentorId.name}`, { align: 'center' });

    // Add border
    doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
       .stroke();

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/certificates/verify/:certificateNumber
// @desc    Verify certificate
// @access  Public
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const certificate = await Certificate.findOne({ certificateNumber })
      .populate('studentId', 'name email')
      .populate('courseId', 'title description');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json({
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.studentId.name,
        courseTitle: certificate.courseId.title,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
