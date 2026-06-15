import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonContent, addAnnotation, deleteAnnotation } from '../services/api';
import { vocabularyService } from '../services/vocabularyService';
import { AnimatePresence, motion } from 'framer-motion';
import {
  XIcon, Volume2, TranslateIcon, BookIcon, CheckIcon, ChevronLeft,
  speak, splitTranslation, getTranslationOnly, getTranslationsFromText,
  getRawText, hasJapanese, renderFuriganaText, getNotionColorStyle, renderRichText,
  preprocessBlocks, shouldShowAnswerField, renderAnnotations
} from '../utils/lessonHelpers';
import './TravelLesson.css';

/* ---- Block Components ---- */
const TranslationControls = ({ id, rawText, isTranslated, onToggle }) => (
  <div className="block-controls" style={{ display: 'inline-flex', gap: '8px', marginTop: '4px' }}>
    <button className="local-en-toggle" onClick={() => speak(rawText)}>
      <Volume2 size={12} /> Speak
    </button>
    <button className={`local-en-toggle ${isTranslated ? 'active' : ''}`} onClick={() => onToggle(id)}>
      <TranslateIcon size={12} /> {isTranslated ? 'Hide' : 'Translate'}
    </button>
  </div>
);

const VocabCard = ({ phrase, reading, meaning, isTranslated, onToggle, wordId, showFurigana, pos }) => (
  <div className="vocab-card">
    <div className="vocab-word">{phrase}</div>
    {showFurigana && reading && <div className="note" style={{ margin: '0 0 4px 0' }}>{reading}</div>}
    {pos && <span className="note" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>[{pos}]</span>}
    {meaning && (
      <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
        <button className="vocab-toggle" onClick={() => onToggle(wordId)}>訳を見る</button>
        <p className="vocab-meaning-en">{meaning}</p>
      </div>
    )}
  </div>
);

const NumberCard = ({ digit, hiragana, kanji, english, isTranslated, onToggle, wordId, showFurigana }) => (
  <div className="example">
    <div className="jp">{kanji || hiragana} {digit && `(${digit})`}</div>
    {showFurigana && hiragana && <div className="note">{hiragana}</div>}
    {english && (
      <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
        <button className="local-en-toggle" onClick={() => onToggle(wordId)}>訳を見る</button>
        <p className="en">{english}</p>
      </div>
    )}
  </div>
);

const GreetingCard = ({ phrase, reading, meaning, isTranslated, onToggle, wordId, showFurigana }) => (
  <div className="example">
    <div className="jp">{phrase}</div>
    {showFurigana && reading && <div className="note">{reading}</div>}
    {meaning && (
      <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
        <button className="local-en-toggle" onClick={() => onToggle(wordId)}>訳を見る</button>
        <p className="en">{meaning}</p>
      </div>
    )}
  </div>
);

const BlockRenderer = ({ block, blockId, translateAll, individualTranslations, onToggle, enTranslation, annotations, onContextMenu, onRemoveAnnotation, translationLanguage, showFurigana }) => {
  const type = block.type;
  const blockData = block[type];
  if (!blockData) return null;

  let rawText = '';
  if (blockData.rich_text) rawText = blockData.rich_text.map(rt => rt.plain_text).join('');
  else if (blockData.text) rawText = blockData.text;

  const isTranslated = translateAll || !!individualTranslations[blockId];
  let { jp, en } = splitTranslation(rawText, translationLanguage);
  if (!en && enTranslation) en = getTranslationOnly(enTranslation, translationLanguage);
  const hasJpChars = hasJapanese(rawText);
  const jpContent = blockData.rich_text ? renderRichText(blockData.rich_text, showFurigana) : renderFuriganaText(jp, showFurigana);

  const subBlocks = block.children ? (
    <div className="block-children" style={{ marginTop: '8px' }}>
      {preprocessBlocks(block.children).map((item, i) => (
        <BlockRenderer
          key={`${blockId}_n${i}`}
          block={item.block}
          enTranslation={item.enTranslation}
          blockId={`${blockId}_n${i}`}
          translateAll={translateAll}
          individualTranslations={individualTranslations}
          onToggle={onToggle}
          annotations={annotations}
          onContextMenu={onContextMenu}
          onRemoveAnnotation={onRemoveAnnotation}
          translationLanguage={translationLanguage}
          showFurigana={showFurigana}
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
      return (
        <div onContextMenu={handleContext}>
          {jp && <h3 className="subhead">{jpContent}</h3>}
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <p className="en">{en}</p>
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'paragraph': {
      if (!jp && !subBlocks) return null;
      return (
        <div className="meaning" onContextMenu={handleContext}>
          {jp && <p>{jpContent}</p>}
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <p className="en">{en}</p>
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'callout': {
      const rawEmoji = blockData.icon?.emoji || '';
      const emoji = rawEmoji;
      if (!jp && !emoji && !subBlocks) return null;
      return (
        <div className="conj-box tone-plain" style={{ marginTop: '10px' }} onContextMenu={handleContext}>
          <div className="conj-header">
            <span className="conj-pattern">{emoji} {jpContent}</span>
          </div>
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <p className="en">{en}</p>
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'bulleted_list_item':
    case 'numbered_list_item': {
      if (!jp && !subBlocks) return null;
      return (
        <ul className="point-list" onContextMenu={handleContext}>
          <li>
            {jp && <span>{jpContent}</span>}
            {en && (
              <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                <p className="en">{en}</p>
              </div>
            )}
            {subBlocks}
            {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
          </li>
        </ul>
      );
    }
    
    case 'to_do': {
      if (!jp && !subBlocks) return null;
      const checked = blockData.checked || false;
      return (
        <ul className="point-list" onContextMenu={handleContext}>
          <li>
            <input type="checkbox" readOnly checked={checked} style={{ marginRight: '8px' }}/>
            {jp && <span>{jpContent}</span>}
            {en && (
              <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                <p className="en">{en}</p>
              </div>
            )}
            {subBlocks}
            {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
          </li>
        </ul>
      );
    }
    
    case 'toggle': {
      return (
        <details className="drill" style={{ margin: '8px 0' }}>
          <summary>{jpContent}</summary>
          <div className="drill-body">
            {isTranslated && en && <p className="en">{en}</p>}
            {subBlocks}
            {hasJpChars && <TranslationControls id={blockId} rawText={rawText} isTranslated={isTranslated} onToggle={onToggle} />}
          </div>
        </details>
      );
    }

    case 'image': {
      const url = blockData.file?.url || blockData.external?.url;
      if (!url) return null;
      return (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <img src={url} alt="Content" className="vocab-img" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
        </div>
      );
    }

    case 'child_database': {
      const items = block.database_items;
      if (!items || items.length === 0) return null;
      return (
        <div className="vocab-grid" style={{ marginTop: '16px' }}>
          {items.map(item => {
            const wordId = `inline_vocab_${item.id}`;
            const v = item.vocab || {};
            let eng = getTranslationOnly(v.en || '', translationLanguage);
            return (
              <VocabCard
                key={item.id}
                phrase={cleanText(v.jp || '')}
                reading={cleanText(v.reading || '')}
                pos={v.pos}
                meaning={cleanText(eng)}
                isTranslated={translateAll || !!individualTranslations[wordId]}
                onToggle={onToggle}
                wordId={wordId}
                showFurigana={showFurigana}
              />
            );
          })}
        </div>
      );
    }

    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px dashed var(--line)', margin: '24px 0' }} />;

    case 'quote': {
      if (!jp && !subBlocks) return null;
      const isKen = jpContent.toString().includes('ケン') || jpContent.toString().includes('Ken');
      return (
        <div className={`bubble ${isKen ? 'ken' : 'ana'}`} onContextMenu={handleContext}>
          {jpContent}
          {en && <p className="en">{en}</p>}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'table': {
      const hasHeader = blockData.has_column_header;
      return (
        <table className="form-table" style={{ margin: '16px 0' }}>
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
      );
    }

    case 'column_list':
      return <div className="ta-chart-grid" style={{ margin: '16px 0' }}>{subBlocks}</div>;

    case 'column':
      return <div className="ta-group">{subBlocks}</div>;

    case 'display_number': {
      const d = blockData;
      const wordId = `number_${blockId}`;
      let eng = getTranslationOnly(d.english || d.translation || '', translationLanguage);
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
          showFurigana={showFurigana}
        />
      );
    }

    case 'vocabulary_item':
    case 'display_greeting': {
      const d = blockData;
      const wordId = `greeting_${blockId}`;
      let eng = getTranslationOnly(d.translation || d.meaning || '', translationLanguage);
      if (!eng && en) eng = en;
      return (
        <GreetingCard
          phrase={cleanText(d.word || d.phrase || '')}
          reading={cleanText(d.reading || d.hiragana || '')}
          meaning={cleanText(eng)}
          isTranslated={translateAll || !!individualTranslations[wordId]}
          onToggle={onToggle}
          wordId={wordId}
          showFurigana={showFurigana}
        />
      );
    }

    case 'grid': {
      const chars = Array.isArray(blockData) ? blockData : (blockData.characters || []);
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {chars.map((ch, i) => <div className="mark" key={i}>{ch}</div>)}
        </div>
      );
    }

    default:
      return null;
  }
};

const TravelLessonLayout = ({ data, lessonId, textbookTitle, levelTitle }) => {
  const navigate = useNavigate();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [translateAll, setTranslateAll] = useState(false);
  const [individualTranslations, setIndividualTranslations] = useState({});
  const [viewMode, setViewMode] = useState(data?.learning_slides?.length > 0 ? 'learning' : (data?.vocabulary?.length > 0 ? 'vocabulary' : 'learning'));
  const [annotations, setAnnotations] = useState(data?.annotations || {});
  const [contextMenu, setContextMenu] = useState(null);
  const [showFurigana, setShowFurigana] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState('en');
  const [answerInputs, setAnswerInputs] = useState({});

  const toggleTranslation = useCallback((id) => {
    setIndividualTranslations(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAnswerChange = useCallback((id, value) => {
    setAnswerInputs(prev => ({ ...prev, [id]: value }));
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

  const slides = data?.learning_slides || [];
  const testSections = data?.test_sections || [];
  const currentSlide = slides[currentSlideIndex] || {};
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

  const renderVocabulary = () => {
    if (!data?.vocabulary || data.vocabulary.length === 0) {
      return <div className="empty-state" style={{padding: '24px'}}>単語が見つかりませんでした</div>;
    }
    return (
      <div className="test-view-area">
        <section className="section">
          <h2 className="section-title"><span className="num">!</span>単語・フレーズ確認</h2>
          <div className="vocab-grid">
            {data.vocabulary.map((vocab, idx) => (
              <div key={idx} className={`vocab-card ${individualTranslations[`vocab_mean_${idx}`] ? 'show-meaning' : ''} ${individualTranslations[`vocab_ex_${idx}`] ? 'show-ex-en' : ''}`}>
                <h3 className="vocab-word">{vocab.word}</h3>
                {vocab.reading && <p className="vocab-reading" style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.15rem'}}>{vocab.reading}</p>}
                
                <button className="vocab-toggle" onClick={() => toggleTranslation(`vocab_mean_${idx}`)}>
                  意味を見る
                </button>
                <p className="vocab-meaning-en">{vocab.meaning}</p>
                
                {vocab.example && (
                  <div style={{marginTop: '1rem'}}>
                    <button className="vocab-toggle" onClick={() => toggleTranslation(`vocab_ex_${idx}`)}>
                      例文を見る
                    </button>
                    <div className="vocab-example-section">
                      <p className="vocab-example">{vocab.example}</p>
                      {vocab.exampleMeaning && <p className="vocab-example-en">{vocab.exampleMeaning}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        <div className="toolbar" style={{ justifyContent: 'center' }}>
          <button onClick={() => navigate(-1)} type="button" className="active">Complete Lesson</button>
        </div>
      </div>
    );
  };

  return (
    <div className="travel-lesson-page">
      <div className="page">
        <div className="toolbar">
          <button onClick={() => navigate(-1)} type="button">Back</button>
          <button className={translateAll ? 'active' : ''} onClick={() => setTranslateAll(v => !v)} type="button">
            {translateAll ? 'Hide Translations' : 'Translate All'}
          </button>
          <button onClick={() => setShowFurigana(v => !v)} type="button">
            Furigana
          </button>
        </div>

        <header className="hero">
          <div className="hero-inner">
            <span className="eyebrow">{textbookTitle} ・ {levelTitle}</span>
            <h1 className="title">{data?.title ? splitTranslation(data.title).jp : 'Lesson'}</h1>
            <p className="subtitle">{data?.title ? splitTranslation(data.title).en : ''}</p>
          </div>
        </header>

        {viewMode === 'vocabulary' ? renderVocabulary() : viewMode === 'learning' ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }}
            >
              <section className="section">
                {currentSlide.title && (
                  <h2 className="section-title">
                    <span className="num">{currentSlideIndex + 1}</span>
                    {splitTranslation(currentSlide.title).jp}
                  </h2>
                )}
                {preprocessBlocks(currentSlide.content || []).map((item, i) => {
                  const blockId = `slide_${currentSlideIndex}_block_${i}`;
                  return (
                    <BlockRenderer
                      key={blockId}
                      block={item.block}
                      enTranslation={item.enTranslation}
                      blockId={blockId}
                      translateAll={translateAll}
                      individualTranslations={individualTranslations}
                      onToggle={toggleTranslation}
                      annotations={annotations}
                      onContextMenu={handleContextMenu}
                      onRemoveAnnotation={null}
                      translationLanguage={translationLanguage}
                      showFurigana={showFurigana}
                    />
                  );
                })}
              </section>

              <div className="toolbar" style={{ justifyContent: 'center' }}>
                {currentSlideIndex > 0 && (
                  <button onClick={goPrev} type="button">Back</button>
                )}
                <button onClick={goNext} type="button" className="active">
                  {isLastSlide && testSections.length > 0 ? 'Test / Revision' : (isLastSlide ? 'Complete Lesson' : 'Next')}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="test-view-area">
            {testSections.map((section, secIdx) => (
              <section key={secIdx} className="section">
                {section.title && (
                  <h2 className="section-title">
                    <span className="num">{secIdx + 1}</span>
                    {splitTranslation(section.title).jp}
                  </h2>
                )}
                {preprocessBlocks(section.content || []).map((item, i) => {
                  const blockId = `test_${secIdx}_block_${i}`;
                  return (
                    <div key={blockId}>
                      <BlockRenderer
                        block={item.block}
                        enTranslation={item.enTranslation}
                        blockId={blockId}
                        translateAll={translateAll}
                        individualTranslations={individualTranslations}
                        onToggle={toggleTranslation}
                        annotations={annotations}
                        onContextMenu={handleContextMenu}
                        onRemoveAnnotation={null}
                        translationLanguage={translationLanguage}
                        showFurigana={showFurigana}
                      />
                      {shouldShowAnswerField(item.block, section.title) && (
                        <textarea
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', marginTop: '8px' }}
                          placeholder="回答を書き込む"
                          value={answerInputs[blockId] || ''}
                          onChange={(e) => handleAnswerChange(blockId, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </section>
            ))}
            <div className="toolbar" style={{ justifyContent: 'center' }}>
              <button onClick={goPrev} type="button">Back to Review</button>
              <button onClick={() => navigate(-1)} type="button" className="active">Complete Lesson</button>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div style={{
            position: 'absolute', top: contextMenu.y, left: contextMenu.x,
            background: 'white', border: '1px solid #ccc', borderRadius: '8px', padding: '8px', zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { handleAddLine(contextMenu.blockId); closeContextMenu(); }} style={{ display: 'block', background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
              ✏️ Add Line
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelLessonLayout;
