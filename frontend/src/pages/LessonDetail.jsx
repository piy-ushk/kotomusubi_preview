import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonContent } from '../services/api';
import { AnimatePresence, motion } from 'framer-motion';

/* ---- Icons ---- */
const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const Volume2 = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const TranslateIcon = ({ size = 18, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/>
    <path d="M2 5h12"/><path d="M7 2h1"/>
    <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
  </svg>
);
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

/* ---- TTS Helper ---- */
const speak = (text) => {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const jpText = text.split('|')[0].split('｜')[0].trim();
  const utt = new SpeechSynthesisUtterance(jpText);
  utt.lang = 'ja-JP';
  utt.rate = 0.8;
  window.speechSynthesis.speak(utt);
};

/* ---- Text cleaning helper ---- */
const cleanText = (text) => {
  if (typeof text !== 'string') return text;
  // Filter out decorative emojis that take up extra space
  return text.replace(/💡|✍️|✅|📝|✨/g, '').trim();
};

/* ---- Translation helper ---- */
const splitTranslation = (text) => {
  if (typeof text !== 'string') return { jp: String(text ?? ''), en: '' };
  let rawJp = '', rawEn = '';
  if (text.includes('｜')) { 
    const p = text.split('｜'); 
    rawJp = p[0]; 
    rawEn = p[1] || ''; 
  } else if (text.includes('|')) { 
    const p = text.split('|'); 
    rawJp = p[0]; 
    rawEn = p[1] || ''; 
  } else {
    rawJp = text;
  }
  return { jp: cleanText(rawJp), en: cleanText(rawEn) };
};

/* ---- Block Processing Helpers ---- */
const getRawText = (block) => {
  if (!block) return '';
  const type = block.type;
  if (!type) return '';
  const blockData = block[type];
  if (!blockData) return '';
  if (blockData.rich_text) return blockData.rich_text.map(rt => rt.plain_text).join('');
  if (blockData.text) return blockData.text;
  return '';
};

const hasJapanese = (str) => /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(str);
const isEnglishTarget = (str) => {
  if (!str.trim()) return false;
  const hasEng = /[a-zA-Z]/.test(str);
  const noJp = !hasJapanese(str);
  return hasEng && noJp;
};

const preprocessBlocks = (blocks) => {
  const result = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];
    
    let jpText = getRawText(block);
    let nextText = nextBlock ? getRawText(nextBlock) : '';
    
    // Skip blocks that are just decorative emojis (take up extra space)
    if (jpText && !cleanText(jpText)) continue;
    
    if (jpText && hasJapanese(jpText) && isEnglishTarget(nextText)) {
      result.push({ block, enTranslation: nextText });
      i++; // Skip the next block since we merged it
    } else {
      result.push({ block, enTranslation: null });
    }
  }
  return result;
};

/* ---- Block Components ---- */

const TranslationControls = ({ id, rawText, isTranslated, onToggle }) => (
  <div className="block-controls">
    <button className="block-ctrl-btn speak-btn" onClick={() => speak(rawText)}>
      <Volume2 size={14} /> Speak
    </button>
    <button className={`block-ctrl-btn translate-btn ${isTranslated ? 'active' : ''}`} onClick={() => onToggle(id)}>
      <TranslateIcon size={14} /> {isTranslated ? 'Hide' : 'Translate'}
    </button>
  </div>
);

const TranslatableBlock = ({ id, rawText, textStyle, isTranslated, onToggle, Tag = 'div', extraClass = '' }) => {
  const { jp, en } = splitTranslation(rawText);
  if (!jp) return null;
  return (
    <div>
      <Tag className={extraClass} style={textStyle}>{jp}</Tag>
      {isTranslated && en && <div className="block-translation">{en}</div>}
      <TranslationControls id={id} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
    </div>
  );
};

const NumberCard = ({ digit, hiragana, kanji, english, isTranslated, onToggle, wordId }) => {
  return (
    <div className="lesson-flashcard">
      <div className="lesson-flashcard-kanji-box">
        <div className="lesson-flashcard-kanji">{kanji || hiragana}</div>
      </div>
      {digit && <div className="lesson-flashcard-digit">{digit}</div>}
      {hiragana && <div className="lesson-flashcard-reading">{hiragana}</div>}
      {english && (
        isTranslated
          ? <div className="lesson-flashcard-meaning">{english}</div>
          : <button className="show-translation-btn" onClick={() => onToggle(wordId)}>Show Translation</button>
      )}
      <button className="lesson-speak-btn" onClick={() => speak(hiragana || kanji)}>
        <Volume2 size={40} />
      </button>
    </div>
  );
};

const GreetingCard = ({ phrase, reading, meaning, isTranslated, onToggle, wordId }) => {
  return (
    <div className="greeting-card">
      <div className="greeting-phrase">{phrase}</div>
      {reading && <div className="greeting-reading">{reading}</div>}
      {meaning && (
        isTranslated
          ? <div className="lesson-flashcard-meaning">{meaning}</div>
          : <button className="show-translation-btn" onClick={() => onToggle(wordId)}>Show Translation</button>
      )}
      <button className="lesson-speak-btn" onClick={() => speak(phrase)}>
        <Volume2 size={40} />
      </button>
    </div>
  );
};

/* ---- Block Renderer ---- */
const BlockRenderer = ({ block, blockId, translateAll, individualTranslations, onToggle, enTranslation }) => {
  const type = block.type;
  const blockData = block[type];
  if (!blockData) return null;

  let rawText = '';
  if (blockData.rich_text) rawText = blockData.rich_text.map(rt => rt.plain_text).join('');
  else if (blockData.text) rawText = blockData.text;

  const isTranslated = translateAll || !!individualTranslations[blockId];
  let { jp, en } = splitTranslation(rawText);
  if (!en && enTranslation) en = enTranslation;

  switch (type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      if (!jp) return null;
      const sizes = { heading_1: '26px', heading_2: '22px', heading_3: '18px' };
      return (
        <div style={{ margin: '24px 0 8px' }}>
          <div className="block-heading" style={{ fontSize: sizes[type] }}>{jp}</div>
          {isTranslated && en && <div className="block-translation">{en}</div>}
          <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
        </div>
      );
    }

    case 'paragraph': {
      if (!jp) return null;
      return (
        <div style={{ marginBottom: '4px' }}>
          <div className="block-paragraph">{jp}</div>
          {isTranslated && en && <div className="block-translation">{en}</div>}
          <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
        </div>
      );
    }

    case 'callout': {
      const rawEmoji = blockData.icon?.emoji || '💡';
      const emoji = cleanText(rawEmoji);
      if (!jp && !emoji) return null;
      
      return (
        <div className="block-callout">
          <div className="callout-header">
            {emoji && <span className="callout-emoji">{emoji}</span>}
            <div>
              <div className="callout-text">{jp}</div>
              {isTranslated && en && <div className="block-translation">{en}</div>}
            </div>
          </div>
          <div className="callout-children">
            <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
          </div>
        </div>
      );
    }

    case 'bulleted_list_item':
    case 'numbered_list_item': {
      return (
        <div className="block-bullet">
          <div className="bullet-dot" />
          <div style={{ flex: 1 }}>
            <div className="block-paragraph" style={{ fontSize: '17px' }}>{jp}</div>
            {isTranslated && en && <div className="block-translation">{en}</div>}
            <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
          </div>
        </div>
      );
    }
    
    case 'to_do': {
      const checked = blockData.checked || false;
      return (
        <div className="block-todo" style={{ display: 'flex', alignItems: 'flex-start', margin: '8px 0' }}>
          <input type="checkbox" readOnly checked={checked} style={{ marginTop: '5px', marginRight: '10px' }} />
          <div style={{ flex: 1 }}>
            <div className="block-paragraph" style={{ fontSize: '17px', color: 'var(--primary)' }}>{jp}</div>
            {isTranslated && en && <div className="block-translation">{en}</div>}
            <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
          </div>
        </div>
      );
    }
    
    case 'toggle': {
      return (
        <details className="block-toggle" style={{ margin: '8px 0', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'var(--bg-secondary)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>{jp}</div>
          </summary>
          <div style={{ marginTop: '12px', paddingLeft: '20px' }}>
            {isTranslated && en && <div className="block-translation" style={{ marginBottom: '8px' }}>{en}</div>}
            <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
          </div>
        </details>
      );
    }

    case 'image': {
      const url = blockData.file?.url || blockData.external?.url;
      if (!url) return null;
      return (
        <div style={{ margin: '24px 0' }}>
          <img
            src={url}
            alt="Lesson content"
            style={{ width: '100%', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          />
        </div>
      );
    }

    case 'divider':
      return <div className="divider" style={{ margin: '24px 0' }} />;

    case 'quote': {
      return (
        <div style={{ borderLeft: '4px solid var(--primary)', paddingLeft: '16px', margin: '12px 0', fontStyle: 'italic', color: '#555', fontSize: '16px' }}>
          {jp}
        </div>
      );
    }

    case 'table': {
      // Basic table — rows come as child blocks in Notion format
      return (
        <div className="block-table">
          <table>
            <tbody>
              {(blockData.rows || []).map((row, ri) => (
                <tr key={ri}>
                  {(row.cells || []).map((cell, ci) => {
                    const cellText = (cell || []).map(rt => rt.plain_text).join('');
                    return ri === 0 ? <th key={ci}>{cellText}</th> : <td key={ci}>{cellText}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'display_number': {
      const d = blockData;
      const wordId = `number_${blockId}`;
      let eng = d.english || d.translation || '';
      if (!eng && en) eng = en;
      return (
        <NumberCard
          digit={cleanText(d.digit || d.number?.toString() || '')}
          hiragana={cleanText(d.hiragana || d.reading || '')}
          kanji={cleanText(d.kanji || '')}
          english={cleanText(eng)}
          isTranslated={translateAll || !!individualTranslations[wordId]}
          onToggle={onToggle}
          wordId={wordId}
        />
      );
    }

    case 'vocabulary_item':
    case 'display_greeting': {
      const d = blockData;
      const wordId = `greeting_${blockId}`;
      let eng = d.translation || d.meaning || '';
      if (!eng && en) eng = en;
      return (
        <GreetingCard
          phrase={cleanText(d.word || d.phrase || '')}
          reading={cleanText(d.reading || d.hiragana || '')}
          meaning={cleanText(eng)}
          isTranslated={translateAll || !!individualTranslations[wordId]}
          onToggle={onToggle}
          wordId={wordId}
        />
      );
    }

    case 'grid': {
      const chars = Array.isArray(blockData) ? blockData : (blockData.characters || []);
      return (
        <div className="char-grid">
          {chars.map((ch, i) => <div className="char-cell" key={i}>{ch}</div>)}
        </div>
      );
    }

    default:
      return null;
  }
};

/* ---- Main LessonDetail Component ---- */
const LessonDetail = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [translateAll, setTranslateAll] = useState(false);
  const [individualTranslations, setIndividualTranslations] = useState({});
  const [viewMode, setViewMode] = useState('learning');

  useEffect(() => {
    getLessonContent(lessonId)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonId]);

  const toggleTranslation = useCallback((id) => {
    setIndividualTranslations(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const slides = data?.learning_slides || [];
  const testSections = data?.test_sections || [];
  
  // Determine if we should show test mode immediately
  useEffect(() => {
    if (data && slides.length === 0 && testSections.length > 0 && viewMode === 'learning') {
      setViewMode('test');
    }
  }, [data, slides.length, testSections.length, viewMode]);

  if (loading) {
    return (
      <div className="lesson-container">
        <div className="loading-container" style={{ flex: 1 }}>
          <div className="spinner" />
          レッスンを読み込み中...
        </div>
      </div>
    );
  }

  if ((!slides || slides.length === 0) && (!testSections || testSections.length === 0)) {
    return (
      <div className="lesson-container">
        <div className="loading-container" style={{ flex: 1 }}>
          コンテンツが見つかりませんでした
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex] || {};
  const progress = viewMode === 'learning' && slides.length > 0 ? ((currentSlideIndex + 1) / slides.length) * 100 : 100;
  const isLastSlide = currentSlideIndex === slides.length - 1;

  const goNext = () => {
    if (viewMode === 'learning') {
      if (!isLastSlide) {
        setCurrentSlideIndex(i => i + 1);
        setIndividualTranslations({});
      } else {
        if (testSections.length > 0) {
          setViewMode('test');
          setIndividualTranslations({});
        } else {
          navigate(-1);
        }
      }
    }
  };

  const goPrev = () => {
    if (viewMode === 'test') {
      if (slides.length > 0) {
        setViewMode('learning');
        setCurrentSlideIndex(slides.length - 1);
        setIndividualTranslations({});
      }
    } else if (currentSlideIndex > 0) {
      setCurrentSlideIndex(i => i - 1);
      setIndividualTranslations({});
    }
  };

  // Global speak — read headings/paragraphs on current slide or test section
  const speakPage = () => {
    let textToRead = '';
    const blocksToRead = viewMode === 'learning' ? (currentSlide.content || []) : testSections.flatMap(s => s.content || []);
    
    blocksToRead.forEach(block => {
      const type = block.type;
      const bd = block[type];
      if (!bd) return;
      if (['heading_1','heading_2','heading_3','paragraph'].includes(type)) {
        if (bd.rich_text) textToRead += bd.rich_text.map(r => r.plain_text).join('') + ' ';
      } else if (type === 'display_number') {
        textToRead += (bd.hiragana || bd.reading || '') + ' ';
      }
    });
    speak(textToRead);
  };

  return (
    <div className="lesson-container">
      {/* Immersive Header */}
      <div className="lesson-header">
        <button className="lesson-close-btn" onClick={() => navigate(-1)}>
          <XIcon />
        </button>
        <div className="lesson-progress-container">
          <div className="lesson-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <button className="lesson-close-btn" onClick={speakPage} title="Read Page" style={{ color: 'var(--text-sub)' }}>
          <Volume2 size={20} />
        </button>
        <button
          className={`lesson-translate-btn ${translateAll ? 'active' : ''}`}
          onClick={() => setTranslateAll(v => !v)}
        >
          <TranslateIcon size={14} active={translateAll} />
          {translateAll ? 'Hide All' : 'Translate All'}
        </button>
      </div>

      {/* Main Content Area */}
      {viewMode === 'learning' ? (
        <>
          <div className="lesson-slide-area">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlideIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.28 }}
              >
                {currentSlide.title && (
                  <div className="slide-section-label">
                    {splitTranslation(currentSlide.title).jp}
                  </div>
                )}
                {preprocessBlocks(currentSlide.content || []).map((item, i) => {
                  const blockId = `slide_${currentSlideIndex}_block_${i}`;
                  return (
                    <motion.div
                      key={blockId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                    >
                      <BlockRenderer
                        block={item.block}
                        enTranslation={item.enTranslation}
                        blockId={blockId}
                        translateAll={translateAll}
                        individualTranslations={individualTranslations}
                        onToggle={toggleTranslation}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="lesson-footer">
            {currentSlideIndex > 0 && (
              <button className="lesson-back-btn" onClick={goPrev}>
                <ChevronLeft /> Back
              </button>
            )}
            <button className="lesson-next-btn" onClick={goNext}>
              {isLastSlide && testSections.length === 0 ? 'Complete Lesson' : (isLastSlide ? 'Test / Revision' : 'Next')}
            </button>
          </div>
        </>
      ) : (
        <div className="test-view-area" style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>
          <div style={{ padding: '0px 10px', maxWidth: '800px', margin: '0 auto' }}>
            <div className="test-view-header" style={{ marginBottom: '32px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '28px', color: 'var(--text-color)', marginBottom: '8px' }}>Test & Revision</h2>
              <p style={{ color: 'var(--text-sub)', fontSize: '16px' }}>Let's review what you've learned.</p>
            </div>
            
            {testSections.map((section, secIdx) => (
              <div key={secIdx} className="test-section-card" style={{ 
                background: 'var(--bg-secondary)', 
                padding: '24px', 
                borderRadius: '20px', 
                marginBottom: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                {section.title && (
                  <h3 style={{ 
                    marginBottom: '20px', 
                    color: 'var(--primary)', 
                    borderBottom: '2px solid var(--border-color)', 
                    paddingBottom: '12px',
                    fontSize: '22px'
                  }}>
                    {splitTranslation(section.title).jp}
                  </h3>
                )}
                {preprocessBlocks(section.content || []).map((item, i) => {
                  const blockId = `test_${secIdx}_block_${i}`;
                  return (
                    <div key={blockId} style={{ marginBottom: '16px' }}>
                      <BlockRenderer
                        block={item.block}
                        enTranslation={item.enTranslation}
                        blockId={blockId}
                        translateAll={translateAll}
                        individualTranslations={individualTranslations}
                        onToggle={toggleTranslation}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
            
            <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {slides.length > 0 && (
                <button className="lesson-back-btn" onClick={goPrev} style={{ padding: '16px 32px' }}>
                  <ChevronLeft /> Back to Review
                </button>
              )}
              <button 
                className="lesson-next-btn" 
                onClick={() => navigate(-1)} 
                style={{ padding: '16px 40px', fontSize: '18px', width: 'auto' }}
              >
                Complete Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonDetail;
