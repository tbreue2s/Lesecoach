/**
 * Lesecoach Sprachanalyse & Lese-Coach Engine
 * Nutzt die Web Speech Recognition API zum Erkennen, Vergleichen und Bewerten des laut Gelesenen.
 */

export class ReadingCoach {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.hasSupport = !!SpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    
    this.isListening = false;
    this.targetWords = [];
    this.currentIndex = 0;
    this.stats = {
      correctCount: 0,
      mistakeCount: 0,
      startTime: null,
      endTime: null
    };

    // Callbacks
    this.onWordMatched = null;
    this.onWordMissed = null;
    this.onProgress = null;
    this.onCompleted = null;
    this.onInterimResult = null;
    this.onError = null;
    this.onStatusChange = null;

    this.setupRecognition();
  }

  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.lang = 'de-DE';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange({ isListening: true });
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && this.onInterimResult) {
        this.onInterimResult(interimTranscript);
      }

      if (finalTranscript) {
        this.processSpokenText(finalTranscript);
      } else if (interimTranscript) {
        // Also try matching interim results for ultra-responsive feedback
        this.processSpokenText(interimTranscript, true);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        if (this.onError) this.onError('Mikrofonzugriff wurde verweigert. Bitte erlaube den Mikrofonzugriff in den Einstellungen.');
      } else if (event.error === 'no-speech') {
        // Normal silence, can continue
      } else {
        if (this.onError) this.onError(`Spracherkennungs-Fehler: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we are still supposed to be listening (vital for Android browsers)
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          this.isListening = false;
          if (this.onStatusChange) this.onStatusChange({ isListening: false });
        }
      } else {
        if (this.onStatusChange) this.onStatusChange({ isListening: false });
      }
    };
  }

  setTargetText(wordsArray) {
    this.targetWords = wordsArray.map((w, idx) => ({
      index: idx,
      original: w,
      clean: this.normalizeWord(w),
      status: 'pending' // 'pending' | 'correct' | 'imperfect' | 'skipped'
    }));
    this.currentIndex = 0;
    this.stats = {
      correctCount: 0,
      mistakeCount: 0,
      startTime: null,
      endTime: null
    };
  }

  startListening() {
    if (!this.hasSupport) {
      if (this.onError) this.onError('Spracherkennung (Web Speech API) wird auf diesem Gerät/Browser leider nicht unterstützt.');
      return;
    }

    if (this.currentIndex >= this.targetWords.length) {
      this.currentIndex = 0;
    }

    this.stats.startTime = Date.now();
    this.isListening = true;

    try {
      this.recognition.start();
    } catch (e) {
      // Might already be running
      console.log('Recognition start note:', e.message);
    }

    if (this.onStatusChange) this.onStatusChange({ isListening: true });
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.onStatusChange) this.onStatusChange({ isListening: false });
  }

  normalizeWord(word) {
    if (!word) return '';
    return word
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'„“»«]/g, '')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .trim();
  }

  calculateSimilarity(s1, s2) {
    const longer = s1.length < s2.length ? s2 : s1;
    const shorter = s1.length < s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    
    // Levenshtein distance
    const costs = [];
    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[shorter.length] = lastValue;
    }
    const editDistance = costs[shorter.length];
    return (longer.length - editDistance) / longer.length;
  }

  processSpokenText(spokenText, isInterim = false) {
    if (!spokenText || this.currentIndex >= this.targetWords.length) return;

    const rawSpokenWords = spokenText.trim().split(/\s+/);
    const spokenWords = rawSpokenWords.map(w => this.normalizeWord(w)).filter(Boolean);

    if (spokenWords.length === 0) return;

    // Look ahead window (up to 4 words ahead) to accommodate natural reading rhythm
    const LOOKAHEAD = 4;
    let matchedAny = false;

    for (let sIdx = 0; sIdx < spokenWords.length; sIdx++) {
      const spoken = spokenWords[sIdx];
      if (this.currentIndex >= this.targetWords.length) break;

      let bestMatchIndex = -1;
      let highestSimilarity = 0;

      const maxCheck = Math.min(this.targetWords.length, this.currentIndex + LOOKAHEAD);
      for (let t = this.currentIndex; t < maxCheck; t++) {
        const targetClean = this.targetWords[t].clean;
        if (!targetClean) continue;

        const sim = this.calculateSimilarity(spoken, targetClean);
        if (sim > 0.72 && sim > highestSimilarity) {
          highestSimilarity = sim;
          bestMatchIndex = t;
        }
      }

      if (bestMatchIndex !== -1 && highestSimilarity >= 0.72) {
        // If user jumped forward, mark intermediate words as skipped/checked
        for (let k = this.currentIndex; k < bestMatchIndex; k++) {
          if (this.targetWords[k].status === 'pending') {
            this.targetWords[k].status = 'skipped';
            this.stats.mistakeCount++;
            if (this.onWordMissed) this.onWordMissed(k, this.targetWords[k].original);
          }
        }

        const currentTarget = this.targetWords[bestMatchIndex];
        if (currentTarget.status !== 'correct') {
          currentTarget.status = highestSimilarity > 0.88 ? 'correct' : 'imperfect';
          this.stats.correctCount++;
          this.currentIndex = bestMatchIndex + 1;
          matchedAny = true;

          // Haptic feedback on mobile if supported
          if (navigator.vibrate) {
            navigator.vibrate(15);
          }

          if (this.onWordMatched) {
            this.onWordMatched(bestMatchIndex, currentTarget.original, currentTarget.status);
          }
        }
      }
    }

    if (matchedAny && this.onProgress) {
      const accuracy = Math.round((this.stats.correctCount / Math.max(1, this.currentIndex)) * 100);
      const elapsedMinutes = (Date.now() - (this.stats.startTime || Date.now())) / 60000;
      const wpm = elapsedMinutes > 0 ? Math.round(this.currentIndex / elapsedMinutes) : 0;
      
      this.onProgress({
        currentIndex: this.currentIndex,
        totalWords: this.targetWords.length,
        accuracy,
        wpm,
        stats: this.stats
      });
    }

    // Check if finished reading entire text
    if (this.currentIndex >= this.targetWords.length) {
      this.finishSession();
    }
  }

  finishSession() {
    this.stopListening();
    this.stats.endTime = Date.now();
    const durationSec = Math.max(1, Math.round((this.stats.endTime - (this.stats.startTime || Date.now())) / 1000));
    const accuracy = Math.round((this.stats.correctCount / Math.max(1, this.targetWords.length)) * 100);
    const wpm = Math.round((this.targetWords.length / durationSec) * 60);

    if (this.onCompleted) {
      this.onCompleted({
        totalWords: this.targetWords.length,
        correctCount: this.stats.correctCount,
        mistakeCount: this.stats.mistakeCount,
        accuracy,
        wpm,
        durationSeconds: durationSec
      });
    }
  }

  resetProgress() {
    this.currentIndex = 0;
    this.targetWords.forEach(w => w.status = 'pending');
    this.stats = {
      correctCount: 0,
      mistakeCount: 0,
      startTime: null,
      endTime: null
    };
  }
}
