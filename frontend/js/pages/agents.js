/**
 * PersonaFlow - Agents List Page
 * With Folders, enhanced Status Badges (Active/Draft/Archived), and quick-toggle
 */

const AgentsPage = {
    agents: [],
    viewMode: 'grid',

    // ── Folder helpers (localStorage) ────────────────────────────────────────
    getFolders() {
        try { return JSON.parse(localStorage.getItem('pf-folders') || '{}'); } catch { return {}; }
    },
    saveFolders(f) { localStorage.setItem('pf-folders', JSON.stringify(f)); },
    getFolderNames() { return Object.keys(this.getFolders()); },
    getAgentFolder(agentId) {
        const f = this.getFolders();
        for (const [name, ids] of Object.entries(f)) if (ids.includes(agentId)) return name;
        return null;
    },
    addFolder(name) {
        const f = this.getFolders(); f[name] = f[name] || []; this.saveFolders(f);
    },
    moveToFolder(agentId, folderName) {
        const f = this.getFolders();
        // Remove from all folders first
        for (const ids of Object.values(f)) { const i = ids.indexOf(agentId); if (i > -1) ids.splice(i, 1); }
        if (folderName && folderName !== '__none__') { f[folderName] = f[folderName] || []; f[folderName].push(agentId); }
        this.saveFolders(f);
    },
    // ─────────────────────────────────────────────────────────────────────────

    async render(container) {
        const folders = this.getFolderNames();

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">My Agents</h1>
                    <p class="page-subtitle">Create and manage your AI conversation agents</p>
                </div>
                <div style="display:flex;gap:0.75rem;">
                    <a href="#/templates" class="btn btn-secondary btn-new-agent">
                        <span><i class="fas fa-magic"></i></span> Templates
                    </a>
                    <a href="#/agents/new" class="btn btn-primary btn-new-agent">
                        <span><i class="fas fa-plus"></i></span> Create Agent
                    </a>
                </div>
            </div>

            <div class="card mb-4">
                <div class="flex items-center gap-4" style="flex-wrap:wrap;">
                    <input type="text" class="form-input" id="search-agents" placeholder="Search agents..." style="max-width: 220px;">

                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter" style="color: var(--gray-400); font-size: 0.875rem;"></i>
                        <select class="form-select" id="filter-status" style="width: auto;">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2">
                        <i class="fas fa-folder" style="color: var(--gray-400); font-size: 0.875rem;"></i>
                        <select class="form-select" id="filter-folder" style="width: auto;">
                            <option value="all">All Folders</option>
                            <option value="__unfoldered__">Unfiled</option>
                            ${folders.map(f => `<option value="${this._esc(f)}">${this._esc(f)}</option>`).join('')}
                        </select>
                    </div>

                    <button class="btn btn-secondary btn-sm" onclick="AgentsPage.promptNewFolder()" title="Create folder" style="padding:0.4rem 0.75rem;">
                        <i class="fas fa-folder-plus"></i> New Folder
                    </button>

                    <div class="view-toggle" style="margin-left: auto; display: flex; gap: 0.25rem;">
                        <button class="btn-view-toggle active" id="btn-grid-view" title="Grid View" onclick="AgentsPage.setView('grid')">
                            <i class="fas fa-th-large"></i>
                        </button>
                        <button class="btn-view-toggle" id="btn-list-view" title="List View" onclick="AgentsPage.setView('list')">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div id="agents-grid" class="agents-grid">
                <div class="empty-state"><div class="spinner"></div></div>
            </div>
        `;

        this.loadAgents();
        this.setupListeners();
    },

    setupListeners() {
        document.getElementById('search-agents')?.addEventListener('input', () => this.renderAgents());
        document.getElementById('filter-status')?.addEventListener('change', () => this.renderAgents());
        document.getElementById('filter-folder')?.addEventListener('change', () => this.renderAgents());
    },

    setView(mode) {
        this.viewMode = mode;
        document.getElementById('btn-grid-view')?.classList.toggle('active', mode === 'grid');
        document.getElementById('btn-list-view')?.classList.toggle('active', mode === 'list');
        this.renderAgents();
    },

    async loadAgents() {
        try {
            const { agents } = await API.get('/agents');
            this.agents = agents;
            this.renderAgents();
        } catch (error) {
            Toast.error('Failed to load agents', error.message);
        }
    },

    renderAgents() {
        const grid = document.getElementById('agents-grid');
        const search = document.getElementById('search-agents')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filter-status')?.value || 'all';
        const folderFilter = document.getElementById('filter-folder')?.value || 'all';

        let filtered = this.agents.filter(agent => {
            if (search && !agent.name?.toLowerCase().includes(search) && !agent.role?.toLowerCase().includes(search)) return false;
            if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
            if (folderFilter !== 'all') {
                const agentFolder = this.getAgentFolder(agent.id);
                if (folderFilter === '__unfoldered__' && agentFolder) return false;
                if (folderFilter !== '__unfoldered__' && agentFolder !== folderFilter) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon" style="font-size: 2rem; color: var(--gray-400); margin-bottom: 0.5rem;"><i class="fas fa-robot"></i></div>
                    <div class="empty-title">No agents found</div>
                    <div class="empty-message">Try adjusting your filters or create a new agent</div>
                    <a href="#/agents/new" class="btn btn-primary">Create Agent</a>
                </div>
            `;
            return;
        }

        grid.className = this.viewMode === 'grid' ? 'agents-grid' : 'agents-list-view';

        grid.innerHTML = filtered.map(agent => {
            const folderName = this.getAgentFolder(agent.id);
            const statusInfo = this.getStatusInfo(agent.status);
            return `
            <div class="card agent-card" onclick="Router.navigate('/agents/${agent.id}')">
                <div class="agent-card-top">
                    <div class="agent-icon" style="background: ${agent.color}; display: flex; align-items: center; justify-content: center; color: white;">${App.getAgentIconHtml(agent.icon)}</div>
                    ${agent.agent_type === 'anchoring' ? '<span class="badge" style="position:absolute;top:12px;right:12px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-size:0.7rem;"><i class="fas fa-microphone" style="font-size: 0.75rem;"></i> Anchoring</span>' : ''}
                    ${agent.is_default ? '<span style="position:absolute;top:12px;left:12px;font-size:14px;color:var(--gray-400);" title="System Agent"><i class="fas fa-lock"></i></span>' : ''}
                    ${folderName ? `<span style="position:absolute;bottom:12px;left:12px;font-size:0.7rem;background:rgba(0,0,0,0.4);color:#fff;border-radius:6px;padding:2px 6px;"><i class="fas fa-folder" style="font-size: 0.7rem;"></i> ${this._esc(folderName)}</span>` : ''}
                </div>
                <div class="agent-card-body">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-role">${agent.role}</div>
                </div>
                <div class="agent-card-footer">
                    <div class="agent-card-meta">
                        <span class="agent-meta-item"><i class="fas fa-comments"></i> ${agent.conversation_count}</span>
                        <!-- Status badge with quick-toggle -->
                        <span class="badge ${agent.status}" style="cursor:pointer;user-select:none;" title="Click to change status"
                            onclick="event.stopPropagation(); AgentsPage.cycleStatus(${agent.id}, '${agent.status}', this)">
                            ${statusInfo.dot} ${agent.status}
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div class="agent-card-date">Created ${this.formatDate(agent.created_at)}</div>
                        <button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.5rem;font-size:0.7rem;"
                            onclick="event.stopPropagation(); AgentsPage.promptFolder(${agent.id})"
                            title="Move to folder"><i class="fas fa-folder"></i></button>
                    </div>
                </div>
            </div>
        `}).join('');
    },

    getStatusInfo(status) {
        const map = {
            active: { dot: '●', label: 'Active' },
            draft: { dot: '◐', label: 'Draft' },
            archived: { dot: '○', label: 'Archived' },
            inactive: { dot: '○', label: 'Inactive' }
        };
        return map[status] || map['active'];
    },

    async cycleStatus(agentId, currentStatus, badgeEl) {
        const cycle = { active: 'draft', draft: 'archived', archived: 'active', inactive: 'active' };
        const newStatus = cycle[currentStatus] || 'active';
        try {
            await API.put(`/agents/${agentId}`, { status: newStatus });
            // Update the agent in local array
            const agent = this.agents.find(a => a.id === agentId);
            if (agent) agent.status = newStatus;
            const info = this.getStatusInfo(newStatus);
            badgeEl.className = `badge ${newStatus}`;
            badgeEl.innerHTML = `${info.dot} ${newStatus}`;
            badgeEl.setAttribute('onclick', `event.stopPropagation(); AgentsPage.cycleStatus(${agentId}, '${newStatus}', this)`);
            Toast.success('Status updated', `Agent is now ${newStatus}`);
        } catch (e) {
            Toast.error('Failed to update status');
        }
    },

    promptNewFolder() {
        Modal.open('New Folder', `
            <div>
                <label class="form-label">Folder Name</label>
                <input class="form-input" id="new-folder-name" placeholder="e.g. Sales Team" autofocus>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="AgentsPage._confirmNewFolder()">Create</button>
        `);
    },

    _confirmNewFolder() {
        const name = document.getElementById('new-folder-name')?.value.trim();
        if (!name) return;
        this.addFolder(name);
        Modal.close();
        Toast.success('Folder created', name);
        this.render(document.getElementById('main-content'));
    },

    promptFolder(agentId) {
        const folders = this.getFolderNames();
        const currentFolder = this.getAgentFolder(agentId);

        Modal.open('Move to Folder', `
            <div>
                <label class="form-label">Choose a folder</label>
                <select class="form-input" id="move-folder-select">
                    <option value="__none__">No folder (remove)</option>
                    ${folders.map(f => `<option value="${this._esc(f)}" ${currentFolder === f ? 'selected' : ''}>${this._esc(f)}</option>`).join('')}
                </select>
                <div style="margin-top:0.75rem;">
                    <input class="form-input" id="new-folder-inline" placeholder="Or type a new folder name...">
                </div>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="AgentsPage._confirmMoveFolder(${agentId})">Move</button>
        `);
    },

    _confirmMoveFolder(agentId) {
        const newName = document.getElementById('new-folder-inline')?.value.trim();
        const selected = document.getElementById('move-folder-select')?.value;
        const target = newName || selected;
        if (newName) this.addFolder(newName);
        this.moveToFolder(agentId, target);
        Modal.close();
        Toast.success('Moved', target === '__none__' ? 'Removed from folder' : `Moved to "${target}"`);
        this.renderAgents();
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    _esc(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
};
