import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ChevronLeft = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const VolumeIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const VOCABULARY = [
  { jp: '日本語', reading: 'にほんご', en: 'Japanese Language' },
  { jp: '勉強', reading: 'べんきょう', en: 'Study' },
  { jp: '学校', reading: 'がっこう', en: 'School' },
  { jp: '先生', reading: 'せんせい', en: 'Teacher' },
  { jp: '学生', reading: 'がくせい', en: 'Student' },
  { jp: '友達', reading: 'ともだち', en: 'Friend' },
  { jp: '家族', reading: 'かぞく', en: 'Family' },
  { jp: '食べる', reading: 'たべる', en: 'To Eat' },
  { jp: '飲む', reading: 'のむ', en: 'To Drink' },
  { jp: '行く', reading: 'いく', en: 'To Go' },
];

const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP';
  utt.rate = 0.8;
  window.speechSynthesis.speak(utt);
};

const FlashcardPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const word = VOCABULARY[currentIndex];

  const goNext = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => (i + 1) % VOCABULARY.length), 100);
  };
  const goPrev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => (i - 1 + VOCABULARY.length) % VOCABULARY.length), 100);
  };

  return (
    <div className="flashcard-screen">
      {/* Title */}
      <div style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
          単語帳
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '2px' }}>
          Vocabulary Flashcards
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {/* Count */}
        <div className="flashcard-count">
          {currentIndex + 1} / {VOCABULARY.length}
        </div>

        {/* Flip Card */}
        <div className="flashcard-wrapper">
          <motion.div
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(f => !f)}
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Front */}
            <div className="flashcard-face flashcard-front">
              <div className="flashcard-kanji">{word.jp}</div>
              <div className="flashcard-hint">タップして意味を見る</div>
            </div>
            {/* Back */}
            <div className="flashcard-face flashcard-back">
              <div className="flashcard-meaning">{word.en}</div>
              <div className="flashcard-reading">{word.reading}</div>
            </div>
          </motion.div>
        </div>

        {/* Speak Button */}
        <button
          className="fc-speak-btn"
          onClick={() => speak(word.jp)}
          style={{ marginTop: '24px' }}
        >
          <VolumeIcon />
        </button>
      </div>

      {/* Navigation */}
      <div className="flashcard-controls">
        <button className="fc-nav-btn" onClick={goPrev}>
          <ChevronLeft />
        </button>
        <button className="fc-nav-btn" onClick={goNext}>
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default FlashcardPage;
