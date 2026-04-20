import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTextbooks } from '../services/api';
import { motion } from 'framer-motion';
import Ruby from '../components/Ruby';

/* Inline Chevron icon */
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const getIcon = (title) => {
  if (title?.includes('Grammar')) return <Ruby text="文" ruby="ぶん" />;
  if (title?.includes('Topic')) return <Ruby text="話" ruby="わ" />;
  if (title?.includes('Travel')) return <Ruby text="旅" ruby="たび" />;
  return '📚';
};

const Home = ({ onGoToMaterials }) => {
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
    <div className="page-pad fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <img src="/logo.png" alt="Kotomusubi" className="logo-main" />
          <div className="greeting-title">おはよう!</div>
          <div className="greeting-sub">
            <Ruby text="学習者" ruby="がくしゅうしゃ" />さん、おはようございます
          </div>
        </div>
        <div className="profile-circle">
          <UserIcon />
        </div>
      </div>

      {/* Section header */}
      <div className="section-header">
        <div className="section-title"></div>
        <button className="view-all-btn" onClick={onGoToMaterials}>
          すべて<Ruby text="表示" ruby="ひょうじ" />
        </button>
      </div>

      {/* Welcome Banner Card */}
      <motion.div
        className="welcome-banner"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="emoji">📚</div>
        <h2><Ruby text="学習" ruby="がくしゅう" />を<Ruby text="始" ruby="はじ" />めましょう！</h2>
        <p>
          「<Ruby text="教材" ruby="きょうざい" />」タブからコースを<Ruby text="選択" ruby="せんたく" />して、<br />
          <Ruby text="新" ruby="あたら" />しいレッスンを<Ruby text="開始" ruby="かいし" />できます。
        </p>
        <button className="primary-button" onClick={onGoToMaterials}>
          <Ruby text="教材" ruby="きょうざい" />を<Ruby text="見" ruby="み" />る
        </button>
      </motion.div>

      {/* Quick textbook list */}
      {!loading && textbooks.length > 0 && (
        <div className="materials-card-grid">
          {textbooks.slice(0, 3).map((textbook, i) => (
            <motion.div
              key={textbook.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link to={`/textbook/${textbook.id}`} className="materials-card">
                <div className="icon-box">{getIcon(textbook.title)}</div>
                <div className="card-info">
                  <div className="card-title">{textbook.title}</div>
                  <div className="badge"><Ruby text="教材" ruby="きょうざい" /></div>
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

export default Home;
