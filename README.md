# Kotomusubi (ことむすび) — Japanese Textbook Web App

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-svg&logo=vercel)](https://kotomusubi-preview.vercel.app/)
[![Backend Render](https://img.shields.io/badge/Backend-Render-darkblue?style=flat-svg&logo=render)](https://kotomusubi-preview.onrender.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-svg&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat-svg&logo=react&logoColor=black)](https://react.dev)

**Kotomusubi (ことむすび)** is a premium, modern Japanese textbook web application designed to help language learners study grammar, vocabulary, and readings interactively. 

By integrating **Notion as a headless CMS**, Kotomusubi enables developers and educators to manage curriculum content in Notion's rich editor, while delivering a beautifully styled, high-performance slide-based study experience on the web.

---

## 💡 The Core Idea

Managing educational content (text, tables, custom cards, lists, images) in database code is tedious. Kotomusubi solves this by leveraging Notion's block structure as the source of truth:
1. **Easy Content Creation**: Course levels, chapters, and lessons are managed directly inside Notion databases.
2. **Dynamic Schema Mapping**: Vocabulary databases in Notion are scanned, mapped, and parsed into interactive cards automatically.
3. **Structured Lesson Chunking**: The backend groups blocks (using dividers and headings) into logical study "slides" and "practice sections."
4. **Active Learning & Review**: Rather than static reading, learners can highlight text, write interactive answers directly on slides, add annotations, organize discovered words, and practice using flashcards.

---

## 🛠️ Tech Stack & Technologies

### Frontend
- **React 19 & Vite**: A fast build tool and modern rendering library for single-page applications.
- **Framer Motion**: Smooth slide transition animations, word card-flipping animations, and interactive component entry states.
- **Vanilla CSS (Custom Design System)**:
  - Curated HSL-based colors, premium glassmorphism effects, and custom dark mode variables.
  - Responsive layouts: A sleek desktop sidebar navigation that adapts to a bottom navigation bar for mobile devices.
- **Lucide React**: Premium icon set for consistent UI language.
- **Axios**: Promised-based HTTP client to request textbook resources.

### Backend
- **FastAPI**: Modern, fast Python web framework for building APIs.
- **Notion API (`notion-client` & `httpx`)**: For high-performance, asynchronous querying of database pages and recursive block fetching.
- **SQLite3 Database**: A lightweight database engine storing user-made block-level annotations.
- **Uvicorn**: Lightning-fast ASGI web server implementation.

---

## 📁 Repository Structure

```
kotomusubi_webapp/
├── backend/                   # FastAPI Backend
│   ├── main.py                # FastAPI endpoints, block chunking logic, and translation splitting
│   ├── notion_service.py      # Async Notion API Wrapper (recursive page/block fetching)
│   ├── db.py                  # SQLite database wrapper for study annotations
│   ├── annotations.db         # Persistent SQLite database (local dev only)
│   ├── requirements.txt       # Python backend dependencies
│   └── test_*.py              # Suite of test cases for validation (vocab mapping, endpoint routing)
│
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── assets/            # Static assets and icons
│   │   ├── components/        # Reusable components (Navbar, Japanese Ruby parser)
│   │   ├── pages/             # App page views (Home, Textbooks, Levels, Lessons, LessonDetail, FlashcardPage)
│   │   ├── services/          # HTTP request handlers (api.js) & LocalStorage managers (vocabularyService.js)
│   │   ├── App.jsx            # Routing configurations (React Router v7) & Desktop/Mobile layouts
│   │   ├── index.css          # Core design system with HSL variables, transitions, and dark modes
│   │   └── main.jsx           # Vite React mounting script
│   ├── package.json           # Frontend dependency declarations (React 19, Framer Motion)
│   └── vite.config.js         # Vite configuration (React plugin setup)
│
└── vercel.json                # Vercel deployment routes and backend routing rewrites
```

---

## ⚙️ Key Implementation Details

### 1. Notion to Slide Parser (`backend/main.py`)
Instead of displaying a long, overwhelming Notion document, the backend parses Notion's blocks recursively and groups them:
* Blocks are split into sections whenever a **Divider (`divider`)** or **Heading (`heading_1`, `heading_2`, `heading_3`)** is found.
* Headings containing words like *Question, Exercise, Practice, Quiz* dynamically switch the section type to a `test` page.
* Blocks containing vocabulary tables or databases are identified and transformed into an interactive structured array of Japanese words.

### 2. Dual-Language Translation Handler
The app splits bilingual text formatted in Notion (e.g. `日本語 | English`) automatically. Users can toggle the translation of individual lines or use the global "Translate All" button.

### 3. Furigana Parser & Text-to-Speech (TTS)
* Renders phonetic readings (Furigana) above Kanji using the HTML `<ruby>` tag.
* Integrates web speech synthesis APIs so users can listen to correct pronunciations directly within the lessons.

### 4. Custom Wordbook (Word Memory)
* Discovered vocabulary words are saved locally. Users can categorize custom words into groups (saved in `localStorage`), track their learning progress ("Learned" vs "Not yet"), and review them in a flipping Flashcard UI.

### 5. Block-Level Annotations
* Users can right-click any content block to insert personalized notes. These notes are saved via the backend to SQLite (`annotations.db`), persisting between study sessions.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.9 or higher)
* **Notion Integration Secret Key** and **Notion Database ID**

### 1. Backend Setup
1. Move to the backend folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file containing your secret credentials:
   ```env
   NOTION_API_KEY=secret_your_notion_api_token
   NOTION_DATABASE_ID=your_notion_textbooks_database_id
   ```
3. Initialize virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Move to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the necessary package dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 🌐 Production Deployments

* **Frontend Hosting (Vercel)**:
  * The frontend is compiled and hosted on Vercel. 
  * The `vercel.json` rewrite rules forward all requests prefixed with `/api` to the production backend:
    ```json
    {
      "version": 2,
      "rewrites": [
        {
          "source": "/api/(.*)",
          "destination": "https://kotomusubi-preview.onrender.com/api/$1"
        },
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    }
    ```
* **Backend Hosting (Render)**:
  * The backend FastAPI server runs on Render, connected to Notion's live database systems.
