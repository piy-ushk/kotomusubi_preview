import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTextbooks } from '../services/api';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const TextbooksList = () => {
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
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.25rem' }}>すべての教材</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>読み込み中...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {textbooks.map((textbook, index) => {
             let icon = '📚';
             if (textbook.title.includes('Grammar')) icon = '文';
             if (textbook.title.includes('Topic')) icon = '話';
             if (textbook.title.includes('Travel')) icon = '旅';

             return (
               <motion.div
                 key={textbook.id}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
               >
                 <Link to={`/textbook/${textbook.id}`} className="materials-card">
                   <div className="icon-box">{icon}</div>
                   <div style={{ flex: 1 }}>
                     <h4 style={{ fontSize: '1.1rem' }}>{textbook.title}</h4>
                     <div className="badge" style={{ marginTop: '0.5rem' }}>教材</div>
                   </div>
                   <ChevronRight size={20} />
                 </Link>
               </motion.div>
             );
          })}
        </div>
      )}
    </div>
  );
};

export default TextbooksList;
