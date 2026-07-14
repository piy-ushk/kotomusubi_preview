import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getLessonContent } from '../services/api';
import GrammarLessonLayout from './GrammarLessonLayout';
import TopicTalkLessonLayout from './TopicTalkLessonLayout';
import TravelLessonLayout from './TravelLessonLayout';
import StaticHtmlLessonLayout from './StaticHtmlLessonLayout';
import lessonMap from '../utils/lessonMap.json';

const LessonDetail = () => {
  const { lessonId } = useParams();
  const location = useLocation();
  const textbookTitle = location.state?.textbookTitle || sessionStorage.getItem('currentTextbook') || 'Material';
  const levelTitle = location.state?.levelTitle || sessionStorage.getItem('currentLevel') || 'Level';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLessonContent(lessonId)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [lessonId]);

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

  if (!data || (!data.learning_slides?.length && !data.test_sections?.length && !data.vocabulary?.length)) {
    return (
      <div className="lesson-container">
        <div className="loading-container" style={{ flex: 1 }}>
          コンテンツが見つかりませんでした
        </div>
      </div>
    );
  }

  // Check if we have a static HTML file for this lesson based on the prefix in the title
  // e.g. "【1-1】..." -> "1-1", "【10-2】..." -> "10-2"
  const title = data.title || '';
  const match = title.match(/【([\d\-]+)】|(\d+\-\d+)/);
  let prefix = match ? (match[1] || match[2]) : null;
  
  // Special fallback for 1-1 which might be named "Chapter1" or "Chapter１"
  if (!prefix && (title.includes('Chapter1') || title.includes('Chapter 1') || title.includes('Chapter１') || lessonId === '3f3edc46-8f20-83b5-8b83-813292c5056f')) {
    prefix = '1-1';
  }

  const htmlFilename = prefix ? lessonMap[prefix] : null;

  if (htmlFilename) {
    return (
      <StaticHtmlLessonLayout 
        htmlFilename={htmlFilename} 
        textbookTitle={textbookTitle} 
        levelTitle={levelTitle} 
      />
    );
  }

  // Dispatch based on textbookTitle
  if (textbookTitle.includes('Topic')) {
    return <TopicTalkLessonLayout data={data} lessonId={lessonId} textbookTitle={textbookTitle} levelTitle={levelTitle} />;
  } else if (textbookTitle.includes('Travel')) {
    return <TravelLessonLayout data={data} lessonId={lessonId} textbookTitle={textbookTitle} levelTitle={levelTitle} />;
  } else {
    // Default to Grammar
    return <GrammarLessonLayout data={data} lessonId={lessonId} textbookTitle={textbookTitle} levelTitle={levelTitle} />;
  }
};

export default LessonDetail;
