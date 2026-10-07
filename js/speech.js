/**
 * Lesecoach Text-to-Speech (TTS) Engine
 * Bietet präzise Steuerung der Sprachausgabe mit Wort- und Satz-Synchronisation.
 */

export class SpeechEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.utterance = null;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // Callbacks
    this.onBoundary = null;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    this.onStateChange = null;

    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    
    const load = () => {
      const allVoices = this.synth.getVoices();
      // Prioritize German voices
      const germanVoices = allVoices.filter(v => v.lang.startsWith('de'));
      const otherVoices = allVoices.filter(v => !v.lang.startsWith('de'));
      this.voices = [...germanVoices, ...otherVoices];

      if (!this.selectedVoice && this.voices.length > 0) {
        // Find best German voice
        const naturalGerman = germanVoices.find(v => 
          v.name.includes('Google') || 
          v.name.includes('Natural') || 
          v.name.includes('Neural') || 
          v.name.includes('Premium') ||
          v.default
        );
        this.selectedVoice = naturalGerman || germanVoices[0] || this.voices[0];
      }
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  getGermanVoices() {
    return this.voices.filter(v => v.lang.startsWith('de'));
  }

  setVoice(voiceURI) {
    const found = this.voices.find(v => v.voiceURI === voiceURI);
    if (found) {
      this.selectedVoice = found;
    }
  }

  setRate(newRate) {
    this.rate = Math.max(0.4, Math.min(2.0, parseFloat(newRate)));
  }

  setPitch(newPitch) {
    this.pitch = Math.max(0.5, Math.min(1.5, parseFloat(newPitch)));
  }

  speakText(text, wordOffset = 0) {
    if (!this.synth) {
      if (this.onError) this.onError('Sprachsynthese wird von diesem Browser nicht unterstützt.');
      return;
    }

    this.stop();

    if (!text || text.trim() === '') return;

    // Split text cleanly
    this.utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      this.utterance.voice = this.selectedVoice;
      this.utterance.lang = this.selectedVoice.lang || 'de-DE';
    } else {
      this.utterance.lang = 'de-DE';
    }

    this.utterance.rate = this.rate;
    this.utterance.pitch = this.pitch;

    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      if (this.onStart) this.onStart();
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isPaused: false });
    };

    this.utterance.onboundary = (event) => {
      if (event.name === 'word' || event.charIndex !== undefined) {
        if (this.onBoundary) {
          this.onBoundary({
            charIndex: event.charIndex,
            charLength: event.charLength || 0,
            name: event.name
          });
        }
      }
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.onEnd) this.onEnd();
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isPaused: false });
    };

    this.utterance.onerror = (event) => {
      // Ignore normal canceled events on stop
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.warn('Speech synthesis error:', event.error);
        if (this.onError) this.onError(event.error);
      }
      this.isPlaying = false;
      this.isPaused = false;
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isPaused: false });
    };

    // Workaround for Chrome/Android GC bug with SpeechSynthesisUtterance
    window._currentUtterance = this.utterance;

    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isPaused: true });
    }
  }

  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      if (this.onStateChange) this.onStateChange({ isPlaying: true, isPaused: false });
    }
  }

  togglePlayPause(text) {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.speakText(text);
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isPaused: false });
    }
  }
}
