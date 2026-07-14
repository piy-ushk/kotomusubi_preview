import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StaticHtmlLessonLayout = ({ htmlFilename, textbookTitle, levelTitle }) => {
  const navigate = useNavigate();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* App Bar */}
      <div className="app-bar" style={{ flexShrink: 0 }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <div className="app-bar-title">
          <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '2px', fontWeight: 500 }}>
            {textbookTitle} / {levelTitle}
          </div>
        </div>
      </div>

      {/* Static HTML Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src={`/lessons/${htmlFilename}`}
          title="Lesson Content"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
};

export default StaticHtmlLessonLayout;
