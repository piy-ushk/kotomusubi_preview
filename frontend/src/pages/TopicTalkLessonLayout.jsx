import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AutoTranslate from '../components/AutoTranslate';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonContent, addAnnotation, deleteAnnotation, getLessonNote, saveLessonNote } from '../services/api';
import { vocabularyService } from '../services/vocabularyService';
import {
  XIcon, Volume2, TranslateIcon, BookIcon, CheckIcon, ChevronLeft,
  speak, splitTranslation, getTranslationOnly, getTranslationsFromText,
  getRawText, hasJapanese, renderFuriganaText, getNotionColorStyle, renderRichText,
  preprocessBlocks, shouldShowAnswerField, renderAnnotations, cleanText, getLanguageLabel, parseLanguageSegments, LANGUAGE_LABELS
} from '../utils/lessonHelpers';
import './TopicTalkLesson.css';

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

const BlockRenderer = ({ block, blockId, translateAll, individualTranslations, onToggle, enTranslation, annotations, onContextMenu, onRemoveAnnotation, translationLanguage, showFurigana, sectionTitle }) => {
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
          sectionTitle={sectionTitle}
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
              <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'paragraph': {
      if (!jp && !subBlocks) return null;
      // If it's a practice section, we might render it as a pair card or practice card.
      // But standard rendering is plain text.
      const isPair = /ペアワーク|pair/i.test(sectionTitle);
      if (isPair) {
        return (
          <div className="pair-card" onContextMenu={handleContext}>
            <div style={{ display: 'flex' }}>
              <div className="pair-num">Q</div>
              <div style={{ flex: 1 }}>
                {jp && <p className="pair-q">{jpContent}</p>}
                {en && (
                  <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                    <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                    <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
                  </div>
                )}
                {subBlocks}
              </div>
            </div>
            {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
          </div>
        );
      }
      return (
        <div style={{ marginBottom: '8px' }} onContextMenu={handleContext}>
          {jp && <p style={{ margin: 0 }}>{jpContent}</p>}
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
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
      const isFlow = /流れ|flow/i.test(sectionTitle);
      if (isFlow) {
        return (
          <ul className="flow-list" onContextMenu={handleContext}>
            <li>
              <span className="flow-num">•</span>
              <div className="flow-content">
                <strong>{jpContent}</strong>
                {en && <span>{en}</span>}
                {subBlocks}
                {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
              </div>
            </li>
          </ul>
        );
      }
      
      const renderArrowPair = (text) => {
        if (text && text.includes('→')) {
          const parts = text.split('→');
          if (parts.length === 2) {
             const isRevealed = individualTranslations[blockId + '_arrow'];
             return (
               <div className="conj-pair">
                  {hasJapanese(parts[0]) ? renderFuriganaText(parts[0].trim(), showFurigana) : parts[0].trim()} 
                  <span className="arrow" style={{ margin: '0 8px' }}>→</span> 
                  <span className={`conj-answer ${isRevealed ? 'revealed' : ''}`} onClick={() => onToggle(blockId + '_arrow')}>
                    {hasJapanese(parts[1]) ? renderFuriganaText(parts[1].trim(), showFurigana) : parts[1].trim()}
                  </span>
               </div>
             );
          }
        }
        return jpContent;
      };

      return (
        <ul className="flow-list" style={{ marginTop: '0', marginBottom: '8px' }} onContextMenu={handleContext}>
          <li style={{ padding: '4px 0', border: 'none' }}>
            <span className="flow-num" style={{ width: '16px', height: '16px', fontSize: '10px' }}>•</span>
            <div className="flow-content" style={{ flex: 1 }}>
              {jp && renderArrowPair(jp)}
              {en && (
                <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                  <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                  <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
                </div>
              )}
              {subBlocks}
              {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
            </div>
          </li>
        </ul>
      );
    }
    
    case 'toggle': {
      if (!jp && !subBlocks) return null;
      
      const aMatch = rawText.match(/^(?:👦🏻|🧒🏻|👩🏻|👨🏻|🧑🏻)?\s*(A|B|ケン|アナ|Ken|Ana|佐藤|Sato)[：:]\s*(.*)/);
      if (aMatch) {
        const speaker = aMatch[1];
        const isKen = speaker === 'ケン' || speaker === 'Ken' || speaker === 'A';
        
        // Render the remaining text without the speaker prefix
        let bubbleContent;
        if (blockData.rich_text) {
          // Clone the rich text array to safely mutate it
          let modifiedRichText = JSON.parse(JSON.stringify(blockData.rich_text));
          if (modifiedRichText.length > 0) {
            // Check if the first item contains the speaker text, and strip it
            modifiedRichText[0].text.content = modifiedRichText[0].text.content.replace(/^(?:👦🏻|🧒🏻|👩🏻|👨🏻|🧑🏻)?\s*(A|B|ケン|アナ|Ken|Ana|佐藤|Sato)[：:]\s*/, '');
            modifiedRichText[0].plain_text = modifiedRichText[0].text.content;
          }
          bubbleContent = renderRichText(modifiedRichText, showFurigana);
        } else {
          bubbleContent = renderFuriganaText(aMatch[2], showFurigana);
        }

        return (
          <div className="dialogue" style={{ marginTop: '8px' }}>
            <div className={`bubble ${isKen ? 'ken' : 'ana'}`} onContextMenu={handleContext}>
              <span className="speaker">{speaker === 'ケン' || speaker === 'Ken' ? '👦🏻 ケン' : '🧒🏻 アナ'}</span>
              {bubbleContent}
              {en && (
                <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                  <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                  <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
                </div>
              )}
              {subBlocks}
              {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
            </div>
          </div>
        );
      }

      return (
        <div className="sample-wrap show" style={{ margin: '8px 0' }}>
          <button className="sample-toggle" onClick={(e) => {
             const body = e.target.nextElementSibling;
             if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
          }}>{jpContent}</button>
          <div className="sample-body" style={{ display: 'none' }}>
            {en && (
              <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
              </div>
            )}
            {subBlocks}
          </div>
        </div>
      );
    }

    case 'quote': {
      if (!jp && !subBlocks) return null;
      const aMatch = rawText.match(/^(?:👦🏻|🧒🏻|👩🏻|👨🏻|🧑🏻)?\s*(A|B|ケン|アナ|Ken|Ana|佐藤|Sato)[：:]\s*(.*)/);
      let speaker = '';
      let bubbleContent = jpContent;
      
      if (aMatch) {
        speaker = aMatch[1];
        if (blockData.rich_text) {
          let modifiedRichText = JSON.parse(JSON.stringify(blockData.rich_text));
          if (modifiedRichText.length > 0) {
            modifiedRichText[0].text.content = modifiedRichText[0].text.content.replace(/^(?:👦🏻|🧒🏻|👩🏻|👨🏻|🧑🏻)?\s*(A|B|ケン|アナ|Ken|Ana|佐藤|Sato)[：:]\s*/, '');
            modifiedRichText[0].plain_text = modifiedRichText[0].text.content;
          }
          bubbleContent = renderRichText(modifiedRichText, showFurigana);
        } else {
          bubbleContent = renderFuriganaText(aMatch[2], showFurigana);
        }
      } else {
        const isKenFallback = rawText.includes('ケン') || rawText.includes('Ken') || rawText.includes('A:');
        speaker = isKenFallback ? 'ケン' : 'アナ';
      }
      
      const isKen = speaker === 'ケン' || speaker === 'Ken' || speaker === 'A';
      return (
        <div className={`bubble ${isKen ? 'ken' : 'ana'}`} onContextMenu={handleContext}>
          <span className="speaker">{isKen ? '👦🏻 ケン' : '🧒🏻 アナ'}</span>
          {bubbleContent}
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'vocabulary_item':
    case 'display_greeting': {
      const d = blockData;
      const wordId = `vocab_${blockId}`;
      let eng = getTranslationOnly(d.translation || d.meaning || '', translationLanguage);
      if (!eng && en) eng = en;
      return (
        <div className="vocab-grid">
          <VocabCard
            phrase={cleanText(d.word || d.phrase || '')}
            reading={cleanText(d.reading || d.hiragana || '')}
            pos={d.pos}
            meaning={cleanText(eng)}
            isTranslated={translateAll || !!individualTranslations[wordId]}
            onToggle={onToggle}
            wordId={wordId}
            showFurigana={showFurigana}
          />
        </div>
      );
    }

    case 'image': {
      return null;
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

    case 'callout': {
      if (!jp && !subBlocks) return null;
      
      const bgColor = blockData.color || 'default';
      let calloutStyle = {
        padding: '16px',
        background: 'var(--card)',
        borderRadius: '12px',
        margin: '16px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        borderLeft: '4px solid var(--primary)'
      };
      let customClass = 'callout';

      if (bgColor === 'pink_background') {
        delete calloutStyle.borderLeft;
        calloutStyle.borderRight = '4px solid var(--ana-color)';
        customClass += ' callout-ana';
      } else if (bgColor === 'blue_background') {
        calloutStyle.borderLeft = '4px solid var(--ken-color)';
        customClass += ' callout-ken';
      }

      return (
        <div className={customClass} style={calloutStyle} onContextMenu={handleContext}>
          {blockData.icon && blockData.icon.emoji && <span style={{ marginRight: '8px' }}>{blockData.icon.emoji}</span>}
          <strong style={{ fontSize: '1.1em' }}>{jpContent}</strong>
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <AutoTranslate text={en} targetLang={translationLanguage} className="en" />
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px dashed var(--line)', margin: '24px 0' }} />;

    case 'column_list':
      return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '16px 0' }}>{subBlocks}</div>;

    case 'column':
      return <div>{subBlocks}</div>;

    default:
      return null;
  }
};

const TopicTalkLessonLayout = ({ data, lessonId, textbookTitle, levelTitle }) => {
  const navigate = useNavigate();
  const [translateAll, setTranslateAll] = useState(false);
  const [individualTranslations, setIndividualTranslations] = useState({});
  const [annotations, setAnnotations] = useState(data?.annotations || {});
  const [contextMenu, setContextMenu] = useState(null);
  const [showFurigana, setShowFurigana] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState('en');
  const [answerInputs, setAnswerInputs] = useState({});
  const [lessonNote, setLessonNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (lessonId) {
      getLessonNote(lessonId).then(res => {
        if (res.data?.content) setLessonNote(res.data.content);
      }).catch(err => console.error(err));
    }
  }, [lessonId]);

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await saveLessonNote(lessonId, lessonNote);
      alert('ノートを保存しました！');
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
    }
    setIsSavingNote(false);
  };

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

  // Helper: render blocks with grouping of quotes -> .dialogue and toggles -> .drills 2-col grid
  const renderGroupedBlocks = (items, prefix) => {
    const elements = [];
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      const blockType = item.block.type;

      if (blockType === 'quote') {
        const group = [];
        const groupStart = i;
        while (i < items.length && items[i].block.type === 'quote') {
          group.push({ ...items[i], idx: i });
          i++;
        }
        elements.push(
          <div className="dialogue" key={`${prefix}_dialogue_${groupStart}`}>
            {group.map((gItem) => {
              const blockId = `${prefix}_block_${gItem.idx}`;
              return (
                <BlockRenderer
                  key={blockId}
                  block={gItem.block}
                  enTranslation={gItem.enTranslation}
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
          </div>
        );
        continue;
      }

      if (blockType === 'toggle') {
        const group = [];
        const groupStart = i;
        while (i < items.length && items[i].block.type === 'toggle') {
          group.push({ ...items[i], idx: i });
          i++;
        }
        elements.push(
          <div className="drills" key={`${prefix}_drills_${groupStart}`}>
            {group.map((gItem) => {
              const blockId = `${prefix}_block_${gItem.idx}`;
              return (
                <BlockRenderer
                  key={blockId}
                  block={gItem.block}
                  enTranslation={gItem.enTranslation}
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
          </div>
        );
        continue;
      }

      const blockId = `${prefix}_block_${i}`;
      elements.push(
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
      i++;
    }
    return elements;
  };

  return (
    <div className={`topic-talk-lesson-page ${translateAll ? 'show-en' : ''}`}>
      <div className="page">
        <div className="toolbar">
          <button onClick={() => navigate(-1)} type="button">Back</button>
            <select 
              value={translationLanguage} 
              onChange={(e) => setTranslationLanguage(e.target.value)}
              style={{ padding: '0.45rem 1rem', borderRadius: '999px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--accent-dark)', fontFamily: 'inherit', fontSize: 'var(--fs-small)', fontWeight: 500, cursor: 'pointer', outline: 'none', marginLeft: '0.5rem' }}
            >
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
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

        {(() => {
          const allSections = [];
          
          const chunkBlocks = (blocks, initialTitle, isTest) => {
            let currentSection = {
              title: initialTitle,
              content: [],
              isTest
            };
            
            const hasMeaningfulContent = (contentArr) => {
              return contentArr.some(cItem => {
                const t = cItem.block.type;
                if (t === 'divider') return false;
                if (t === 'paragraph') {
                  const text = cItem.block.paragraph.rich_text?.map(rt => rt.plain_text).join('') || '';
                  if (!text.trim()) return false;
                }
                return true;
              });
            };

            blocks.forEach(item => {
              const b = item.block;
              if (b.type === 'heading_1' || b.type === 'heading_2' || b.type === 'heading_3') {
                if (currentSection.title || hasMeaningfulContent(currentSection.content)) {
                  allSections.push(currentSection);
                  currentSection = { title: '', content: [], isTest };
                }
                
                let headingText = '';
                if (b[b.type].rich_text) headingText = b[b.type].rich_text.map(rt => rt.plain_text).join('');
                else if (b[b.type].text) headingText = b[b.type].text;
                
                currentSection.title = headingText;
                
              } else if (b.type === 'child_database') {
                const pageItems = b.database_items?.filter(dbItem => dbItem.page_blocks?.length > 0) || [];
                if (pageItems.length > 0) {
                  if (currentSection.title || hasMeaningfulContent(currentSection.content)) {
                    allSections.push(currentSection);
                  }
                  
                  b.database_items.forEach(dbItem => {
                    if (dbItem.page_blocks?.length > 0) {
                      const dbBlocks = preprocessBlocks(dbItem.page_blocks, true);
                      chunkBlocks(dbBlocks, '', isTest); 
                    }
                  });
                  
                  currentSection = { title: '', content: [], isTest };
                } else {
                  currentSection.content.push(item);
                }
              } else {
                currentSection.content.push(item);
              }
            });
            
            if (currentSection.title || hasMeaningfulContent(currentSection.content)) {
              allSections.push(currentSection);
            }
          };

          slides.forEach(slide => {
            const pb = preprocessBlocks(slide.content || [], true);
            chunkBlocks(pb, '', false);
          });
          
          testSections.forEach(section => {
            const pb = preprocessBlocks(section.content || [], true);
            chunkBlocks(pb, '', true);
          });

          const validSections = allSections.filter(sec => {
            const hasContent = sec.content.some(item => {
              const t = item.block.type;
              if (t === 'divider' || t === 'image') return false; 
              if (t === 'paragraph') {
                const text = item.block.paragraph.rich_text?.map(rt => rt.plain_text).join('') || '';
                if (!text.trim()) return false;
              }
              return true;
            });
            return hasContent || sec.title;
          });

          return validSections.map((section, secIdx) => (
            <section className={`section ${section.isTest ? 'quiz-section' : ''}`} key={`sec_${secIdx}`}>
              {section.title && (
                <h2 className="section-title">
                  <span className="num">{secIdx + 1}</span>
                  {splitTranslation(section.title).jp}
                </h2>
              )}
              {renderGroupedBlocks(section.content, `sec_${secIdx}`)}
            </section>
          ))
        })()}

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', color: 'var(--accent-dark)' }}>My Note</h3>
          <textarea 
            value={lessonNote} 
            onChange={e => setLessonNote(e.target.value)}
            placeholder="ここにメモや英作文を自由に書いてください..."
            style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--line)', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <button 
            onClick={handleSaveNote}
            disabled={isSavingNote}
            style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isSavingNote ? '保存中...' : '保存する (Save)'}
          </button>
        </div>

        <div className="toolbar" style={{ justifyContent: 'center', marginTop: '30px' }}>
          <button onClick={() => navigate(-1)} type="button" className="active" style={{ fontSize: '1.1rem', padding: '12px 30px' }}>Complete Lesson</button>
        </div>

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

export default TopicTalkLessonLayout;
