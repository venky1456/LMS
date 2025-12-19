import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './MentorDashboard.css';

const MentorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Course creation (step-based UI, same API logic)
  const [createStep, setCreateStep] = useState(1);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: '',
  });
  const [createdCourse, setCreatedCourse] = useState(null);

  // Course assignment UI
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchStudents();
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

  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/users/students');
      setStudents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students. Please try again or contact admin.');
    }
  };

  // === Existing business logic: create course (API unchanged) ===
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: newCourse.title,
        description: newCourse.description,
        // category is UI-only for now; not sent to backend to avoid schema changes
      };
      const response = await axios.post('/api/courses', payload);
      setCourses([...courses, response.data]);
      setCreatedCourse(response.data);
      toast.success('Course created successfully!');
      setCreateStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      await axios.delete(`/api/courses/${courseId}`);
      setCourses(courses.filter((course) => course._id !== courseId));
      toast.success('Course deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    }
  };

  // === Existing business logic: assign course ===
  const handleAssignCourse = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentIds = Array.from(formData.getAll('studentIds'));

    if (studentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      await axios.post(`/api/courses/${selectedCourse._id}/assign`, {
        studentIds: studentIds,
      });
      toast.success('Course assigned successfully!');
      setShowAssignForm(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign course');
    }
  };

  const totalCourses = courses.length;
  const totalAssignedStudents = new Set(
    courses.flatMap((c) => (c.assignedStudents || []).map((s) => s.toString()))
  ).size;

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  const renderDashboard = () => (
    <>
      <div className="mentor-dashboard-header">
        <h1>Welcome back, {user?.name || 'Mentor'}</h1>
        <p className="mentor-welcome-subtitle">
          Manage your courses, students, and track learning progress from a single place.
        </p>
        <div className="mentor-badge-row">
          <span
            className={`badge-pill ${
              user?.isApproved ? 'badge-approved' : 'badge-pending'
            }`}
          >
            {user?.isApproved ? 'Approved Mentor' : 'Pending Approval'}
          </span>
          <span className="badge-pill badge-role">Role: Mentor</span>
        </div>
      </div>

      <div className="mentor-overview-grid">
        <div className="card mentor-overview-card">
          <div className="mentor-overview-label">Courses Created</div>
          <div className="mentor-overview-value">{totalCourses}</div>
        </div>
        <div className="card mentor-overview-card">
          <div className="mentor-overview-label">Students Assigned</div>
          <div className="mentor-overview-value">{totalAssignedStudents}</div>
        </div>
      </div>

      <div className="card">
        <div className="mentor-section-header">
          <div>
            <h2>Quick Actions</h2>
            <p className="mentor-section-description">
              Jump directly into the most common mentor workflows.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setActiveTab('create');
              setCreateStep(1);
              setCreatedCourse(null);
            }}
          >
            Create New Course
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setActiveTab('courses')}
          >
            View My Courses
          </button>
        </div>
      </div>
    </>
  );

  const renderCreateCourse = () => (
    <div className="card">
      <div className="mentor-section-header">
        <div>
          <h2>Create Course</h2>
          <p className="mentor-section-description">
            Guided, step-by-step creation flow using the existing course and chapter APIs.
          </p>
        </div>
      </div>

      <div className="mentor-stepper">
        <div className={`mentor-step ${createStep === 1 ? 'active' : ''}`}>
          <div className="mentor-step-circle">1</div>
          <span>Course Details</span>
        </div>
        <div className={`mentor-step ${createStep === 2 ? 'active' : ''}`}>
          <div className="mentor-step-circle">2</div>
          <span>Chapters</span>
        </div>
        <div className={`mentor-step ${createStep === 3 ? 'active' : ''}`}>
          <div className="mentor-step-circle">3</div>
          <span>Review</span>
        </div>
      </div>

      {createStep === 1 && (
        <form onSubmit={handleCreateCourse}>
          <div className="input-group">
            <label>Course Title</label>
            <input
              type="text"
              value={newCourse.title}
              onChange={(e) =>
                setNewCourse({ ...newCourse, title: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse({ ...newCourse, description: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label>Category (optional, UI only)</label>
            <input
              type="text"
              value={newCourse.category}
              onChange={(e) =>
                setNewCourse({ ...newCourse, category: e.target.value })
              }
              placeholder="e.g. Web Development"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save &amp; Continue
          </button>
        </form>
      )}

      {createStep === 2 && createdCourse && (
        <div>
          <p className="mentor-section-description" style={{ marginBottom: '16px' }}>
            Your course has been created. Use the chapter manager to add content
            chapter by chapter.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/course/${createdCourse._id}/manage`)}
          >
            Open Chapter Builder
          </button>
          <span className="mentor-pill-muted" style={{ marginLeft: '10px' }}>
            (Existing chapter management flow)
          </span>
          <div style={{ marginTop: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCreateStep(3)}
            >
              I&apos;ve finished adding chapters
            </button>
          </div>
        </div>
      )}

      {createStep === 3 && createdCourse && (
        <div>
          <h3>Review</h3>
          <p className="mentor-section-description" style={{ marginBottom: '16px' }}>
            Quick summary of your course before you start assigning it to students.
          </p>
          <p>
            <strong>Title:</strong> {createdCourse.title}
          </p>
          <p>
            <strong>Description:</strong> {createdCourse.description}
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveTab('courses');
                setCreateStep(1);
                setNewCourse({ title: '', description: '', category: '' });
              }}
            >
              Finish &amp; Go to My Courses
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setCreateStep(2)}
            >
              Back to Chapters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCourses = () => (
    <div className="card">
      <div className="mentor-section-header">
        <div>
          <h2>My Courses</h2>
          <p className="mentor-section-description">
            Manage existing courses, chapters, assignments, and track progress.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setActiveTab('create');
            setCreateStep(1);
            setCreatedCourse(null);
          }}
        >
          Create Course
        </button>
      </div>

      {courses.length === 0 ? (
        <p>No courses yet. Create your first course to get started.</p>
      ) : (
        <table className="mentor-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Students Assigned</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{course.title}</div>
                  <div className="mentor-section-description">
                    {course.description}
                  </div>
                </td>
                <td>{course.assignedStudents?.length || 0}</td>
                <td>
                  <span
                    className={`mentor-status-pill ${
                      course.isActive ? 'mentor-status-active' : 'mentor-status-inactive'
                    }`}
                  >
                    {course.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="action-buttons">
                    <button
                      onClick={() => navigate(`/course/${course._id}/manage`)}
                      className="btn btn-secondary btn-sm"
                    >
                      Chapters
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/mentor/course/${course._id}/progress`)
                      }
                      className="btn btn-info btn-sm"
                    >
                      Progress
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowAssignForm(true);
                      }}
                      className="btn btn-success btn-sm"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAssignForm && selectedCourse && (
        <div style={{ marginTop: '20px' }}>
          <hr
            style={{
              borderColor: 'rgba(148, 163, 184, 0.3)',
              margin: '16px 0',
            }}
          />
          <h3>Assign Students to: {selectedCourse.title}</h3>
          <form onSubmit={handleAssignCourse}>
            <div className="input-group">
              <label>Select Students</label>
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                }}
              >
                {students.map((student) => (
                  <div key={student._id} style={{ marginBottom: '8px' }}>
                    <label>
                      <input
                        type="checkbox"
                        name="studentIds"
                        value={student._id}
                        defaultChecked={selectedCourse.assignedStudents?.some(
                          (id) => id.toString() === student._id
                        )}
                        style={{ marginRight: '8px' }}
                      />
                      {student.name} ({student.email})
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary">
                Assign to Course
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssignForm(false);
                  setSelectedCourse(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const renderStudentProgressHint = () => (
    <div className="card">
      <div className="mentor-section-header">
        <div>
          <h2>Student Progress</h2>
          <p className="mentor-section-description">
            View detailed progress per course using the existing progress view.
          </p>
        </div>
      </div>
      {courses.length === 0 ? (
        <p>Create a course and assign students to start tracking progress.</p>
      ) : (
        <table className="mentor-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Students</th>
              <th style={{ textAlign: 'right' }}>Open Progress</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course._id}>
                <td>{course.title}</td>
                <td>{course.assignedStudents?.length || 0}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-info btn-sm"
                    onClick={() =>
                      navigate(`/mentor/course/${course._id}/progress`)
                    }
                  >
                    View Progress
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="mentor-layout">
        <aside className="mentor-sidebar">
          <div className="mentor-sidebar-nav">
            <button
              className={`mentor-nav-item ${
                activeTab === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`mentor-nav-item ${
                activeTab === 'courses' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('courses')}
            >
              My Courses
            </button>
            <button
              className={`mentor-nav-item ${
                activeTab === 'create' ? 'active' : ''
              }`}
              onClick={() => {
                setActiveTab('create');
                setCreateStep(1);
                setCreatedCourse(null);
              }}
            >
              Create Course
            </button>
            <button
              className={`mentor-nav-item ${
                activeTab === 'progress' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('progress')}
            >
              Student Progress
            </button>
          </div>
        </aside>

        <main className="mentor-main">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'create' && renderCreateCourse()}
          {activeTab === 'courses' && renderCourses()}
          {activeTab === 'progress' && renderStudentProgressHint()}
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;
