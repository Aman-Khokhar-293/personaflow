/**
 * PersonaFlow - Notification System
 * In-app bell icon with real-time polling for shared agent activity
 */

const Notifications = {
    items: [],
    readIds: new Set(),
    pollInterval: null,
    POLL_MS: 30000, // 30 seconds

    init() {
        // Load read notification IDs from localStorage
        try {
            const stored = localStorage.getItem('pf-notif-read');
            this.readIds = new Set(JSON.parse(stored || '[]'));
        } catch (e) {
            this.readIds = new Set();
        }

        this.injectBell();
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), this.POLL_MS);
    },

    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    injectBell() {
        // Insert bell button into the sidebar header
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (!sidebarHeader || document.getElementById('notif-bell')) return;

        const bellWrapper = document.createElement('div');
        bellWrapper.id = 'notif-bell-wrapper';
        bellWrapper.style.cssText = 'position:relative;cursor:pointer;margin-left:auto;';
        bellWrapper.innerHTML = `
            <button id="notif-bell" title="Notifications" style="
                background: none; border: none; cursor: pointer;
                font-size: 1.2rem; padding: 0.25rem 0.4rem;
                border-radius: 8px; transition: background 0.2s;
                color: var(--gray-400, #9ca3af);
                position: relative;
            " onmouseover="this.style.background='var(--gray-100,#f3f4f6)'" onmouseout="this.style.background='none'"
               onclick="Notifications.togglePanel()">
                🔔
                <span id="notif-badge" style="
                    position: absolute; top: -4px; right: -4px;
                    background: #ef4444; color: white;
                    font-size: 0.65rem; font-weight: 700;
                    border-radius: 999px; min-width: 16px; height: 16px;
                    display: none; align-items: center; justify-content: center;
                    line-height: 1; padding: 0 3px;
                    border: 2px solid var(--surface, white);
                ">0</span>
            </button>
        `;

        sidebarHeader.appendChild(bellWrapper);

        // ─────────────────────────────────────────────────────────────────
        // IMPORTANT: attach the panel to <body> so it is NEVER clipped by
        // the sidebar's overflow or width constraints.  We position it
        // dynamically via getBoundingClientRect() each time it opens.
        // ─────────────────────────────────────────────────────────────────
        const panel = document.createElement('div');
        panel.id = 'notif-panel';
        panel.style.cssText = `
            display: none;
            position: fixed;
            width: 320px;
            background: var(--surface, #ffffff);
            border: 1px solid var(--gray-200, #e5e7eb);
            border-radius: 14px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.18);
            z-index: 99999;
            overflow: hidden;
        `;
        panel.innerHTML = `
            <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--gray-100,#f3f4f6); display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--gray-900,#111827);">Notifications</div>
                <button onclick="Notifications.markAllRead()" style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:var(--primary-500,#6366f1);font-weight:500;">
                    Mark all read
                </button>
            </div>
            <div id="notif-list" style="max-height: 360px; overflow-y: auto;">
                <div style="padding: 2rem; text-align: center; color: var(--gray-400,#9ca3af); font-size: 0.875rem;">
                    No notifications yet
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Close panel when clicking outside both the bell and the panel
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('notif-bell-wrapper');
            if (!wrapper?.contains(e.target) && !panel.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    },

    async poll() {
        try {
            const data = await API.get('/notifications');
            this.items = data.notifications || [];
            this.renderBadge();
        } catch (e) {
            // Silently ignore polling failures
        }
    },

    renderBadge() {
        const unread = this.items.filter(n => !this.readIds.has(n.id));
        const badge = document.getElementById('notif-badge');
        if (!badge) return;

        if (unread.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = unread.length > 9 ? '9+' : unread.length;
        } else {
            badge.style.display = 'none';
        }
    },

    togglePanel() {
        const panel = document.getElementById('notif-panel');
        const bell = document.getElementById('notif-bell');
        if (!panel || !bell) return;

        const isOpen = panel.style.display === 'block';

        if (isOpen) {
            panel.style.display = 'none';
            return;
        }

        // ── Position the panel relative to the bell button's screen rect ──
        const rect = bell.getBoundingClientRect();
        const panelWidth = 320;
        const margin = 8; // gap between bell and panel top edge

        // Place the panel just below the bell
        let top = rect.bottom + margin;
        // Align left edge of panel with left edge of bell (then clamp to viewport)
        let left = rect.left;

        // If it would overflow the right edge of the viewport, shift left
        if (left + panelWidth > window.innerWidth - 12) {
            left = window.innerWidth - panelWidth - 12;
        }
        // Never go off-screen left
        if (left < 8) left = 8;

        // If it would overflow the bottom, open upward instead
        const panelMaxHeight = 420; // header + list max-height
        if (top + panelMaxHeight > window.innerHeight) {
            top = rect.top - panelMaxHeight - margin;
        }

        panel.style.top = `${top}px`;
        panel.style.left = `${left}px`;
        panel.style.display = 'block';

        this.renderPanel();
    },

    renderPanel() {
        const list = document.getElementById('notif-list');
        if (!list) return;

        if (this.items.length === 0) {
            list.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--gray-400,#9ca3af); font-size: 0.875rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔔</div>
                    No notifications yet
                </div>
            `;
            return;
        }

        list.innerHTML = this.items.map(n => {
            const isRead = this.readIds.has(n.id);
            return `
                <div onclick="Notifications.handleClick('${n.id}', '${n.link || ''}')" style="
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--gray-50,#f9fafb);
                    cursor: pointer;
                    display: flex; gap: 0.75rem; align-items: flex-start;
                    background: ${isRead ? 'transparent' : 'var(--primary-50,#eef2ff)'};
                    transition: background 0.15s;
                " onmouseover="this.style.background='var(--gray-50,#f9fafb)'" onmouseout="this.style.background='${isRead ? 'transparent' : 'var(--primary-50,#eef2ff)'}'"">
                    <div style="font-size: 1.3rem; flex-shrink: 0;">${n.icon || '🔔'}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: ${isRead ? '400' : '600'}; font-size: 0.85rem; color: var(--gray-900,#111827); margin-bottom: 0.1rem;">
                            ${n.title}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--gray-500,#6b7280); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${n.message}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--gray-400,#9ca3af); margin-top: 0.2rem;">
                            ${this.timeAgo(n.timestamp)}
                        </div>
                    </div>
                    ${!isRead ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary-500,#6366f1); flex-shrink: 0; margin-top: 0.3rem;"></div>` : ''}
                </div>
            `;
        }).join('');
    },

    handleClick(id, link) {
        this.markRead(id);
        if (link) {
            document.getElementById('notif-panel').style.display = 'none';
            Router.navigate(link);
        }
    },

    markRead(id) {
        this.readIds.add(id);
        this.saveReadIds();
        this.renderBadge();
        this.renderPanel();
    },

    markAllRead() {
        this.items.forEach(n => this.readIds.add(n.id));
        this.saveReadIds();
        this.renderBadge();
        this.renderPanel();
    },

    saveReadIds() {
        try {
            localStorage.setItem('pf-notif-read', JSON.stringify([...this.readIds]));
        } catch (e) { }
    },

    timeAgo(ts) {
        if (!ts) return '';
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }
};
