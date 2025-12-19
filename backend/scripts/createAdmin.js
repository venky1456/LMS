const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const adminEmail = process.argv[2] || 'admin@lms.com';
    const adminPassword = process.argv[3] || 'admin123';
    const adminName = process.argv[4] || 'Admin User';

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      // If admin exists, update password and role and save (will trigger pre-save hashing)
      admin.name = adminName;
      admin.password = adminPassword;
      admin.role = 'admin';
      admin.isApproved = true;
      await admin.save();

      console.log('Admin user already existed. Password and role updated.');
      console.log('Email:', admin.email);
      console.log('Password:', adminPassword);
      console.log('Role:', admin.role);
      process.exit(0);
    }

    // Create new admin user (password will be hashed by User pre-save hook)
    admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isApproved: true,
    });

    console.log('Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password:', adminPassword);
    console.log('Role:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
