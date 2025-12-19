import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ChapterViewer from '../components/ChapterViewer';

const CourseViewer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progress, setProgress] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const [courseRes, chaptersRes, progressRes] = await Promise.all([
        axios.get(`/api/courses/${courseId}`),
        axios.get(`/api/courses/${courseId}/chapters`),
        axios.get(`/api/progress/course/${courseId}`),
      ]);

      setCourse(courseRes.data);
      setChapters(chaptersRes.data);
      setProgress(progressRes.data);

      // Select first chapter if available
      if (chaptersRes.data.length > 0) {
        const firstChapter = chaptersRes.data[0];
        fetchChapterDetails(firstChapter._id);
      }
    } catch (error) {
      toast.error('Failed to load course data');
      console.error(error);
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterDetails = async (chapterId) => {
    try {
      // Try direct chapter route first, fallback to finding in chapters array
      try {
        const response = await axios.get(`/api/chapters/${chapterId}`);
        setSelectedChapter(response.data);
      } catch (err) {
        // If direct route fails, find chapter in already fetched chapters
        const chapter = chapters.find(ch => ch._id === chapterId);
        if (chapter) {
          setSelectedChapter(chapter);
        } else {
          throw err;
        }
      }
    } catch (error) {
      toast.error('Failed to load chapter');
      console.error(error);
    }
  };

  const handleChapterSelect = (chapter) => {
    if (chapter.isLocked) {
      toast.warning('Please complete previous chapters first');
      return;
    }
    fetchChapterDetails(chapter._id);
  };

  const handleChapterComplete = async () => {
    if (!selectedChapter) return;

    try {
      await axios.post(`/api/progress/${selectedChapter._id}/complete`);
      toast.success('Chapter marked as complete!');
      
      // Refresh progress and chapters
      const progressRes = await axios.get(`/api/progress/course/${courseId}`);
      setProgress(progressRes.data);
      
      // Update chapter status
      setChapters(chapters.map(ch => {
        if (ch._id === selectedChapter._id) {
          return { ...ch, isCompleted: true };
        }
        return ch;
      }));

      // Auto-select next chapter if available
      const currentIndex = chapters.findIndex(ch => ch._id === selectedChapter._id);
      if (currentIndex < chapters.length - 1) {
        const nextChapter = chapters[currentIndex + 1];
        if (!nextChapter.isLocked) {
          fetchChapterDetails(nextChapter._id);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark chapter as complete');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!course) {
    return <div className="container">Course not found</div>;
  }

  return (
    <div className="container">
      <button
        onClick={() => navigate('/student/dashboard')}
        className="btn btn-secondary"
        style={{ marginBottom: '20px' }}
      >
        ← Back to Dashboard
      </button>

      <div className="card">
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        {progress && (
          <div style={{ marginTop: '15px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '5px',
                fontSize: '0.9rem',
              }}
            >
              <span>Overall Progress: {progress.progress.completionPercentage}%</span>
              <span>
                {progress.progress.completedChapters} / {progress.progress.totalChapters} chapters
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '16px',
                backgroundColor: '#111827',
                borderRadius: '999px',
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.5)',
              }}
            >
              <div
                style={{
                  width: `${progress.progress.completionPercentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        <div className="card">
          <h2>Chapters</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            Complete the current chapter to unlock the next one. Locked chapters cannot be opened yet.
          </p>
          {progress?.chapters.map((chapter, index) => {
            const isActive = selectedChapter?._id === chapter._id && !chapter.isLocked;
            const isLocked = chapter.isLocked;
            const isCompleted = chapter.isCompleted;

            return (
              <div
                key={chapter._id}
                onClick={() => handleChapterSelect(chapter)}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: isActive
                    ? 'rgba(37, 99, 235, 0.15)'
                    : isCompleted
                    ? 'rgba(34, 197, 94, 0.08)'
                    : '#0b1120',
                  border: isActive
                    ? '1px solid rgba(59, 130, 246, 0.9)'
                    : '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>
                  {index + 1}. {chapter.title}
                </span>
                <span style={{ fontSize: '0.8rem' }}>
                  {isLocked && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(148, 163, 184, 0.15)',
                      }}
                    >
                      🔒 Locked
                    </span>
                  )}
                  {!isLocked && !isCompleted && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(59, 130, 246, 0.18)',
                      }}
                    >
                      ▶ Current
                    </span>
                  )}
                  {isCompleted && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(34, 197, 94, 0.18)',
                      }}
                    >
                      ✓ Completed
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="card">
          {selectedChapter ? (
            <ChapterViewer
              chapter={selectedChapter}
              isCompleted={
                progress?.chapters.find((ch) => ch._id === selectedChapter._id)
                  ?.isCompleted
              }
              onComplete={handleChapterComplete}
            />
          ) : (
            <p>Select a chapter to view</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseViewer;
