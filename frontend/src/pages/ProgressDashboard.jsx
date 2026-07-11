import React, { useEffect, useState } from 'react';
import { getUserAnnotations } from '../services/api';
import { vocabularyService } from '../services/vocabularyService';
import { motion } from 'framer-motion';

const ProgressDashboard = () => {
  const [stats, setStats] = useState({
    notesCount: 0,
    learnedWords: 0,
    reviewingWords: 0,
    totalCustomWords: 0,
    totalQuizzes: 0,
    accuracyRate: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      let notesAndWritingsCount = 0;
      let correctQuizzes = 0;
      let totalQuizzes = 0;
      try {
        const res = await getUserAnnotations();
        if (res.data) {
          const notes = res.data.filter(ann => ann.action === 'note');
          const answers = res.data.filter(ann => ann.action === 'answer');
          notesAndWritingsCount = notes.length + answers.length;
          
          const quizzes = res.data.filter(ann => ann.action === 'quiz_result');
          totalQuizzes = quizzes.length;
          correctQuizzes = quizzes.filter(q => q.content === 'correct').length;
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }

      const learned = vocabularyService.getLearnedWordIds().length;
      const custom = vocabularyService.getCustomWords();
      const notYet = vocabularyService.getNotYetWords().length;
      const accuracyRate = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : null;

      setStats({
        notesCount: notesAndWritingsCount,
        learnedWords: learned,
        reviewingWords: notYet,
        totalCustomWords: custom.length,
        totalQuizzes,
        accuracyRate,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="page-pad fade-in">
      <div className="section-header">
        <h2 className="section-title">学習進捗 (Progress)</h2>
      </div>

      <div className="materials-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        
        <motion.div className="materials-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <div className="card-info" style={{ width: '100%' }}>
            <div className="card-title" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{stats.notesCount}</div>
            <div className="badge" style={{ margin: '0 auto' }}>Notes / Writings Saved</div>
          </div>
        </motion.div>

        <motion.div className="materials-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          <div className="card-info" style={{ width: '100%' }}>
            <div className="card-title" style={{ fontSize: '2rem', color: stats.accuracyRate !== null ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {stats.accuracyRate !== null ? `${stats.accuracyRate}%` : 'N/A'}
            </div>
            <div className="badge" style={{ margin: '0 auto' }}>Quiz Accuracy ({stats.totalQuizzes} Taken)</div>
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
