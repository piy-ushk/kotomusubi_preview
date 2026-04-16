import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLessons } from '../services/api';
import { motion } from 'framer-motion';

const ArrowLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const CheckCircle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f18b5b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

/* Tab Bar for Super Beginner with Hiragana/Katakana + Elementary split */
const HIRAKATA_KEYWORDS = ['ひらがな', 'カタカナ', 'Hiragana', 'Katakana', '拗音', 'Youon'];

const isHirakata = (title) => HIRAKATA_KEYWORDS.some(k => title.includes(k));

const Lessons = () => {
  const { levelId } = useParams();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperBeginner, setIsSuperBeginner] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [levelTitle, setLevelTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getLessons(levelId)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setLessons(data);

        // Detect if this is a Super Beginner level from lesson titles or if stored in level data
        const firstLesson = data[0];
        if (firstLesson) {
          // Check if any lesson has hirakata keywords indicating super beginner
          const hasHirakata = data.some(l => isHirakata(l.title));
          setIsSuperBeginner(hasHirakata);
        }
        setLoading(false);
      })
      .catch(() => { setLessons([]); setLoading(false); });
  }, [levelId]);

  const hirakataLessons = lessons.filter(l => isHirakata(l.title));
  const elementaryLessons = lessons.filter(l => !isHirakata(l.title));

  const displayedLessons = isSuperBeginner
    ? (activeTab === 0 ? hirakataLessons : elementaryLessons)
    : lessons;

  const renderLessonList = (lessonList, offset = 0) => (
    <div className="materials-card-grid" style={{ padding: '0 24px 24px' }}>
      {lessonList.map((lesson, index) => (
        <motion.div
          key={lesson.id}
          className="stagger-item"
          style={{ animationDelay: `${(index + offset) * 50}ms` }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            to={`/lesson/${lesson.id}`}
            className={`lesson-card ${lesson.completed ? 'completed' : ''}`}
            style={{ display: 'flex' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lesson-subtitle">Lesson {index + 1}</div>
              <div className="lesson-title">
                {lesson.title.split('|')[0].split('｜')[0].trim()}
              </div>
            </div>
            <span style={{ color: lesson.completed ? 'var(--primary)' : 'var(--text-sub)', flexShrink: 0 }}>
              {lesson.completed ? <CheckCircle /> : <ChevronRight />}
            </span>
          </Link>
        </motion.div>
      ))}
      {lessonList.length === 0 && (
        <div className="empty-state">レッスンが見つかりませんでした</div>
      )}
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* App Bar */}
      <div className="app-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <div className="app-bar-title">レッスン一覧</div>
      </div>

      {/* Progress Card */}
      {!loading && lessons.length > 0 && (
        <div style={{ padding: '0 24px 8px' }}>
          <div className="progress-card">
            <div className="progress-label-row">
              <span>Level Progress</span>
              <span>0%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar for Super Beginner */}
      {isSuperBeginner && !loading && (
        <div className="tab-bar" style={{ flexShrink: 0 }}>
          <button
            className={`tab-item ${activeTab === 0 ? 'active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            Hiragana &amp; Katakana
          </button>
          <button
            className={`tab-item ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Elementary
          </button>
        </div>
      )}

      {/* Lesson List */}
      <div className="screen-content">
        {loading ? (
          <div className="loading-container" key="loading">
            <div className="spinner" />
            読み込み中...
          </div>
        ) : (
          <div key="lesson-list">
            {renderLessonList(displayedLessons)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lessons;
