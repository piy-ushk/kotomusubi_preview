import React, { useState, useEffect } from 'react';

const translationCache = new Map();

export default function AutoTranslate({ text, targetLang, className, as: Component = 'p' }) {
  const [translatedText, setTranslatedText] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If targetLang is 'en' or text is empty, just use the original text
    if (!text || targetLang === 'en') {
      setTranslatedText(text);
      return;
    }

    // Check if the provided text is likely NOT English (e.g., if we already got Spanish from the DB)
    // If text doesn't contain mostly latin characters, or if we know it's already translated.
    // Actually, splitTranslation/getTranslationOnly in lessonHelpers returns the DB translation if it exists.
    // We only want to auto-translate if the DB didn't have it.
    // But since this component only gets `text`, we'll translate it.
    // A slight issue: if `text` is ALREADY Spanish (because DB had it), translating Spanish to Spanish via API is fine (it will just return Spanish).
    
    const cacheKey = `${targetLang}_${text}`;
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey));
      return;
    }

    let isMounted = true;
    setLoading(true);

    const translate = async () => {
      try {
        const q = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${q}`;
        const res = await fetch(url);
        const data = await res.json();
        const result = data[0].map(item => item[0]).join('');
        if (isMounted) {
          translationCache.set(cacheKey, result);
          setTranslatedText(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Translation error:", err);
        if (isMounted) {
          setTranslatedText(text); // fallback to original
          setLoading(false);
        }
      }
    };

    // Add a small delay to debounce multiple rapid renders if needed, though useEffect does some of that
    const timer = setTimeout(() => {
      translate();
    }, 50);

    return () => { 
      isMounted = false; 
      clearTimeout(timer);
    };
  }, [text, targetLang]);

  return (
    <Component className={className} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {translatedText}
    </Component>
  );
}
