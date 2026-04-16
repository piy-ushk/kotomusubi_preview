import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLevels } from '../services/api';
import { motion } from 'framer-motion';

const ArrowLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const StarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f18b5b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const Levels = () => {
  const { textbookId } = useParams();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getLevels(textbookId)
      .then(res => {
        setLevels(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(() => { setLevels([]); setLoading(false); });
  }, [textbookId]);

  return (
    <div className="fade-in">
      {/* App Bar */}
      <div className="app-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <div className="app-bar-title">内容を選択してください</div>
      </div>

      <div className="page-pad" style={{ paddingTop: '8px' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '24px' }}>
          学習内容
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            読み込み中...
          </div>
        ) : levels.length === 0 ? (
          <div className="empty-state">レベルが見つかりませんでした</div>
        ) : (
          <div className="materials-card-grid">
            {levels.map((level, index) => (
              <motion.div
                key={level.id}
                className="stagger-item"
                style={{ animationDelay: `${index * 80}ms` }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  className="level-card"
                  onClick={() => navigate(`/level/${level.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    width: '100%',
                    padding: '24px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Noto Sans JP', sans-serif",
                  }}
                >
                  <div className="icon-box-sm">
                    <StarIcon />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {level.title}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
                      レベル - {level.title}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-primary)', flexShrink: 0 }}>
                    <ChevronRight />
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Levels;
