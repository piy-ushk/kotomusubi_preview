import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonContent, addAnnotation, deleteAnnotation } from '../services/api';
import { vocabularyService } from '../services/vocabularyService';
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
const BookIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
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

/* ---- Annotation Helper ---- */
const renderAnnotations = (blockId, annotations, onRemoveAnnotation) => {
  if (!annotations || !annotations[blockId]) return null;
  return annotations[blockId].map(ann => {
    if (ann.action === 'add_line') {
      return (
        <div key={ann.id} className="user-annotation-line" style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '12px', color: 'var(--primary)', fontStyle: 'italic', margin: '8px 0', fontSize: '15px', fontWeight: '500' }}>
          <span>{ann.content}</span>
          {onRemoveAnnotation && (
            <button 
              className="remove-annotation-btn"
              onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(blockId, ann.id); }}
              title="Remove note"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      );
    }
    return null;
  });
};

/* ---- Block Renderer ---- */
const BlockRenderer = ({ block, blockId, translateAll, individualTranslations, onToggle, enTranslation, annotations, onContextMenu, onRemoveAnnotation }) => {
  const type = block.type;
  const blockData = block[type];
  if (!blockData) return null;

  let rawText = '';
  if (blockData.rich_text) rawText = blockData.rich_text.map(rt => rt.plain_text).join('');
  else if (blockData.text) rawText = blockData.text;

  const isTranslated = translateAll || !!individualTranslations[blockId];
  let { jp, en } = splitTranslation(rawText);
  if (!en && enTranslation) en = enTranslation;

  const subBlocks = block.children ? (
    <div className="block-children" style={{ marginTop: '8px' }}>
      {block.children.map((child, i) => (
        <BlockRenderer
          key={`${blockId}_n${i}`}
          block={child}
          blockId={`${blockId}_n${i}`}
          translateAll={translateAll}
          individualTranslations={individualTranslations}
          onToggle={onToggle}
          annotations={annotations}
          onContextMenu={onContextMenu}
          onRemoveAnnotation={onRemoveAnnotation}
        />
      ))}
    </div>
  ) : null;

  const handleContext = (e) => {
    if (onContextMenu) onContextMenu(e, blockId);
  };

  switch (type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      if (!jp && !subBlocks) return null;
      const sizes = { heading_1: '26px', heading_2: '22px', heading_3: '18px' };
      return (
        <div style={{ margin: '24px 0 8px' }} onContextMenu={handleContext}>
          {jp && <div className="block-heading" style={{ fontSize: sizes[type] }}>{jp}</div>}
          {isTranslated && en && <div className="block-translation">{en}</div>}
          {jp && <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'paragraph': {
      if (!jp && !subBlocks) return null;
      return (
        <div style={{ marginBottom: '4px' }} onContextMenu={handleContext}>
          {jp && <div className="block-paragraph">{jp}</div>}
          {isTranslated && en && <div className="block-translation">{en}</div>}
          {jp && <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'callout': {
      const rawEmoji = blockData.icon?.emoji || '💡';
      const emoji = cleanText(rawEmoji);
      if (!jp && !emoji && !subBlocks) return null;
      
      return (
        <div className="block-callout" onContextMenu={handleContext}>
          <div className="callout-header">
            {emoji && <span className="callout-emoji">{emoji}</span>}
            <div>
              <div className="callout-text">{jp}</div>
              {isTranslated && en && <div className="block-translation">{en}</div>}
            </div>
          </div>
          <div className="callout-body">
            {subBlocks}
            <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
          </div>
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'bulleted_list_item':
    case 'numbered_list_item': {
      if (!jp && !subBlocks) return null;
      return (
        <div className="block-bullet" onContextMenu={handleContext}>
          <div className="bullet-dot" />
          <div style={{ flex: 1 }}>
            {jp && <div className="block-paragraph" style={{ fontSize: '17px' }}>{jp}</div>}
            {isTranslated && en && <div className="block-translation">{en}</div>}
            {jp && <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />}
            {subBlocks}
            {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
          </div>
        </div>
      );
    }
    
    case 'to_do': {
      if (!jp && !subBlocks) return null;
      const checked = blockData.checked || false;
      return (
        <div className="block-todo" style={{ display: 'flex', alignItems: 'flex-start', margin: '8px 0' }} onContextMenu={handleContext}>
          <input type="checkbox" readOnly checked={checked} style={{ marginTop: '5px', marginRight: '10px' }} />
          <div style={{ flex: 1 }}>
            {jp && <div className="block-paragraph" style={{ fontSize: '17px', color: 'var(--primary)' }}>{jp}</div>}
            {isTranslated && en && <div className="block-translation">{en}</div>}
            {jp && <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />}
            {subBlocks}
            {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
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
          <div style={{ marginTop: '12px', paddingLeft: '10px' }}>
            {isTranslated && en && <div className="block-translation" style={{ marginBottom: '8px' }}>{en}</div>}
            {subBlocks}
            <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />
          </div>
        </details>
      );
    }

    case 'image': {
      const url = blockData.file?.url || blockData.external?.url;
      if (!url) return null;
      return (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <img
            src={url}
            alt="Lesson content"
            style={{
              maxWidth: '100%',
              width: 'auto',
              maxHeight: 'min(320px, 45vh)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'block',
              margin: '0 auto',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    case 'divider':
      return <div className="divider" style={{ margin: '24px 0' }} />;

    case 'quote': {
      if (!jp && !subBlocks) return null;
      return (
        <div style={{ borderLeft: '4px solid var(--primary)', paddingLeft: '16px', margin: '12px 0', fontStyle: 'italic', color: '#555', fontSize: '16px' }} onContextMenu={handleContext}>
          {jp && <div>{jp}</div>}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'table': {
      const hasHeader = blockData.has_column_header;
      return (
        <div className="block-table" style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table>
            <tbody>
              {block.children && block.children.map((row, ri) => (
                <tr key={ri}>
                  {row.table_row?.cells?.map((cell, ci) => {
                    const cellText = cell.map(rt => rt.plain_text).join('');
                    return (ri === 0 && hasHeader) ? <th key={ci}>{cellText}</th> : <td key={ci}>{cellText}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'column_list': {
      return (
        <div className="block-column-list" style={{ display: 'flex', gap: '20px', margin: '16px 0', flexWrap: 'wrap' }}>
          {subBlocks}
        </div>
      );
    }

    case 'column': {
      return (
        <div className="block-column" style={{ flex: 1, minWidth: '200px' }}>
          {subBlocks}
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
  const [annotations, setAnnotations] = useState({});
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    getLessonContent(lessonId)
      .then(res => { 
        setData(res.data); 
        setAnnotations(res.data.annotations || {});
        if (res.data.vocabulary) {
          vocabularyService.addDiscoveredWords(res.data.vocabulary);
        }
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [lessonId]);

  const toggleTranslation = useCallback((id) => {
    setIndividualTranslations(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleContextMenu = useCallback((e, blockId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.pageX, y: e.pageY, blockId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, [closeContextMenu]);

  const handleAddLine = async (blockId) => {
    const text = prompt("Enter your personalized note or line:");
    if (!text) return;
    try {
      const res = await addAnnotation(lessonId, { block_id: blockId, action: "add_line", content: text });
      if (res.data.success) {
         setAnnotations(prev => ({
           ...prev,
           [blockId]: [...(prev[blockId] || []), { id: res.data.annotation_id, action: "add_line", content: text }]
         }));
      }
    } catch (e) {
       console.error("Failed to add annotation", e);
    }
  };

  const handleSaveWord = async (blockId) => {
    alert("Saved to personal memory!");
  };

  const handleBookmark = async (blockId) => {
    alert("Bookmark added!");
  };

  const handleRemoveAnnotation = async (blockId, annotationId) => {
    if (!window.confirm("Are you sure you want to remove this personalized note?")) return;
    try {
      await deleteAnnotation(annotationId);
      setAnnotations(prev => {
        const blockAnns = prev[blockId] || [];
        return {
          ...prev,
          [blockId]: blockAnns.filter(a => a.id !== annotationId)
        };
      });
    } catch (e) {
      console.error("Failed to remove annotation", e);
    }
  };

  const slides = data?.learning_slides || [];
  const testSections = data?.test_sections || [];
  const lessonVocab = data?.vocabulary || [];
  const [learnedIds, setLearnedIds] = useState(vocabularyService.getLearnedWordIds());

  const toggleWordLearned = (wordId) => {
    const newList = vocabularyService.toggleLearned(wordId);
    setLearnedIds(newList);
  };
  
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
          className={`lesson-translate-btn ${viewMode === 'vocabulary' ? 'active' : ''}`}
          onClick={() => setViewMode(v => v === 'vocabulary' ? 'learning' : 'vocabulary')}
          style={{ marginRight: '8px' }}
        >
          <BookIcon size={14} />
          Vocabulary
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
                        annotations={annotations}
                        onContextMenu={handleContextMenu}
                        onRemoveAnnotation={handleRemoveAnnotation}
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
          {viewMode === 'vocabulary' ? (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '28px', color: 'var(--text-color)', marginBottom: '8px' }}>Lesson Vocabulary</h2>
                <p style={{ color: 'var(--text-sub)', fontSize: '16px' }}>Master these words from this lesson.</p>
              </div>
              
              <div className="vocab-list" style={{ display: 'grid', gap: '16px' }}>
                {lessonVocab.length > 0 ? lessonVocab.map((word) => {
                  const isLearned = learnedIds.includes(word.id);
                  return (
                    <div key={word.id} className={`vocab-card ${isLearned ? 'learned' : ''}`} style={{
                      background: 'var(--bg-secondary)',
                      padding: '20px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: isLearned ? '2px solid var(--primary)' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-color)' }}>{word.jp}</div>
                          {word.reading && <div style={{ fontSize: '16px', color: 'var(--text-sub)' }}>{word.reading}</div>}
                        </div>
                        <div style={{ fontSize: '16px', color: 'var(--text-sub)', marginTop: '4px' }}>{word.en}</div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                          className="lesson-speak-btn" 
                          onClick={() => speak(word.jp)}
                          style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '50%', color: 'var(--text-sub)' }}
                        >
                          <Volume2 size={20} />
                        </button>
                        <button 
                          onClick={() => toggleWordLearned(word.id)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: isLearned ? 'var(--primary)' : 'var(--bg-card)',
                            color: isLearned ? 'white' : 'var(--text-sub)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {isLearned ? <><CheckIcon size={16} /> Learned</> : 'Not yet'}
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>
                    No vocabulary items found in this lesson.
                  </div>
                )}
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <button 
                  className="lesson-next-btn" 
                  onClick={() => setViewMode('learning')} 
                  style={{ padding: '16px 40px', fontSize: '18px', width: 'auto' }}
                >
                  Back to Lesson
                </button>
              </div>
            </div>
          ) : (
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
                          annotations={annotations}
                          onContextMenu={handleContextMenu}
                          onRemoveAnnotation={handleRemoveAnnotation}
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
          )}
        </div>
      )}

      {/* Context Menu Modal/Overlay */}
      {contextMenu && (
        <div style={{
          position: 'absolute',
          top: Math.min(contextMenu.y, window.innerHeight - 150),
          left: Math.min(contextMenu.x, window.innerWidth - 180),
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '12px',
          padding: '8px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          minWidth: '160px'
        }} onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => { handleAddLine(contextMenu.blockId); closeContextMenu(); }}
            style={{ padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '15px', color: 'var(--text-color)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            ✏️ Add Line
          </button>
          <button 
            onClick={() => { handleSaveWord(contextMenu.blockId); closeContextMenu(); }}
            style={{ padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '15px', color: 'var(--text-color)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            💾 Save Word
          </button>
          <button 
            onClick={() => { handleBookmark(contextMenu.blockId); closeContextMenu(); }}
            style={{ padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '15px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            🔖 Bookmark
          </button>
        </div>
      )}

    </div>
  );
};

export default LessonDetail;
