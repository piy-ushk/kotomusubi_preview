import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTextbooks } from '../services/api';
import { motion } from 'framer-motion';

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const getIcon = (title) => {
  if (title?.includes('Grammar')) return '文';
  if (title?.includes('Topic')) return '話';
  if (title?.includes('Travel')) return '旅';
  return '📚';
};

const TextbooksList = () => {
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTextbooks()
      .then(res => {
        setTextbooks(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(() => { setTextbooks([]); setLoading(false); });
  }, []);

  return (
    <div className="page-pad slide-in-right">
      {/* Header — no back button, this is a tab */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section-title" style={{ fontSize: '20px' }}>すべての教材</div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          読み込み中...
        </div>
      ) : textbooks.length === 0 ? (
        <div className="empty-state">教材が見つかりませんでした</div>
      ) : (
        <div className="materials-card-grid">
          {textbooks.map((textbook, index) => (
            <motion.div
              key={textbook.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Link to={`/textbook/${textbook.id}`} className="materials-card">
                <div className="icon-box">{getIcon(textbook.title)}</div>
                <div className="card-info">
                  <div className="card-title">{textbook.title}</div>
                  <div className="badge">教材</div>
                </div>
                <span className="chevron-icon"><ChevronRight /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TextbooksList;
