import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const textbookTitle = location.state?.textbookTitle || 'Select Content';

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
        <div className="app-bar-title">{textbookTitle}</div>
      </div>

      <div className="page-pad" style={{ paddingTop: '8px' }}>


        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            読み込み中...
          </div>
        ) : levels.length === 0 ? (
          <div className="empty-state">レベルが見つかりませんでした</div>
        ) : (
          <div className="materials-card-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {levels.map((level, index) => {
              const hasCover = !!level.cover;
              
              if (hasCover) {
                const titleParts = level.title.split('|');
                const mainTitle = titleParts.length > 1 ? titleParts[1].trim() : titleParts[0].trim();
                const subTitle = titleParts.length > 1 ? titleParts[0].trim() : '';

                return (
                  <motion.div
                    key={level.id}
                    className="stagger-item"
                    style={{ animationDelay: `${index * 80}ms` }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="level-image-card"
                      onClick={() => navigate(`/level/${level.id}`, { state: { textbookTitle, levelTitle: mainTitle } })}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '220px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `url(${level.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'transform 0.3s ease'
                      }} className="hover-scale-bg" />
                      
                      {/* Gradient overlay */}
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)'
                      }} />

                      <div style={{ position: 'relative', padding: '24px', color: 'white', zIndex: 1, textAlign: 'center' }}>
                         <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', letterSpacing: '0.5px' }}>
                           {mainTitle}
                         </h2>
                         {titleParts.length > 1 ? (
                           <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
                             {subTitle} | {mainTitle}
                           </div>
                         ) : (
                           <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
                             {mainTitle}
                           </div>
                         )}
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                 <motion.div
                   key={level.id}
                   className="stagger-item"
                   style={{ animationDelay: `${index * 80}ms`, height: '100%' }}
                   whileTap={{ scale: 0.98 }}
                 >
                   <button
                     className="level-card"
                     onClick={() => navigate(`/level/${level.id}`, { state: { textbookTitle, levelTitle: level.title } })}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '20px',
                       width: '100%',
                       height: '100%',
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Levels;
