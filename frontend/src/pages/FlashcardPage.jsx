import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vocabularyService } from '../services/vocabularyService';
import { getLessonContent } from '../services/api';

const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ja-JP'; utt.rate = 0.8;
  window.speechSynthesis.speak(utt);
};

const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const VolumeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const ChevronLeft = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevronRight = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const FolderIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const EditIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const BackIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

// Modal helper
const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
          onClick={e => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const VIEWS = { GROUPS: 'groups', GROUP_DETAIL: 'group_detail', FLASHCARD: 'flashcard' };

const FlashcardPage = ({ lessonFilter, lessonTitle }) => {
  const [view, setView] = useState(VIEWS.GROUPS);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null); // null = all words / ungrouped
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Modals
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showRenameGroup, setShowRenameGroup] = useState(false);
  const [groupInput, setGroupInput] = useState('');
  const [newWord, setNewWord] = useState({ jp: '', reading: '', en: '' });

  const refresh = () => {
    setGroups(vocabularyService.getGroups());
  };

  useEffect(() => {
    refresh();
    if (lessonFilter) {
      getLessonContent(lessonFilter)
        .then(res => {
          const vocab = res.data?.vocabulary || [];
          const formatted = vocab.map(vr => ({
            id: vr.id,
            jp: vr.word || vr.jp || '',
            reading: vr.reading || '',
            en: vr.meaning || vr.en || '',
            kanji: vr.kanji || '',
            pos: vr.pos || '',
            example: vr.example || '',
            status: 'not yet'
          }));
          setActiveGroup({ id: 'lesson_' + lessonFilter, title: lessonTitle || 'Lesson Words', isLesson: true });
          setWords(formatted);
          setCurrentIndex(0);
          setFlipped(false);
          setView(VIEWS.GROUP_DETAIL);
        })
        .catch(err => console.error("Failed to fetch lesson vocabulary:", err));
    }
  }, [lessonFilter, lessonTitle]);

  const openGroup = (group) => {
    setActiveGroup(group);
    const groupWords = group
      ? vocabularyService.getWordsByGroup(group.id)
      : vocabularyService.getNotYetWords();
    setWords(groupWords);
    setCurrentIndex(0);
    setFlipped(false);
    setView(VIEWS.GROUP_DETAIL);
  };

  const startFlashcard = () => {
    if (words.length === 0) return;
    setCurrentIndex(0);
    setFlipped(false);
    setView(VIEWS.FLASHCARD);
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupInput.trim()) return;
    vocabularyService.createGroup(groupInput);
    setGroupInput('');
    setShowAddGroup(false);
    refresh();
  };

  const handleRenameGroup = (e) => {
    e.preventDefault();
    if (!groupInput.trim() || !activeGroup) return;
    vocabularyService.renameGroup(activeGroup.id, groupInput);
    setActiveGroup(g => ({ ...g, title: groupInput.trim() }));
    setGroupInput('');
    setShowRenameGroup(false);
    refresh();
  };

  const handleDeleteGroup = (groupId) => {
    if (!window.confirm('Delete this group? Words will be moved to Ungrouped.')) return;
    vocabularyService.deleteGroup(groupId);
    refresh();
  };

  const handleAddWord = (e) => {
    e.preventDefault();
    if (!newWord.jp || !newWord.en) return;
    vocabularyService.addCustomWord(newWord, activeGroup?.id || null);
    setNewWord({ jp: '', reading: '', en: '' });
    setShowAddWord(false);
    if (activeGroup) openGroup(activeGroup);
    else openGroup(null);
  };

  const handleDeleteWord = (wordId) => {
    vocabularyService.deleteCustomWord(wordId);
    if (activeGroup) openGroup(activeGroup);
    else openGroup(null);
  };

  const handleToggleLearned = (wordId) => {
    vocabularyService.toggleLearned(wordId);
    const updated = words.map(w => w.id === wordId ? { ...w, _learned: !w._learned } : w);
    setWords(updated);
  };

  const goNext = () => { setFlipped(false); setTimeout(() => setCurrentIndex(i => (i + 1) % words.length), 80); };
  const goPrev = () => { setFlipped(false); setTimeout(() => setCurrentIndex(i => (i - 1 + words.length) % words.length), 80); };

  // ── GROUPS view ────────────────────────────────────────────────
  if (view === VIEWS.GROUPS) {
    const allWords = vocabularyService.getNotYetWords();
    return (
      <div className="flashcard-screen">
        <div style={{ alignSelf: 'stretch', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>単語帳</div>
            <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '2px' }}>Wordbook</div>
          </div>
          <button onClick={() => setShowAddGroup(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            <PlusIcon /> New Group
          </button>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
          {/* All Words card */}
          <div onClick={() => openGroup(null)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: 'var(--primary)', borderRadius: '16px', cursor: 'pointer', color: 'white', boxShadow: '0 4px 16px rgba(241,139,91,0.3)' }}>
            <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📚</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>All Words</div>
              <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>{allWords.length} words to study</div>
            </div>
            <ChevronRight />
          </div>

          {groups.map(g => {
            const gWords = vocabularyService.getWordsByGroup(g.id);
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
                onClick={() => openGroup(g)}>
                <div style={{ width: '44px', height: '44px', background: 'var(--bg-surface)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <FolderIcon />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>{g.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '2px' }}>{gWords.length} words</div>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                  style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ccc', borderRadius: '8px' }}>
                  <TrashIcon />
                </button>
                <ChevronRight />
              </div>
            );
          })}

          {groups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-sub)', fontSize: '14px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗂️</div>
              <div style={{ fontWeight: '600' }}>No groups yet</div>
              <div style={{ marginTop: '6px' }}>Create groups like "JLPT Vocabulary" or "My Travel Words"</div>
            </div>
          )}
        </div>

        <Modal show={showAddGroup} onClose={() => setShowAddGroup(false)}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>Create New Group</h3>
          <form onSubmit={handleCreateGroup}>
            <input autoFocus type="text" value={groupInput} onChange={e => setGroupInput(e.target.value)} placeholder="e.g. JLPT Vocabulary, My Travel Words…"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', fontSize: '15px', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddGroup(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Create Group</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ── GROUP DETAIL view ──────────────────────────────────────────
  if (view === VIEWS.GROUP_DETAIL) {
    const learnedIds = vocabularyService.getLearnedWordIds();
    return (
      <div className="flashcard-screen">
        <div style={{ alignSelf: 'stretch', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <button onClick={() => setView(VIEWS.GROUPS)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', padding: '4px' }}><BackIcon /></button>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', flex: 1 }}>{activeGroup ? activeGroup.title : 'All Words'}</div>
            {activeGroup && !activeGroup.isLesson && (
              <button onClick={() => { setGroupInput(activeGroup.title); setShowRenameGroup(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', display: 'flex', padding: '4px' }}><EditIcon /></button>
            )}
            {!activeGroup?.isLesson && (
              <button onClick={() => setShowAddWord(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                <PlusIcon /> Add
              </button>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-sub)', paddingLeft: '40px' }}>{words.length} words</div>
        </div>

        {words.length > 0 && (
          <button onClick={startFlashcard} style={{ width: '100%', marginBottom: '16px', padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(241,139,91,0.3)' }}>
            🃏 Start Flashcards ({words.length})
          </button>
        )}

        <div style={{ flex: 1, width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-sub)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>No words yet</div>
              <div style={{ marginTop: '6px', fontSize: '13px' }}>Tap "+ Add" to add vocabulary to this group.</div>
            </div>
          ) : words.map(word => {
            const learned = learnedIds.includes(word.id);
            return (
              <div key={word.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', background: learned ? 'var(--primary-light)' : 'var(--bg-primary)', borderRadius: '14px', border: `1.5px solid ${learned ? 'var(--primary)' : 'var(--border-light)'}`, gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '19px', fontWeight: '700', color: 'var(--text-primary)' }}>{word.jp}</span>
                    {word.reading && <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{word.reading}</span>}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-sub)', marginTop: '2px' }}>{word.en}</div>
                </div>
                <button onClick={() => speak(word.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '6px' }}><VolumeIcon /></button>
                <button onClick={() => handleToggleLearned(word.id)} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: learned ? 'var(--primary)' : 'white', color: learned ? 'white' : 'var(--text-sub)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  {learned ? '✓ Done' : 'Done'}
                </button>
                {word.isCustom && (
                  <button onClick={() => handleDeleteWord(word.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '6px' }}><TrashIcon /></button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Word Modal */}
        <Modal show={showAddWord} onClose={() => setShowAddWord(false)}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>Add Word{activeGroup ? ` to "${activeGroup.title}"` : ''}</h3>
          <form onSubmit={handleAddWord}>
            {[['Japanese (Kanji/Kana)', 'jp', '勉強'], ['Reading (Hiragana)', 'reading', 'べんきょう'], ['Meaning (English)', 'en', 'To study']].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-sub)' }}>{label}</label>
                <input type="text" value={newWord[key]} onChange={e => setNewWord({ ...newWord, [key]: e.target.value })} placeholder={`e.g. ${ph}`}
                  autoFocus={key === 'jp'}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '15px' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAddWord(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Word</button>
            </div>
          </form>
        </Modal>

        {/* Rename Group Modal */}
        <Modal show={showRenameGroup} onClose={() => setShowRenameGroup(false)}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>Rename Group</h3>
          <form onSubmit={handleRenameGroup}>
            <input autoFocus type="text" value={groupInput} onChange={e => setGroupInput(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', fontSize: '15px', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowRenameGroup(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ── FLASHCARD view ─────────────────────────────────────────────
  const currentWord = words[currentIndex];
  if (!currentWord) return null;

  return (
    <div className="flashcard-screen">
      <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => { setFlipped(false); setView(VIEWS.GROUP_DETAIL); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', padding: '4px' }}><BackIcon /></button>
        <div style={{ flex: 1, fontWeight: '700', fontSize: '17px', color: 'var(--text-primary)' }}>{activeGroup ? activeGroup.title : 'All Words'}</div>
        <div style={{ fontSize: '14px', color: 'var(--text-sub)', fontWeight: '600' }}>{currentIndex + 1} / {words.length}</div>
      </div>

      {/* Outer fade wrapper */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}
        >
          {/* Dynamic perspective container */}
          <div
            onClick={() => setFlipped(f => !f)}
            style={{
              perspective: '1200px',
              width: '100%',
              maxWidth: '400px',
              height: '280px',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            {/* Front Face */}
            <motion.div
              className="flashcard-face flashcard-front"
              initial={false}
              animate={{
                rotateY: flipped ? 180 : 0,
                opacity: flipped ? 0 : 1,
                scale: flipped ? 0.95 : 1,
              }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                pointerEvents: flipped ? 'none' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: '44px', fontWeight: '700', color: 'var(--text-primary)' }}>{currentWord.jp}</div>
              {currentWord.reading && <div style={{ fontSize: '18px', color: 'var(--text-sub)' }}>{currentWord.reading}</div>}
              <div style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic', marginTop: '12px' }}>Tap to flip</div>
            </motion.div>

            {/* Back Face */}
            <motion.div
              className="flashcard-face flashcard-back"
              initial={false}
              animate={{
                rotateY: flipped ? 0 : -180,
                opacity: flipped ? 1 : 0,
                scale: flipped ? 1 : 0.95,
              }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                pointerEvents: flipped ? 'auto' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'center' }}>{currentWord.en}</div>
              <div style={{ fontSize: '20px', color: 'var(--text-sub)', marginTop: '8px' }}>{currentWord.jp}</div>
              <button onClick={e => { e.stopPropagation(); vocabularyService.toggleLearned(currentWord.id); goNext(); }}
                style={{ marginTop: '20px', padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(241,139,91,0.2)' }}>
                ✓ Mark Learned
              </button>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '28px' }}>
        <button onClick={goPrev} style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft /></button>
        <button onClick={() => speak(currentWord.jp)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(241,139,91,0.35)' }}><VolumeIcon /></button>
        <button onClick={goNext} style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight /></button>
      </div>
    </div>
  );
};

export default FlashcardPage;
