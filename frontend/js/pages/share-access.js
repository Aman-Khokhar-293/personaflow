/**
 * PersonaFlow - Share Access Pages
 * Public pages for accessing shared agents
 */

const ShareAccessPage = {
    token: null,
    agentInfo: null,
    conversationId: null,

    async render(container, token) {
        this.token = token;
        this.agentInfo = null;
        this.conversationId = null;

        // Hide sidebar for public access
        Sidebar.hide();
        document.getElementById('main-content').classList.add('full-width');

        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="empty-state" style="padding: 2rem;">
                        <div class="spinner"></div>
                        <p style="margin-top: 1rem; color: var(--gray-500);">Loading...</p>
                    </div>
                </div>
            </div>
        `;

        try {
            this.agentInfo = await API.get(`/share/${token}`);

            if (this.agentInfo.has_password) {
                this.renderPasswordForm(container);
            } else {
                this.renderParticipantForm(container);
            }
        } catch (error) {
            this.renderError(container, error.message);
        }
    },

    renderError(container, message) {
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card text-center">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">😔</div>
                    <h2 style="color: var(--gray-900); margin-bottom: 0.5rem;">Link Unavailable</h2>
                    <p style="color: var(--gray-500);">${message}</p>
                </div>
            </div>
        `;
    },

    renderPasswordForm(container) {
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="text-center mb-4">
                        <div class="agent-icon" style="width: 80px; height: 80px; background: ${this.agentInfo.agent_color}; font-size: 2.5rem; margin: 0 auto 1rem;">${this.agentInfo.agent_icon}</div>
                        <h2 style="color: var(--gray-900); margin-bottom: 0.25rem;">${this.agentInfo.agent_name}</h2>
                        <p style="color: var(--gray-500);">${this.agentInfo.agent_role}</p>
                    </div>
                    
                    <div class="card" style="background: var(--warning-light); border: 1px solid #fcd34d; margin-bottom: 1.5rem;">
                        <div class="flex items-center gap-2">
                            <span>🔒</span>
                            <span style="color: #92400e;">This link is password protected</span>
                        </div>
                    </div>
                    
                    <form id="password-form">
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" id="share-password" class="form-input" placeholder="Enter password" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-lg w-full">
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('password-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('share-password').value;

            try {
                await API.post(`/share/${this.token}/verify`, { password });
                this.renderParticipantForm(container);
            } catch (error) {
                Toast.error('Incorrect password');
            }
        });
    },

    renderParticipantForm(container) {
        const showName = this.agentInfo.require_name;
        const showEmail = this.agentInfo.require_email;

        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="text-center mb-4">
                        <div class="agent-icon" style="width: 80px; height: 80px; background: ${this.agentInfo.agent_color}; font-size: 2.5rem; margin: 0 auto 1rem;">${this.agentInfo.agent_icon}</div>
                        <h2 style="color: var(--gray-900); margin-bottom: 0.25rem;">${this.agentInfo.agent_name}</h2>
                        <p style="color: var(--gray-500);">${this.agentInfo.agent_role}</p>
                    </div>
                    
                    <form id="participant-form">
                        ${showName ? `
                            <div class="form-group">
                                <label class="form-label">Your Name ${showName ? '*' : ''}</label>
                                <input type="text" id="participant-name" class="form-input" placeholder="Enter your name" ${showName ? 'required' : ''}>
                            </div>
                        ` : ''}
                        
                        ${showEmail ? `
                            <div class="form-group">
                                <label class="form-label">Your Email ${showEmail ? '*' : ''}</label>
                                <input type="email" id="participant-email" class="form-input" placeholder="Enter your email" ${showEmail ? 'required' : ''}>
                            </div>
                        ` : ''}
                        
                        ${!showName && !showEmail ? `
                            <p style="color: var(--gray-500); text-align: center; margin-bottom: 1.5rem;">
                                Choose how you'd like to interact with ${this.agentInfo.agent_name}
                            </p>
                        ` : ''}
                        
                        <button type="button" class="btn btn-primary btn-lg w-full" onclick="ShareAccessPage.startConversation('video')">
                            📹 Start Video Call
                        </button>
                    </form>
                </div>
            </div>
        `;
    },

    async startConversation(mode) {
        const name = document.getElementById('participant-name')?.value || '';
        const email = document.getElementById('participant-email')?.value || '';

        // Validate if required
        if (this.agentInfo.require_name && !name) {
            Toast.error('Please enter your name');
            return;
        }
        if (this.agentInfo.require_email && !email) {
            Toast.error('Please enter your email');
            return;
        }

        try {
            const data = await API.post(`/share/${this.token}/start`, {
                name: name || 'Anonymous',
                email: email || null,
                mode: mode
            });

            this.conversationId = data.conversation_id;

            // Navigate to chat or video call
            if (mode === 'text') {
                ShareChatPage.render(document.getElementById('main-content'), data, this.token);
            } else {
                ShareVideoPage.render(document.getElementById('main-content'), data, this.token);
            }

        } catch (error) {
            Toast.error('Failed to start conversation', error.message);
        }
    }
};

/**
 * Share Chat Page (simplified chat for public access)
 */
const ShareChatPage = {
    data: null,
    messages: [],
    isTyping: false,
    isRecording: false,
    mediaRecorder: null,
    audioStream: null,
    sttChunks: [],

    render(container, data, token) {
        this.data = data;
        this.messages = data.opening_message ? [{
            role: 'agent',
            content: data.opening_message,
            timestamp: new Date().toISOString()
        }] : [];

        container.innerHTML = `
            <div class="chat-container" style="max-width: 800px; margin: 0 auto; height: 100vh;">
                <div class="chat-header">
                    <div class="chat-agent-icon" style="background: ${data.agent.color};">${data.agent.icon}</div>
                    <div class="chat-agent-info">
                        <div class="chat-agent-name">${data.agent.name}</div>
                        <div class="chat-agent-status">● Online</div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="ShareChatPage.endChat()">
                        End Chat
                    </button>
                </div>
                
                <div class="chat-messages" id="chat-messages">
                    ${this.renderMessages()}
                </div>
                
                <div class="chat-input-container">
                    <button class="chat-btn chat-mic-btn" id="mic-btn" title="Voice input">
                        🎤
                    </button>
                    <input type="text" class="chat-input" id="chat-input" placeholder="Type your message..." autocomplete="off">
                    <button class="chat-btn chat-send-btn" id="send-btn" title="Send message">
                        ➤
                    </button>
                </div>
            </div>
        `;

        this.setupListeners();
        this.setupSpeechRecognition();
    },

    renderMessages() {
        return this.messages.map(msg => `
            <div class="message ${msg.role === 'user' ? 'user' : 'agent'}">
                ${msg.role === 'agent' ? `
                    <div class="message-avatar" style="background: ${this.data.agent.color}; font-size: 1.25rem;">${this.data.agent.icon}</div>
                ` : ''}
                <div>
                    <div class="message-bubble">${msg.content}</div>
                </div>
            </div>
        `).join('');
    },

    setupListeners() {
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('send-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('mic-btn')?.addEventListener('click', () => this.toggleRecording());
    },

    setupSpeechRecognition() {
        // Use Browser's native Web Speech API — no backend/ffmpeg needed
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Web Speech API not supported in this browser');
            return;
        }
        this._shareRecognition = new SpeechRecognition();
        this._shareRecognition.continuous = false;
        this._shareRecognition.interimResults = true;
        this._shareRecognition.lang = 'en-US';

        this._shareRecognition.onresult = (event) => {
            let finalText = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalText += event.results[i][0].transcript;
                }
            }
            if (finalText.trim()) {
                document.getElementById('chat-input').value = finalText.trim();
                this.sendMessage();
            }
        };

        this._shareRecognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            console.warn('Speech recognition error:', event.error);
        };

        this._shareRecognition.onend = () => {
            this.isRecording = false;
            document.getElementById('mic-btn')?.classList.remove('recording');
        };
    },

    async toggleRecording() {
        if (this.isRecording) {
            if (this._shareRecognition) {
                try { this._shareRecognition.stop(); } catch (e) { }
            }
            this.isRecording = false;
            document.getElementById('mic-btn')?.classList.remove('recording');
            return;
        }

        try {
            // Request mic permission
            if (!this.audioStream) {
                this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            if (this._shareRecognition) {
                this._shareRecognition.start();
                this.isRecording = true;
                document.getElementById('mic-btn')?.classList.add('recording');
            }
        } catch (e) {
            console.error('Microphone access error:', e);
            Toast.error('Microphone access denied');
        }
    },

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input?.value.trim();
        if (!content || this.isTyping) return;

        input.value = '';

        this.messages.push({
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        });
        this.updateMessages();
        this.showTypingIndicator();

        try {
            const response = await API.post(`/conversations/${this.data.conversation_id}/messages`, {
                content: content
            });

            this.messages.push(response.agent_message);
            this.hideTypingIndicator();
            this.updateMessages();
        } catch (error) {
            this.hideTypingIndicator();
            Toast.error('Failed to send message');
        }
    },

    updateMessages() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = this.renderMessages();
            container.scrollTop = container.scrollHeight;
        }
    },

    showTypingIndicator() {
        this.isTyping = true;
        const container = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'message agent';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-avatar" style="background: ${this.data.agent.color}; font-size: 1.25rem;">${this.data.agent.icon}</div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        container?.appendChild(indicator);
    },

    hideTypingIndicator() {
        this.isTyping = false;
        document.getElementById('typing-indicator')?.remove();
    },

    async endChat() {
        Modal.confirm('End Chat', 'Are you sure you want to end this conversation?', async () => {
            try {
                await API.post(`/conversations/${this.data.conversation_id}/end`);
                Toast.success('Chat ended. Thank you!');
                location.reload();
            } catch (error) {
                Toast.error('Failed to end chat');
            }
        });
    }
};

/**
 * Share Video Page (Premium - Public access video call)
 * Matches the main VideoCallPage design
 */
const ShareVideoPage = {
    data: null,
    messages: [],
    stream: null,
    synthesis: window.speechSynthesis,
    mediaRecorder: null,
    audioStream: null,
    sttChunks: [],
    sttInterval: null,
    isTranscribing: false,
    isListening: false,
    isMuted: false,
    isCameraOff: false,
    isSpeakerOff: false,
    isSpeaking: false,
    isChatOpen: false,
    selectedVoice: null,
    _voiceRequestId: 0,
    _pendingSpeechTimer: null,
    _pendingSpeechText: '',

    _selectVoice() {
        if (this.selectedVoice) return;
        const voices = this.synthesis.getVoices();
        this.selectedVoice = voices.find(v => /female|zira|samantha|karen|fiona|moira|tessa|victoria/i.test(v.name) && /en/i.test(v.lang))
            || voices.find(v => /female|zira|samantha|karen|fiona|moira|tessa|victoria/i.test(v.name))
            || voices.find(v => /en/i.test(v.lang) && !/male/i.test(v.name))
            || null;
    },
    callTimer: null,
    callDuration: 0,
    subtitleLines: [],

    resetState() {
        this.stopCamera();
        if (this.callTimer) clearInterval(this.callTimer);
        this.callTimer = null;
        this.isSpeaking = false;
        if (this.synthesis) this.synthesis.cancel();

        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
            this.recognition = null;
        }

        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.stopSpeaking();
            Avatar3D.destroy();
        }

        this.data = null;
        this.messages = [];
        this.callDuration = 0;
        this.isMuted = false;
        this.isCameraOff = false;
        this.isSpeakerOff = false;
        this.isSpeaking = false;
        this.isChatOpen = false;
        this.subtitleLines = [];
        this._voiceRequestId = 0;
        this._pendingSpeechTimer = null;
        this._pendingSpeechText = '';
    },

    async render(container, data, token) {
        this.resetState();
        this.data = data;
        this.messages = data.opening_message ? [{
            role: 'agent',
            content: data.opening_message,
            timestamp: new Date().toISOString()
        }] : [];

        this.injectStyles();

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

                <!-- Chat Bubble (Top Left - moved down slightly) -->
                <div class="vc-chat-bubble" id="chat-bubble" style="display:none;">
                    <div class="vc-chat-bubble-text" id="chat-bubble-text"></div>
                    <div class="vc-chat-bubble-meta" id="chat-bubble-meta"></div>
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

        this.startCamera();
        this.setupSpeechRecognition();
        this.setupListeners();
        this.startCallTimer();

        // Initialize 3D Avatar
        try {
            if (typeof Avatar3D !== 'undefined') {
                await Avatar3D.init('avatar-3d-container');
            }
        } catch (e) {
            console.warn('3D Avatar init failed:', e);
        }

        // Auto-start listening
        setTimeout(() => this.startListening(), 2000);

        if (data.opening_message) {
            setTimeout(() => this.speakWithSubtitles(data.opening_message), 2500);
        }
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
            
            /* Chat Bubble (Top Left - Under Status) */
            .vc-chat-bubble {
                position: absolute;
                top: 5rem; /* Below status */
                left: 2rem;
                max-width: 320px;
                background: rgba(20, 20, 25, 0.9);
                backdrop-filter: blur(10px);
                color: white;
                padding: 1rem;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                z-index: 50;
                border: 1px solid rgba(255,255,255,0.05);
                animation: vcBubbleIn 0.3s ease;
            }
            
            .vc-chat-bubble-text {
                font-size: 0.95rem;
                line-height: 1.5;
            }
            
            .vc-chat-bubble-meta {
                margin-top: 0.5rem;
                font-size: 0.75rem;
                color: rgba(255,255,255,0.4);
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
                width: 80%;
                max-width: 700px;
                z-index: 40;
                pointer-events: none;
            }

            .vc-subtitles {
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(8px);
                border-radius: 12px;
                padding: 0.6rem 1rem;
                text-align: center;
                transition: all 0.3s ease;
                display: none;
            }

            .vc-subtitles:not(:empty) {
                display: block;
            }

            .vc-subtitles:empty {
                display: none;
            }

            .vc-subtitle-line {
                color: white;
                font-size: 1.1rem;
                line-height: 1.5;
                animation: vcFadeInUp 0.3s ease;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
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

                .vc-chat-bubble {
                    max-width: 200px;
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

    startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: {
                    // AEC strips agent's speaker audio from mic — enables true interrupt
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })
                .then(stream => {
                    this.stream = stream;
                    const video = document.getElementById('user-video');
                    if (video) {
                        video.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error('Error accessing media devices:', err);
                    this.isCameraOff = true;
                    this.updateControls();
                });
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    toggleCamera() {
        this.isCameraOff = !this.isCameraOff;
        if (this.stream) {
            this.stream.getVideoTracks().forEach(track => {
                track.enabled = !this.isCameraOff;
            });
        }

        const overlay = document.getElementById('camera-off-overlay');
        if (overlay) {
            overlay.style.display = this.isCameraOff ? 'flex' : 'none';
        }

        this.updateControls();
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

    stopListening() {
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
        }
    },

    toggleSpeaker() {
        this.isSpeakerOff = !this.isSpeakerOff;
        if (this.isSpeakerOff) {
            if (this.synthesis) this.synthesis.cancel();
            if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
                Avatar3D.stopSpeaking();
            }
            this.isSpeaking = false;
            if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);
            const sub = document.getElementById('subtitles');
            if (sub) sub.innerHTML = '';
            this.updateStatus('Listening...', true);
        }
        this.updateControls();
    },

    updateControls() {
        const muteBtn = document.getElementById('mute-btn');
        const cameraBtn = document.getElementById('camera-btn');
        const speakerBtn = document.getElementById('speaker-btn');

        if (muteBtn) {
            muteBtn.className = `vc-control-btn ${this.isMuted ? 'off' : ''}`;
            muteBtn.innerHTML = this.isMuted ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
        }

        if (cameraBtn) {
            cameraBtn.className = `vc-control-btn ${this.isCameraOff ? 'off' : ''}`;
            cameraBtn.innerHTML = this.isCameraOff ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
        }

        if (speakerBtn) {
            speakerBtn.className = `vc-control-btn ${this.isSpeakerOff ? 'off' : ''}`;
            speakerBtn.innerHTML = this.isSpeakerOff ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
        }
    },

    async endCall() {
        // Calculate duration
        const mins = Math.floor(this.callDuration / 60);
        const secs = this.callDuration % 60;
        const timeStr = mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;

        // Stop everything
        this.stopCamera();
        if (this.callTimer) clearInterval(this.callTimer);
        this.callTimer = null;

        // Stop speech synthesis
        this.isSpeaking = false;
        if (this.synthesis) this.synthesis.cancel();

        // Stop and null out recognition to prevent onend from restarting
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
            this.recognition = null;
        }

        // Stop Avatar3D speech/audio
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.stopSpeaking();
            Avatar3D.destroy();
        }

        // End conversation on server
        if (this.data && this.data.conversation_id) {
            API.post(`/conversations/${this.data.conversation_id}/end`).catch(e => console.error(e));
        }

        // Remove injected styles
        document.getElementById('vc-premium-styles')?.remove();

        const agentName = this.data?.agent?.name || 'Agent';
        const agentIcon = this.data?.agent?.icon || '🤖';

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

                        <div style="font-size: 48px; margin-bottom: 10px;">${agentIcon}</div>

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
                        ">Your call with <strong style="color:rgba(255,255,255,0.9);">${agentName}</strong> has ended</p>

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

                        <p style="
                            font-size: 18px;
                            color: rgba(255,255,255,0.4);
                            margin-bottom: 40px;
                            font-style: italic;
                        ">See you again! 👋</p>

                        <button onclick="window.close(); setTimeout(() => location.reload(), 500);" style="
                            padding: 14px 48px;
                            background: linear-gradient(135deg, #6366f1, #8b5cf6);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 20px rgba(99,102,241,0.4);
                        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 30px rgba(99,102,241,0.5)';"
                           onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(99,102,241,0.4)';">
                            Close
                        </button>
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
    },

    startCallTimer() {
        this.callDuration = 0;
        if (this.callTimer) clearInterval(this.callTimer);
        this.callTimer = setInterval(() => {
            this.callDuration++;
            const mins = Math.floor(this.callDuration / 60).toString().padStart(2, '0');
            const secs = (this.callDuration % 60).toString().padStart(2, '0');
            const timer = document.getElementById('call-timer');
            if (timer) {
                timer.querySelector('.vc-timer-text').textContent = `${mins}:${secs}`;
            }
        }, 1000);
    },

    setupSpeechRecognition() {
        // Use Browser's native Web Speech API — no backend/ffmpeg needed
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

                // AEC residual guard: drop very short blips
                const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
                if (wordCount < 2 && text.length < 4) return;

                // ── REAL INTERRUPT: user spoke while agent was talking ──
                if (this.isSpeaking) {
                    this.synthesis.cancel();
                    if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) Avatar3D.stopSpeaking();
                    if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);
                    this.isSpeaking = false;
                    this.updateStatus('Interrupted — processing...', false);
                } else {
                    this.updateStatus('Processing...', false);
                }

                // ── DEBOUNCE: accumulate rapid consecutive transcripts ──
                this._pendingSpeechText += (this._pendingSpeechText ? ' ' : '') + text;
                this.showSubtitle('You', this._pendingSpeechText, true);

                if (this._pendingSpeechTimer) clearTimeout(this._pendingSpeechTimer);
                this._pendingSpeechTimer = setTimeout(() => {
                    const combined = this._pendingSpeechText.trim();
                    this._pendingSpeechText = '';
                    this._pendingSpeechTimer = null;
                    if (combined) {
                        this.sendVoiceMessage(combined);
                    }
                }, 800);
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            console.warn('Speech recognition error:', event.error);
        };

        this.recognition.onend = () => {
            // Always restart while call is active and not muted
            if (this.isListening && !this.isMuted) {
                try {
                    finalTranscript = '';
                    this.recognition.start();
                } catch (e) { }
            }
        };
    },

    async startListening() {
        if (this.isMuted) return;

        try {
            if (!this.audioStream) {
                // Request microphone access (triggers permission prompt)
                this.audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false
                });
            }

            this.isListening = true;
            this.updateStatus('Listening...', true);

            if (this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('Could not start recognition, recreating...', e);
                    this.setupSpeechRecognition();
                    try { this.recognition.start(); } catch (e2) { console.error('Failed to start new recognition', e2); }
                }
            }
        } catch (e) {
            console.error('Microphone access error:', e);
            this.updateStatus('Mic Denied', false);
        }
    },

    async sendVoiceMessage(text) {
        if (!text.trim()) return;

        // ── REQUEST GENERATION COUNTER ──
        const requestId = ++this._voiceRequestId;

        // Stop any current speech immediately
        if (this.isSpeaking) {
            this.synthesis.cancel();
            if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) Avatar3D.stopSpeaking();
            if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);
            this.isSpeaking = false;
        }

        const sub = document.getElementById('subtitles');
        if (sub) sub.innerHTML = '';

        // Add user message
        this.addMessage('user', text);
        this.updateStatus('Processing...', false);

        try {
            const response = await API.post(`/conversations/${this.data.conversation_id}/messages`, {
                content: text
            });

            // ── STALE CHECK: discard if a newer request was fired ──
            if (requestId !== this._voiceRequestId) {
                console.log(`Discarding stale response (req ${requestId}, current ${this._voiceRequestId})`);
                return;
            }

            const agentMessage = response.agent_message.content;
            this.addMessage('agent', agentMessage);

            if (!this.isSpeakerOff) {
                this.speakWithSubtitles(agentMessage);
            } else {
                this.updateStatus('Listening...', true);
            }

        } catch (error) {
            if (requestId === this._voiceRequestId) {
                console.error('Failed to send message:', error);
                this.updateStatus('Listening...', true);
            }
        }
    },

    sendMessage() {
        const input = document.getElementById('drawer-chat-input');
        const text = input.value.trim();
        if (text) {
            this.sendVoiceMessage(text);
            input.value = '';
        }
    },

    addMessage(role, content) {
        this.messages.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });

        const container = document.getElementById('drawer-messages');
        if (container) {
            container.innerHTML = this.renderDrawerMessages();
            container.scrollTop = container.scrollHeight;
        }
    },

    renderDrawerMessages() {
        return this.messages.map(msg => `
            <div class="vc-chat-msg ${msg.role === 'user' ? 'user' : 'agent'}">
                ${msg.content}
            </div>
        `).join('');
    },

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        const drawer = document.getElementById('chat-drawer');
        if (drawer) {
            if (this.isChatOpen) drawer.classList.add('open');
            else drawer.classList.remove('open');
        }
    },

    showChatBubble(text) {
        const bubble = document.getElementById('chat-bubble');
        const bubbleText = document.getElementById('chat-bubble-text');

        if (bubble && bubbleText) {
            bubbleText.textContent = text;
            bubble.style.display = 'block';

            // Hide after delay depending on length
            const duration = Math.max(3000, text.length * 50);
            setTimeout(() => {
                bubble.style.display = 'none';
            }, duration);
        }
    },

    speakWithSubtitles(text) {
        if (this.isSpeakerOff) return;

        // Stop any current speech
        if (this.synthesis) this.synthesis.cancel();
        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) Avatar3D.stopSpeaking();
        if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);

        this.isSpeaking = true;
        this.updateStatus(`${this.data.agent.name} speaking...`, false);

        // Mic stays ON — AEC filters out the speaker audio.
        // If user speaks during TTS, onresult will fire and interrupt the agent.

        const onSpeakEnd = () => {
            this.isSpeaking = false;
            if (this._subtitleAnimFrame) cancelAnimationFrame(this._subtitleAnimFrame);
            const sub = document.getElementById('subtitles');
            if (sub) sub.innerHTML = '';
            this.updateStatus('Listening...', true);
        };

        if (typeof Avatar3D !== 'undefined' && Avatar3D.isInitialized) {
            Avatar3D.speak(text, onSpeakEnd)
                .then((success) => {
                    if (success === false) {
                        this.showSubtitle(this.data.agent.name, text, false);
                        this._fallbackSpeak(text, onSpeakEnd);
                    } else {
                        this._startWordByWordSubtitles(text);
                    }
                })
                .catch(() => {
                    this.showSubtitle(this.data.agent.name, text, false);
                    this._fallbackSpeak(text, onSpeakEnd);
                });
        } else {
            this.showSubtitle(this.data.agent.name, text, false);
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

            const speechStart = 0.08;
            const speechEnd = duration - 0.15;
            const speechDuration = Math.max(speechEnd - speechStart, 0.5);

            // Punctuation-aware word weights
            const wordWeights = words.map(w => {
                let weight = w.replace(/[.,!?;:…]+$/, '').length || 1;
                if (/[.!?]$/.test(w)) weight += 4;
                else if (/[,;:]$/.test(w)) weight += 2;
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

            const updateSubtitles = () => {
                if (!this.isSpeaking || !Avatar3D.currentAudio) return;

                const timeOffset = 0.25;
                const currentTime = Avatar3D.currentAudio.currentTime + timeOffset;

                let activeIdx = -1;
                for (let i = wordTimings.length - 1; i >= 0; i--) {
                    if (currentTime >= wordTimings[i].start) {
                        activeIdx = i;
                        break;
                    }
                }

                if (activeIdx !== lastShownIdx && activeIdx >= 0) {
                    lastShownIdx = activeIdx;
                    const w = wordTimings[activeIdx].word;
                    subtitles.innerHTML = `<div class="vc-subtitle-line" style="font-size:1.4em;font-weight:600;text-align:center;animation:subtitlePop 0.15s ease-out">${w}</div>`;
                    subtitles.style.opacity = '1';
                }

                this._subtitleAnimFrame = requestAnimationFrame(updateSubtitles);
            };

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

    /**
     * Fallback to browser speech synthesis when Avatar3D is not available
     */
    _fallbackSpeak(text, onEnd) {
        if (!this.synthesis) { if (onEnd) onEnd(); return; }

        const utterance = new SpeechSynthesisUtterance(text);
        this._selectVoice();
        if (this.selectedVoice) utterance.voice = this.selectedVoice;

        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = () => { if (onEnd) onEnd(); };

        this.synthesis.speak(utterance);
    },

    showSubtitle(speaker, text, isInterim) {
        const container = document.getElementById('subtitles');
        if (!container) return;

        container.innerHTML = `<div class="vc-subtitle-line">${text}</div>`;
        container.style.opacity = '1';

        if (!isInterim) {
            setTimeout(() => {
                if (container.textContent === text) {
                    container.style.opacity = '0';
                }
            }, 5000);
        }
    },

    updateStatus(text, isListening) {
        const statusText = document.querySelector('.vc-status-text');
        const indicator = document.querySelector('.vc-status-indicator');

        if (statusText) statusText.textContent = text;
        if (indicator) {
            if (isListening) indicator.classList.add('listening');
            else indicator.classList.remove('listening');
        }
    },

    setupListeners() {
        document.getElementById('mute-btn')?.addEventListener('click', () => this.toggleMute());
        document.getElementById('camera-btn')?.addEventListener('click', () => this.toggleCamera());
        document.getElementById('speaker-btn')?.addEventListener('click', () => this.toggleSpeaker());
        document.getElementById('end-btn')?.addEventListener('click', () => this.endCall());
        document.getElementById('chat-btn')?.addEventListener('click', () => this.toggleChat());
        document.getElementById('drawer-close')?.addEventListener('click', () => this.toggleChat());

        document.getElementById('drawer-chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        document.getElementById('drawer-chat-send')?.addEventListener('click', () => this.sendMessage());
    }
};
