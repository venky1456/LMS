import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';

const MentorCourseProgress = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [totalChapters, setTotalChapters] = useState(0);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get(`/api/progress/course/${courseId}/students`);
        setCourse(res.data.course);
        setStudents(res.data.students || []);
        setTotalChapters(res.data.totalChapters || 0);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load course progress');
        navigate('/mentor/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [courseId, navigate]);

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!course) {
    return <div className="container">Course not found</div>;
  }

  return (
    <div className="container">
      <button
        onClick={() => navigate('/mentor/dashboard')}
        className="btn btn-secondary"
        style={{ marginBottom: '20px' }}
      >
        ← Back to Dashboard
      </button>

      <div className="card">
        <h1>Student Progress: {course.title}</h1>
        <p>{course.description}</p>
        <p>
          <strong>Total Chapters:</strong> {totalChapters}
        </p>
      </div>

      <div className="card">
        <h2>Enrolled Students</h2>
        {students.length === 0 ? (
          <p>No students assigned to this course yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Progress</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Chapters</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{student.name}</td>
                  <td style={{ padding: '10px' }}>{student.email}</td>
                  <td style={{ padding: '10px' }}>
                    {student.completionPercentage}%
                  </td>
                  <td style={{ padding: '10px' }}>
                    {student.completedChapters} / {student.totalChapters}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MentorCourseProgress;


