import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import Ruby from './components/Ruby';

import Home from './pages/Home';
import TextbooksList from './pages/TextbooksList';
import Levels from './pages/Levels';
import Lessons from './pages/Lessons';
import LessonDetail from './pages/LessonDetail';
import FlashcardPage from './pages/FlashcardPage';

/* ---- SVG Icons (inline to avoid extra deps) ---- */
export const HomeIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const MaterialsIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

export const FlashcardIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

/* ---- Bottom Navigation (Mobile) ---- */
function BottomNav({ currentTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item ${currentTab === 0 ? 'active' : ''}`} onClick={() => onTabChange(0)}>
        <HomeIcon /> Home
      </button>
      <button className={`bottom-nav-item ${currentTab === 1 ? 'active' : ''}`} onClick={() => onTabChange(1)}>
        <MaterialsIcon /> Materials
      </button>
      <button className={`bottom-nav-item ${currentTab === 2 ? 'active' : ''}`} onClick={() => onTabChange(2)}>
        <FlashcardIcon /> Wordbook
      </button>
    </nav>
  );
}

/* ---- Side Navigation (Desktop) ---- */
function SideNav({ currentTab, onTabChange }) {
  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Kotomusubi" />
      </div>
      <nav className="sidebar-nav">
        <button className={`sidebar-nav-item ${currentTab === 0 ? 'active' : ''}`} onClick={() => onTabChange(0)}>
          <HomeIcon /> Home
        </button>
        <button className={`sidebar-nav-item ${currentTab === 1 ? 'active' : ''}`} onClick={() => onTabChange(1)}>
          <MaterialsIcon /> Materials
        </button>
        <button className={`sidebar-nav-item ${currentTab === 2 ? 'active' : ''}`} onClick={() => onTabChange(2)}>
          <FlashcardIcon /> Wordbook
        </button>
      </nav>
    </aside>
  );
}

/* ---- Dashboard Shell (Responsive) ---- */
function DashboardShell() {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    <Home key="home" onGoToMaterials={() => setCurrentTab(1)} />,
    <TextbooksList key="materials" />,
    <FlashcardPage key="flashcards" />,
  ];

  return (
    <div className="app-container">
      <SideNav currentTab={currentTab} onTabChange={setCurrentTab} />
      <div className="app-main">
        <div className="screen-content">
          <div className="content-max-width">
            {tabs[currentTab]}
          </div>
        </div>
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </div>
  );
}

/* ---- Detail screens (no bottom nav, but keep sidebar on desktop) ---- */
function DetailShell({ children }) {
  const navigate = useNavigate();
  return (
    <div className="app-container">
      <SideNav currentTab={-1} onTabChange={(idx) => {
        // Navigate based on sidebar click when in detail view
        navigate('/');
      }} />
      <div className="app-main">
        <div className="screen-content">
          <div className="content-max-width">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard routes */}
        <Route path="/" element={<DashboardShell />} />

        {/* Detail routes */}
        <Route path="/textbook/:textbookId" element={<DetailShell><Levels /></DetailShell>} />
        <Route path="/level/:levelId" element={<DetailShell><Lessons /></DetailShell>} />
        <Route path="/lesson/:lessonId" element={<DetailShell><LessonDetail /></DetailShell>} />
      </Routes>
    </Router>
  );
}

export default App;
