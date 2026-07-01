import React, { useEffect, useState } from 'react';
import { getAllNotes } from '../services/api';
import { vocabularyService } from '../services/vocabularyService';
import { motion } from 'framer-motion';

const ProgressDashboard = () => {
  const [stats, setStats] = useState({
    notesCount: 0,
    learnedWords: 0,
    reviewingWords: 0,
    totalCustomWords: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      let nCount = 0;
      try {
        const res = await getAllNotes();
        if (res.data) {
          nCount = res.data.length;
        }
      } catch (err) {
        console.error("Failed to fetch notes count", err);
      }

      const learned = vocabularyService.getLearnedWordIds().length;
      const discovered = vocabularyService.getDiscoveredWords();
      const custom = vocabularyService.getCustomWords();
      
      const notYet = vocabularyService.getNotYetWords().length;

      setStats({
        notesCount: nCount,
        learnedWords: learned,
        reviewingWords: notYet,
        totalCustomWords: custom.length,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="page-pad fade-in">
      <div className="section-header">
        <h2 className="section-title">学習進捗 (Progress)</h2>
      </div>

      <div className="materials-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        
        <motion.div className="materials-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <div className="card-info" style={{ width: '100%' }}>
            <div className="card-title" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{stats.notesCount}</div>
            <div className="badge" style={{ margin: '0 auto' }}>Notes / Writings Saved</div>
          </div>
        </motion.div>

        <motion.div className="materials-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div className="card-info" style={{ width: '100%' }}>
            <div className="card-title" style={{ fontSize: '2rem', color: 'var(--ok)', marginBottom: '0.5rem' }}>{stats.learnedWords}</div>
            <div className="badge" style={{ margin: '0 auto' }}>Words Learned</div>
          </div>
        </motion.div>

        <motion.div className="materials-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          <div className="card-info" style={{ width: '100%' }}>
            <div className="card-title" style={{ fontSize: '2rem', color: 'var(--orange)', marginBottom: '0.5rem' }}>{stats.reviewingWords}</div>
            <div className="badge" style={{ margin: '0 auto' }}>Words to Review</div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default ProgressDashboard;
