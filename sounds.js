// Sound Effects Manager
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Create beep sound
    playBeep(frequency = 800, duration = 100, volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }

    // Ball pot sound (satisfying deeper tone)
    playPotSound() {
        if (!this.enabled) return;
        this.playBeep(400, 200, 0.4);  // Lower frequency, longer duration
        setTimeout(() => this.playBeep(300, 150, 0.3), 100);  // Secondary beep
    }

    // Cushion collision sound (short click)
    playCushionSound(velocity = 1) {
        if (!this.enabled) return;
        const volume = Math.min(velocity / 10, 0.5);
        this.playBeep(600 + velocity * 20, 80, volume);
    }

    // Ball collision sound (light click)
    playBallCollisionSound(velocity = 1) {
        if (!this.enabled) return;
        const volume = Math.min(velocity / 15, 0.3);
        this.playBeep(500 + velocity * 30, 60, volume);
    }

    // Shot sound (cue strike)
    playShotSound(power = 1) {
        if (!this.enabled) return;
        const frequency = 700 + power * 50;
        const duration = 100 + power * 20;
        this.playBeep(frequency, duration, 0.5);
    }

    // Game over sound
    playGameOverSound() {
        if (!this.enabled) return;
        this.playBeep(400, 300, 0.4);
        setTimeout(() => this.playBeep(300, 300, 0.4), 350);
        setTimeout(() => this.playBeep(250, 400, 0.4), 700);
    }

    // Toggle sound on/off
    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Create global sound manager
const soundManager = new SoundManager();
