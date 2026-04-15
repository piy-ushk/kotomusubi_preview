import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonContent } from '../services/api';
import { X, Volume2, Languages, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LessonDetail = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [translateAll, setTranslateAll] = useState(false);
  const [individualTranslations, setIndividualTranslations] = useState({});

  useEffect(() => {
    getLessonContent(lessonId)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [lessonId]);

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    // For flashcards, sometimes data is in different fields
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const toggleTranslation = (id) => {
    setIndividualTranslations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const splitTranslation = (text) => {
    if (typeof text !== 'string') return { jp: text?.toString() || '', en: '' };
    if (text.includes('｜')) {
      const parts = text.split('｜');
      return { jp: parts[0].trim(), en: parts[1].trim() };
    } else if (text.includes('|')) {
      const parts = text.split('|');
      return { jp: parts[0].trim(), en: parts[1].trim() };
    }
    return { jp: text, en: '' };
  };

  const renderBlock = (block, index, depth = 0) => {
    const type = block.type;
    const blockId = `block_${currentSlideIndex}_${index}_${depth}`;
    const blockData = block[type];
    
    if (!blockData) return null;

    let text = "";
    if (blockData.rich_text) {
      text = blockData.rich_text.map(rt => rt.plain_text).join("");
    } else if (blockData.text) {
       text = blockData.text;
    }

    const { jp, en } = splitTranslation(text);
    const isTranslated = translateAll || individualTranslations[blockId];

    switch (type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return (
          <div key={blockId} className="block-heading">
            <div>{jp}</div>
            {isTranslated && en && <div style={{ fontSize: '0.9rem', opacity: 0.6, fontStyle: 'italic' }}>{en}</div>}
            <div className="flex gap-4">
              <button className="action-btn" onClick={() => speak(jp)}><Volume2 size={14} /> Speak</button>
              <button className="action-btn secondary-action-btn" onClick={() => toggleTranslation(blockId)}>
                <Languages size={14} /> {isTranslated ? "Hide" : "Translate"}
              </button>
            </div>
          </div>
        );
      
      case 'paragraph':
        return (
          <div key={blockId} className="block-paragraph">
            <div>{jp}</div>
            {isTranslated && en && <div style={{ fontSize: '0.85rem', opacity: 0.7, fontStyle: 'italic', marginTop: '4px' }}>{en}</div>}
            <div className="flex gap-4">
              <button className="action-btn" onClick={() => speak(jp)}><Volume2 size={14} /></button>
              <button className="action-btn secondary-action-btn" onClick={() => toggleTranslation(blockId)}>
                {isTranslated ? "Hide" : "Translate"}
              </button>
            </div>
          </div>
        );

      case 'callout':
        return (
          <div key={blockId} className="block-callout">
             <div className="callout-header">
                <span className="callout-emoji">{blockData.icon?.emoji || '💡'}</span>
                <div>
                   <div className="callout-title">{jp}</div>
                   {isTranslated && en && <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{en}</div>}
                </div>
             </div>
             <div className="callout-children">
                 <button className="action-btn" onClick={() => speak(jp)}><Volume2 size={12} /> Speak</button>
             </div>
          </div>
        );

      case 'bulleted_list_item':
        return (
          <div key={blockId} className="block-bullet">
             <div className="bullet-dot" />
             <div>
                <div>{jp}</div>
                {isTranslated && en && <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{en}</div>}
             </div>
          </div>
        );

      case 'display_number':
      case 'vocabulary_item':
      case 'display_greeting':
        // These are custom blocks from the atomic data or specialized Notion structure
        const d = blockData;
        const mainText = d.kanji || d.word || d.phrase || jp;
        const sub1 = d.digit || d.number || '';
        const sub2 = d.hiragana || d.reading || '';
        const trans = d.english || d.translation || d.meaning || en;

        return (
          <div key={blockId} className="flashcard">
             <div className="flashcard-kanji">{mainText}</div>
             {sub1 && <div style={{ fontSize: '3rem', color: '#C49F7B', fontWeight: '300', marginTop: '1rem' }}>{sub1}</div>}
             <div className="flashcard-reading">{sub2}</div>
             {(isTranslated && trans) ? (
                <div className="flashcard-translation">{trans}</div>
             ) : (
                <button className="action-btn" style={{ fontSize: '1.1rem', marginTop: '1rem' }} onClick={() => toggleTranslation(blockId)}>
                   Show Translation
                </button>
             )}
             <button className="action-btn" style={{ marginTop: '2rem' }} onClick={() => speak(sub2 || mainText)}>
                <Volume2 size={40} />
             </button>
          </div>
        );

      case 'image':
        return (
          <div key={blockId} style={{ margin: '2rem 0' }}>
            <img 
               src={blockData.file?.url || blockData.external?.url} 
               alt="Lesson Content" 
               style={{ width: '100%', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} 
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Lesson...</div>;

  const slides = data.slides;
  if (!slides || slides.length === 0) return <div className="p-10 text-center">No content found.</div>;

  const currentSlide = slides[currentSlideIndex];
  const progress = ((currentSlideIndex + 1) / slides.length) * 100;

  return (
    <div className="lesson-container">
      {/* Immersive Header */}
      <div className="lesson-header">
        <button onClick={() => navigate(-1)}><X size={24} /></button>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <button 
          onClick={() => setTranslateAll(!translateAll)}
          style={{ color: translateAll ? 'var(--primary)' : '#9e9e9e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          <Languages size={18} />
          {translateAll ? "Hide All" : "Translate All"}
        </button>
      </div>

      {/* Slide Content */}
      <div className="slide-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%' }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'blue', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentSlide.title}
            </span>
            <div style={{ marginTop: '1rem' }}>
              {currentSlide.content.map((block, i) => (
                <div key={i}>
                  {renderBlock(block, i)}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Footer Navigation */}
      <div className="slide-footer">
        <div className="flex gap-4 w-100" style={{ width: '100%' }}>
          {currentSlideIndex > 0 && (
            <button 
              className="flex items-center justify-center gap-2 p-4"
              style={{ flex: 1, border: '1px solid var(--primary)', borderRadius: '12px', color: 'var(--primary)', fontWeight: 'bold' }}
              onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
            >
              <ChevronLeft size={20} /> Back
            </button>
          )}
          <button 
            className="primary-button" 
            style={{ flex: 2, marginTop: 0 }}
            onClick={() => {
              if (currentSlideIndex < slides.length - 1) {
                setCurrentSlideIndex(currentSlideIndex + 1);
              } else {
                navigate(-1);
              }
            }}
          >
            {currentSlideIndex < slides.length - 1 ? "Next" : "Complete Lesson"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonDetail;
