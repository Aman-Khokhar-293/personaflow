/**
 * PersonaFlow - Anchoring Remote Control Page
 * Dashboard user's remote control for the Event Anchoring Agent
 */

const AnchoringRemotePage = {
    agent: null,
    state: null,
    pollInterval: null,
    scriptLines: [],

    async render(container, agentId) {
        this.agentId = agentId;

        try {
            const data = await API.get(`/agents/${agentId}`);
            this.agent = data.agent;

            if (this.agent.agent_type !== 'anchoring') {
                Toast.error('This is not an anchoring agent');
                Router.navigate('/agents');
                return;
            }

            this.renderRemote(container);
            await this.fetchState();
            this.setupListeners();
            this.startPolling();

        } catch (error) {
            Toast.error('Failed to load anchoring agent');
            Router.navigate('/agents');
        }
    },

    renderRemote(container) {
        container.innerHTML = `
            <div class="anc-remote-container">
                <!-- Header -->
                <div class="anc-remote-header">
                    <button class="anc-back-btn" id="anc-back-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        Back
                    </button>
                    <div class="anc-remote-title">
                        <span class="anc-remote-icon">${this.agent.icon}</span>
                        <div>
                            <h1>${this.agent.name}</h1>
                            <span class="anc-badge-system">🎤 Anchoring Mode</span>
                        </div>
                    </div>
                    <div class="anc-status-badge" id="anc-status-badge">
                        <span class="anc-status-dot stopped"></span>
                        <span>Stopped</span>
                    </div>
                </div>

                <div class="anc-remote-body">
                    <!-- Left: Script Editor -->
                    <div class="anc-script-panel">
                        <div class="anc-panel-header">
                            <h3>📝 Anchoring Script</h3>
                            <button class="anc-save-btn" id="anc-save-script">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                Save Script
                            </button>
                        </div>
                        <textarea class="anc-script-editor" id="anc-script-input" placeholder="Enter your anchoring script here...&#10;&#10;Each line will be spoken separately.&#10;Use empty lines to add pauses.">${this.agent.script_content || ''}</textarea>
                        
                        <!-- Script Preview -->
                        <div class="anc-script-preview" id="anc-script-preview">
                            <h4>Script Lines Preview</h4>
                            <div class="anc-lines-list" id="anc-lines-list"></div>
                        </div>
                    </div>

                    <!-- Right: Controls -->
                    <div class="anc-controls-panel">
                        <!-- Remote Control Card -->
                        <div class="anc-control-card">
                            <h3>🎛️ Remote Control</h3>
                            <p class="anc-control-subtitle">Control the anchoring flow in real-time</p>
                            
                            <div class="anc-progress-info" id="anc-progress-info">
                                <div class="anc-progress-bar-container">
                                    <div class="anc-progress-bar" id="anc-progress-bar" style="width:0%"></div>
                                </div>
                                <span class="anc-progress-text" id="anc-progress-text">Line 0 / 0</span>
                            </div>

                            <div class="anc-current-line-card" id="anc-current-line-card">
                                <div class="anc-current-label">Now Speaking:</div>
                                <div class="anc-current-text" id="anc-current-text">—</div>
                            </div>

                            <div class="anc-controls-grid">
                                <button class="anc-ctrl-btn play" id="anc-play-btn" title="Play / Resume">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    <span>Play</span>
                                </button>
                                <button class="anc-ctrl-btn pause" id="anc-pause-btn" title="Pause">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                    <span>Pause</span>
                                </button>
                                <button class="anc-ctrl-btn stop" id="anc-stop-btn" title="Stop">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                                    <span>Stop</span>
                                </button>
                                <button class="anc-ctrl-btn restart" id="anc-restart-btn" title="Restart">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                    <span>Restart</span>
                                </button>
                            </div>

                            <button class="anc-next-btn" id="anc-next-btn">
                                Next Line →
                            </button>
                        </div>

                        <!-- Share Link -->
                        <div class="anc-control-card anc-share-card">
                            <h3>🔗 Performance Link</h3>
                            <p class="anc-control-subtitle">Share this link for the audience to watch the anchoring</p>
                            <button class="anc-share-btn" id="anc-create-share" onclick="Router.navigate('/agents/${this.agent.id}')">
                                Open Agent Details to Create Share Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateScriptPreview();
    },

    setupListeners() {
        document.getElementById('anc-back-btn')?.addEventListener('click', () => {
            this.stopPolling();
            Router.navigate(`/agents/${this.agentId}`);
        });

        document.getElementById('anc-save-script')?.addEventListener('click', () => this.saveScript());
        document.getElementById('anc-play-btn')?.addEventListener('click', () => this.sendControl('play'));
        document.getElementById('anc-pause-btn')?.addEventListener('click', () => this.sendControl('pause'));
        document.getElementById('anc-stop-btn')?.addEventListener('click', () => this.sendControl('stop'));
        document.getElementById('anc-restart-btn')?.addEventListener('click', () => this.sendControl('restart'));
        document.getElementById('anc-next-btn')?.addEventListener('click', () => this.sendControl('next'));

        document.getElementById('anc-script-input')?.addEventListener('input', () => {
            this.updateScriptPreview();
        });
    },

    async saveScript() {
        const textarea = document.getElementById('anc-script-input');
        if (!textarea) return;

        try {
            const response = await API.post(`/agents/${this.agentId}/anchoring/script`, {
                script: textarea.value
            });
            Toast.success('Script saved successfully');
            this.agent.script_content = textarea.value;
            this.updateScriptPreview();
        } catch (error) {
            Toast.error('Failed to save script', error.message);
        }
    },

    async sendControl(action) {
        try {
            const response = await API.post(`/agents/${this.agentId}/anchoring/control`, { action });
            this.state = response.state;
            this.updateUI();
        } catch (error) {
            Toast.error(`Failed to ${action}`, error.message);
        }
    },

    async fetchState() {
        try {
            const response = await API.get(`/agents/${this.agentId}/anchoring/state`);
            this.state = response.state;
            this.updateUI();
        } catch (error) {
            console.error('Failed to fetch anchoring state:', error);
        }
    },

    startPolling() {
        this.pollInterval = setInterval(() => this.fetchState(), 2000);
    },

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    updateUI() {
        if (!this.state) return;

        // Update status badge
        const badge = document.getElementById('anc-status-badge');
        if (badge) {
            const statusColors = {
                'playing': 'playing',
                'paused': 'paused',
                'stopped': 'stopped'
            };
            const statusLabels = {
                'playing': '▶ Playing',
                'paused': '⏸ Paused',
                'stopped': '⏹ Stopped'
            };
            badge.innerHTML = `
                <span class="anc-status-dot ${statusColors[this.state.status] || 'stopped'}"></span>
                <span>${statusLabels[this.state.status] || 'Stopped'}</span>
            `;
        }

        // Update progress
        const total = this.state.total_lines || 0;
        const current = this.state.current_line || 0;
        const pct = total > 0 ? ((current + 1) / total * 100) : 0;

        const progressBar = document.getElementById('anc-progress-bar');
        if (progressBar) progressBar.style.width = `${pct}%`;

        const progressText = document.getElementById('anc-progress-text');
        if (progressText) progressText.textContent = `Line ${current + 1} / ${total}`;

        // Update current line
        const currentText = document.getElementById('anc-current-text');
        if (currentText && this.state.script_lines && this.state.script_lines.length > 0) {
            currentText.textContent = this.state.script_lines[current] || '—';
        }

        // Highlight current line in preview
        const lines = document.querySelectorAll('.anc-line-item');
        lines.forEach((line, i) => {
            line.classList.toggle('active', i === current);
            line.classList.toggle('done', i < current);
        });

        // Update button states
        const playBtn = document.getElementById('anc-play-btn');
        const pauseBtn = document.getElementById('anc-pause-btn');
        if (playBtn) playBtn.classList.toggle('active-ctrl', this.state.status === 'playing');
        if (pauseBtn) pauseBtn.classList.toggle('active-ctrl', this.state.status === 'paused');
    },

    updateScriptPreview() {
        const textarea = document.getElementById('anc-script-input');
        const listEl = document.getElementById('anc-lines-list');
        if (!textarea || !listEl) return;

        const lines = textarea.value.split('\n').filter(l => l.trim());
        this.scriptLines = lines;

        listEl.innerHTML = lines.map((line, i) => `
            <div class="anc-line-item" data-line="${i}" onclick="AnchoringRemotePage.jumpToLine(${i})">
                <span class="anc-line-num">${i + 1}</span>
                <span class="anc-line-text">${line}</span>
            </div>
        `).join('');
    },

    async jumpToLine(lineNum) {
        try {
            const response = await API.post(`/agents/${this.agentId}/anchoring/control`, {
                action: 'set_line',
                line: lineNum
            });
            this.state = response.state;
            this.updateUI();
        } catch (error) {
            console.error('Failed to jump to line:', error);
        }
    },

    destroy() {
        this.stopPolling();
    }
};
