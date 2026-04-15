import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLessons } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Play } from 'lucide-react';

const Lessons = () => {
  const { levelId } = useParams();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLessons(levelId)
      .then(res => {
        setLessons(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [levelId]);

  if (loading) return <div className="p-6">Loading lessons...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" style={{ color: 'var(--text-secondary)' }}><ArrowLeft /></Link>
        <h1>Lessons</h1>
      </div>
      
      <div className="flex flex-col gap-3">
        {lessons.map((lesson, index) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={`/lesson/${lesson.id}`} className="premium-card flex items-center gap-4">
              <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                <Play size={16} fill="white" />
              </div>
              <span style={{ fontWeight: '500' }}>{lesson.title}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Lessons;
