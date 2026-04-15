import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLevels } from '../services/api';
import { ArrowLeft, ChevronRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const Levels = () => {
  const { textbookId } = useParams();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getLevels(textbookId)
      .then(res => {
        setLevels(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [textbookId]);

  return (
    <div className="p-6 fade-in">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.25rem' }}>内容を選択してください</h2>
      </div>

      <div style={{ marginBottom: '1.5rem', fontWeight: '700', fontSize: '1.1rem' }}>
        学習内容
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>読み込み中...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {levels.map((level, index) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div 
                onClick={() => navigate(`/level/${level.id}`)}
                className="materials-card"
                style={{ background: 'var(--bg-primary)', cursor: 'pointer' }}
              >
                <div 
                  className="icon-box" 
                  style={{ background: 'var(--bg-secondary)', width: '56px', height: '56px' }}
                >
                  <Star size={32} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem' }}>{level.title}</h4>
                  <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>レベル - {level.title}</p>
                </div>
                <ChevronRight size={20} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Levels;
