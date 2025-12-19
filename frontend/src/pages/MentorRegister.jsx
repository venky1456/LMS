import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const MentorRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/mentor/dashboard');
    }
  }, [isAuthenticated]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await axios.post('/api/auth/register-mentor', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      toast.success(
        'Mentor registered successfully! Please wait for admin approval before logging in.'
      );
      navigate('/login');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Mentor registration failed'
      );
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2>Register as Mentor</h2>
        <p style={{ marginBottom: '15px', fontSize: '14px', color: '#555' }}>
          After registration, an admin must approve your account before you can log in.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Register as Mentor
          </button>
        </form>
        <p style={{ marginTop: '20px' }}>
          Already have an account? <a href="/login">Login here</a>
        </p>
        <p style={{ marginTop: '10px', fontSize: '14px' }}>
          Want to register as a student instead?{' '}
          <a href="/register">Go to student registration</a>
        </p>
      </div>
    </div>
  );
};

export default MentorRegister;


