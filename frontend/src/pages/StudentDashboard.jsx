import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const StudentDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    fetchProgress();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses/my');
      setCourses(response.data);
    } catch (error) {
      toast.error('Failed to fetch courses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get('/api/progress/my');
      setProgress(response.data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const handleViewCourse = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleDownloadCertificate = async (courseId) => {
    try {
      const response = await axios.get(`/api/certificates/${courseId}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${courseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download certificate');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>My Assigned Courses</h1>
      {courses.length === 0 ? (
        <div className="card">
          <h2 style={{ marginBottom: '8px' }}>No Courses Assigned Yet</h2>
          <p style={{ marginBottom: '16px' }}>
            You don&apos;t have any courses assigned to your account right now.
            Course enrollment is controlled by your mentor or platform admin.
          </p>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(148, 163, 184, 0.4)',
              background:
                'radial-gradient(circle at top left, rgba(30,64,175,0.25), rgba(15,23,42,0.9))',
            }}
          >
            <h3 style={{ marginBottom: '6px', fontSize: '1rem' }}>Contact Mentor / Admin</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              Please reach out to your mentor or the platform administrator to request course
              assignment.
            </p>
            <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
              <strong>Admin Name:</strong> Venkatesh Gokavarapu
            </p>
            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              <strong>Admin Email:</strong>{' '}
              <a href="mailto:admin@example.com" style={{ color: '#60a5fa' }}>
                2200080121.aids@gmail.com
              </a>
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Tip: Include your full name and any specific course or topic you&apos;re interested in.
            </p>
          </div>
        </div>
      ) : (
        courses.map((course) => {
          const courseProgress = progress[course._id] || {
            completionPercentage: 0,
            totalChapters: 0,
            completedChapters: 0,
          };
          const isCompleted = courseProgress.completionPercentage === 100;
          const courseStatus = isCompleted ? 'Completed' : 'In Progress';

          return (
            <div key={course._id} className="card">
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p>
                <strong>Mentor:</strong> {course.mentorId?.name || 'Unknown'}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    backgroundColor: isCompleted ? 'rgba(40,167,69,0.1)' : 'rgba(59,130,246,0.1)',
                    color: isCompleted ? '#22c55e' : '#3b82f6',
                  }}
                >
                  {courseStatus}
                </span>
              </p>
              <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Overall Progress: {courseProgress.completionPercentage}%</span>
                  <span>
                    {courseProgress.completedChapters} / {courseProgress.totalChapters} chapters
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '20px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${courseProgress.completionPercentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => handleViewCourse(course._id)}
                className="btn btn-primary"
                style={{ marginRight: '10px' }}
              >
                View Course
              </button>
              <button
                onClick={() => handleDownloadCertificate(course._id)}
                className="btn btn-success"
                disabled={!isCompleted}
                style={{ opacity: isCompleted ? 1 : 0.6, cursor: isCompleted ? 'pointer' : 'not-allowed' }}
              >
                Download Certificate
              </button>
              <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Certificate unlocks after completing all chapters of this course.
              </p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default StudentDashboard;
