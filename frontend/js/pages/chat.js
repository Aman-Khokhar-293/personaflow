/**
 * PersonaFlow - Text Chat Page
 * With Web Speech API STT + interrupt handling
 */

const ChatPage = {
    conversation: null,
    agent: null,
    messages: [],
    isTyping: false,
    recognition: null,
    isRecording: false,
    abortController: null,   // For cancelling in-flight AI requests (interrupt)

    async render(container, conversationId) {
        this.conversation = null;
        this.agent = null;
        this.messages = [];
        this.isTyping = false;
        this.abortController = null;

        // Stop any previous recognition session
        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) { }
            this.recognition = null;
        }

        try {
            const data = await API.get(`/conversations/${conversationId}`);
            this.conversation = data.conversation;
            this.agent = data.agent;
            this.messages = data.messages;

            this.renderChat(container);
            this.initSpeechRecognition();
        } catch (error) {
            Toast.error('Failed to load conversation');
            Router.navigate('/conversations');
        }
    },

    renderChat(container) {
        container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <button class="btn btn-icon btn-secondary" onclick="Router.back()" style="margin-right: 0.5rem;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="chat-agent-icon" style="background: ${this.agent.color}; color: white; display: flex; align-items: center; justify-content: center;">${App.getAgentIconHtml(this.agent.icon)}</div>
                    <div class="chat-agent-info">
                        <div class="chat-agent-name">${this.agent.name}</div>
                        <div class="chat-agent-status" id="chat-status-indicator">● Online</div>
                    </div>
                    <div style="margin-left: auto; display: flex; gap: 0.5rem;">
                        ${this.conversation.status === 'active' ? `
                            <button class="btn btn-secondary btn-sm" onclick="ChatPage.endConversation()">
                                End Chat
                            </button>
                        ` : `
                            <span class="badge completed">Completed</span>
                        `}
                    </div>
                </div>

                <div class="chat-messages" id="chat-messages">
                    ${this.renderMessages()}
                </div>

                ${this.conversation.status === 'active' ? `
                    <div class="chat-input-container">
                        <button class="chat-btn chat-mic-btn" id="mic-btn" title="Voice input (click to start, click again to stop)">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <input type="text" class="chat-input" id="chat-input" placeholder="Type your message..." autocomplete="off">
                        <button class="chat-btn chat-send-btn" id="send-btn" title="Send message">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <!-- Live STT transcript display -->
                    <div id="stt-interim" style="display:none; padding: 0.4rem 1rem; font-size:0.8rem; color: var(--primary-500); font-style: italic; background: var(--primary-50, #eef2ff); border-top: 1px solid var(--primary-100, #c7d2fe);"></div>
                ` : ''}
            </div>
        `;

        this.scrollToBottom();
        this.setupListeners();
    },

    renderMessages() {
        if (this.messages.length === 0) {
            return `
                <div class="empty-state" style="padding: 2rem;">
                    <div class="empty-icon">💬</div>
                    <div class="empty-message">Start the conversation!</div>
                </div>
            `;
        }

        return this.messages.map(msg => `
            <div class="message ${msg.role === 'user' ? 'user' : 'agent'}">
                ${msg.role === 'agent' ? `
                    <div class="message-avatar" style="background: ${this.agent.color}; font-size: 1.25rem; color: white; display: flex; align-items: center; justify-content: center;">${App.getAgentIconHtml(this.agent.icon)}</div>
                ` : ''}
                <div>
                    <div class="message-bubble">${this.formatMessage(msg.content)}</div>
                    <div class="message-time">${App.formatTime(msg.timestamp)}</div>
                </div>
            </div>
        `).join('');
    },

    formatMessage(content) {
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
        return content
            .replace(imgRegex, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    },

    setupListeners() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const micBtn = document.getElementById('mic-btn');

        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn?.addEventListener('click', () => this.sendMessage());
        micBtn?.addEventListener('click', () => this.toggleRecording());
    },

    // ─── Web Speech API STT ───────────────────────────────────────────────────

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            // Browser doesn't support — hide mic button gracefully
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) {
                micBtn.title = 'Voice input not supported in this browser (use Chrome/Edge)';
                micBtn.style.opacity = '0.4';
                micBtn.style.cursor = 'not-allowed';
            }
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Show live interim transcript while user speaks
        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            const interimEl = document.getElementById('stt-interim');
            if (interimEl) {
                if (interim) {
                    interimEl.style.display = 'block';
                    interimEl.textContent = '🎙️ ' + interim;
                } else {
                    interimEl.style.display = 'none';
                }
            }

            if (final.trim()) {
                // Hide interim display
                if (interimEl) interimEl.style.display = 'none';

                // If agent is currently typing → INTERRUPT: cancel in-flight request
                if (this.isTyping && this.abortController) {
                    this.abortController.abort();
                    this.abortController = null;
                    this.hideTypingIndicator();
                    this.updateStatusIndicator('● Online');
                    Toast.info('Interrupted', 'Sending your voice message instead');
                }

                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = final.trim();
                    this.sendMessage();
                }
            }
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.textContent = '🎤';
                micBtn.title = 'Voice input (click to start, click again to stop)';
            }
            const interimEl = document.getElementById('stt-interim');
            if (interimEl) interimEl.style.display = 'none';
        };

        this.recognition.onerror = (event) => {
            this.isRecording = false;
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.textContent = '🎤';
            }
            const interimEl = document.getElementById('stt-interim');
            if (interimEl) interimEl.style.display = 'none';

            if (event.error === 'not-allowed') {
                Toast.error('Microphone access denied', 'Please allow microphone access in your browser');
            } else if (event.error === 'no-speech') {
                Toast.warning('No speech detected', 'Please try again');
            } else if (event.error !== 'aborted') {
                Toast.error('Voice input error', event.error);
            }
        };
    },

    toggleRecording() {
        if (!this.recognition) {
            Toast.error('Voice input not supported', 'Please use Chrome or Edge browser');
            return;
        }

        if (this.isRecording) {
            // Stop recognition — onend will fire which sends the result
            this.recognition.stop();
            this.isRecording = false;
            return;
        }

        // Start recording
        try {
            this.recognition.start();
            this.isRecording = true;
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) {
                micBtn.classList.add('recording');
                micBtn.textContent = '⏹️';
                micBtn.title = 'Click to stop recording';
            }
            Toast.info('Listening...', 'Speak now, click mic again to stop');
        } catch (e) {
            if (e.name === 'InvalidStateError') {
                // Already started — stop it
                this.recognition.stop();
            } else {
                Toast.error('Could not start voice input', e.message);
            }
        }
    },

    updateStatusIndicator(text) {
        const el = document.getElementById('chat-status-indicator');
        if (el) el.textContent = text;
    },

    // ─── Send Message ─────────────────────────────────────────────────────────

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input?.value.trim();

        if (!content) return;
        // Allow sending while isTyping (interrupt case already handled in STT)
        if (this.isTyping && !this.abortController) {
            // Already waiting and no abort controller (shouldn't happen normally)
            return;
        }

        input.value = '';

        // Add user message immediately
        this.messages.push({
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        });

        this.updateMessages();
        this.showTypingIndicator();
        this.updateStatusIndicator('● Typing...');

        // Create a fresh abort controller for this request
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        try {
            const response = await fetch(`/api/conversations/${this.conversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content }),
                signal
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Request failed');
            }

            const data = await response.json();
            this.messages.push(data.agent_message);
            this.hideTypingIndicator();
            this.updateStatusIndicator('● Online');
            this.updateMessages();

        } catch (error) {
            if (error.name === 'AbortError') {
                // Request was interrupted by user — do nothing (already handled)
                return;
            }
            this.hideTypingIndicator();
            this.updateStatusIndicator('● Online');
            Toast.error('Failed to send message', error.message);
        } finally {
            this.abortController = null;
        }
    },

    updateMessages() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = this.renderMessages();
            this.scrollToBottom();
        }
    },

    showTypingIndicator() {
        this.isTyping = true;
        const container = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'message agent';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-avatar" style="background: ${this.agent.color}; font-size: 1.25rem; color: white; display: flex; align-items: center; justify-content: center;">${App.getAgentIconHtml(this.agent.icon)}</div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        container?.appendChild(indicator);
        this.scrollToBottom();
    },

    hideTypingIndicator() {
        this.isTyping = false;
        document.getElementById('typing-indicator')?.remove();
    },

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },

    async endConversation() {
        Modal.confirm(
            'End Conversation',
            'Are you sure you want to end this conversation? A report will be generated based on the conversation.',
            async () => {
                try {
                    await API.post(`/conversations/${this.conversation.id}/end`);
                    Toast.success('Conversation ended', 'Report is being generated');
                    Router.navigate('/conversations');
                } catch (error) {
                    Toast.error('Failed to end conversation', error.message);
                }
            }
        );
    }
};

/**
 * Conversation Detail Page (for viewing completed conversations)
 */
const ConversationDetailPage = {
    async render(container, conversationId) {
        try {
            const data = await API.get(`/conversations/${conversationId}`);

            if (data.conversation.status === 'active') {
                Router.navigate(`/chat/${conversationId}`);
                return;
            }

            container.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Conversation Transcript</h1>
                        <p class="page-subtitle">${data.agent.name} with ${data.conversation.participant_name || 'Anonymous'}</p>
                    </div>
                    ${data.conversation.has_report ? `
                        <a href="#/reports/${conversationId}" class="btn btn-primary">View Report</a>
                    ` : ''}
                </div>

                <div class="card">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="agent-icon" style="width: 48px; height: 48px; background: ${data.agent.color}; font-size: 1.5rem;">${data.agent.icon}</div>
                        <div>
                            <div style="font-weight: 600; color: var(--gray-900);">${data.agent.name}</div>
                            <div style="color: var(--gray-500);">${data.conversation.message_count} messages • ${App.formatDate(data.conversation.started_at)}</div>
                        </div>
                    </div>

                    <div style="max-height: 500px; overflow-y: auto; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                        ${data.messages.map(msg => `
                            <div style="margin-bottom: 1rem; ${msg.role === 'user' ? 'text-align: right;' : ''}">
                                <div style="display: inline-block; padding: 0.75rem 1rem; border-radius: 12px; max-width: 80%; ${msg.role === 'user' ? 'background: var(--primary-500); color: white;' : 'background: white; border: 1px solid var(--gray-200);'}">
                                    ${msg.content}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--gray-400); margin-top: 0.25rem;">
                                    ${App.formatTime(msg.timestamp)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            Toast.error('Failed to load conversation');
            Router.navigate('/conversations');
        }
    }
};
