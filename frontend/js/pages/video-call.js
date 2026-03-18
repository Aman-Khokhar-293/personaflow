/**
 * PersonaFlow - Video Call Page (Premium Version)
 * Enhanced with auto-speech, premium UI, and line-by-line subtitles
 */

const VideoCallPage = {
    conversation: null,
    agent: null,
    messages: [],
    stream: null,
    callTimer: null,
    callDuration: 0,
    isMuted: false,
    isCameraOff: false,
    isSpeakerOff: false,
    isListening: false,
    isChatOpen: false,
    recognition: null,
    synthesis: window.speechSynthesis,
    subtitleLines: [],
    currentUtterance: null,
    isSpeaking: false,
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
        this.resetState();

        try {
            const data = await API.get(`/conversations/${conversationId}`);
            this.conversation = data.conversation;
            this.agent = data.agent;
            this.messages = data.messages;

            this.renderVideoCall(container);
            await this.startCamera();
            this.startCallTimer();
            this.setupSpeechRecognition();

            // Initialize 3D Avatar
            try {
                await Avatar3D.init('avatar-3d-container');
            } catch (e) {
                console.warn('3D Avatar init failed, falling back to emoji:', e);
            }

            // Auto-start listening after 2 seconds (give avatar time to load)
            setTimeout(() => {
                this.startListening();
            }, 2000);

            // Speak opening message if exists
            if (this.messages.length > 0) {
                const lastMsg = this.messages[this.messages.length - 1];
                if (lastMsg.role === 'agent') {
                    this.speakWithSubtitles(lastMsg.content);
                }
            }

        } catch (error) {
            Toast.error('Failed to start video call');
            Router.navigate('/agents');
        }
    },

    resetState() {
        this.stopCamera();
        this.stopCallTimer();
        this.stopSpeaking();

        // Stop and null out recognition to prevent onend from restarting
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
            this.recognition = null;
        }

        // Destroy 3D avatar
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.destroy();
        }

        this.conversation = null;
        this.agent = null;
        this.messages = [];
        this.callDuration = 0;
        this.isMuted = false;
        this.isCameraOff = false;
        this.isSpeakerOff = false;
        this.isSpeaking = false;
        this.isChatOpen = false;
        this.subtitleLines = [];
    },

    renderVideoCall(container) {
        // Hide sidebar for full-screen experience
        Sidebar.hide();
        document.getElementById('main-content').classList.add('full-width');
        document.getElementById('main-content').style.padding = '0';

        container.innerHTML = `
            <div class="vc-container">
                <!-- 3D Avatar - Full Screen Background -->
                <div id="avatar-3d-container" class="vc-avatar-fullscreen"></div>

                <!-- Floating Timer (Top Right) -->
                <div class="vc-float-timer" id="call-timer">
                    <span class="vc-timer-dot"></span>
                    <span class="vc-timer-text">00:00</span>
                </div>

                <!-- Status Indicator (Top Left) -->
                <div class="vc-float-status" id="vc-status">
                    <span class="vc-status-indicator listening"></span>
                    <span class="vc-status-text">Listening...</span>
                </div>

                <!-- User Camera PiP (Bottom Right) -->
                <div class="vc-user-pip-br" id="user-pip">
                    <video id="user-video" class="vc-pip-video" autoplay muted playsinline></video>
                    <div class="vc-pip-overlay" id="camera-off-overlay" style="display:none;">
                        <span>NO CAMERA</span>
                    </div>
                </div>

                <!-- Control Bar (Bottom Center) -->
                <div class="vc-control-bar">
                    <button class="vc-control-btn ${this.isMuted ? 'off' : ''}" id="mute-btn" title="Toggle Mic">
                        ${this.isMuted ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>'}
                    </button>
                    
                    <button class="vc-control-btn ${this.isSpeakerOff ? 'off' : ''}" id="speaker-btn" title="Toggle Speaker">
                        ${this.isSpeakerOff ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'}
                    </button>
                    
                    <button class="vc-control-btn end-call" id="end-btn" title="End Call">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                    </button>
                    
                    <button class="vc-control-btn" id="chat-btn" title="Open Chat">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    
                    <button class="vc-control-btn ${this.isCameraOff ? 'off' : ''}" id="camera-btn" title="Toggle Camera">
                        ${this.isCameraOff ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>'}
                    </button>
                </div>

                <!-- Subtitles Overlay -->
                <div class="vc-subtitles-float">
                    <div class="vc-subtitles" id="subtitles"></div>
                </div>

                <!-- Chat Drawer (hidden by default) -->
                <div class="vc-chat-drawer ${this.isChatOpen ? 'open' : ''}" id="chat-drawer">
                    <div class="vc-chat-header">
                        <span class="vc-chat-title">💬 Chat</span>
                        <button class="vc-chat-close" id="drawer-close">✕</button>
                    </div>
                    <div class="vc-chat-messages" id="drawer-messages">
                        ${this.renderDrawerMessages()}
                    </div>
                    <div class="vc-chat-input-area">
                        <input type="text" class="vc-chat-input" id="drawer-chat-input" placeholder="Type a message...">
                        <button class="vc-chat-send" id="drawer-chat-send">➤</button>
                    </div>
                </div>
            </div>
        `;

        this.setupListeners();
        this.injectStyles();
    },

    injectStyles() {
        if (document.getElementById('vc-premium-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'vc-premium-styles';
        styles.textContent = `
            /* ===== IMMERSIVE FULL-SCREEN VIDEO CALL ===== */
            .vc-container {
                position: fixed;
                inset: 0;
                background: #0a0a0a;
                z-index: 1000;
                font-family: 'Inter', sans-serif;
                overflow: hidden;
            }

            /* 3D Avatar - Fills Entire Screen */
            .vc-avatar-fullscreen {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }

            .vc-avatar-fullscreen canvas {
                display: block;
                width: 100% !important;
                height: 100% !important;
            }

            .avatar-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: vcSpin 0.8s linear infinite;
                margin: 0 auto;
            }

            @keyframes vcSpin {
                to { transform: rotate(360deg); }
            }

            /* Floating Timer (Top Right) */
            .vc-float-timer {
                position: absolute;
                top: 2rem;
                right: 2rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: #000;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                z-index: 50;
                min-width: 80px;
                justify-content: center;
            }

            .vc-timer-text {
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 0.9rem;
                font-weight: 600;
                letter-spacing: 0.5px;
            }

            /* Status Indicator (Top Left) */
            .vc-float-status {
                position: absolute;
                top: 2rem;
                left: 2rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(10px);
                padding: 0.5rem 1rem;
                border-radius: 8px;
                z-index: 50;
            }

            .vc-status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #22c55e;
            }

            .vc-status-indicator.listening {
                animation: vcPulse 1.5s infinite;
            }

            .vc-status-text {
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.85rem;
                font-weight: 500;
            }

            /* Control Bar (Bottom Center) */
            .vc-control-bar {
                position: absolute;
                bottom: 2.5rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 1.5rem;
                z-index: 60;
            }

            .vc-control-btn {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                border: none;
                background: #2c3038;
                color: rgba(255,255,255,0.9);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .vc-control-btn:hover {
                background: #3b404a;
                transform: translateY(-2px);
            }

            .vc-control-btn.off {
                background: #3b404a; /* Or sticky state color */
                position: relative;
            }

            .vc-control-btn.end-call {
                width: 72px;
                height: 72px;
                background: #ef4444;
                color: white;
            }

            .vc-control-btn.end-call:hover {
                background: #dc2626;
                transform: scale(1.05);
            }

            /* User PiP (Bottom Right) */
            .vc-user-pip-br {
                position: absolute;
                bottom: 2.5rem;
                right: 2.5rem;
                width: 180px;
                height: 120px;
                border-radius: 12px;
                overflow: hidden;
                border: 2px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                z-index: 55;
                background: #1a1a1a;
            }
            
            .vc-pip-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transform: scaleX(-1);
            }
            
            .vc-pip-overlay {
                position: absolute;
                inset: 0;
                background: #1a1a1a;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .vc-pip-overlay span {
                font-size: 0.8rem;
                color: #666;
                font-weight: 600;
                letter-spacing: 1px;
            }
            
            /* Animations */
            @keyframes vcPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

             @keyframes vcBubbleIn {
                from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            /* Subtitles Overlay */
            .vc-subtitles-float {
                position: absolute;
                bottom: 9rem;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 600px;
                z-index: 40;
                pointer-events: none;
            }

            .vc-subtitles {
                background: rgba(0, 0, 0, 0.72);
                backdrop-filter: blur(12px);
                border-radius: 12px;
                padding: 0.75rem 1.25rem;
                text-align: center;
                transition: opacity 0.3s ease;
            }

            .vc-subtitles:empty {
                opacity: 0;
                padding: 0;
            }

            .vc-subtitle-line {
                color: white;
                font-size: 1.05rem;
                line-height: 1.6;
                text-shadow: 0 1px 3px rgba(0,0,0,0.6);
            }

            .vc-subtitle-line.speaker {
                font-size: 0.8rem;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 2px;
            }

            .vc-subtitle-line.user-speaking {
                color: rgba(99,102,241,0.8);
            }

            @keyframes vcFadeInUp {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Chat Drawer */
            .vc-chat-drawer {
                position: fixed;
                right: 0;
                top: 0;
                bottom: 0;
                width: 360px;
                background: #111115;
                border-left: 1px solid rgba(255, 255, 255, 0.08);
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                z-index: 1001;
                box-shadow: -10px 0 40px rgba(0,0,0,0.5);
            }

            .vc-chat-drawer.open {
                transform: translateX(0);
            }

            .vc-chat-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1.25rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: #111115;
            }

            .vc-chat-title {
                color: white;
                font-weight: 600;
            }

            .vc-chat-close {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.2s;
            }

            .vc-chat-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .vc-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .vc-chat-msg {
                max-width: 85%;
                padding: 0.75rem 1rem;
                border-radius: 16px;
                font-size: 0.9375rem;
                line-height: 1.4;
            }

            .vc-chat-msg.agent {
                background: rgba(99, 102, 241, 0.2);
                color: white;
                align-self: flex-start;
                border-bottom-left-radius: 4px;
            }

            .vc-chat-msg.user {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
            }

            .vc-chat-input-area {
                display: flex;
                gap: 0.5rem;
                padding: 1rem;
                background: #111115;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }

            .vc-chat-input {
                flex: 1;
                padding: 0.75rem 1rem;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: white;
                font-size: 0.9375rem;
            }

            .vc-chat-input::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }

            .vc-chat-input:focus {
                outline: none;
                border-color: rgba(99, 102, 241, 0.5);
            }

            .vc-chat-send {
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none;
                border-radius: 12px;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
                transition: transform 0.2s;
            }

            .vc-chat-send:hover {
                transform: scale(1.05);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .vc-user-pip {
                    width: 100px;
                    height: 75px;
                    bottom: 5rem;
                }



                .vc-chat-drawer {
                    width: 100%;
                }

                .vc-bottom-bar {
                    padding: 0.5rem;
                }
            }
        `;

        document.head.appendChild(styles);
    },

    renderDrawerMessages() {
        return this.messages.map(msg => `
            <div class="vc-chat-msg ${msg.role === 'user' ? 'user' : 'agent'}">
                ${msg.content}
            </div>
        `).join('');
    },

    setupListeners() {
        document.getElementById('mute-btn')?.addEventListener('click', () => this.toggleMute());
        document.getElementById('camera-btn')?.addEventListener('click', () => this.toggleCamera());
        document.getElementById('speaker-btn')?.addEventListener('click', () => this.toggleSpeaker());
        document.getElementById('end-btn')?.addEventListener('click', () => this.endCall());
        document.getElementById('chat-btn')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('drawer-close')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());

        document.getElementById('drawer-chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        document.getElementById('drawer-chat-send')?.addEventListener('click', () => this.sendMessage());
    },

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            Toast.info('Uploading image...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Send image as a message
                const imageUrl = data.url;
                await this.sendMessageWithImage(imageUrl);
                Toast.success('Image sent!');
                // Open chat drawer if not open to see it
                if (!this.isChatOpen) {
                    this.toggleChat();
                }
            } else {
                Toast.error('Upload failed', data.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            Toast.error('Upload failed', 'Network error');
        }

        // Reset input
        event.target.value = '';
    },

    async sendMessageWithImage(imageUrl) {
        // Construct markdown image string
        const messageContent = `![Image](${imageUrl})`;

        // Add to local messages immediately
        this.messages.push({
            role: 'user',
            content: messageContent,
            timestamp: new Date().toISOString()
        });

        this.updateDrawerMessages();

        try {
            // Send to backend
            await API.post(`/conversations/${this.conversation.id}/messages`, {
                content: messageContent
            });
            // (We could handle the agent response here, but the main loop handles updates usually, 
            // or we just trust it sends. For video call, we usually expect spoken response or chat response.
            // Let's just fetch latest to be sure or wait for next poll if there is one. 
            // The existing sendMessage implementation does a refresh.)
        } catch (e) {
            console.error(e);
        }
    },

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: {
                    // ── ECHO CANCELLATION ──
                    // These three flags are the key to real interrupt handling.
                    // The browser's AEC (Acoustic Echo Canceller) strips the agent's
                    // speaker audio from the mic stream, so the speech recognizer only
                    // hears the USER's voice — even while the agent is talking.
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const video = document.getElementById('user-video');
            if (video) {
                video.srcObject = this.stream;
            }
        } catch (error) {
            console.error('Camera access error:', error);
            Toast.warning('Camera access denied', 'Video will not be available');
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    startCallTimer() {
        this.callTimer = setInterval(() => {
            this.callDuration++;
            const mins = Math.floor(this.callDuration / 60).toString().padStart(2, '0');
            const secs = (this.callDuration % 60).toString().padStart(2, '0');
            const timer = document.querySelector('.vc-timer-text');
            if (timer) {
                timer.textContent = `${mins}:${secs}`;
            }
        }, 1000);
    },

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    },

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Web Speech API not supported in this browser');
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        let finalTranscript = '';

        this.recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interim += transcript;
                }
            }

            // Show live interim subtitle while user is talking
            if (interim) {
                this.updateStatus('You\'re speaking...', true);
                this.showSubtitle('You', interim + '...', true);
            }

            if (finalTranscript.trim().length > 0) {
                const text = finalTranscript.trim();
                finalTranscript = '';

                // Noise / AEC residual guard: drop very short blips
                const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
                if (wordCount < 2 && text.length < 4) return;

                // ── REAL INTERRUPT: user spoke while agent was talking ──
                // AEC already cleaned the mic, so this is definitely the user.
                // Stop the agent immediately and process the user's message.
                if (this.isSpeaking) {
                    this.stopSpeaking();   // cut agent mid-sentence
                    this.updateStatus('Interrupted — processing...', false);
                } else {
                    this.updateStatus('Processing...', false);
                }

                this.showSubtitle('You', text, true);
                this.sendVoiceMessage(text);
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                Toast.error('Microphone blocked', 'Please allow microphone access in your browser and reload');
                this.isListening = false;
            } else if (event.error === 'audio-capture') {
                Toast.warning('Mic in use', 'Another app may be using the microphone. Try reloading.');
            }
        };

        this.recognition.onend = () => {
            // Always restart while call is active and not muted
            if (this.isListening && !this.isMuted) {
                try {
                    finalTranscript = '';
                    this.recognition.start();
                } catch (e) { /* already started */ }
            }
        };
    },

    async startListening() {
        if (this.isMuted) return;

        try {
            if (!this.stream) {
                // No camera stream — request audio-only with echo cancellation
                this.stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false
                });
            }

            this.isListening = true;
            this.updateStatus('Listening...', true);

            if (this.recognition) {
                try { this.recognition.start(); } catch (e) { /* already started */ }
            }
        } catch (e) {
            console.error('Microphone access error:', e);
            Toast.warning('Microphone access denied', 'Voice input will not be available');
        }
    },

    stopListening() {
        this.isListening = false;
        document.getElementById('listening-indicator')?.classList.remove('active');

        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
        }
    },

    updateStatus(text, isListening) {
        const status = document.getElementById('vc-status');
        if (status) {
            status.querySelector('.vc-status-text').textContent = text;
            status.querySelector('.vc-status-indicator').classList.toggle('listening', isListening);
        }
    },

    async sendVoiceMessage(content) {
        this.clearSubtitle();
        this.updateStatus('Processing...', false);

        // Add user message
        this.messages.push({
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        });
        this.updateDrawerMessages();

        try {
            const response = await API.post(`/conversations/${this.conversation.id}/messages`, {
                content: content
            });

            // Add agent response
            this.messages.push(response.agent_message);
            this.updateDrawerMessages();

            // Speak response with line-by-line subtitles
            if (!this.isSpeakerOff) {
                this.speakWithSubtitles(response.agent_message.content);
            } else {
                this.updateStatus('Listening...', true);
            }

        } catch (error) {
            Toast.error('Failed to send message');
            this.updateStatus('Listening...', true);
        }
    },

    async sendMessage() {
        const input = document.getElementById('drawer-chat-input');
        const content = input?.value.trim();

        if (!content) return;
        input.value = '';

        // Add user message
        this.messages.push({
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        });
        this.updateDrawerMessages();

        try {
            const response = await API.post(`/conversations/${this.conversation.id}/messages`, {
                content: content
            });

            this.messages.push(response.agent_message);
            this.updateDrawerMessages();

            if (!this.isSpeakerOff) {
                this.speakWithSubtitles(response.agent_message.content);
            }

        } catch (error) {
            Toast.error('Failed to send message');
        }
    },

    updateDrawerMessages() {
        const container = document.getElementById('drawer-messages');
        if (container) {
            container.innerHTML = this.renderDrawerMessages();
            container.scrollTop = container.scrollHeight;
        }
    },

    speakWithSubtitles(text) {
        this.stopSpeaking();
        this.isSpeaking = true;
        this.updateStatus(`${this.agent.name} speaking...`, false);

        // Mic stays ON — AEC (echoCancellation:true) filters out the speaker audio.
        // If user speaks during TTS, onresult will fire and interrupt the agent.

        document.getElementById('ai-waveform')?.classList.add('active');
        if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);

        const onSpeakEnd = () => {
            this.isSpeaking = false;
            document.getElementById('ai-waveform')?.classList.remove('active');
            if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);
            this.clearSubtitle();
            this.updateStatus('Listening...', true);
        };

        if (Avatar3D.isInitialized) {
            Avatar3D.speak(text, onSpeakEnd)
                .then((success) => {
                    if (success === false) {
                        this.showSubtitle(this.agent.name, text, false);
                        this._fallbackSpeak(text, onSpeakEnd);
                    } else {
                        this._startWordByWordSubtitles(text);
                    }
                })
                .catch(() => {
                    this.showSubtitle(this.agent.name, text, false);
                    this._fallbackSpeak(text, onSpeakEnd);
                });
        } else {
            this.showSubtitle(this.agent.name, text, false);
            this._fallbackSpeak(text, onSpeakEnd);
        }
    },


    /**
     * Display words one-by-one synced with Avatar3D audio playback (blink-style)
     * Shows only the CURRENT word being spoken, replacing it with the next
     */
    _startWordByWordSubtitles(text) {
        const subtitles = document.getElementById('subtitles');
        if (!subtitles || !Avatar3D.currentAudio) return;

        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return;

        const audio = Avatar3D.currentAudio;
        const startSync = () => {
            const duration = audio.duration;
            if (!duration || !isFinite(duration)) {
                this._subtitleAnimFrame = requestAnimationFrame(startSync);
                return;
            }

            // Calculate per-word timing with punctuation-aware pauses
            const speechStart = 0.08;
            const speechEnd = duration - 0.15;
            const speechDuration = Math.max(speechEnd - speechStart, 0.5);

            // Each word gets a weight: base = char count, + extra for trailing punctuation pauses
            const wordWeights = words.map(w => {
                let weight = w.replace(/[.,!?;:…]+$/, '').length || 1;
                // Add pause weight for punctuation
                if (/[.!?]$/.test(w)) weight += 4;       // sentence end
                else if (/[,;:]$/.test(w)) weight += 2;  // clause break
                return weight;
            });
            const totalWeight = wordWeights.reduce((s, w) => s + w, 0);

            const wordTimings = [];
            let t = speechStart;
            for (let i = 0; i < words.length; i++) {
                const wordDur = (wordWeights[i] / totalWeight) * speechDuration;
                wordTimings.push({ word: words[i], start: t, end: t + wordDur });
                t += wordDur;
            }

            let lastShownIdx = -1;

            // Animation loop: show ONLY the current word
            const updateSubtitles = () => {
                if (!this.isSpeaking || !Avatar3D.currentAudio) return;

                const timeOffset = 0.25;
                const currentTime = Avatar3D.currentAudio.currentTime + timeOffset;

                // Find which word is active right now
                let activeIdx = -1;
                for (let i = wordTimings.length - 1; i >= 0; i--) {
                    if (currentTime >= wordTimings[i].start) {
                        activeIdx = i;
                        break;
                    }
                }

                // Only update DOM when the word changes
                if (activeIdx !== lastShownIdx && activeIdx >= 0) {
                    lastShownIdx = activeIdx;
                    const w = wordTimings[activeIdx].word;
                    subtitles.innerHTML = `<div class="vc-subtitle-line" style="font-size:1.4em;font-weight:600;text-align:center;animation:subtitlePop 0.15s ease-out">${w}</div>`;
                    subtitles.style.opacity = '1';
                }

                this._subtitleAnimFrame = requestAnimationFrame(updateSubtitles);
            };

            // Inject the pop animation if not present
            if (!document.getElementById('subtitle-pop-style')) {
                const style = document.createElement('style');
                style.id = 'subtitle-pop-style';
                style.textContent = `@keyframes subtitlePop { 0% { transform: scale(0.85); opacity: 0.4; } 100% { transform: scale(1); opacity: 1; } }`;
                document.head.appendChild(style);
            }

            this._subtitleAnimFrame = requestAnimationFrame(updateSubtitles);
        };

        this._subtitleAnimFrame = requestAnimationFrame(startSync);
    },

    _fallbackSpeak(text, onEnd) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Use cached female voice
        this._selectVoice();
        if (this.selectedVoice) utterance.voice = this.selectedVoice;

        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = () => {
            this.isSpeaking = false;
            document.getElementById('ai-waveform')?.classList.remove('active');
        };
        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
    },

    stopSpeaking(resumeMic = false) {
        this.isSpeaking = false;
        this.synthesis.cancel();

        // Stop 3D avatar speech
        if (Avatar3D.isInitialized) {
            Avatar3D.stopSpeaking();
        }

        document.getElementById('ai-waveform')?.classList.remove('active');

        // Clear any scheduled subtitle updates
        if (this._subtitleAnimFrame) {
            cancelAnimationFrame(this._subtitleAnimFrame);
            this._subtitleAnimFrame = null;
        }
        if (this.subtitleTimeouts) {
            this.subtitleTimeouts.forEach(t => clearTimeout(t));
            this.subtitleTimeouts = [];
        }

        // Re-enable the mic after a short echo-decay delay if requested
        // (400 ms is enough when audio cut early; the full 800 ms is used for natural TTS end)
        if (resumeMic) {
            setTimeout(() => this._resumeListeningAfterSpeech(), 400);
        }
    },

    showSubtitle(speaker, text, isUser) {
        const subtitles = document.getElementById('subtitles');
        if (subtitles) {
            subtitles.innerHTML = `
                <div class="vc-subtitle-line">${text}</div>
            `;
        }
    },

    clearSubtitle() {
        const subtitles = document.getElementById('subtitles');
        if (subtitles) {
            subtitles.innerHTML = '';
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('mute-btn');
        if (btn) {
            btn.innerHTML = this.isMuted ?
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' :
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
            btn.classList.toggle('off', this.isMuted);
            btn.title = this.isMuted ? 'Unmute' : 'Mute';
        }

        if (this.stream) {
            this.stream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        if (this.isMuted) {
            this.stopListening();
            this.updateStatus('Muted', false);
        } else {
            this.startListening();
        }
    },

    toggleCamera() {
        this.isCameraOff = !this.isCameraOff;
        const btn = document.getElementById('camera-btn');
        if (btn) {
            btn.innerHTML = this.isCameraOff ?
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' :
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
            btn.classList.toggle('off', this.isCameraOff);
            btn.title = this.isCameraOff ? 'Start Video' : 'Stop Video';
        }

        const overlay = document.getElementById('camera-off-overlay');
        if (overlay) overlay.style.display = this.isCameraOff ? 'flex' : 'none';

        if (this.stream) {
            this.stream.getVideoTracks().forEach(track => {
                track.enabled = !this.isCameraOff;
            });
        }
    },

    toggleSpeaker() {
        this.isSpeakerOff = !this.isSpeakerOff;
        const btn = document.getElementById('speaker-btn');
        if (btn) {
            btn.innerHTML = this.isSpeakerOff ?
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>' :
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            btn.classList.toggle('off', this.isSpeakerOff);
            btn.title = this.isSpeakerOff ? 'Unmute Speaker' : 'Mute Speaker';
        }

        if (this.isSpeakerOff) {
            this.stopSpeaking();
        }
    },

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        document.getElementById('chat-drawer')?.classList.toggle('open', this.isChatOpen);
        document.getElementById('chat-btn')?.classList.toggle('active', this.isChatOpen);
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    },

    // Interrupt AI speaking when user starts talking
    interruptSpeaking() {
        if (this.isSpeaking) {
            console.log('User interrupted - stopping AI speech');
            this.stopSpeaking();
            this.clearSubtitle();
            this.updateStatus('Interrupted - Listening...', true);
            Toast.info('AI interrupted', 'Continue speaking...');
        }
    },

    async endCall() {
        // Calculate duration before stopping timer
        const mins = Math.floor(this.callDuration / 60);
        const secs = this.callDuration % 60;
        const timeStr = mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;

        // Stop everything immediately
        this.stopCamera();
        this.stopCallTimer();
        this.stopSpeaking();

        // Stop recognition and clean up audio
        this.isListening = false;
        this.isSpeaking = false;
        this.stopListening();
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(t => t.stop());
            this.audioStream = null;
        }

        // Destroy 3D avatar
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.destroy();
        }

        // Fire and forget API call to avoid delay
        if (this.conversation && this.conversation.id) {
            API.post(`/conversations/${this.conversation.id}/end`).catch(e => console.error('Error ending call on server:', e));
        }

        // Remove injected styles
        document.getElementById('vc-premium-styles')?.remove();

        // Show greeting/thank you card
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.padding = '0';
            mainContent.innerHTML = `
                <div style="
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                    position: relative;
                    overflow: hidden;
                ">
                    <!-- Animated background particles -->
                    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
                        <div style="position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.15),transparent);top:-50px;right:-50px;animation:float 6s infinite ease-in-out;"></div>
                        <div style="position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(236,72,153,0.1),transparent);bottom:-30px;left:-30px;animation:float 8s infinite ease-in-out reverse;"></div>
                    </div>

                    <div style="
                        text-align: center;
                        padding: 60px 40px;
                        max-width: 500px;
                        position: relative;
                        z-index: 1;
                    ">
                        <!-- Success Checkmark Animation -->
                        <div style="
                            width: 100px; height: 100px;
                            border-radius: 50%;
                            background: linear-gradient(135deg, #22c55e, #16a34a);
                            display: flex; align-items: center; justify-content: center;
                            margin: 0 auto 30px;
                            box-shadow: 0 0 40px rgba(34,197,94,0.3);
                            animation: scaleIn 0.5s ease-out;
                        ">
                            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>

                        <!-- Agent Info -->
                        <div style="
                            font-size: 48px;
                            margin-bottom: 10px;
                        ">${this.agent?.icon || '🤖'}</div>

                        <h1 style="
                            font-size: 32px;
                            font-weight: 700;
                            color: #ffffff;
                            margin-bottom: 8px;
                            letter-spacing: -0.5px;
                        ">Thank You!</h1>

                        <p style="
                            font-size: 16px;
                            color: rgba(255,255,255,0.6);
                            margin-bottom: 30px;
                        ">Your call with <strong style="color:rgba(255,255,255,0.9);">${this.agent?.name || 'Agent'}</strong> has ended</p>

                        <!-- Meeting Duration Card -->
                        <div style="
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 16px;
                            padding: 24px;
                            margin-bottom: 40px;
                            backdrop-filter: blur(10px);
                        ">
                            <div style="color:rgba(255,255,255,0.5);font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Meeting Duration</div>
                            <div style="font-size:36px;font-weight:700;color:#6366f1;letter-spacing:1px;">${timeStr}</div>
                        </div>

                        <!-- See You Again -->
                        <p style="
                            font-size: 18px;
                            color: rgba(255,255,255,0.4);
                            margin-bottom: 40px;
                            font-style: italic;
                        ">See you again! 👋</p>


                    </div>
                </div>

                <style>
                    @keyframes scaleIn {
                        from { transform: scale(0); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-20px); }
                    }
                </style>
            `;
        }
    }
};
