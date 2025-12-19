import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalMentors: 0,
    totalCourses: 0,
    totalCompletions: 0,
  });

  // User Management State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  // Student Progress State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [progressStatusFilter, setProgressStatusFilter] = useState('all');
  const [completionLevelFilter, setCompletionLevelFilter] = useState('all');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [courses, setCourses] = useState([]);

  // Course Management State
  const [allCourses, setAllCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState('all');
  const [assigningCourse, setAssigningCourse] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Mentor Activity State
  const [mentors, setMentors] = useState([]);
  const [mentorSearch, setMentorSearch] = useState('');
  const [expandedMentor, setExpandedMentor] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'students') {
      fetchStudents();
      fetchCourses();
    } else if (activeTab === 'courses') {
      fetchAllCourses();
      fetchUsers();
    } else if (activeTab === 'mentors') {
      fetchMentors();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/api/analytics/summary');
      setAnalytics(res.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (courseFilter !== 'all') params.courseId = courseFilter;
      if (progressStatusFilter !== 'all') params.progressStatus = progressStatusFilter;
      if (completionLevelFilter !== 'all') params.completionLevel = completionLevelFilter;

      const response = await api.get('/api/analytics/students/progress', { params });
      setStudents(response.data.students || []);
    } catch (error) {
      toast.error('Failed to fetch student progress');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/api/courses/my');
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchAllCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/courses/my');
      setAllCourses(response.data);
    } catch (error) {
      toast.error('Failed to fetch courses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/analytics/mentors/activity');
      setMentors(response.data.mentors || []);
    } catch (error) {
      toast.error('Failed to fetch mentor activity');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMentor = async (userId, isApproved) => {
    try {
      await api.put(`/api/users/${userId}/approve-mentor`, { isApproved });
      toast.success(`Mentor ${isApproved ? 'approved' : 'rejected'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update mentor status');
    }
  };

  const handleActivateUser = async (userId, isActive) => {
    try {
      await api.put(`/api/users/${userId}/activate`, { isActive });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user._id);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  };

  const handleSaveUser = async () => {
    try {
      await api.put(`/api/users/${editingUser}`, editForm);
      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleActivateCourse = async (courseId, isActive) => {
    try {
      await api.put(`/api/courses/${courseId}/activate`, { isActive });
      toast.success(`Course ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchAllCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update course status');
    }
  };

  const handleAssignCourse = async (courseId) => {
    try {
      if (selectedStudents.length === 0) {
        toast.error('Please select at least one student');
        return;
      }
      await api.post(`/api/courses/${courseId}/assign`, {
        studentIds: selectedStudents,
      });
      toast.success('Course assigned successfully');
      setAssigningCourse(null);
      setSelectedStudents([]);
      fetchAllCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign course');
    }
  };

  const handleReassignCourse = async (courseId) => {
    try {
      await api.put(`/api/courses/${courseId}/assign`, {
        studentIds: selectedStudents,
      });
      toast.success('Course reassigned successfully');
      setAssigningCourse(null);
      setSelectedStudents([]);
      fetchAllCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reassign course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? All chapters and progress will be deleted. This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/courses/${courseId}`);
      toast.success('Course deleted successfully');
      fetchAllCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    }
  };

  // Filter functions
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && user.isActive) ||
      (userStatusFilter === 'blocked' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredStudents = students.filter((student) => {
    return (
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearch.toLowerCase())
    );
  });

  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      course.mentorId?.name?.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesStatus =
      courseStatusFilter === 'all' ||
      (courseStatusFilter === 'active' && course.isActive) ||
      (courseStatusFilter === 'inactive' && !course.isActive);
    return matchesSearch && matchesStatus;
  });

  const filteredMentors = mentors.filter((mentor) => {
    return (
      mentor.name.toLowerCase().includes(mentorSearch.toLowerCase()) ||
      mentor.email.toLowerCase().includes(mentorSearch.toLowerCase())
    );
  });

  const studentList = users.filter((u) => u.role === 'student' && u.isActive);

  if (loading && activeTab === 'users') {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container admin-panel">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{analytics.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics.totalStudents}</div>
            <div className="stat-label">Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics.totalMentors}</div>
            <div className="stat-label">Mentors</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics.totalCourses}</div>
            <div className="stat-label">Courses</div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Student Progress
        </button>
        <button
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Course Management
        </button>
        <button
          className={`tab-button ${activeTab === 'mentors' ? 'active' : ''}`}
          onClick={() => setActiveTab('mentors')}
        >
          Mentor Activity
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>User Management</h2>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="search-input"
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Signup Date</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      {editingUser === user._id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              className="edit-input"
                            />
                          </td>
                          <td>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) =>
                                setEditForm({ ...editForm, email: e.target.value })
                              }
                              className="edit-input"
                            />
                          </td>
                          <td>
                            <select
                              value={editForm.role}
                              onChange={(e) =>
                                setEditForm({ ...editForm, role: e.target.value })
                              }
                              className="edit-input"
                              disabled={user.role === 'admin'}
                            >
                              <option value="student">Student</option>
                              <option value="mentor">Mentor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                user.isActive ? 'active' : 'blocked'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={handleSaveUser}
                              className="btn btn-success btn-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-badge ${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                user.isActive ? 'active' : 'blocked'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              {user.role === 'mentor' && (
                                <button
                                  onClick={() =>
                                    handleApproveMentor(user._id, !user.isApproved)
                                  }
                                  className={`btn btn-sm ${
                                    user.isApproved ? 'btn-secondary' : 'btn-success'
                                  }`}
                                >
                                  {user.isApproved ? 'Reject' : 'Approve'}
                                </button>
                              )}
                              <button
                                onClick={() => handleActivateUser(user._id, !user.isActive)}
                                className={`btn btn-sm ${
                                  user.isActive ? 'btn-secondary' : 'btn-success'
                                }`}
                                disabled={user.role === 'admin'}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="btn btn-info btn-sm"
                                disabled={user.role === 'admin'}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="btn btn-danger btn-sm"
                                disabled={user.role === 'admin'}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Student Progress Tracking</h2>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="search-input"
                />
                <select
                  value={courseFilter}
                  onChange={(e) => {
                    setCourseFilter(e.target.value);
                    fetchStudents();
                  }}
                  className="filter-select"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <select
                  value={progressStatusFilter}
                  onChange={(e) => {
                    setProgressStatusFilter(e.target.value);
                    fetchStudents();
                  }}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={completionLevelFilter}
                  onChange={(e) => {
                    setCompletionLevelFilter(e.target.value);
                    fetchStudents();
                  }}
                  className="filter-select"
                >
                  <option value="all">All Levels</option>
                  <option value="high">High (70%+)</option>
                  <option value="medium">Medium (30-69%)</option>
                  <option value="low">Low (&lt;30%)</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Signup Date</th>
                      <th>Total Courses</th>
                      <th>Avg Completion</th>
                      <th>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <React.Fragment key={student.id}>
                        <tr
                          className="expandable-row"
                          onClick={() =>
                            setExpandedStudent(
                              expandedStudent === student.id ? null : student.id
                            )
                          }
                        >
                          <td>
                            <span className="expand-icon">
                              {expandedStudent === student.id ? '▼' : '▶'}
                            </span>
                          </td>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{new Date(student.signupDate).toLocaleDateString()}</td>
                          <td>{student.totalCourses}</td>
                          <td>
                            <div className="progress-bar-container">
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${student.avgCompletion}%` }}
                                ></div>
                              </div>
                              <span className="progress-text">
                                {student.avgCompletion}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                student.accountStatus === 'Active' ? 'active' : 'blocked'
                              }`}
                            >
                              {student.accountStatus}
                            </span>
                          </td>
                        </tr>
                        {expandedStudent === student.id && (
                          <tr className="expanded-content">
                            <td colSpan="7">
                              <div className="course-progress-list">
                                <h4>Enrolled Courses:</h4>
                                {student.courses.length === 0 ? (
                                  <p>No courses enrolled</p>
                                ) : (
                                  student.courses.map((course) => (
                                    <div key={course.courseId} className="course-progress-item">
                                      <div className="course-progress-header">
                                        <div>
                                          <strong>{course.courseTitle}</strong>
                                          <span className="mentor-name">
                                            Mentor: {course.mentorName}
                                          </span>
                                        </div>
                                        <span
                                          className={`certificate-badge ${
                                            course.certificateStatus === 'Issued'
                                              ? 'issued'
                                              : 'not-issued'
                                          }`}
                                        >
                                          {course.certificateStatus}
                                        </span>
                                      </div>
                                      <div className="course-progress-details">
                                        <div className="progress-info">
                                          <span>
                                            {course.completedChapters} / {course.totalChapters}{' '}
                                            chapters completed
                                          </span>
                                          {course.currentChapter && (
                                            <span className="current-chapter">
                                              Current: {course.currentChapter.title} (Chapter{' '}
                                              {course.currentChapter.sequenceOrder})
                                            </span>
                                          )}
                                        </div>
                                        <div className="progress-bar-container">
                                          <div className="progress-bar">
                                            <div
                                              className="progress-fill"
                                              style={{
                                                width: `${course.completionPercentage}%`,
                                              }}
                                            ></div>
                                          </div>
                                          <span className="progress-text">
                                            {course.completionPercentage}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Course Management</h2>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="search-input"
                />
                <select
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Mentor</th>
                      <th>Creation Date</th>
                      <th>Assigned Students</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr key={course._id}>
                        <td>
                          <strong>{course.title}</strong>
                          <p className="course-description">{course.description}</p>
                        </td>
                        <td>{course.mentorId?.name || 'Unknown'}</td>
                        <td>{new Date(course.createdAt).toLocaleDateString()}</td>
                        <td>{course.assignedStudents?.length || 0}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              course.isActive ? 'active' : 'inactive'
                            }`}
                          >
                            {course.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleActivateCourse(course._id, !course.isActive)}
                              className={`btn btn-sm ${
                                course.isActive ? 'btn-secondary' : 'btn-success'
                              }`}
                            >
                              {course.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => setAssigningCourse(course._id)}
                              className="btn btn-info btn-sm"
                            >
                              {course.assignedStudents?.length > 0
                                ? 'Reassign'
                                : 'Assign'}
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
              </div>
            )}

            {assigningCourse && (
              <div className="modal-overlay" onClick={() => setAssigningCourse(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Assign Students to Course</h3>
                  <div className="student-select-list">
                    {studentList.map((student) => (
                      <label key={student._id} className="student-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student._id]);
                            } else {
                              setSelectedStudents(
                                selectedStudents.filter((id) => id !== student._id)
                              );
                            }
                          }}
                        />
                        <span>
                          {student.name} ({student.email})
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button
                      onClick={() => {
                        const course = allCourses.find((c) => c._id === assigningCourse);
                        if (course?.assignedStudents?.length > 0) {
                          handleReassignCourse(assigningCourse);
                        } else {
                          handleAssignCourse(assigningCourse);
                        }
                      }}
                      className="btn btn-primary"
                    >
                      {allCourses.find((c) => c._id === assigningCourse)?.assignedStudents
                        ?.length > 0
                        ? 'Reassign'
                        : 'Assign'}
                    </button>
                    <button
                      onClick={() => {
                        setAssigningCourse(null);
                        setSelectedStudents([]);
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'mentors' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Mentor Activity Monitoring</h2>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={mentorSearch}
                  onChange={(e) => setMentorSearch(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Total Courses</th>
                      <th>Active Courses</th>
                      <th>Total Students</th>
                      <th>Activity Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMentors.map((mentor) => (
                      <React.Fragment key={mentor.id}>
                        <tr
                          className="expandable-row"
                          onClick={() =>
                            setExpandedMentor(expandedMentor === mentor.id ? null : mentor.id)
                          }
                        >
                          <td>
                            <span className="expand-icon">
                              {expandedMentor === mentor.id ? '▼' : '▶'}
                            </span>
                          </td>
                          <td>{mentor.name}</td>
                          <td>{mentor.email}</td>
                          <td>
                            <div>
                              <span
                                className={`status-badge ${
                                  mentor.isApproved ? 'approved' : 'pending'
                                }`}
                              >
                                {mentor.isApproved ? 'Approved' : 'Pending'}
                              </span>
                              <span
                                className={`status-badge ${
                                  mentor.isActive ? 'active' : 'blocked'
                                }`}
                                style={{ marginLeft: '8px' }}
                              >
                                {mentor.isActive ? 'Active' : 'Blocked'}
                              </span>
                            </div>
                          </td>
                          <td>{mentor.totalCourses}</td>
                          <td>{mentor.activeCourses}</td>
                          <td>{mentor.totalStudents}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                mentor.activityStatus === 'Active' ? 'active' : 'inactive'
                              }`}
                            >
                              {mentor.activityStatus}
                            </span>
                          </td>
                        </tr>
                        {expandedMentor === mentor.id && (
                          <tr className="expanded-content">
                            <td colSpan="8">
                              <div className="mentor-courses-list">
                                <h4>Courses Created:</h4>
                                {mentor.courses.length === 0 ? (
                                  <p>No courses created</p>
                                ) : (
                                  mentor.courses.map((course) => (
                                    <div key={course.courseId} className="mentor-course-item">
                                      <div className="mentor-course-header">
                                        <div>
                                          <strong>{course.courseTitle}</strong>
                                          <span className="course-date">
                                            Created: {new Date(course.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <span
                                          className={`status-badge ${
                                            course.isActive ? 'active' : 'inactive'
                                          }`}
                                        >
                                          {course.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                      <div className="mentor-course-stats">
                                        <div className="stat-item">
                                          <span className="stat-label">Chapters:</span>
                                          <span className="stat-value">{course.totalChapters}</span>
                                        </div>
                                        <div className="stat-item">
                                          <span className="stat-label">Enrolled:</span>
                                          <span className="stat-value">
                                            {course.enrolledStudents}
                                          </span>
                                        </div>
                                        <div className="stat-item">
                                          <span className="stat-label">Active:</span>
                                          <span className="stat-value">
                                            {course.activeStudents}
                                          </span>
                                        </div>
                                        <div className="stat-item">
                                          <span className="stat-label">Avg Completion:</span>
                                          <span className="stat-value">
                                            {course.avgCompletion}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
