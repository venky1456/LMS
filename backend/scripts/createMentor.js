const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');

const createMentor = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const mentorEmail = process.argv[2] || 'mentor@lms.com';
    const mentorPassword = process.argv[3] || 'mentor123';
    const mentorName = process.argv[4] || 'Mentor User';

    // Check if mentor already exists
    const existingMentor = await User.findOne({ email: mentorEmail });
    if (existingMentor) {
      console.log('Mentor user already exists with this email');
      process.exit(0);
    }

    // Create mentor user
    const mentor = await User.create({
      name: mentorName,
      email: mentorEmail,
      password: mentorPassword,
      role: 'mentor',
      isApproved: false, // Requires admin approval
    });

    console.log('Mentor user created successfully!');
    console.log('Email:', mentor.email);
    console.log('Password:', mentorPassword);
    console.log('Role:', mentor.role);
    console.log('Status: Pending Admin Approval');

    process.exit(0);
  } catch (error) {
    console.error('Error creating mentor:', error);
    process.exit(1);
  }
};

createMentor();
