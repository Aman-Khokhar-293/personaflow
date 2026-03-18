/**
 * PersonaFlow - Anchoring Performance Page
 * Full-screen immersive view where the anchoring agent speaks script lines
 * No user camera - one-direction scripted delivery
 */

const AnchoringPage = {
    agent: null,
    state: null,
    pollInterval: null,
    synthesis: window.speechSynthesis,
    currentUtterance: null,
    isSpeaking: false,
    lastSpokenLine: -1,
    conversationId: null,
    selectedVoice: null,

    _selectVoice() {
        if (this.selectedVoice) return;
        const voices = this.synthesis.getVoices();
        this.selectedVoice = voices.find(v => /female|zira|samantha|karen|fiona|moira|tessa|victoria/i.test(v.name) && /en/i.test(v.lang))
            || voices.find(v => /female|zira|samantha|karen|fiona|moira|tessa|victoria/i.test(v.name))
            || voices.find(v => /en/i.test(v.lang) && !/male/i.test(v.name))
            || null;
    },

    async render(container, conversationId) {
        this.conversationId = conversationId;
        this.lastSpokenLine = -1;
        this.isSpeaking = false;

        try {
            const data = await API.get(`/conversations/${conversationId}`);
            this.agent = data.agent;
            this.conversation = data.conversation;

            if (this.agent.agent_type !== 'anchoring') {
                Toast.error('This is not an anchoring agent');
                Router.navigate('/agents');
                return;
            }

            this.renderPerformance(container);
            this.startPolling();

            // Initialize 3D Avatar
            try {
                await Avatar3D.init('anc-avatar-container');
            } catch (e) {
                console.warn('3D Avatar init failed:', e);
            }

        } catch (error) {
            Toast.error('Failed to load anchoring performance');
            Router.navigate('/agents');
        }
    },

    renderPerformance(container) {
        // Hide sidebar
        Sidebar.hide();
        document.getElementById('main-content').classList.add('full-width');
        document.getElementById('main-content').style.padding = '0';

        container.innerHTML = `
            <div class="anc-perf-container">
                <!-- 3D Avatar Background -->
                <div id="anc-avatar-container" class="anc-avatar-fullscreen"></div>

                <!-- Cinematic Overlay Gradient (Vignette) -->
                <div class="anc-perf-overlay"></div>

                <!-- Top Bar -->
                <div class="anc-perf-header">
                    <div class="anc-perf-agent-card">
                        <div class="anc-perf-icon-wrapper">
                            <span class="anc-perf-icon">${this.agent.icon}</span>
                        </div>
                        <div class="anc-perf-info">
                            <div class="anc-perf-name">${this.agent.name}</div>
                            <div class="anc-perf-role">AI Host</div>
                        </div>
                    </div>

                    <div class="anc-perf-status-pill" id="anc-perf-status">
                        <span class="anc-live-indicator">
                            <span class="anc-live-dot"></span>
                            LIVE
                        </span>
                        <span class="anc-status-divider"></span>
                        <span class="anc-status-text">Connecting...</span>
                    </div>
                </div>

                <!-- Subtitle Area (Bottom Center) -->
                <div class="anc-perf-subtitle-area">
                    <div class="anc-perf-subtitle" id="anc-perf-subtitle">
                        <span class="anc-subtitle-placeholder">Waiting for broadcast to begin...</span>
                    </div>
                </div>

                <!-- Progress (Bottom) -->
                <div class="anc-perf-progress-container">
                    <div class="anc-perf-progress-track">
                        <div class="anc-perf-progress-bar" id="anc-perf-progress-bar" style="width:0%">
                            <div class="anc-perf-progress-glow"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
    },

    injectStyles() {
        if (document.getElementById('anc-perf-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'anc-perf-styles';
        styles.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

            .anc-perf-container {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at center, #1e1e2f 0%, #0f0f1a 100%);
                font-family: 'Outfit', sans-serif;
                overflow: hidden;
                z-index: 1000;
                color: #fff;
            }

            .anc-avatar-fullscreen {
                position: absolute;
                inset: 0;
                z-index: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .anc-perf-overlay {
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%);
                pointer-events: none;
                z-index: 2;
            }

            /* Header / Top Bar */
            .anc-perf-header {
                position: absolute;
                top: 30px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                z-index: 10;
                pointer-events: none;
            }

            .anc-perf-agent-card {
                display: flex;
                align-items: center;
                gap: 16px;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                padding: 10px 20px 10px 10px;
                border-radius: 50px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                transition: transform 0.3s ease;
            }

            .anc-perf-icon-wrapper {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }

            .anc-perf-info {
                display: flex;
                flex-direction: column;
            }

            .anc-perf-name {
                font-weight: 700;
                font-size: 16px;
                line-height: 1.2;
                letter-spacing: 0.5px;
            }

            .anc-perf-role {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
            }

            /* Status Pill */
            .anc-perf-status-pill {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 10px 24px;
                border-radius: 30px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }

            .anc-live-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1.5px;
                color: #ef4444;
                text-transform: uppercase;
            }

            .anc-live-dot {
                width: 8px;
                height: 8px;
                background-color: #ef4444;
                border-radius: 50%;
                box-shadow: 0 0 10px #ef4444;
                animation: pulse-live 1.5s infinite;
            }

            .anc-status-divider {
                width: 1px;
                height: 14px;
                background: rgba(255, 255, 255, 0.15);
            }

            .anc-status-text {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
                letter-spacing: 0.3px;
            }

            /* Subtitles */
            .anc-perf-subtitle-area {
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 900px; /* Wider measure for cinematic feel */
                z-index: 10;
                text-align: center;
                pointer-events: none;
            }

            .anc-perf-subtitle {
                display: inline-block;
                background: rgba(0, 0, 0, 0.7); /* Darker backdrop for better contrast */
                backdrop-filter: blur(8px);
                padding: 24px 48px;
                border-radius: 24px;
                color: rgba(255, 255, 255, 0.95);
                font-size: 26px; /* Larger text */
                font-weight: 500;
                line-height: 1.5;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                opacity: 0;
                transform: translateY(20px);
                animation: slide-up-fade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                border: 1px solid rgba(255,255,255,0.05);
            }

            .anc-subtitle-placeholder {
                font-style: italic;
                color: rgba(255, 255, 255, 0.5);
                font-size: 18px;
            }

            /* Progress Bar */
            .anc-perf-progress-container {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 0;
                z-index: 10;
            }

            .anc-perf-progress-track {
                width: 100%;
                height: 4px; /* Slimmer */
                background: rgba(255, 255, 255, 0.05);
                position: relative;
            }

            .anc-perf-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #6366f1, #ec4899, #f59e0b);
                width: 0%;
                position: relative;
                transition: width 0.3s linear; /* Linear for smoother progress look */
            }

            .anc-perf-progress-glow {
                position: absolute;
                right: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 100px;
                height: 4px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8));
                box-shadow: 0 0 15px rgba(255,255,255,0.8);
            }

            /* Animations */
            @keyframes pulse-live {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }

            @keyframes slide-up-fade {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;

        document.head.appendChild(styles);
    },

    startPolling() {
        this.pollInterval = setInterval(() => this.fetchAndProcess(), 1500);
    },

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    async fetchAndProcess() {
        try {
            const response = await API.get(`/agents/${this.agent.id}/anchoring/state`);
            this.state = response.state;
            this.updatePerformanceUI();

            // Speak the current line if it changed and status is playing
            if (this.state.status === 'playing' && this.state.current_line !== this.lastSpokenLine) {
                this.lastSpokenLine = this.state.current_line;
                const line = this.state.script_lines[this.state.current_line];
                if (line) {
                    this.speakLine(line);
                }
            }

            // If paused, stop speaking
            if (this.state.status === 'paused' && this.isSpeaking) {
                this.synthesis.pause();
            }

            // If stopped
            if (this.state.status === 'stopped') {
                this.stopSpeaking();
                this.lastSpokenLine = -1;
            }

        } catch (error) {
            console.error('Anchoring poll error:', error);
        }
    },

    updatePerformanceUI() {
        if (!this.state) return;

        // Status Pill — only update when status changes
        const statusEl = document.getElementById('anc-perf-status');
        if (statusEl && statusEl.dataset.currentStatus !== this.state.status) {
            const labels = { playing: 'Playing', paused: 'Paused', stopped: 'Stopped' };
            const dotColors = { playing: '#22c55e', paused: '#f59e0b', stopped: '#ef4444' };
            const dotColor = dotColors[this.state.status] || '#f59e0b';
            statusEl.innerHTML = `
                <span class="anc-live-indicator">
                    <span class="anc-live-dot" style="background-color:${dotColor};box-shadow:0 0 10px ${dotColor}"></span>
                    ${this.state.status === 'playing' ? 'LIVE' : labels[this.state.status] || 'LIVE'}
                </span>
                <span class="anc-status-divider"></span>
                <span class="anc-status-text">${labels[this.state.status] || 'Connecting...'}</span>
            `;
            statusEl.dataset.currentStatus = this.state.status;
        }

        // Subtitle — only animate when text actually changes
        const subtitleEl = document.getElementById('anc-perf-subtitle');
        if (subtitleEl && this.state.script_lines) {
            if (this.state.status === 'stopped') {
                if (subtitleEl.dataset.currentText !== '__stopped__') {
                    subtitleEl.innerHTML = '<span class="anc-subtitle-placeholder">Waiting for broadcast to begin...</span>';
                    subtitleEl.dataset.currentText = '__stopped__';
                }
            } else {
                const line = this.state.script_lines[this.state.current_line] || '';
                // Only re-trigger animation if the line has changed
                if (subtitleEl.dataset.currentText !== line) {
                    subtitleEl.style.animation = 'none';
                    subtitleEl.offsetHeight; // force reflow
                    subtitleEl.style.animation = 'slide-up-fade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
                    subtitleEl.textContent = line;
                    subtitleEl.dataset.currentText = line;
                }
            }
        }

        // Progress
        const total = this.state.total_lines || 0;
        const current = this.state.current_line || 0;
        const pct = total > 0 ? ((current + 1) / total * 100) : 0;

        const progressBar = document.getElementById('anc-perf-progress-bar');
        if (progressBar) progressBar.style.width = `${pct}%`;
    },

    speakLine(text) {
        this.stopSpeaking();
        this.isSpeaking = true;

        const onSpeakEnd = () => {
            this.isSpeaking = false;
            // Auto-advance to next line if playing
            if (this.state && this.state.status === 'playing') {
                setTimeout(() => {
                    this.advanceToNextLine();
                }, 1000); // 1 second pause between lines
            }
        };

        // Use Avatar3D TTS if available, otherwise fallback to browser SpeechSynthesis
        // IMPORTANT: Do NOT use both — Avatar3D.speak() has its own audio playback
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.speak(text, onSpeakEnd).catch(() => {
                // Fallback to browser speech synthesis if Avatar3D fails
                this._fallbackSpeak(text, onSpeakEnd);
            });
        } else {
            this._fallbackSpeak(text, onSpeakEnd);
        }
    },

    _fallbackSpeak(text, onEnd) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Use cached female voice
        this._selectVoice();
        if (this.selectedVoice) utterance.voice = this.selectedVoice;

        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = () => {
            this.isSpeaking = false;
        };
        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
    },

    async advanceToNextLine() {
        try {
            const response = await API.post(`/agents/${this.agent.id}/anchoring/control`, { action: 'next' });
            this.state = response.state;
            this.updatePerformanceUI();

            // If the status changed to stopped (end of script), show thank you
            if (this.state.status === 'stopped') {
                this.showEndScreen();
            }
        } catch (e) {
            console.error('Failed to advance line:', e);
        }
    },

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        // Stop Avatar3D speech/audio too
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.stopSpeaking();
        }
        this.isSpeaking = false;
    },

    showEndScreen() {
        this.stopPolling();
        this.stopSpeaking();
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.destroy();
        }
        document.getElementById('anc-perf-styles')?.remove();

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
                    .anc-end-screen {
                        min-height: 100vh; display: flex; align-items: center; justify-content: center;
                        background: radial-gradient(circle at center, #1e1e2f 0%, #0f0f1a 100%);
                        position: relative; overflow: hidden; font-family: 'Outfit', sans-serif;
                    }
                    .anc-end-particles { position: absolute; inset: 0; overflow: hidden; }
                    .anc-end-particle {
                        position: absolute; border-radius: 50%; opacity: 0;
                        animation: float-up 4s ease-in-out infinite;
                    }
                    @keyframes float-up {
                        0% { opacity: 0; transform: translateY(100vh) scale(0); }
                        50% { opacity: 0.6; }
                        100% { opacity: 0; transform: translateY(-20vh) scale(1); }
                    }
                    .anc-end-card {
                        text-align: center; padding: 60px 50px; max-width: 520px; z-index: 1;
                        background: rgba(255,255,255,0.03); backdrop-filter: blur(20px);
                        border: 1px solid rgba(255,255,255,0.08); border-radius: 32px;
                        box-shadow: 0 8px 40px rgba(0,0,0,0.4);
                        animation: card-appear 0.8s cubic-bezier(0.2,0.8,0.2,1) forwards;
                        opacity: 0;
                    }
                    @keyframes card-appear {
                        from { opacity: 0; transform: translateY(30px) scale(0.95); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .anc-end-icon {
                        width: 80px; height: 80px; margin: 0 auto 24px;
                        background: linear-gradient(135deg, #6366f1, #a855f7);
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;
                        font-size: 36px; box-shadow: 0 4px 20px rgba(99,102,241,0.4);
                    }
                    .anc-end-title { font-size: 34px; font-weight: 700; color: #fff; margin-bottom: 8px; }
                    .anc-end-desc { font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 32px; line-height: 1.6; }
                    .anc-end-host-card {
                        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 16px; padding: 20px; margin-bottom: 28px;
                    }
                    .anc-end-host-label { color: rgba(255,255,255,0.4); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
                    .anc-end-host-name {
                        font-size: 22px; font-weight: 600;
                        background: linear-gradient(135deg, #6366f1, #ec4899);
                        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    }
                    .anc-end-bye { font-size: 16px; color: rgba(255,255,255,0.35); font-style: italic; }
                </style>
                <div class="anc-end-screen">
                    <div class="anc-end-particles">
                        ${Array.from({ length: 12 }, (_, i) => {
                const size = Math.random() * 6 + 3;
                const left = Math.random() * 100;
                const delay = Math.random() * 4;
                const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b'];
                const color = colors[i % colors.length];
                return `<div class="anc-end-particle" style="width:${size}px;height:${size}px;left:${left}%;background:${color};animation-delay:${delay}s;"></div>`;
            }).join('')}
                    </div>
                    <div class="anc-end-card">
                        <div class="anc-end-icon">🎤</div>
                        <h1 class="anc-end-title">Broadcast Complete</h1>
                        <p class="anc-end-desc">Thank you for attending! The live anchoring session has concluded.</p>
                        <div class="anc-end-host-card">
                            <div class="anc-end-host-label">Hosted by</div>
                            <div class="anc-end-host-name">${this.agent?.name || 'Event Anchor'}</div>
                        </div>
                        <p class="anc-end-bye">See you at the next event! 👋</p>
                    </div>
                </div>
            `;
        }
    },

    destroy() {
        this.stopPolling();
        this.stopSpeaking();
    }
};
