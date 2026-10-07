/**
 * Lesecoach – Hauptanwendung (PWA)
 * Verbindet UI, Web Speech TTS, Spracherkennung, Text-Bibliothek & Service Worker.
 */

import { SpeechEngine } from './speech.js';
import { ReadingCoach } from './coach.js';
import { LibraryManager } from './library.js';

class LesecoachApp {
  constructor() {
    this.speechEngine = new SpeechEngine();
    this.readingCoach = new ReadingCoach();
    this.library = new LibraryManager();

    this.currentMode = 'listen'; // 'listen' | 'coach'
    this.currentStory = null;
    this.storyWords = [];
    this.wordElements = [];
    this.deferredInstallPrompt = null;

    this.initDOM();
    this.initPWA();
    this.bindEvents();
    this.setupEngines();
    this.loadInitialStory();
  }

  initDOM() {
    // Buttons & Modes
    this.modeListenBtn = document.getElementById('modeListen');
    this.modeCoachBtn = document.getElementById('modeCoach');
    this.btnMainAction = document.getElementById('btnMainAction');
    this.btnStopAction = document.getElementById('btnStopAction');
    this.btnResetReading = document.getElementById('btnResetReading');
    
    // Sliders & Controls
    this.sliderSpeed = document.getElementById('sliderSpeed');
    this.lblSpeed = document.getElementById('lblSpeed');
    this.sliderFontSize = document.getElementById('sliderFontSize');
    this.lblFontSize = document.getElementById('lblFontSize');
    this.selectVoice = document.getElementById('selectVoice');
    this.sliderPitch = document.getElementById('sliderPitch');
    this.toggleDyslexicFont = document.getElementById('toggleDyslexicFont');
    this.toggleTheme = document.getElementById('toggleTheme');

    // Display areas
    this.readerBox = document.getElementById('readerBox');
    this.currentStoryTitle = document.getElementById('currentStoryTitle');
    this.badgeLevel = document.getElementById('badgeLevel');
    this.badgeCategory = document.getElementById('badgeCategory');
    this.statWordsRead = document.getElementById('statWordsRead');
    this.statAccuracy = document.getElementById('statAccuracy');
    this.statWpm = document.getElementById('statWpm');
    this.feedbackBar = document.getElementById('feedbackBar');
    this.feedbackText = document.getElementById('feedbackText');
    this.visualizer = document.getElementById('visualizer');

    // Modals
    this.modalLibrary = document.getElementById('modalLibrary');
    this.modalAddText = document.getElementById('modalAddText');
    this.modalSettings = document.getElementById('modalSettings');
    this.modalSummary = document.getElementById('modalSummary');
    this.libraryList = document.getElementById('libraryList');
    this.pwaBanner = document.getElementById('pwaBanner');
    this.btnInstallPwa = document.getElementById('btnInstallPwa');
  }

  initPWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker registriert:', reg.scope))
          .catch(err => console.warn('Service Worker Registrierung fehlgeschlagen:', err));
      });
    }

    // Capture Android install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (this.pwaBanner) {
        this.pwaBanner.classList.remove('hidden');
      }
    });

    if (this.btnInstallPwa) {
      this.btnInstallPwa.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) return;
        this.deferredInstallPrompt.prompt();
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        console.log('PWA Install Outcome:', outcome);
        this.deferredInstallPrompt = null;
        this.pwaBanner.classList.add('hidden');
      });
    }
  }

  setupEngines() {
    // Speech Engine (TTS) callbacks
    this.speechEngine.onStart = () => {
      this.visualizer.classList.add('speaking');
      this.visualizer.classList.remove('listening');
      this.updatePlayButtonState(true);
      this.feedbackText.textContent = 'Lesecoach liest vor...';
    };

    this.speechEngine.onEnd = () => {
      this.visualizer.classList.remove('speaking');
      this.updatePlayButtonState(false);
      this.feedbackText.textContent = 'Vorlesen beendet.';
      this.clearWordHighlights();
    };

    this.speechEngine.onBoundary = (data) => {
      this.handleTTSBoundary(data);
    };

    this.speechEngine.onError = (err) => {
      this.visualizer.classList.remove('speaking');
      this.updatePlayButtonState(false);
      this.feedbackText.textContent = 'Hinweis: ' + err;
    };

    // Populate voices when ready
    const populateVoiceList = () => {
      const germanVoices = this.speechEngine.getGermanVoices();
      if (!this.selectVoice) return;
      this.selectVoice.innerHTML = '';

      if (germanVoices.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'Standardstimme (Browser)';
        opt.value = '';
        this.selectVoice.appendChild(opt);
        return;
      }

      germanVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        if (this.speechEngine.selectedVoice && this.speechEngine.selectedVoice.voiceURI === v.voiceURI) {
          opt.selected = true;
        }
        this.selectVoice.appendChild(opt);
      });
    };

    populateVoiceList();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Reading Coach (STT) callbacks
    this.readingCoach.onStatusChange = ({ isListening }) => {
      if (isListening) {
        this.visualizer.classList.add('listening');
        this.visualizer.classList.remove('speaking');
        this.feedbackBar.classList.add('mic-active');
        this.updatePlayButtonState(true);
        this.feedbackText.textContent = 'Ich höre zu... Lies jetzt laut vor!';
      } else {
        this.visualizer.classList.remove('listening');
        this.feedbackBar.classList.remove('mic-active');
        this.updatePlayButtonState(false);
        if (!this.readingCoach.stats.endTime) {
          this.feedbackText.textContent = 'Pausiert. Klicke Start, um weiterzulesen.';
        }
      }
    };

    this.readingCoach.onWordMatched = (idx, word, status) => {
      if (this.wordElements[idx]) {
        this.wordElements[idx].classList.remove('word-active', 'word-skipped', 'word-imperfect');
        this.wordElements[idx].classList.add(status === 'correct' ? 'word-correct' : 'word-imperfect');
        
        // Highlight next target word
        if (this.wordElements[idx + 1]) {
          this.clearActiveHighlight();
          this.wordElements[idx + 1].classList.add('word-active');
          this.scrollToElement(this.wordElements[idx + 1]);
        }
      }
    };

    this.readingCoach.onWordMissed = (idx) => {
      if (this.wordElements[idx]) {
        this.wordElements[idx].classList.remove('word-active');
        this.wordElements[idx].classList.add('word-skipped');
      }
    };

    this.readingCoach.onInterimResult = (interim) => {
      this.feedbackText.textContent = `Erkannt: "${interim}"`;
    };

    this.readingCoach.onProgress = ({ currentIndex, totalWords, accuracy, wpm }) => {
      this.statWordsRead.textContent = `${currentIndex} / ${totalWords}`;
      this.statAccuracy.textContent = `${accuracy}%`;
      this.statWpm.textContent = `${wpm} WPM`;
    };

    this.readingCoach.onCompleted = (summary) => {
      this.showSummaryModal(summary);
    };

    this.readingCoach.onError = (err) => {
      this.feedbackText.textContent = err;
      this.visualizer.classList.remove('listening');
      this.feedbackBar.classList.remove('mic-active');
      this.updatePlayButtonState(false);
    };
  }

  loadInitialStory() {
    const all = this.library.getAllTexts();
    this.loadStory(all[0]);
  }

  loadStory(story) {
    this.currentStory = story;
    this.currentStoryTitle.textContent = story.title;
    this.badgeLevel.textContent = `Stufe: ${story.difficulty || 'Normal'}`;
    this.badgeCategory.textContent = story.category ? story.category.toUpperCase() : 'TEXT';

    this.stopAllAudio();
    this.renderStoryText(story.text);

    // Prepare engines
    const rawTokens = story.text.trim().split(/\s+/).filter(Boolean);
    this.storyWords = rawTokens;
    this.readingCoach.setTargetText(this.storyWords);

    this.statWordsRead.textContent = `0 / ${this.storyWords.length}`;
    this.statAccuracy.textContent = '100%';
    this.statWpm.textContent = '0 WPM';
    this.feedbackText.textContent = 'Bereit. Tippe auf Start, um loszulegen...';
  }

  renderStoryText(fullText) {
    this.readerBox.innerHTML = '';
    this.wordElements = [];

    const paragraphs = fullText.split(/\n\s*\n/);
    let globalWordIndex = 0;
    let runningCharIndex = 0;

    paragraphs.forEach(paraText => {
      if (!paraText.trim()) return;
      const p = document.createElement('div');
      p.className = 'paragraph';

      const words = paraText.trim().split(/\s+/);
      words.forEach((w) => {
        const span = document.createElement('span');
        span.className = 'coach-word';
        span.textContent = w;
        span.dataset.index = globalWordIndex;
        span.dataset.charStart = runningCharIndex;
        
        runningCharIndex += w.length + 1; // approx char position
        span.dataset.charEnd = runningCharIndex;

        // Click word to speak or jump
        span.addEventListener('click', () => {
          this.onWordClicked(parseInt(span.dataset.index));
        });

        p.appendChild(span);
        p.appendChild(document.createTextNode(' '));
        this.wordElements.push(span);
        globalWordIndex++;
      });

      this.readerBox.appendChild(p);
    });
  }

  onWordClicked(wordIndex) {
    if (this.currentMode === 'listen') {
      // Speak single word or resume from here
      const word = this.storyWords[wordIndex];
      this.speechEngine.speakText(word);
    } else {
      // Set coach target index to this word
      this.readingCoach.currentIndex = wordIndex;
      this.clearActiveHighlight();
      if (this.wordElements[wordIndex]) {
        this.wordElements[wordIndex].classList.add('word-active');
        this.scrollToElement(this.wordElements[wordIndex]);
      }
      this.feedbackText.textContent = `Ziel gesetzt auf Wort ${wordIndex + 1}: "${this.storyWords[wordIndex]}"`;
    }
  }

  handleTTSBoundary(data) {
    const { charIndex } = data;
    if (charIndex === undefined) return;

    // Find the word element closest to this charIndex
    let targetEl = null;
    let targetIdx = 0;

    for (let i = 0; i < this.wordElements.length; i++) {
      const el = this.wordElements[i];
      const start = parseInt(el.dataset.charStart || '0');
      const end = parseInt(el.dataset.charEnd || '0');

      if (charIndex >= start && charIndex <= end + 3) {
        targetEl = el;
        targetIdx = i;
        break;
      }
    }

    if (targetEl) {
      this.clearActiveHighlight();
      targetEl.classList.add('word-active');
      this.scrollToElement(targetEl);
      this.statWordsRead.textContent = `${targetIdx + 1} / ${this.storyWords.length}`;
    }
  }

  clearActiveHighlight() {
    const prev = this.readerBox.querySelector('.word-active');
    if (prev) prev.classList.remove('word-active');
  }

  clearWordHighlights() {
    this.wordElements.forEach(el => {
      el.classList.remove('word-active');
    });
  }

  scrollToElement(el) {
    if (!el) return;
    const parent = this.readerBox;
    const elTop = el.offsetTop;
    const parentTop = parent.scrollTop;
    const parentHeight = parent.clientHeight;

    if (elTop < parentTop + 40 || elTop > parentTop + parentHeight - 60) {
      parent.scrollTo({
        top: Math.max(0, elTop - 80),
        behavior: 'smooth'
      });
    }
  }

  toggleMainAction() {
    if (this.currentMode === 'listen') {
      if (this.speechEngine.isPlaying && !this.speechEngine.isPaused) {
        this.speechEngine.pause();
      } else if (this.speechEngine.isPaused) {
        this.speechEngine.resume();
      } else {
        this.speechEngine.speakText(this.currentStory.text);
      }
    } else {
      // Coach (Speech Recognition) Mode
      if (this.readingCoach.isListening) {
        this.readingCoach.stopListening();
      } else {
        if (this.readingCoach.currentIndex === 0) {
          this.wordElements.forEach(el => {
            el.classList.remove('word-correct', 'word-skipped', 'word-imperfect', 'word-active');
          });
          if (this.wordElements[0]) {
            this.wordElements[0].classList.add('word-active');
          }
        }
        this.readingCoach.startListening();
      }
    }
  }

  stopAllAudio() {
    this.speechEngine.stop();
    this.readingCoach.stopListening();
    this.visualizer.classList.remove('speaking', 'listening');
    this.feedbackBar.classList.remove('mic-active');
    this.updatePlayButtonState(false);
  }

  updatePlayButtonState(isPlaying) {
    const icon = this.btnMainAction.querySelector('svg');
    if (isPlaying) {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
    } else {
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    }
  }

  setMode(mode) {
    this.stopAllAudio();
    this.currentMode = mode;

    if (mode === 'listen') {
      this.modeListenBtn.classList.add('active');
      this.modeCoachBtn.classList.remove('active');
      document.getElementById('speedControlGroup').style.display = 'flex';
      this.feedbackText.textContent = 'Vorlesemodus aktiv. Drücke Start zum Vorlesen.';
    } else {
      this.modeCoachBtn.classList.add('active');
      this.modeListenBtn.classList.remove('active');
      document.getElementById('speedControlGroup').style.display = 'none';
      this.feedbackText.textContent = 'Mitsprech-Coach aktiv. Drücke Start und lies laut ins Mikrofon!';
    }
    this.clearWordHighlights();
  }

  bindEvents() {
    // Mode toggles
    this.modeListenBtn.addEventListener('click', () => this.setMode('listen'));
    this.modeCoachBtn.addEventListener('click', () => this.setMode('coach'));

    // Main action buttons
    this.btnMainAction.addEventListener('click', () => this.toggleMainAction());
    this.btnStopAction.addEventListener('click', () => {
      this.stopAllAudio();
      this.feedbackText.textContent = 'Wiedergabe gestoppt.';
    });

    this.btnResetReading.addEventListener('click', () => {
      this.stopAllAudio();
      this.readingCoach.resetProgress();
      this.wordElements.forEach(el => {
        el.className = 'coach-word';
      });
      this.statWordsRead.textContent = `0 / ${this.storyWords.length}`;
      this.statAccuracy.textContent = '100%';
      this.statWpm.textContent = '0 WPM';
      this.feedbackText.textContent = 'Fortschritt zurückgesetzt.';
    });

    // Speed & Font Size Sliders
    this.sliderSpeed.addEventListener('input', (e) => {
      const val = e.target.value;
      this.lblSpeed.textContent = `${val}x`;
      this.speechEngine.setRate(val);
    });

    this.sliderFontSize.addEventListener('input', (e) => {
      const val = e.target.value;
      this.lblFontSize.textContent = `${val}px`;
      document.documentElement.style.setProperty('--reader-font-size', `${val}px`);
    });

    // Settings
    this.selectVoice.addEventListener('change', (e) => {
      this.speechEngine.setVoice(e.target.value);
    });

    this.sliderPitch.addEventListener('input', (e) => {
      this.speechEngine.setPitch(e.target.value);
    });

    this.toggleDyslexicFont.addEventListener('change', (e) => {
      document.body.classList.toggle('font-dyslexic', e.target.checked);
    });

    this.toggleTheme.addEventListener('change', (e) => {
      document.body.classList.toggle('light-theme', e.target.checked);
    });

    // Modals open/close
    document.getElementById('btnOpenLibrary').addEventListener('click', () => this.openLibraryModal());
    document.getElementById('btnOpenSettings').addEventListener('click', () => this.openModal(this.modalSettings));
    document.getElementById('btnOpenAddTextModal').addEventListener('click', () => {
      this.closeModal(this.modalLibrary);
      this.openModal(this.modalAddText);
    });

    // Mobile tabs
    document.getElementById('tabHome').addEventListener('click', () => {
      this.closeAllModals();
      this.updateActiveTab('tabHome');
    });
    document.getElementById('tabLibrary').addEventListener('click', () => {
      this.openLibraryModal();
      this.updateActiveTab('tabLibrary');
    });
    document.getElementById('tabNewText').addEventListener('click', () => {
      this.openModal(this.modalAddText);
      this.updateActiveTab('tabNewText');
    });
    document.getElementById('tabSettings').addEventListener('click', () => {
      this.openModal(this.modalSettings);
      this.updateActiveTab('tabSettings');
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        if (targetId) {
          const m = document.getElementById(targetId);
          if (m) this.closeModal(m);
        }
      });
    });

    // Custom text save
    document.getElementById('btnSaveCustomText').addEventListener('click', () => {
      const title = document.getElementById('inputCustomTitle').value;
      const content = document.getElementById('inputCustomContent').value;
      if (!content.trim()) {
        alert('Bitte gib einen Text ein.');
        return;
      }
      const newDoc = this.library.addCustomText(title, content);
      this.closeModal(this.modalAddText);
      document.getElementById('inputCustomTitle').value = '';
      document.getElementById('inputCustomContent').value = '';
      this.loadStory(newDoc);
    });

    // Repeat text button on summary modal
    document.getElementById('btnRepeatText').addEventListener('click', () => {
      this.closeModal(this.modalSummary);
      this.btnResetReading.click();
      this.setMode('coach');
      setTimeout(() => this.toggleMainAction(), 400);
    });
  }

  updateActiveTab(activeId) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.id === activeId);
    });
  }

  openModal(modalEl) {
    if (modalEl) modalEl.classList.add('open');
  }

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('open');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
  }

  openLibraryModal() {
    this.renderLibraryList();
    this.openModal(this.modalLibrary);
  }

  renderLibraryList() {
    this.libraryList.innerHTML = '';
    const texts = this.library.getAllTexts();

    texts.forEach(item => {
      const card = document.createElement('div');
      card.className = 'library-item';
      if (this.currentStory && this.currentStory.id === item.id) {
        card.classList.add('active-item');
      }

      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <span class="badge badge-level">${item.difficulty || 'Text'}</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">${item.category || ''}</span>
          </div>
          <h4>${item.title}</h4>
          <p>${item.description || ''}</p>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
          <span style="font-size:0.75rem; color:var(--accent-secondary);">${item.text.trim().split(/\s+/).length} Wörter</span>
          ${item.isCustom ? `<button class="btn-icon btn-delete-custom" data-id="${item.id}" style="width:28px; height:28px;" title="Löschen"><svg viewBox="0 0 24 24" style="width:14px; height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : ''}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-custom')) {
          e.stopPropagation();
          const id = e.target.closest('.btn-delete-custom').dataset.id;
          this.library.deleteCustomText(id);
          this.renderLibraryList();
          return;
        }
        this.loadStory(item);
        this.closeModal(this.modalLibrary);
      });

      this.libraryList.appendChild(card);
    });
  }

  showSummaryModal({ totalWords, correctCount, accuracy, wpm, durationSeconds }) {
    document.getElementById('summaryScore').textContent = `${accuracy}%`;
    document.getElementById('summaryWords').textContent = totalWords;
    document.getElementById('summaryWpm').textContent = wpm;
    
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    document.getElementById('summaryTime').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const heading = document.getElementById('summaryHeading');
    const subtext = document.getElementById('summarySubtext');

    if (accuracy >= 90) {
      heading.textContent = '🌟 Fantastisch gemeistert!';
      subtext.textContent = 'Deine Aussprache und dein Lesefluss waren hervorragend.';
    } else if (accuracy >= 75) {
      heading.textContent = '👍 Sehr gut gemacht!';
      subtext.textContent = 'Toller Lesefluss mit nur wenigen kleinen Unsicherheiten.';
    } else {
      heading.textContent = '💪 Guter Versuch!';
      subtext.textContent = 'Wiederhole den Text noch einmal im langsameren Tempo.';
    }

    this.openModal(this.modalSummary);
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.lesecoachApp = new LesecoachApp();
});
