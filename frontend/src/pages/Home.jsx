import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTextbooks } from '../services/api';
import { User, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getTextbooks()
      .then(res => {
        setTextbooks(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src="/logo.png" alt="Logo" className="logo-main" />
          <h2 style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>おはよう!</h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>学習者さん、おはようございます</p>
        </div>
        <div className="profile-circle">
          <User size={24} />
        </div>
      </div>

      {/* Learning Materials Section Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '1rem' }}>学習教材</h3>
        <Link to="/textbooks" className="view-all-btn">すべて表示</Link>
      </div>

      {/* Welcome Banner Card */}
      <motion.div 
        className="welcome-banner mb-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
        <h2 style={{ fontSize: '1.25rem' }}>学習を始めましょう！</h2>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          「教材」タブからコースを選択して、新しいレッスンを開始できます。
        </p>
        <button 
          className="primary-button"
          onClick={() => navigate('/textbooks')}
        >
          教材を見る
        </button>
      </motion.div>

      {/* Optional: Short list of materials if they exist */}
      {!loading && textbooks.length > 0 && (
        <div className="flex flex-col gap-4">
          {textbooks.slice(0, 3).map((textbook) => {
            let icon = '📚';
            if (textbook.title.includes('Grammar')) icon = '文';
            if (textbook.title.includes('Topic')) icon = '話';
            if (textbook.title.includes('Travel')) icon = '旅';

            return (
              <Link 
                key={textbook.id} 
                to={`/textbook/${textbook.id}`}
                className="materials-card"
              >
                <div className="icon-box">{icon}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem' }}>{textbook.title}</h4>
                  <div className="badge" style={{ marginTop: '0.5rem' }}>教材</div>
                </div>
                <ChevronRight size={20} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;
