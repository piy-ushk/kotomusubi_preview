import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonContent, addAnnotation, deleteAnnotation, getLessonNote, saveLessonNote } from '../services/api';
import { vocabularyService } from '../services/vocabularyService';
import {
  XIcon, Volume2, TranslateIcon, BookIcon, CheckIcon, ChevronLeft,
  speak, splitTranslation, getTranslationOnly, getTranslationsFromText,
  getRawText, hasJapanese, renderFuriganaText, getNotionColorStyle, renderRichText,
  preprocessBlocks, shouldShowAnswerField, renderAnnotations, cleanText, getLanguageLabel, parseLanguageSegments, LANGUAGE_LABELS
} from '../utils/lessonHelpers';
import './GrammarLesson.css';
import Lesson6_1 from './Lesson6_1';
import Lesson1_1 from './Lesson1_1';

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
      if (blockData.is_toggleable || subBlocks) {
        return (
          <details className="drill" style={{ margin: '8px 0' }} onContextMenu={handleContext}>
            <summary>{jpContent}</summary>
            <div className="drill-body">
              {en && (
                <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
                  <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                  <p className="en">{en}</p>
                </div>
              )}
              {subBlocks}
              {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
            </div>
          </details>
        );
      }
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
        <div className="meaning" onContextMenu={handleContext}>
          {jp && renderArrowPair(jp)}
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
      
      const getConjToneClass = (color) => {
         if (color === 'orange_background') return 'tone-a';
         if (color === 'yellow_background') return 'tone-b';
         if (color === 'blue_background' || color === 'green_background') return 'tone-c';
         if (color === 'red_background') return 'tone-exception';
         if (color === 'gray_background') return 'tone-note';
         return 'tone-plain';
      };
      const toneClass = getConjToneClass(blockData.color);

      return (
        <div className={`conj-box ${toneClass}`} style={{ marginTop: '10px' }} onContextMenu={handleContext}>
          <div className="conj-header">
            <span className="conj-pattern">{emoji} {jpContent}</span>
          </div>
          {en && <div className="en" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{en}</div>}
          {subBlocks && <div className="conj-pairs" style={{ marginTop: '6px' }}>{subBlocks}</div>}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'bulleted_list_item': {
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
        <li onContextMenu={handleContext} style={getNotionColorStyle(blockData.color)}>
          {renderArrowPair(jp)}
          {en && (
            <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`}>
              <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
              <p className="en">{en}</p>
            </div>
          )}
          {subBlocks && <ul>{subBlocks}</ul>}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </li>
      );
    }
    
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
            <input type="checkbox" readOnly checked={checked} style={{ marginRight: '8px' }} />
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
      if (!jp && !subBlocks) return null;
      return (
        <details className="drill" style={{ margin: '8px 0' }} onContextMenu={handleContext}>
          <summary>
            {jpContent}
            {en && !subBlocks && (
              <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`} style={{ display: 'inline-block', marginLeft: '10px' }}>
                <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                <span className="en">{en}</span>
              </div>
            )}
          </summary>
          <div className="drill-body">
            {en && subBlocks && (
              <div className={`en-wrap ${isTranslated ? 'show-en' : ''}`} style={{ marginBottom: '8px' }}>
                <button className="local-en-toggle" onClick={() => onToggle(blockId)}>訳を見る</button>
                <p className="en">{en}</p>
              </div>
            )}
            {subBlocks}
            {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
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

    case 'audio': {
      const url = blockData.file?.url || blockData.external?.url;
      if (!url) return null;
      return (
        <div className="media-block" style={{ margin: '16px 0' }}>
          <audio controls src={url} style={{ width: '100%' }} />
        </div>
      );
    }

    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px dashed var(--line)', margin: '24px 0' }} />;

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
              <p className="en">{en}</p>
            </div>
          )}
          {subBlocks}
          {renderAnnotations(blockId, annotations, onRemoveAnnotation)}
        </div>
      );
    }

    case 'table': {
      const hasHeader = blockData.has_column_header;
      return (
        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', maxWidth: '100%', margin: '16px 0' }}>
          <table className="form-table" style={{ margin: 0 }}>
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

    case 'column_list':
      return <div className="ta-chart-grid" style={{ margin: '16px 0' }}>{subBlocks}</div>;

    case 'child_database': {
      const items = block.database_items || [];
      if (items.length === 0) return null;
      const pageItems = items.filter(item => Array.isArray(item.page_blocks) && item.page_blocks.length > 0);
      if (pageItems.length > 0) {
        return (
          <div className="inline-page-db" style={{ marginTop: '16px' }} onContextMenu={handleContext}>
            {pageItems.map((item, itemIdx) => (
              <section key={item.id} className="inline-page-section">
                {item.title && <h3 className="subhead inline-page-title">{splitTranslation(item.title).jp}</h3>}
                {preprocessBlocks(item.page_blocks, true).map((pageItem, pageBlockIdx) => (
                  <BlockRenderer
                    key={`${blockId}_db${itemIdx}_b${pageBlockIdx}`}
                    block={pageItem.block}
                    enTranslation={pageItem.enTranslation}
                    blockId={`${blockId}_db${itemIdx}_b${pageBlockIdx}`}
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
              </section>
            ))}
          </div>
        );
      }
      return (
        <div className="vocab-grid inline-vocab-grid" style={{ marginTop: '16px', gap: '16px' }}>
          {items.map((item, idx) => {
            const vocab = item.vocab;
            const title = vocab.jp || item.raw_props["名前"] || item.raw_props["Name"] || item.raw_props["Word"] || item.raw_props["単語"] || "";
            const meaning = vocab.en || item.raw_props["Meaning"] || item.raw_props["English"] || item.raw_props["意味"] || "";
            const reading = vocab.reading || item.raw_props["Reading"] || item.raw_props["Pronunciation"] || item.raw_props["読み方"] || item.raw_props["ひらがな"] || "";
            
            return (
              <div key={item.id} className="vocab-card inline-card">
                <h3 className="vocab-word" style={{fontSize: '1.2rem', marginBottom: '4px'}}>{title}</h3>
                {reading && <p className="vocab-reading" style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px'}}>{reading}</p>}
                
                {meaning && (
                  <>
                    <button className="vocab-toggle" style={{marginTop: 'auto'}} onClick={(e) => {
                      const tgt = e.currentTarget.nextElementSibling;
                      tgt.style.display = tgt.style.display === 'block' ? 'none' : 'block';
                    }}>
                      意味を見る
                    </button>
                    <p className="vocab-meaning-en" style={{display: 'none', marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '8px'}}>{meaning}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    }

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

const GrammarLessonLayout = ({ data, lessonId, textbookTitle, levelTitle }) => {
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

      // Group consecutive quote blocks into a .dialogue wrapper
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

      // Group consecutive toggle blocks into a .drills 2-column grid
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

      // Regular block
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

  if (data?.title?.includes('てください') || data?.title?.includes('Chapter6') || data?.title?.includes('Chapter 6') || lessonId === 'd59edc46-8f20-8354-8805-01959648e824') {
    return (
      <div className={`grammar-lesson-page ${translateAll ? 'show-en' : ''}`}>
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
          <Lesson6_1 translateAll={translateAll} translationLanguage={translationLanguage} />
          
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
        </div>
      </div>
    );
  }

  // Chapter 1 — render Lesson1_1 with same layout style
  if (data?.title?.includes('Chapter1') || data?.title?.includes('Chapter 1') || lessonId === '3f3edc46-8f20-83b5-8b83-813292c5056f') {
    return (
      <div className={`grammar-lesson-page ${translateAll ? 'show-en' : ''}`}>
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
          <Lesson1_1 translateAll={translateAll} translationLanguage={translationLanguage} />
          
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
        </div>
      </div>
    );
  }

  return (
    <div className={`grammar-lesson-page ${translateAll ? 'show-en' : ''}`}>
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
                
                let mappedTitle = headingText;
                if (headingText.includes('この章で学ぶこと')) mappedTitle = '意味';
                else if (headingText.includes('できるようになると')) mappedTitle = '文型';
                else if (headingText.includes('英語は日本語に直し')) mappedTitle = '練習問題';
                
                currentSection.title = mappedTitle;
                currentSection.originalHeading = headingText;
                
              } else if (b.type === 'child_database') {
                const pageItems = b.database_items?.filter(dbItem => dbItem.page_blocks?.length > 0) || [];
                if (pageItems.length > 0) {
                  if (currentSection.title || hasMeaningfulContent(currentSection.content)) {
                    allSections.push(currentSection);
                  }
                  
                  b.database_items.forEach(dbItem => {
                    if (dbItem.page_blocks?.length > 0) {
                      const dbBlocks = preprocessBlocks(dbItem.page_blocks, true);
                      // Do not pass dbItem.title as initialTitle to avoid redundant empty white boxes
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
            // Do not pass slide.title (like 'Introduction') to avoid empty sections
            chunkBlocks(pb, '', false);
          });
          
          testSections.forEach(section => {
            const pb = preprocessBlocks(section.content || [], true);
            chunkBlocks(pb, '', true);
          });

          // Filter out empty sections or sections with just empty dividers
          const validSections = allSections.filter(sec => {
            const hasContent = sec.content.some(item => {
              const t = item.block.type;
              if (t === 'divider' || t === 'image') return false; // Ignore sections with ONLY images/dividers
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
              {section.originalHeading && (
                 <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {section.originalHeading !== section.title ? section.originalHeading : ''}
                 </div>
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

export default GrammarLessonLayout;
