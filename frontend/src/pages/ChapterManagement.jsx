import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ChapterManagement = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChapter, setNewChapter] = useState({
    title: '',
    description: '',
    image: '',
    videoLink: '',
    sequenceOrder: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const [courseRes, chaptersRes] = await Promise.all([
        axios.get(`/api/courses/${courseId}`),
        axios.get(`/api/courses/${courseId}/chapters`),
      ]);

      setCourse(courseRes.data);
      setChapters(chaptersRes.data);
      if (chaptersRes.data.length > 0) {
        setNewChapter({
          ...newChapter,
          sequenceOrder: Math.max(...chaptersRes.data.map(ch => ch.sequenceOrder)) + 1,
        });
      }
    } catch (error) {
      toast.error('Failed to load course data');
      console.error(error);
      navigate('/mentor/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChapter = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/courses/${courseId}/chapters`, newChapter);
      setChapters([...chapters, response.data]);
      setNewChapter({
        title: '',
        description: '',
        image: '',
        videoLink: '',
        sequenceOrder: response.data.sequenceOrder + 1,
      });
      setShowCreateForm(false);
      toast.success('Chapter created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create chapter');
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    try {
      await axios.delete(`/api/chapters/${chapterId}`);
      setChapters(chapters.filter(ch => ch._id !== chapterId));
      toast.success('Chapter deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete chapter');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Manage Chapters: {course?.title}</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Add New Chapter'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card">
          <h2>Create New Chapter</h2>
          <form onSubmit={handleCreateChapter}>
            <div className="input-group">
              <label>Chapter Title</label>
              <input
                type="text"
                value={newChapter.title}
                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea
                value={newChapter.description}
                onChange={(e) => setNewChapter({ ...newChapter, description: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Image URL (optional)</label>
              <input
                type="url"
                value={newChapter.image}
                onChange={(e) => setNewChapter({ ...newChapter, image: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Video Link (YouTube, Vimeo, or Drive)</label>
              <input
                type="url"
                value={newChapter.videoLink}
                onChange={(e) => setNewChapter({ ...newChapter, videoLink: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Sequence Order</label>
              <input
                type="number"
                min="1"
                value={newChapter.sequenceOrder}
                onChange={(e) => setNewChapter({ ...newChapter, sequenceOrder: parseInt(e.target.value) })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Create Chapter
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Chapters ({chapters.length})</h2>
        {chapters.length === 0 ? (
          <p>No chapters yet. Create your first chapter!</p>
        ) : (
          chapters
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            .map((chapter) => (
              <div
                key={chapter._id}
                style={{
                  padding: '15px',
                  marginBottom: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                }}
              >
                <h3>
                  {chapter.sequenceOrder}. {chapter.title}
                </h3>
                <p>{chapter.description}</p>
                <p>
                  <strong>Video:</strong>{' '}
                  <a href={chapter.videoLink} target="_blank" rel="noopener noreferrer">
                    {chapter.videoLink}
                  </a>
                </p>
                <button
                  onClick={() => handleDeleteChapter(chapter._id)}
                  className="btn btn-danger"
                  style={{ marginTop: '10px' }}
                >
                  Delete Chapter
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ChapterManagement;