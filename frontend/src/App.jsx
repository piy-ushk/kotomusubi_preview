import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TextbooksList from './pages/TextbooksList';
import Levels from './pages/Levels';
import Lessons from './pages/Lessons';
import LessonDetail from './pages/LessonDetail';

function App() {
  return (
    <Router>
      <div className="app-container">
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/textbooks" element={<TextbooksList />} />
            <Route path="/textbook/:textbookId" element={<Levels />} />
            <Route path="/level/:levelId" element={<Lessons />} />
            <Route path="/lesson/:lessonId" element={<LessonDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
