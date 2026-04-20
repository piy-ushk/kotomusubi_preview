import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vocabularyService } from '../services/vocabularyService';

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const VolumeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const FlashcardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP';
  utt.rate = 0.8;
  window.speechSynthesis.speak(utt);
};

const FlashcardPage = () => {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'flashcard'
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState({ jp: '', reading: '', en: '' });

  useEffect(() => {
    refreshWords();
  }, []);

  const refreshWords = () => {
    const notYet = vocabularyService.getNotYetWords();
    setWords(notYet);
    if (currentIndex >= notYet.length) {
      setCurrentIndex(Math.max(0, notYet.length - 1));
    }
  };

  const handleToggleLearned = (wordId) => {
    vocabularyService.toggleLearned(wordId);
    refreshWords();
  };

  const handleAddWord = (e) => {
    e.preventDefault();
    if (!newWord.jp || !newWord.en) return;
    vocabularyService.addCustomWord(newWord);
    setNewWord({ jp: '', reading: '', en: '' });
    setShowAddModal(false);
    refreshWords();
  };

  const goNext = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => (i + 1) % words.length), 100);
  };
  const goPrev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => (i - 1 + words.length) % words.length), 100);
  };

  const currentWord = words[currentIndex];

  return (
    <div className="flashcard-screen">
      {/* Header */}
      <div style={{ alignSelf: 'stretch', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            単語帳
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '2px' }}>
            {words.length} words to learn
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-sub)' }}
          >
            <ListIcon />
          </button>
          <button 
            className={`tab-btn ${viewMode === 'flashcard' ? 'active' : ''}`}
            onClick={() => setViewMode('flashcard')}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: viewMode === 'flashcard' ? 'var(--primary)' : 'transparent', color: viewMode === 'flashcard' ? 'white' : 'var(--text-sub)' }}
          >
            <FlashcardIcon />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <PlusIcon /> Add
          </button>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', overflowY: 'auto' }}>
        {viewMode === 'list' ? (
          <div className="vocab-list" style={{ display: 'grid', gap: '12px' }}>
            {words.length > 0 ? words.map((word) => (
              <div key={word.id} className="vocab-card" style={{
                background: 'var(--bg-secondary)',
                padding: '16px 20px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-color)' }}>{word.jp}</div>
                    {word.reading && <div style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{word.reading}</div>}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--text-sub)', marginTop: '2px' }}>{word.en}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="icon-btn" 
                    onClick={() => speak(word.jp)}
                    style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-sub)' }}
                  >
                    <VolumeIcon size={20} />
                  </button>
                  <button 
                    onClick={() => handleToggleLearned(word.id)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-sub)', fontSize: '13px', fontWeight: '600' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-sub)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>All caught up!</div>
                <div style={{ marginTop: '8px' }}>No words marked as "not yet". Add some or visit a lesson.</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {words.length > 0 ? (
              <>
                <div className="flashcard-count" style={{ marginBottom: '16px', color: 'var(--text-sub)', fontWeight: '600' }}>
                  {currentIndex + 1} / {words.length}
                </div>

                <div className="flashcard-wrapper" style={{ width: '100%', maxWidth: '340px', height: '400px' }}>
                  <motion.div
                    className={`flashcard ${flipped ? 'flipped' : ''}`}
                    onClick={() => setFlipped(f => !f)}
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 20 }}
                    style={{ height: '100%' }}
                  >
                    <div className="flashcard-face flashcard-front">
                      <div className="flashcard-kanji" style={{ fontSize: '42px' }}>{currentWord.jp}</div>
                      <div className="flashcard-hint">Tap to flip</div>
                    </div>
                    <div className="flashcard-face flashcard-back">
                      <div className="flashcard-meaning" style={{ fontSize: '28px' }}>{currentWord.en}</div>
                      <div className="flashcard-reading" style={{ fontSize: '20px', marginTop: '12px' }}>{currentWord.reading}</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleLearned(currentWord.id); }}
                        style={{ marginTop: '32px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '600' }}
                      >
                        Mark as Learned
                      </button>
                    </div>
                  </motion.div>
                </div>

                <div className="flashcard-controls" style={{ marginTop: '32px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <button className="fc-nav-btn" onClick={goPrev} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft />
                  </button>
                  <button className="fc-speak-btn" onClick={() => speak(currentWord.jp)} style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <VolumeIcon size={32} />
                  </button>
                  <button className="fc-nav-btn" onClick={goNext} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-sub)' }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>No words to study!</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Word Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>Add New Word</h3>
              <form onSubmit={handleAddWord}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-sub)' }}>Japanese (Kanji/Kana)</label>
                  <input 
                    type="text" 
                    value={newWord.jp} 
                    onChange={e => setNewWord({...newWord, jp: e.target.value})}
                    placeholder="e.g. 勉強"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '16px' }}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-sub)' }}>Reading (Hiragana)</label>
                  <input 
                    type="text" 
                    value={newWord.reading} 
                    onChange={e => setNewWord({...newWord, reading: e.target.value})}
                    placeholder="e.g. べんきょう"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '16px' }}
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-sub)' }}>Meaning (English)</label>
                  <input 
                    type="text" 
                    value={newWord.en} 
                    onChange={e => setNewWord({...newWord, en: e.target.value})}
                    placeholder="e.g. To study"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '16px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '600' }}
                  >
                    Save Word
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlashcardPage;
