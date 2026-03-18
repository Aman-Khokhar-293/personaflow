/**
 * PersonaFlow - Agent Detail Page
 */

const AgentDetailPage = {
    agent: null,
    activeTab: 'settings',
    // Report Chat state — persisted per agent across tab navigation
    _rcHistoryCache: {},   // { [agentId]: [{role, content}] }
    _rcAgentId: null,

    get _rcHistory() {
        const id = this._rcAgentId;
        if (!id) return [];
        if (!this._rcHistoryCache[id]) this._rcHistoryCache[id] = [];
        return this._rcHistoryCache[id];
    },
    set _rcHistory(val) {
        if (this._rcAgentId) this._rcHistoryCache[this._rcAgentId] = val;
    },

    async render(container, agentId) {
        this.agent = null;
        this.activeTab = 'settings';
        // Update report chat agent ID (but preserve history cache)

        container.innerHTML = `
            <div class="empty-state">
                <div class="spinner"></div>
            </div>
        `;

        try {
            const { agent } = await API.get(`/agents/${agentId}`);
            this.agent = agent;
            this.renderContent(container);
        } catch (error) {
            Toast.error('Failed to load agent');
            Router.navigate('/agents');
        }
    },

    renderContent(container) {
        container.innerHTML = `
            <div class="page-header">
                <div class="flex items-center gap-4">
                    <div class="agent-icon" style="width: 64px; height: 64px; background: ${this.agent.color}; font-size: 2rem;">${this.agent.icon}</div>
                    <div>
                        <h1 class="page-title">${this.agent.name}</h1>
                        <p class="page-subtitle">${this.agent.role}</p>
                    </div>
                    <span class="badge ${this.agent.status}" style="margin-left: 1rem;">${this.agent.status}</span>
                    ${this.agent.agent_type === 'anchoring' ? '<span class="badge" style="margin-left:0.5rem;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;">🎤 Anchoring Mode</span>' : ''}
                    ${this.agent.is_default ? '<span class="badge" style="margin-left:0.5rem;background:rgba(99,102,241,0.15);color:#6366f1;">🔒 System Agent</span>' : ''}
                </div>
                <div class="flex gap-2">
                    ${this.agent.agent_type === 'anchoring' ? `
                        <button class="btn btn-primary" onclick="AgentDetailPage.openRemoteControl()">
                            🎛️ Remote Control
                        </button>
                        <button class="btn btn-secondary" onclick="AgentDetailPage.startAnchoring()">
                            ▶️ Start Performance
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="AgentDetailPage.startVideoCall()">
                            📹 Video Call
                        </button>
                        <button class="btn btn-secondary" onclick="AgentDetailPage.startTextChat()">
                            💬 Text Chat
                        </button>
                    `}
                    <a href="#/agents/${this.agent.id}/edit" class="btn btn-outline">
                        ✏️ Edit
                    </a>
                </div>
            </div>
            
            <div class="tabs">
                <button class="tab ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">Settings</button>
                <button class="tab ${this.activeTab === 'share-links' ? 'active' : ''}" data-tab="share-links">Share Links</button>
                <button class="tab ${this.activeTab === 'conversations' ? 'active' : ''}" data-tab="conversations">Conversations</button>
                <button class="tab ${this.activeTab === 'analytics' ? 'active' : ''}" data-tab="analytics">📊 Analytics</button>
                <button class="tab ${this.activeTab === 'report-chat' ? 'active' : ''}" data-tab="report-chat">🤖 Report Chat</button>
            </div>
            
            <div id="tab-content">
                ${this.renderTabContent()}
            </div>
        `;

        this.setupListeners();
    },

    renderTabContent() {
        switch (this.activeTab) {
            case 'settings':
                return this.renderSettingsTab();
            case 'share-links':
                return this.renderShareLinksTab();
            case 'conversations':
                return this.renderConversationsTab();
            case 'analytics':
                return this.renderAnalyticsTab();
            case 'report-chat':
                return this.renderReportChatTab();
            default:
                return '';
        }
    },

    renderReportChatTab() {
        // Set agent ID so the history getter/setter work
        this._rcAgentId = this.agent.id;
        // Restore previous messages from cache if any
        const history = this._rcHistory;
        const hasHistory = history.length > 0;
        return `
            <div class="card" style="padding:0; overflow:hidden; border-radius:16px;">
                <!-- Chat Header -->
                <div style="display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; background:#f8fafc; border-bottom:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:40px; height:40px; border-radius:12px; background:${this.agent.color}22; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">${this.agent.icon}</div>
                        <div>
                            <div style="font-weight:700; color:#111827; font-size:1rem;">${this.agent.name} — Report Chat</div>
                            <div style="font-size:0.75rem; color:#6b7280;">AI assistant with full access to this agent's data</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="AgentDetailPage.rcClearHistory()" title="Clear chat history" style="padding:0.4rem 0.9rem; background:transparent; color:#9ca3af; border:1px solid #e5e7eb; border-radius:8px; font-size:0.8rem; font-weight:500; cursor:pointer;">🗑 Clear</button>
                        <button onclick="AgentDetailPage.rcDownloadPDF()" style="padding:0.4rem 0.9rem; background:#6366f1; color:white; border:none; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer;">📄 PDF</button>
                        <button onclick="AgentDetailPage.rcDownloadDOCX()" style="padding:0.4rem 0.9rem; background:#16a34a; color:white; border:none; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer;">📝 DOCX</button>
                    </div>
                </div>

                <!-- Quick Suggestions -->
                <div style="padding:0.75rem 1.25rem; background:#f1f5f9; border-bottom:1px solid #e2e8f0; display:flex; gap:0.5rem; flex-wrap:wrap;">
                    ${['Top 10 performers', 'Average score', 'Recent sessions', 'Lowest scores', 'Performance of [name]', 'Total conversations'].map(q =>
            `<button onclick="AgentDetailPage.rcSuggest('${q}')" style="padding:0.3rem 0.7rem; background:white; color:#6366f1; border:1px solid #c7d2fe; border-radius:20px; font-size:0.78rem; font-weight:500; cursor:pointer; transition:all .15s;" onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background='white'">${q}</button>`
        ).join('')}
                </div>

                <!-- Messages -->
                <div id="rc-messages" style="height:360px; overflow-y:auto; padding:1.25rem; display:flex; flex-direction:column; gap:0.875rem; background:#ffffff;">
                    ${hasHistory ? '' : `
                    <div style="text-align:center; color:#9ca3af; font-size:0.85rem; padding:1.5rem 0;">
                        👋 Ask me anything about <strong>${this.agent.name}</strong>'s data!<br>
                        <span style="font-size:0.78rem;">e.g. "Top 5 performers", "Performance of John", "Average score"</span>
                    </div>`}
                </div>

                <!-- Input -->
                <div style="padding:1rem 1.25rem; border-top:1px solid #e2e8f0; background:#f8fafc; display:flex; gap:0.5rem;">
                    <input type="text" id="rc-input" placeholder="Ask about scores, rankings, specific participant performance..." style="flex:1; padding:0.65rem 1rem; border:1px solid #d1d5db; border-radius:10px; background:white; color:#111827; font-size:0.9rem; outline:none; font-family:inherit;" onkeypress="if(event.key==='Enter') AgentDetailPage.rcSend()">
                    <button onclick="AgentDetailPage.rcSend()" style="padding:0.65rem 1.1rem; background:#6366f1; color:white; border:none; border-radius:10px; cursor:pointer; font-size:1rem; font-weight:600;">➤</button>
                </div>
            </div>
        `;
    },

    renderAnalyticsTab() {
        return `
            <div class="card">
                <h4 style="margin-bottom: 1.5rem; color: var(--gray-900);">📊 Agent Analytics</h4>

                <!-- Summary Stats -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:2rem;" id="analytics-stats">
                    <div class="card" style="text-align:center;padding:1rem;">
                        <div class="spinner" style="margin:auto;"></div>
                    </div>
                </div>

                <!-- Conversations over time chart -->
                <div style="margin-bottom:1.5rem;">
                    <div style="font-weight:600;color:var(--gray-700);margin-bottom:0.75rem;font-size:0.875rem;">Conversations (last 30 days)</div>
                    <div style="position:relative;height:180px;">
                        <canvas id="analytics-chart"></canvas>
                    </div>
                </div>

                <!-- Score trend -->
                <div id="analytics-score-section" style="display:none;">
                    <div style="font-weight:600;color:var(--gray-700);margin-bottom:0.75rem;font-size:0.875rem;">Score Trend (last 10 sessions)</div>
                    <div style="position:relative;height:140px;">
                        <canvas id="score-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },

    renderSettingsTab() {
        const rules = this.agent.rules || [];
        const config = this.agent.output_config || {};
        const isAnchoring = this.agent.agent_type === 'anchoring';

        return `
            <div class="card">
                ${isAnchoring ? `
                    <div style="margin-bottom:1.5rem;padding:16px;background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(249,115,22,0.05));border:1px solid rgba(245,158,11,0.2);border-radius:12px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                            <span style="font-size:24px;">🎤</span>
                            <strong style="color:var(--gray-900);">Event Anchoring Agent</strong>
                        </div>
                        <p style="color:var(--gray-600);font-size:0.875rem;margin:0;">This is a script-based anchoring agent. It reads your script line by line with no conversation. Use the Remote Control to manage the performance.</p>
                    </div>
                    
                    <h4 style="margin-bottom:1rem;color:var(--gray-900);">📝 Anchoring Script</h4>
                    <textarea id="anc-detail-script" class="form-input" style="min-height:200px;font-family:monospace;line-height:1.8;resize:vertical;" placeholder="Enter your anchoring script...&#10;Each line will be spoken separately.">${this.agent.script_content || ''}</textarea>
                    <div style="margin-top:1rem;display:flex;gap:0.5rem;">
                        <button class="btn btn-primary" onclick="AgentDetailPage.saveScript()">💾 Save Script</button>
                        <button class="btn btn-secondary" onclick="AgentDetailPage.openRemoteControl()">🎛️ Open Remote Control</button>
                    </div>
                    <hr style="margin:1.5rem 0;border:none;border-top:1px solid var(--gray-100);">
                ` : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div>
                        <h4 style="margin-bottom: 1rem; color: var(--gray-900);">Identity</h4>
                        <div class="mb-3">
                            <div style="font-size: 0.875rem; color: var(--gray-500);">Goal</div>
                            <div>${this.agent.goal || 'Not specified'}</div>
                        </div>
                        <div class="mb-3">
                            <div style="font-size: 0.875rem; color: var(--gray-500);">Opening Message</div>
                            <div>${this.agent.opening_message || 'No opening message'}</div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 1rem; color: var(--gray-900);">Behavior</h4>
                        <div class="mb-3">
                            <div style="font-size: 0.875rem; color: var(--gray-500);">Tone</div>
                            <div style="text-transform: capitalize;">${this.agent.tone}</div>
                        </div>
                        <div class="mb-3">
                            <div style="font-size: 0.875rem; color: var(--gray-500);">Rules</div>
                            ${rules.length > 0 ? `
                                <ul style="margin: 0; padding-left: 1.25rem;">
                                    ${rules.map(r => `<li>${r}</li>`).join('')}
                                </ul>
                            ` : '<div>No rules defined</div>'}
                        </div>
                    </div>
                </div>
                
                <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--gray-100);">
                
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--gray-900);">Output Configuration</h4>
                    <div class="flex gap-4">
                        <span class="badge ${config.summary ? 'active' : 'inactive'}">Summary: ${config.summary ? 'On' : 'Off'}</span>
                        <span class="badge ${config.transcript ? 'active' : 'inactive'}">Transcript: ${config.transcript ? 'On' : 'Off'}</span>
                        <span class="badge ${config.evaluation ? 'active' : 'inactive'}">Evaluation: ${config.evaluation ? 'On' : 'Off'}</span>
                    </div>
                </div>
                
                ${!this.agent.is_default ? `
                    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-100); display: flex; justify-content: flex-end;">
                        <button class="btn btn-danger" onclick="AgentDetailPage.deleteAgent()">
                            🗑️ Delete Agent
                        </button>
                    </div>
                ` : `
                    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-100); text-align: right;">
                        <span style="color:var(--gray-400);font-size:0.875rem;">🔒 System agent cannot be deleted</span>
                    </div>
                `}
            </div>
        `;
    },

    renderShareLinksTab() {
        return `
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <h4 style="color: var(--gray-900);">Share Links</h4>
                    <button class="btn btn-primary" onclick="AgentDetailPage.showCreateLinkModal()">
                        + Create Link
                    </button>
                </div>
                <div id="share-links-list">
                    <div class="empty-state" style="padding: 2rem;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderConversationsTab() {
        return `
            <div class="card">
                <h4 style="margin-bottom: 1rem; color: var(--gray-900);">Conversations</h4>
                <div id="agent-conversations-list">
                    <div class="empty-state" style="padding: 2rem;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;
    },

    setupListeners() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.activeTab = tab.dataset.tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-content').innerHTML = this.renderTabContent();

                if (this.activeTab === 'share-links') {
                    this.loadShareLinks();
                } else if (this.activeTab === 'conversations') {
                    this.loadConversations();
                } else if (this.activeTab === 'analytics') {
                    this.loadAnalytics();
                } else if (this.activeTab === 'report-chat') {
                    // Set agent ID — history is preserved in _rcHistoryCache
                    this._rcAgentId = this.agent.id;
                    // Re-render previous messages from cache
                    this._rcRestoreHistory();
                }
            });
        });
    },

    // ─── Report Chat Methods ───────────────────────────────────────────────

    rcClearHistory() {
        if (this._rcAgentId) this._rcHistoryCache[this._rcAgentId] = [];
        const msgs = document.getElementById('rc-messages');
        if (msgs) msgs.innerHTML = `
            <div style="text-align:center; color:#9ca3af; font-size:0.85rem; padding:1.5rem 0;">
                👋 Chat history cleared. Ask me anything about <strong>${this.agent?.name || 'this agent'}</strong>'s data!
            </div>`;
    },

    _rcRestoreHistory() {
        const msgs = document.getElementById('rc-messages');
        if (!msgs) return;
        const history = this._rcHistory;
        if (!history.length) return;
        // Clear default placeholder
        msgs.innerHTML = '';
        history.forEach(h => this._rcAppend(h.content, h.role === 'user' ? 'user' : 'agent'));
    },

    rcSuggest(text) {
        const input = document.getElementById('rc-input');
        if (input) { input.value = text; input.focus(); }
        // Auto-send only if it's not a template like "Performance of [name]"
        if (!text.includes('[')) this.rcSend();
    },

    async rcSend() {
        const input = document.getElementById('rc-input');
        const msg = input?.value.trim();
        if (!msg) return;
        input.value = '';

        this._rcAppend(msg, 'user');
        this._rcHistory.push({ role: 'user', content: msg });

        // Typing indicator
        const tid = 'rc-typing-' + Date.now();
        const msgs = document.getElementById('rc-messages');
        const typing = document.createElement('div');
        typing.id = tid;
        typing.style.cssText = 'align-self:flex-start;padding:0.6rem 1rem;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px 14px 14px 14px;color:#94a3b8;font-size:0.85rem;';
        typing.textContent = '...';
        msgs?.appendChild(typing);
        msgs.scrollTop = msgs.scrollHeight;

        try {
            const res = await API.post(`/agents/${this._rcAgentId}/report-chat`, {
                message: msg,
                history: this._rcHistory.slice(-12)
            });
            document.getElementById(tid)?.remove();
            const reply = res.reply || 'No response.';
            this._rcHistoryCache[this._rcAgentId].push({ role: 'assistant', content: reply });
            this._rcAppend(reply, 'agent');
        } catch (e) {
            document.getElementById(tid)?.remove();
            this._rcAppend('⚠️ Failed to get a response. Please try again.', 'agent');
        }
    },

    _rcAppend(text, role) {
        const msgs = document.getElementById('rc-messages');
        if (!msgs) return;
        const div = document.createElement('div');
        if (role === 'user') {
            div.style.cssText = 'align-self:flex-end;background:#6366f1;color:white;padding:0.65rem 1rem;border-radius:14px 14px 4px 14px;max-width:82%;font-size:0.9rem;line-height:1.5;word-wrap:break-word;';
        } else {
            div.style.cssText = 'align-self:flex-start;background:#f8fafc;color:#1e293b;border:1px solid #e2e8f0;padding:0.65rem 1rem;border-radius:4px 14px 14px 14px;max-width:90%;font-size:0.9rem;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;';
        }
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    },

    rcDownloadPDF() {
        const agent = this.agent;
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const chatHtml = this._rcHistory.map(h => `
            <div style="margin-bottom:1rem;">
                <strong style="color:${h.role === 'user' ? '#6366f1' : '#374151'};">${h.role === 'user' ? 'You' : agent.name}:</strong>
                <p style="margin:0.25rem 0 0; color:#374151; white-space:pre-wrap; line-height:1.6;">${h.content}</p>
            </div>`).join('');

        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Report Chat — ${agent.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',sans-serif;background:#f9fafb;color:#1f2937;padding:2rem;}
.c{max-width:800px;margin:0 auto;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden;}
.h{padding:2rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;}
.h h1{font-size:1.4rem;font-weight:700;}.h p{opacity:.8;margin-top:.25rem;font-size:.9rem;}
.b{padding:2rem;}.f{padding:1.25rem 2rem;background:#f9fafb;text-align:center;font-size:.8rem;color:#9ca3af;}
@media print{.np{display:none}.c{box-shadow:none;border-radius:0;}body{padding:0;background:white;}}</style></head>
<body><div class="np" style="text-align:center;margin-bottom:1rem;"><button onclick="window.print()" style="padding:10px 24px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;">📥 Save as PDF</button></div>
<div class="c"><div class="h"><h1>${agent.icon} ${agent.name} — Report Chat Export</h1><p>${agent.role} • Generated: ${dateStr}</p></div>
<div class="b">${chatHtml || '<p style="color:#9ca3af;text-align:center;">No chat history to export.</p>'}</div>
<div class="f">PersonaFlow • ${dateStr}</div></div></body></html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    },

    async rcDownloadDOCX() {
        if (!this._rcAgentId) return;
        Toast.info('Generating DOCX...');
        try {
            const response = await fetch(`/api/agents/${this._rcAgentId}/export-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${this.agent.name.replace(/\s+/g, '_').toLowerCase()}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            Toast.success('DOCX downloaded!');
        } catch (e) {
            Toast.error('Failed to generate DOCX');
        }
    },

    async loadShareLinks() {
        try {
            const { share_links } = await API.get(`/agents/${this.agent.id}/share-links`);
            const container = document.getElementById('share-links-list');

            if (share_links.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 2rem;">
                        <div class="empty-icon">🔗</div>
                        <div class="empty-message">No share links yet</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = share_links.map(link => `
                <div class="flex items-center justify-between" style="padding: 1rem; border-bottom: 1px solid var(--gray-100);">
                    <div>
                        <div style="font-weight:600; color:var(--gray-900); margin-bottom:0.25rem;">
                            ${link.name ? `🔗 ${link.name}` : '🔗 Unnamed Link'}
                        </div>
                        <div class="flex items-center gap-2 mb-1">
                            ${link.has_password ? '<span class="badge protected">🔒 Protected</span>' : ''}
                            ${link.is_expired ? '<span class="badge expired">Expired</span>' : ''}
                            ${link.is_maxed ? '<span class="badge expired">Max uses reached</span>' : ''}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--gray-500);">
                            Created ${App.formatRelativeTime(link.created_at)} • 
                            ${link.current_uses}${link.max_uses ? '/' + link.max_uses : ''} uses
                            ${link.expires_at ? ' • Expires ' + App.formatDate(link.expires_at) : ''}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-secondary" onclick="AgentDetailPage.copyLink('${link.token}')">
                            📋 Copy Link
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="AgentDetailPage.deleteLink(${link.id})">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            Toast.error('Failed to load share links');
        }
    },

    async loadConversations() {
        try {
            const { conversations } = await API.get('/conversations');
            const filtered = conversations.filter(c => c.agent_id === this.agent.id);
            const container = document.getElementById('agent-conversations-list');

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 2rem;">
                        <div class="empty-icon">💬</div>
                        <div class="empty-message">No conversations yet</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = filtered.map(conv => `
                <a href="#/conversations/${conv.id}" class="flex items-center justify-between" style="padding: 1rem; border-bottom: 1px solid var(--gray-100); text-decoration: none; color: inherit;">
                    <div>
                        <div style="font-weight: 500; color: var(--gray-900);">${conv.participant_name || 'Anonymous'}</div>
                        <div style="font-size: 0.875rem; color: var(--gray-500);">
                            ${conv.message_count} messages • ${App.formatRelativeTime(conv.started_at)}
                        </div>
                    </div>
                    <span class="badge ${conv.status}">${conv.status}</span>
                </a>
            `).join('');

        } catch (error) {
            Toast.error('Failed to load conversations');
        }
    },

    async loadAnalytics() {
        try {
            const { analytics: a } = await API.get(`/agents/${this.agent.id}/analytics`);

            // Render stat cards
            document.getElementById('analytics-stats').innerHTML = `
                <div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1rem;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:700;color:var(--primary-600,#4f46e5);">${a.total_conversations}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">Total Conversations</div>
                </div>
                <div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1rem;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:700;color:#22c55e;">${a.completed_conversations}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">Completed</div>
                </div>
                <div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1rem;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:700;color:#0ea5e9;">${a.text_count}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">Text Chats</div>
                </div>
                <div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1rem;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:700;color:#8b5cf6;">${a.video_count}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">Video Calls</div>
                </div>
                ${a.avg_score !== null ? `
                <div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1rem;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:700;color:#f59e0b;">${a.avg_score}/10</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">Avg Score</div>
                </div>` : ''}
                <div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1rem;text-align:center;">
                    <div style="font-size:1.75rem;font-weight:700;color:#ec4899;">${a.share_conversations}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">Via Share Link</div>
                </div>
            `;

            // Draw conversations chart (simple inline SVG bars — no Chart.js CDN needed)
            const days = a.conversations_by_day;
            const maxCount = Math.max(...days.map(d => d.count), 1);
            const chartEl = document.getElementById('analytics-chart');
            if (chartEl) {
                // Replace canvas with SVG bar chart
                const labels = days.filter((_, i) => i % 5 === 4 || i === days.length - 1).map(d => d.date.slice(5));
                const barW = 100 / days.length;
                const bars = days.map((d, i) => {
                    const h = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    const x = i * barW;
                    const color = d.count > 0 ? '#6366f1' : '#e5e7eb';
                    return `<g>
                        <rect x="${x}%" y="${100 - h}%" width="${barW - 0.5}%" height="${h}%" fill="${color}" rx="2"
                            style="transition:opacity 0.2s" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
                            <title>${d.date}: ${d.count} conversation${d.count !== 1 ? 's' : ''}</title>
                        </rect>
                    </g>`;
                }).join('');

                chartEl.outerHTML = `<svg width="100%" height="180" viewBox="0 0 100 100" preserveAspectRatio="none"
                    style="display:block;border-bottom:1px solid var(--gray-200,#e5e7eb);">${bars}</svg>`;
            }

            // Score trend
            if (a.score_trend && a.score_trend.length > 0) {
                const scoreSection = document.getElementById('analytics-score-section');
                if (scoreSection) scoreSection.style.display = 'block';
                const scoreEl = document.getElementById('score-chart');
                if (scoreEl) {
                    const scores = a.score_trend;
                    const maxS = 10;
                    const ptW = 100 / (scores.length - 1 || 1);
                    const points = scores.map((s, i) => {
                        const x = i * ptW;
                        const y = 100 - (s.score / maxS * 100);
                        return `${x},${y}`;
                    }).join(' ');
                    const dots = scores.map((s, i) => {
                        const x = i * ptW;
                        const y = 100 - (s.score / maxS * 100);
                        return `<circle cx="${x}%" cy="${y}%" r="3" fill="#f59e0b"><title>${s.date}: ${s.score}/10</title></circle>`;
                    }).join('');
                    scoreEl.outerHTML = `<svg width="100%" height="140" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
                        <polyline points="${points}" fill="none" stroke="#f59e0b" stroke-width="2" vector-effect="non-scaling-stroke"/>
                        ${dots}</svg>`;
                }
            }
        } catch (e) {
            Toast.error('Failed to load analytics');
        }
    },

    async startTextChat() {
        try {
            const { conversation } = await API.post('/conversations', {
                agent_id: this.agent.id,
                mode: 'text'
            });
            Router.navigate(`/chat/${conversation.id}`);
        } catch (error) {
            Toast.error('Failed to start chat', error.message);
        }
    },

    async startVideoCall() {
        try {
            const { conversation } = await API.post('/conversations', {
                agent_id: this.agent.id,
                mode: 'video'
            });
            Router.navigate(`/video-call/${conversation.id}`);
        } catch (error) {
            Toast.error('Failed to start video call', error.message);
        }
    },

    showCreateLinkModal() {
        const content = `
            <div style="color: var(--gray-500); font-size: 0.95rem; margin-bottom: 1.5rem; margin-top: -0.5rem;">
                Configure the share link settings
            </div>

            <div class="form-group">
                <label class="form-label" style="font-weight: 600; color: #111827;">Link Name</label>
                <input type="text" id="link-name" class="form-input" placeholder="e.g., Interview Session 1">
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 600; color: #111827; margin-bottom: 0.25rem;">Password Protection</div>
                        <div style="color: var(--gray-500); font-size: 0.85rem;">Require password to access</div>
                    </div>
                    <div class="toggle" id="toggle-password"></div>
                </div>
                <div id="password-input-container" style="display: none; margin-top: 1rem;">
                    <input type="password" id="link-password" class="form-input" placeholder="Enter password">
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--gray-200);">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-weight: 600; color: #111827;">Expires in (days)</label>
                    <input type="number" id="link-expires" class="form-input" placeholder="0 = never" min="0">
                </div>
                
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-weight: 600; color: #111827;">Max Uses</label>
                    <input type="number" id="link-max-uses" class="form-input" placeholder="0 = unlimited" min="0">
                </div>
            </div>
            
            <div class="form-group" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #111827;">Require Name</span>
                    <div class="toggle active" id="toggle-require-name"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #111827;">Require Email</span>
                    <div class="toggle" id="toggle-require-email"></div>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="Modal.close()" style="background: white; border: 1px solid var(--gray-300); color: var(--gray-700);">Cancel</button>
            <button class="btn btn-primary" onclick="AgentDetailPage.createLink()" style="background: #0f172a; color: white;">Create Link</button>
        `;

        Modal.open('Create Share Link', content, footer);

        // Styling the modal content wrapper via inline styles on the container if needed
        const modalContainer = document.getElementById('modal');
        if (modalContainer) {
            modalContainer.style.maxWidth = '460px'; // Make it slightly narrower if needed to match image perfectly
        }

        // Setup toggles
        document.getElementById('toggle-password')?.addEventListener('click', function () {
            this.classList.toggle('active');
            const pwdContainer = document.getElementById('password-input-container');
            if (this.classList.contains('active')) {
                pwdContainer.style.display = 'block';
                document.getElementById('link-password').focus();
            } else {
                pwdContainer.style.display = 'none';
                document.getElementById('link-password').value = ''; // clear when turned off
            }
        });

        document.getElementById('toggle-require-name')?.addEventListener('click', function () {
            this.classList.toggle('active');
        });
        document.getElementById('toggle-require-email')?.addEventListener('click', function () {
            this.classList.toggle('active');
        });
    },

    async createLink() {
        const isPasswordProtected = document.getElementById('toggle-password').classList.contains('active');
        const passwordValue = document.getElementById('link-password')?.value || '';

        if (isPasswordProtected && !passwordValue.trim()) {
            Toast.error('Please enter a password');
            return;
        }

        let linkExpires = parseInt(document.getElementById('link-expires').value);
        if (isNaN(linkExpires) || linkExpires <= 0) linkExpires = null;
        
        let linkMaxUses = parseInt(document.getElementById('link-max-uses').value);
        if (isNaN(linkMaxUses) || linkMaxUses <= 0) linkMaxUses = null;

        const data = {
            name: document.getElementById('link-name')?.value?.trim() || null,
            password: isPasswordProtected ? passwordValue : null,
            expires_days: linkExpires,
            max_uses: linkMaxUses,
            require_name: document.getElementById('toggle-require-name').classList.contains('active'),
            require_email: document.getElementById('toggle-require-email').classList.contains('active')
        };

        try {
            const { share_link } = await API.post(`/agents/${this.agent.id}/share-links`, data);
            Modal.close();
            Toast.success('Share link created');
            this.copyLink(share_link.token);
            this.loadShareLinks();
        } catch (error) {
            Toast.error('Failed to create link', error.message);
        }
    },

    copyLink(token) {
        const url = `${window.location.origin}${window.location.pathname}#/share/${token}`;
        navigator.clipboard.writeText(url);
        Toast.success('Link copied to clipboard');
    },

    async deleteLink(linkId) {
        Modal.confirm(
            'Delete Share Link',
            'Are you sure you want to delete this share link? Anyone with this link will no longer be able to access the agent.',
            async () => {
                try {
                    await API.delete(`/share-links/${linkId}`);
                    Toast.success('Share link deleted');
                    this.loadShareLinks();
                } catch (error) {
                    Toast.error('Failed to delete link', error.message);
                }
            },
            'Delete',
            true
        );
    },

    deleteAgent() {
        if (this.agent.is_default) {
            Toast.error('Cannot delete system default agent');
            return;
        }
        Modal.confirm(
            'Delete Agent',
            `Are you sure you want to delete "${this.agent.name}"? This will also delete all conversations and share links associated with this agent.`,
            async () => {
                try {
                    await API.delete(`/agents/${this.agent.id}`);
                    Toast.success('Agent deleted');
                    Router.navigate('/agents');
                } catch (error) {
                    Toast.error('Failed to delete agent', error.message);
                }
            },
            'Delete',
            true
        );
    },

    openRemoteControl() {
        Router.navigate(`/anchoring-remote/${this.agent.id}`);
    },

    async startAnchoring() {
        try {
            const { conversation } = await API.post('/conversations', {
                agent_id: this.agent.id,
                mode: 'video'
            });
            window.open(`${window.location.origin}${window.location.pathname}#/anchoring/${conversation.id}`, '_blank');
        } catch (error) {
            Toast.error('Failed to start anchoring', error.message);
        }
    },

    async saveScript() {
        const textarea = document.getElementById('anc-detail-script');
        if (!textarea) return;

        try {
            await API.post(`/agents/${this.agent.id}/anchoring/script`, {
                script: textarea.value
            });
            this.agent.script_content = textarea.value;
            Toast.success('Script saved successfully');
        } catch (error) {
            Toast.error('Failed to save script', error.message);
        }
    }
};
