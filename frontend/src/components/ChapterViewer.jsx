import React from 'react';

const ChapterViewer = ({ chapter, isCompleted, onComplete }) => {
  if (!chapter) {
    return <div>No chapter selected</div>;
  }

  const isYouTubeLink =
    chapter.videoLink?.includes('youtube.com') ||
    chapter.videoLink?.includes('youtu.be');
  const isVimeoLink = chapter.videoLink?.includes('vimeo.com');

  const getEmbedUrl = (url) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <div>
      <h2>{chapter.title}</h2>

      {chapter.image && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>Chapter Image</h3>
          <img
            src={chapter.image}
            alt={chapter.title}
            style={{
              width: '100%',
              maxWidth: '600px',
              height: 'auto',
              borderRadius: '8px',
            }}
          />
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '8px' }}>Chapter Description</h3>
        <p style={{ lineHeight: '1.6' }}>{chapter.description}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Video Content</h3>
        {isYouTubeLink || isVimeoLink ? (
          <div
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            <iframe
              src={getEmbedUrl(chapter.videoLink)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div>
            <a
              href={chapter.videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Watch Video
            </a>
          </div>
        )}
      </div>

      {!isCompleted && (
        <button onClick={onComplete} className="btn btn-success">
          Mark this chapter as complete
        </button>
      )}

      {isCompleted && (
        <div className="success-message">
          ✓ This chapter has been completed. You can now move to the next one.
        </div>
      )}
    </div>
  );
};

export default ChapterViewer;
