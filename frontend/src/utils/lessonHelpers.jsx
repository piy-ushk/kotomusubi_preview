import React, { useState } from 'react';

/* ---- Icons ---- */
export const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
export const Volume2 = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
export const TranslateIcon = ({ size = 18, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/>
    <path d="M2 5h12"/><path d="M7 2h1"/>
    <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
  </svg>
);
export const BookIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
export const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
export const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

/* ---- TTS Helper ---- */
export const speak = (text) => {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const jpText = text.split('|')[0].split('｜')[0].split('/')[0].split('／')[0].trim();
  const utt = new SpeechSynthesisUtterance(jpText);
  utt.lang = 'ja-JP';
  utt.rate = 0.8;
  window.speechSynthesis.speak(utt);
};

/* ---- Text cleaning helper ---- */
export const cleanText = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/💡|✍️|✅|📝|✨/g, '').trim();
};

/* ---- Translation helper ---- */
export const LANGUAGE_LABELS = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  vi: 'Tiếng Việt',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português'
};

export const normalizeLanguageCode = (label) => {
  if (!label) return '';
  const normalized = label.trim().toLowerCase();
  if (['en', 'eng', 'english', '英語'].includes(normalized)) return 'en';
  if (['ja', 'jp', 'jpn', 'japanese', '日本語'].includes(normalized)) return 'ja';
  if (['zh', 'cn', 'chi', 'chinese', '中文', '中国語'].includes(normalized)) return 'zh';
  if (['ko', 'kr', 'kor', 'korean', '한국어', '韓国語', '韓語'].includes(normalized)) return 'ko';
  if (['vi', 'viet', 'vietnamese', 'ベトナム語', 'tiếng việt'].includes(normalized)) return 'vi';
  if (['es', 'spa', 'spanish', 'español'].includes(normalized)) return 'es';
  if (['fr', 'fre', 'french', 'français'].includes(normalized)) return 'fr';
  if (['de', 'ger', 'german', 'deutsch'].includes(normalized)) return 'de';
  if (['pt', 'por', 'portuguese', 'português'].includes(normalized)) return 'pt';
  return '';
};

export const getLanguageLabel = (code) => {
  if (LANGUAGE_LABELS[code]) return LANGUAGE_LABELS[code];
  if (code.startsWith('lang')) return `Language ${code.replace('lang', '')}`;
  return code.toUpperCase();
};

export const parseLanguageSegments = (segments, assumeEnglishFirst = true) => {
  const translations = {};
  const unlabeled = [];
  segments.forEach(segment => {
    const trimmed = cleanText(segment);
    if (!trimmed) return;
    const match = trimmed.match(/^([A-Za-z]{2,10}|日本語|英語|中国語|中文|韓国語|韓語|한국어|ベトナム語|Vietnamese|English|Japanese|Chinese|Korean|Spanish|Español|French|Français|German|Deutsch|Portuguese|Português)\s*[:：]\s*(.+)$/i);
    if (match) {
      const code = normalizeLanguageCode(match[1]);
      const value = cleanText(match[2]);
      if (code && value) translations[code] = value;
      else if (value) unlabeled.push(value);
    } else {
      unlabeled.push(trimmed);
    }
  });
  if (assumeEnglishFirst && unlabeled.length > 0 && !translations.en) {
    translations.en = unlabeled.shift();
  }
  unlabeled.forEach((value, index) => {
    translations[`lang${index + 2}`] = value;
  });
  return translations;
};

export const selectTranslation = (translations, language) => {
  if (!translations || Object.keys(translations).length === 0) return '';
  if (language && translations[language]) return translations[language];
  if (language !== 'en' && translations.en) return translations.en;
  const firstKey = Object.keys(translations)[0];
  return translations[firstKey] || '';
};

export const splitTranslation = (text, language = 'en') => {
  if (typeof text !== 'string') return { jp: String(text ?? ''), en: '', translations: {} };
  let rawJp = text;
  let translationParts = [];
  
  let separator = '';
  if (text.includes('｜')) separator = '｜';
  else if (text.includes('|')) separator = '|';
  else if (text.includes('／')) separator = '／';
  else if (text.includes('/')) {
    if (!text.includes('http://') && !text.includes('https://')) {
      separator = '/';
    }
  }
  
  if (separator) {
    const p = text.split(separator);
    rawJp = p[0] || '';
    translationParts = p.slice(1);
  }
  
  const translations = parseLanguageSegments(translationParts, true);
  return { jp: cleanText(rawJp), en: selectTranslation(translations, language), translations };
};

export const getTranslationOnly = (text, language = 'en') => {
  if (typeof text !== 'string') return '';
  let parts = [text];
  if (text.includes('｜')) parts = text.split('｜');
  else if (text.includes('|')) parts = text.split('|');
  else if (text.includes('／')) parts = text.split('／');
  else if (text.includes('/')) {
    if (!text.includes('http://') && !text.includes('https://')) {
      parts = text.split('/');
    }
  }
  const translations = parseLanguageSegments(parts, true);
  return selectTranslation(translations, language);
};

export const getTranslationsFromText = (text) => {
  if (typeof text !== 'string') return {};
  let parts = [text];
  if (text.includes('｜')) parts = text.split('｜');
  else if (text.includes('|')) parts = text.split('|');
  else if (text.includes('／')) parts = text.split('／');
  else if (text.includes('/')) {
    if (!text.includes('http://') && !text.includes('https://')) {
      parts = text.split('/');
    }
  }
  return parseLanguageSegments(parts, true);
};

/* ---- Block Processing Helpers ---- */
export const getRawText = (block) => {
  if (!block) return '';
  const type = block.type;
  if (!type) return '';
  const blockData = block[type];
  if (!blockData) return '';
  if (blockData.rich_text) return blockData.rich_text.map(rt => rt.plain_text).join('');
  if (blockData.text) return blockData.text;
  return '';
};

export const hasJapanese = (str) => /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(str);
export const isEnglishTarget = (str) => {
  if (!str.trim()) return false;
  const hasEng = /[a-zA-Z]/.test(str);
  const noJp = !hasJapanese(str);
  return hasEng && noJp;
};

export const FURIGANA_REGEX = /([\u4e00-\u9faf々〆ヵヶ]+)(?:\(([^)]+)\)|（([^）]+)）|\[([^\]]+)\])/g;

export const renderFuriganaText = (text, showFurigana) => {
  if (typeof text !== 'string') return text;
  if (!showFurigana) return text.replace(FURIGANA_REGEX, '$1');
  const parts = [];
  let lastIndex = 0;
  text.replace(FURIGANA_REGEX, (match, base, r1, r2, r3, offset) => {
    if (offset > lastIndex) parts.push(text.slice(lastIndex, offset));
    const reading = r1 || r2 || r3 || '';
    parts.push(
      <ruby key={`${offset}-${base}`}>
        {base}
        <rp>(</rp>
        <rt>{reading}</rt>
        <rp>)</rp>
      </ruby>
    );
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
};

export const NOTION_COLORS = {
  gray: '#6f6f6f',
  brown: '#8d6e63',
  orange: '#f18b5b',
  yellow: '#f5c542',
  green: '#4caf50',
  blue: '#3b6fd4',
  purple: '#9c27b0',
  pink: '#e91e63',
  red: '#e53935'
};

export const NOTION_BG_COLORS = {
  gray: 'rgba(111, 111, 111, 0.18)',
  brown: 'rgba(141, 110, 99, 0.2)',
  orange: 'rgba(241, 139, 91, 0.22)',
  yellow: 'rgba(245, 197, 66, 0.25)',
  green: 'rgba(76, 175, 80, 0.2)',
  blue: 'rgba(59, 111, 212, 0.2)',
  purple: 'rgba(156, 39, 176, 0.2)',
  pink: 'rgba(233, 30, 99, 0.2)',
  red: 'rgba(229, 57, 53, 0.2)'
};

export const getNotionColorStyle = (color) => {
  if (!color || color === 'default') return {};
  if (color.endsWith('_background')) {
    const base = color.replace('_background', '');
    return {
      backgroundColor: NOTION_BG_COLORS[base] || 'rgba(0,0,0,0.08)',
      color: NOTION_COLORS[base] || 'inherit',
      padding: '0 4px',
      borderRadius: '4px'
    };
  }
  return { color: NOTION_COLORS[color] || 'inherit' };
};

export const renderRichText = (richText, showFurigana) => {
  if (!Array.isArray(richText) || richText.length === 0) return '';
  
  const result = [];
  for (let idx = 0; idx < richText.length; idx++) {
    const rt = richText[idx];
    let plainText = rt.plain_text || '';
    
    // Skip file attachment links (e.g. て形.png or URLs linking to S3)
    const isFileLink = plainText.match(/\.(png|jpg|jpeg|gif|pdf|zip|mp3|wav|mp4|mov)$/i) || 
                       (rt.href && (rt.href.includes('prod-files-secure.s3') || rt.href.includes('amazonaws.com')));
    if (isFileLink) {
      continue;
    }
    
    let hasSeparator = false;
    if (plainText.includes('｜')) {
      plainText = plainText.split('｜')[0];
      hasSeparator = true;
    } else if (plainText.includes('|')) {
      plainText = plainText.split('|')[0];
      hasSeparator = true;
    } else if (plainText.includes('／')) {
      plainText = plainText.split('／')[0];
      hasSeparator = true;
    } else if (plainText.includes('/')) {
      if (!plainText.includes('http://') && !plainText.includes('https://')) {
        plainText = plainText.split('/')[0];
        hasSeparator = true;
      }
    }

    const { bold, italic, underline, strikethrough, code, color } = rt.annotations || {};
    const style = {
      ...getNotionColorStyle(color),
      fontWeight: bold ? 700 : undefined,
      fontStyle: italic ? 'italic' : undefined
    };
    if (underline || strikethrough) {
      style.textDecoration = `${underline ? 'underline' : ''}${underline && strikethrough ? ' ' : ''}${strikethrough ? 'line-through' : ''}`.trim();
    }
    if (code) {
      style.fontFamily = 'monospace';
      style.backgroundColor = 'rgba(0,0,0,0.06)';
      style.padding = '0 4px';
      style.borderRadius = '4px';
    }
    
    const content = renderFuriganaText(cleanText(plainText), showFurigana);
    
    if (rt.href) {
      result.push(
        <a key={idx} href={rt.href} target="_blank" rel="noreferrer" style={style}>
          {content}
        </a>
      );
    } else {
      result.push(
        <span key={idx} style={style}>
          {content}
        </span>
      );
    }

    if (hasSeparator) {
      break;
    }
  }
  
  return result;
};

const shouldIgnoreBlock = (block) => {
  if (!block || !block.type) return false;
  const type = block.type;
  const blockData = block[type];
  if (!blockData) return false;

  // 1. Filter out Notion link_to_page blocks completely
  if (type === 'link_to_page') {
    return true;
  }

  // 2. Filter out bookmarks linking to notion.so / notion.site
  if (type === 'bookmark') {
    const url = blockData.url || '';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('notion.so') || lowerUrl.includes('notion.site')) {
      return true;
    }
  }

  // 3. Filter out file/pdf blocks completely (actual images/audio have their own block types)
  if (type === 'file' || type === 'pdf') {
    return true;
  }

  // Check if the block consists only of file attachment links
  if (blockData.rich_text && blockData.rich_text.length > 0) {
    const allFileLinks = blockData.rich_text.every(rt => {
      const plainText = rt.plain_text || '';
      return plainText.match(/\.(png|jpg|jpeg|gif|pdf|zip|mp3|wav|mp4|mov)$/i) || 
             (rt.href && (rt.href.includes('prod-files-secure.s3') || rt.href.includes('amazonaws.com')));
    });
    if (allFileLinks) {
      return true;
    }
  }

  // Extract raw text
  let rawText = '';
  if (blockData.rich_text) {
    rawText = blockData.rich_text.map(rt => rt.plain_text).join('');
  } else if (blockData.text) {
    rawText = blockData.text;
  }

  if (rawText) {
    const lowerText = rawText.toLowerCase();
    // 4. Filter out blocks containing "関連ページ", "Related page", or "Rerated page" (case-insensitive)
    if (
      lowerText.includes('関連ページ') || 
      lowerText.includes('related page') || 
      lowerText.includes('rerated page')
    ) {
      return true;
    }
    
    // 5. Filter out blocks containing "notion.so" or "notion.site" URLs
    if (lowerText.includes('notion.so') || lowerText.includes('notion.site')) {
      return true;
    }
  }

  // 6. Filter out blocks that have talking head/speaking head icon/emoji
  const emoji = blockData.icon?.emoji;
  if (emoji && (emoji === '🗣️' || emoji === '🗣' || emoji.includes('🗣'))) {
    return true;
  }

  return false;
};

export const preprocessBlocks = (blocks, isTopLevel = false) => {
  const result = [];
  if (!blocks) return result;
  
  // First, filter out ignored blocks
  let filteredBlocks = blocks.filter(b => !shouldIgnoreBlock(b));

  // Remove the very first block if it is an image (main thumbnail)
  if (isTopLevel && filteredBlocks.length > 0 && filteredBlocks[0].type === 'image') {
    filteredBlocks = filteredBlocks.slice(1);
  }
  
  for (let i = 0; i < filteredBlocks.length; i++) {
    const block = filteredBlocks[i];
    const nextBlock = filteredBlocks[i + 1];
    
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

export const isPracticeSection = (title = '') => /let's practice|話してみよう/i.test(title);
export const isReviewSection = (title = '') => /復習問題|review|revise/i.test(title);

export const shouldShowAnswerField = (block, sectionTitle) => {
  if (!sectionTitle) return false;
  if (!isPracticeSection(sectionTitle) && !isReviewSection(sectionTitle)) return false;
  if (!block || !block.type) return false;
  const type = block.type;
  if (!['paragraph', 'bulleted_list_item', 'numbered_list_item', 'quote', 'callout', 'to_do'].includes(type)) return false;
  const text = getRawText(block).trim();
  if (!text) return false;
  if (/回答例|こたえ|答え|サンプル|sample/i.test(text)) return false;
  return true;
};

export const renderAnnotations = (blockId, annotations, onRemoveAnnotation) => {
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

export const AnswerField = ({ blockId, initialValue, onSave }) => {
  const [value, setValue] = useState(initialValue || '');
  const [isSaved, setIsSaved] = useState(!!initialValue);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(blockId, value);
      setIsSaved(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="practice-input-wrapper" style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => { setValue(e.target.value); setIsSaved(false); }}
        placeholder="ここに答えを書いてください (Write your answer here)..."
        style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${isSaved ? 'var(--ok)' : 'var(--line)'}`, outline: 'none', fontSize: '0.92rem', fontFamily: 'inherit', backgroundColor: 'var(--card)', color: 'var(--text)' }}
      />
      <button 
        onClick={handleSave} 
        disabled={loading || isSaved}
        style={{ padding: '10px 16px', background: isSaved ? 'var(--ok)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', minWidth: '70px', fontSize: '0.85rem' }}
      >
        {loading ? '...' : (isSaved ? '✓ Saved' : 'Save')}
      </button>
    </div>
  );
};

export const SelfGradingButtons = ({ blockId, initialValue, onGraded }) => {
  const [result, setResult] = useState(initialValue); // 'correct' or 'incorrect' or null
  const [loading, setLoading] = useState(false);

  const handleSelect = async (val) => {
    if (loading) return;
    setLoading(true);
    try {
      await onGraded(blockId, val);
      setResult(val);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="self-grading-wrapper" style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', border: '1px dashed var(--line)' }}>
      <div style={{ fontWeight: '600', color: 'var(--text-muted)' }}>正解しましたか？ (Did you get it right?)</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => handleSelect('correct')}
          disabled={loading}
          style={{ flex: 1, padding: '6px 12px', borderRadius: '8px', border: result === 'correct' ? '2px solid var(--ok)' : '1px solid var(--line)', background: result === 'correct' ? 'rgba(76,175,80,0.1)' : 'var(--card)', color: result === 'correct' ? 'var(--ok)' : 'var(--text)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          できた (Correct)
        </button>
        <button 
          onClick={() => handleSelect('incorrect')}
          disabled={loading}
          style={{ flex: 1, padding: '6px 12px', borderRadius: '8px', border: result === 'incorrect' ? '2px solid var(--warn)' : '1px solid var(--line)', background: result === 'incorrect' ? 'rgba(229,57,53,0.1)' : 'var(--card)', color: result === 'incorrect' ? 'var(--warn)' : 'var(--text)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          できなかった (Incorrect)
        </button>
      </div>
    </div>
  );
};
