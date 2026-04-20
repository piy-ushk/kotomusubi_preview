const STORAGE_KEY_LEARNED = 'kotomusubi_learned_words';
const STORAGE_KEY_CUSTOM = 'kotomusubi_custom_words';
const STORAGE_KEY_DISCOVERED = 'kotomusubi_discovered_words';

export const vocabularyService = {
  // Get all words marked as learned (set of IDs)
  getLearnedWordIds: () => {
    const stored = localStorage.getItem(STORAGE_KEY_LEARNED);
    return stored ? JSON.parse(stored) : [];
  },

  // Toggle learned status
  toggleLearned: (wordId) => {
    const learned = vocabularyService.getLearnedWordIds();
    const index = learned.indexOf(wordId);
    if (index > -1) {
      learned.splice(index, 1);
    } else {
      learned.push(wordId);
    }
    localStorage.setItem(STORAGE_KEY_LEARNED, JSON.stringify(learned));
    return learned;
  },

  // Add words discovered in lessons to the local database
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

    if (changed) {
      localStorage.setItem(STORAGE_KEY_DISCOVERED, JSON.stringify(discovered));
    }
    return discovered;
  },

  getDiscoveredWords: () => {
    const stored = localStorage.getItem(STORAGE_KEY_DISCOVERED);
    return stored ? JSON.parse(stored) : [];
  },

  // Custom words
  addCustomWord: (word) => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    const custom = stored ? JSON.parse(stored) : [];
    const newWord = {
      ...word,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true
    };
    custom.push(newWord);
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(custom));
    return newWord;
  },

  getCustomWords: () => {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return stored ? JSON.parse(stored) : [];
  },

  // Helper to get all "not yet" words
  getNotYetWords: () => {
    const learnedIds = vocabularyService.getLearnedWordIds();
    const discovered = vocabularyService.getDiscoveredWords();
    const custom = vocabularyService.getCustomWords();
    
    const all = [...discovered, ...custom];
    return all.filter(w => !learnedIds.includes(w.id));
  }
};
