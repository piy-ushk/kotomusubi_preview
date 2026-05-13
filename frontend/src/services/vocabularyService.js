const STORAGE_KEY_LEARNED = 'kotomusubi_learned_words';
const STORAGE_KEY_CUSTOM = 'kotomusubi_custom_words';
const STORAGE_KEY_DISCOVERED = 'kotomusubi_discovered_words';
const STORAGE_KEY_GROUPS = 'kotomusubi_word_groups';

export const vocabularyService = {
  // ── Learned words ────────────────────────────────────────────
  getLearnedWordIds: () => {
    const stored = localStorage.getItem(STORAGE_KEY_LEARNED);
    return stored ? JSON.parse(stored) : [];
  },

  toggleLearned: (wordId) => {
    const learned = vocabularyService.getLearnedWordIds();
    const index = learned.indexOf(wordId);
    if (index > -1) learned.splice(index, 1);
    else learned.push(wordId);
    localStorage.setItem(STORAGE_KEY_LEARNED, JSON.stringify(learned));
    return learned;
  },

  // ── Discovered words (from lessons) ──────────────────────────
  addDiscoveredWords: (words) => {
    const stored = localStorage.getItem(STORAGE_KEY_DISCOVERED);
    const discovered = stored ? JSON.parse(stored) : [];
    let changed = false;
    words.forEach(w => {
      if (!discovered.find(d => d.id === w.id)) {
        discovered.push(w);
        changed = true;
      }
    });
    if (changed) localStorage.setItem(STORAGE_KEY_DISCOVERED, JSON.stringify(discovered));
    return discovered;
  },

  getDiscoveredWords: () => {
    const stored = localStorage.getItem(STORAGE_KEY_DISCOVERED);
    return stored ? JSON.parse(stored) : [];
  },

  // ── Custom words ─────────────────────────────────────────────
  addCustomWord: (word, groupId = null) => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    const custom = stored ? JSON.parse(stored) : [];
    const newWord = {
      ...word,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
      groupId: groupId,
    };
    custom.push(newWord);
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(custom));
    return newWord;
  },

  getCustomWords: () => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return stored ? JSON.parse(stored) : [];
  },

  deleteCustomWord: (wordId) => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    const custom = stored ? JSON.parse(stored) : [];
    const filtered = custom.filter(w => w.id !== wordId);
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(filtered));
  },

  moveWordToGroup: (wordId, groupId) => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    const custom = stored ? JSON.parse(stored) : [];
    const updated = custom.map(w => w.id === wordId ? { ...w, groupId } : w);
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(updated));
  },

  // ── Groups ───────────────────────────────────────────────────
  getGroups: () => {
    const stored = localStorage.getItem(STORAGE_KEY_GROUPS);
    return stored ? JSON.parse(stored) : [];
  },

  createGroup: (title) => {
    const groups = vocabularyService.getGroups();
    const newGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      createdAt: Date.now(),
    };
    groups.push(newGroup);
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    return newGroup;
  },

  renameGroup: (groupId, newTitle) => {
    const groups = vocabularyService.getGroups();
    const updated = groups.map(g => g.id === groupId ? { ...g, title: newTitle.trim() } : g);
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(updated));
  },

  deleteGroup: (groupId) => {
    // Remove the group
    const groups = vocabularyService.getGroups().filter(g => g.id !== groupId);
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    // Unassign words that were in this group
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    const custom = stored ? JSON.parse(stored) : [];
    const updated = custom.map(w => w.groupId === groupId ? { ...w, groupId: null } : w);
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(updated));
  },

  getWordsByGroup: (groupId) => {
    const custom = vocabularyService.getCustomWords();
    return custom.filter(w => w.groupId === groupId);
  },

  getUngroupedCustomWords: () => {
    const custom = vocabularyService.getCustomWords();
    return custom.filter(w => !w.groupId);
  },

  // ── All not-yet-learned words ────────────────────────────────
  getNotYetWords: () => {
    const learnedIds = vocabularyService.getLearnedWordIds();
    const discovered = vocabularyService.getDiscoveredWords();
    const custom = vocabularyService.getCustomWords();
    const all = [...discovered, ...custom];
    return all.filter(w => !learnedIds.includes(w.id));
  }
};
