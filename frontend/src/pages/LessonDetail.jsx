import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getLessonContent } from '../services/api';
import GrammarLessonLayout from './GrammarLessonLayout';
import TopicTalkLessonLayout from './TopicTalkLessonLayout';
import TravelLessonLayout from './TravelLessonLayout';

const LessonDetail = () => {
  const { lessonId } = useParams();
  const location = useLocation();
  const textbookTitle = location.state?.textbookTitle || 'Material';
  const levelTitle = location.state?.levelTitle || 'Level';

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

  if (!data || (!data.learning_slides?.length && !data.test_sections?.length)) {
    return (
      <div className="lesson-container">
        <div className="loading-container" style={{ flex: 1 }}>
          コンテンツが見つかりませんでした
        </div>
      </div>
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
