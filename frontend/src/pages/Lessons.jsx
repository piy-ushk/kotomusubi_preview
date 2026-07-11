import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { getLessons } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

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

const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
          onClick={e => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* Tab Bar for Super Beginner with Hiragana/Katakana + Elementary split */
const HIRAKATA_KEYWORDS = ['ひらがな', 'カタカナ', 'Hiragana', 'Katakana', '拗音', 'Youon'];

const isHirakata = (title) => HIRAKATA_KEYWORDS.some(k => title.includes(k));

const Lessons = () => {
  const { levelId } = useParams();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperBeginner, setIsSuperBeginner] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedLessonTitle, setSelectedLessonTitle] = useState('');
  const [levelTitle, setLevelTitle] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const textbookTitleState = location.state?.textbookTitle || sessionStorage.getItem('currentTextbook') || 'Material';
  const levelTitleState = location.state?.levelTitle || sessionStorage.getItem('currentLevel') || 'Level';

  useEffect(() => {
    if (location.state?.textbookTitle) {
      sessionStorage.setItem('currentTextbook', location.state.textbookTitle);
    }
    if (location.state?.levelTitle) {
      sessionStorage.setItem('currentLevel', location.state.levelTitle);
    }
    
    getLessons(levelId)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        
        // Auto-redirect for Travel Column articles which map exactly 1-to-1 (level=lesson)
        if (data.length === 1 && !data[0].is_chapter) {
          navigate(`/lesson/${data[0].id}`, { replace: true, state: { textbookTitle: textbookTitleState, levelTitle: levelTitleState } });
          return;
        }

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

  const handleLessonAction = (lesson) => {
    setSelectedLessonId(lesson.id);
    setSelectedLessonTitle(lesson.title);
    setShowSelectionModal(true);
  };

  const renderLessonCard = (lesson, index) => (
    <motion.div
      key={lesson.id}
      className="stagger-item"
      style={{ animationDelay: `${index * 50}ms` }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        onClick={() => handleLessonAction(lesson)}
        className={`lesson-card ${lesson.completed ? 'completed' : ''}`}
        style={{ display: 'flex', cursor: 'pointer' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lesson-title">
            {lesson.title.split('|')[0].split('｜')[0].trim()}
          </div>
        </div>
        <span style={{ color: lesson.completed ? 'var(--primary)' : 'var(--text-sub)', flexShrink: 0 }}>
          {lesson.completed ? <CheckCircle /> : <ChevronRight />}
        </span>
      </div>
    </motion.div>
  );

  const renderLessonList = (lessonList) => (
    <div className="materials-card-grid" style={{ padding: '0 24px 24px' }}>
      {lessonList.map((item, index) => {
        if (item.is_chapter) {
          return (
            <div key={item.id} style={{ gridColumn: '1 / -1', marginTop: index === 0 ? '0' : '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '12px', paddingLeft: '4px' }}>
                {item.title}
              </h3>
              <div className="materials-card-grid" style={{ padding: 0 }}>
                {item.lessons.map((lesson, subIndex) => renderLessonCard(lesson, index + subIndex))}
              </div>
            </div>
          );
        }
        return renderLessonCard(item, index);
      })}
      {lessonList.length === 0 && (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>レッスンが見つかりませんでした</div>
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
        <div className="app-bar-title" style={{ fontSize: '15px' }}>
          <span style={{ opacity: 0.6 }}>{textbookTitleState}</span>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>/</span>
          <span>{levelTitleState}</span>
        </div>
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
            読込中...
          </div>
        ) : (
          <div key="lesson-list">
            {renderLessonList(displayedLessons)}
          </div>
        )}
      </div>

      {/* Selection Modal */}
      <Modal show={showSelectionModal} onClose={() => setShowSelectionModal(false)}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-dark)', marginBottom: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}>
          どちらを開きますか？
        </h3>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          What would you like to study?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <button
            onClick={() => {
              navigate('/', { state: { targetTab: 2, lessonFilter: selectedLessonId, lessonTitle: selectedLessonTitle } });
            }}
            style={{
              padding: '1rem', background: 'var(--accent-soft)', color: 'var(--accent-dark)',
              border: '2px solid var(--accent)', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            単語帳 (Wordbook)
          </button>
          <button
            onClick={() => {
              navigate(`/lesson/${selectedLessonId}`, { state: { textbookTitle: textbookTitleState, levelTitle: levelTitleState } });
            }}
            style={{
              padding: '1rem', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            テキストブック (Textbook)
          </button>
        </div>
        <button
          onClick={() => setShowSelectionModal(false)}
          style={{ marginTop: '1.2rem', width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          キャンセル (Cancel)
        </button>
      </Modal>
    </div>
  );
};

export default Lessons;
