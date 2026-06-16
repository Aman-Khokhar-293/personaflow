/**
 * PersonaFlow - Reports Pages
 * Shows report generation history for all agents
 */

const ReportsPage = {
    reports: [],

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Reports</h1>
                    <p class="page-subtitle">View conversation reports and evaluations</p>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="flex items-center gap-4" style="flex-wrap: wrap;">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" class="form-input search-expandable" id="search-reports" placeholder="Search reports...">
                    </div>
                    <select class="form-select" id="filter-agent" style="width: auto; flex-shrink: 0;">
                        <option value="all">All Agents</option>
                    </select>
                </div>
            </div>
            
            <div id="reports-list">
                <div class="empty-state"><div class="spinner"></div></div>
            </div>
        `;

        this.loadReports();
        this.loadAgents();
        this.setupListeners();
    },

    async loadReports() {
        try {
            const { reports } = await API.get('/reports');
            this.reports = reports;
            this.renderList();
        } catch (error) {
            Toast.error('Failed to load reports');
        }
    },

    async loadAgents() {
        try {
            const { agents } = await API.get('/agents');
            const select = document.getElementById('filter-agent');
            if (select) {
                agents.forEach(agent => {
                    const option = document.createElement('option');
                    option.value = agent.id;
                    option.textContent = agent.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load agents for filter');
        }
    },

    setupListeners() {
        document.getElementById('search-reports')?.addEventListener('input', () => this.renderList());
        document.getElementById('filter-agent')?.addEventListener('change', () => this.renderList());
    },

    renderList() {
        const container = document.getElementById('reports-list');
        const search = document.getElementById('search-reports')?.value.toLowerCase() || '';
        const agentFilter = document.getElementById('filter-agent')?.value || 'all';

        let filtered = this.reports.filter(report => {
            if (search && !report.participant_name?.toLowerCase().includes(search)) return false;
            if (agentFilter !== 'all' && String(report.agent_id || report.conversation?.agent_id) !== agentFilter) return false;
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <div class="empty-title">No reports yet</div>
                        <div class="empty-message">Reports are generated when conversations end. Open an agent to use the AI Report Chat.</div>
                    </div>
                </div>
            `;
            return;
        }

        const colors = ['#e67e22', '#3498db', '#9b59b6', '#2ecc71', '#e74c3c', '#1abc9c'];

        container.innerHTML = `
            <div class="reports-grid">
                ${filtered.map((report, idx) => {
            const color = report.agent_color || colors[idx % colors.length];
            const dateStr = this.formatDate(report.created_at);
            const title = `Report: ${report.participant_name || 'Anonymous'} - ${dateStr}`;
            return `
                    <div class="report-card card" onclick="Router.navigate('/reports/${report.id}')">
                        <div class="report-card-icon" style="background: ${color}20; color: ${color};">
                            ${report.agent_icon || '<i class="fas fa-user-tie"></i>'}
                        </div>
                        <div class="report-card-title">${title}</div>
                        <div class="report-card-participant">
                            <i class="fas fa-user" style="font-size: 0.75rem; opacity: 0.5;"></i>
                            ${report.participant_name || 'Anonymous'}
                        </div>
                        ${report.overall_score !== null ? `
                            <div class="report-card-score">
                                <i class="fas fa-star" style="color: #f59e0b;"></i>
                                <span class="report-score-num">${Math.round(report.overall_score)}</span>
                                <span class="report-score-max">/100</span>
                            </div>
                        ` : ''}
                        <div class="report-card-desc">
                            ${report.summary ? report.summary.substring(0, 130) + '...' : 'No summary available'}
                        </div>
                        <div class="report-card-bottom">
                            <span class="badge-full">full</span>
                            <span class="report-card-date">${dateStr}</span>
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
};

/**
 * Report Detail Page
 */
const ReportDetailPage = {
    currentReport: null,

    _parseFeedback(feedback) {
        if (!feedback) return { text: '', strengths: [], improvements: [], insights: [] };

        const strengths = [];
        const improvements = [];
        const insights = [];
        let overallText = '';
        let currentSection = 'text';

        const lines = feedback.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const lower = trimmed.toLowerCase();
            if (lower.includes('strength') || lower.includes('positive') || lower.includes('did well')) {
                currentSection = 'strengths';
                continue;
            } else if (lower.includes('improvement') || lower.includes('areas for') || lower.includes('could improve') || lower.includes('weakness')) {
                currentSection = 'improvements';
                continue;
            } else if (lower.includes('insight') || lower.includes('key takeaway') || lower.includes('recommendation') || lower.includes('actionable')) {
                currentSection = 'insights';
                continue;
            }

            const cleaned = trimmed.replace(/^[-*•·→✓✔●◆▪\d.)\]]+\s*/, '').trim();
            if (!cleaned) continue;

            switch (currentSection) {
                case 'strengths': strengths.push(cleaned); break;
                case 'improvements': improvements.push(cleaned); break;
                case 'insights': insights.push(cleaned); break;
                default: overallText += (overallText ? ' ' : '') + trimmed;
            }
        }

        return { text: overallText, strengths, improvements, insights };
    },

    async render(container, reportId) {
        try {
            const { report } = await API.get(`/reports/${reportId}`);
            this.currentReport = report;

            const parsed = this._parseFeedback(report.feedback);
            const strengths = parsed.strengths.length > 0 ? parsed.strengths : (Array.isArray(report.strengths) ? report.strengths : []);
            const improvements = parsed.improvements.length > 0 ? parsed.improvements : (Array.isArray(report.improvements) ? report.improvements : []);
            const insights = parsed.insights.length > 0 ? parsed.insights : (Array.isArray(report.key_insights) ? report.key_insights : []);
            const feedbackText = parsed.text || (strengths.length === 0 && improvements.length === 0 ? report.feedback : '');
            const dateStr = App.formatDate ? App.formatDate(report.created_at) : new Date(report.created_at).toLocaleString();

            container.innerHTML = `
                <div class="page-header" style="max-width: 800px; margin: 0 auto;">
                    <button class="btn btn-secondary" onclick="Router.back()">← Back to Reports</button>
                </div>

                <div class="report-modal-card">
                    <div class="report-header">
                        <div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--gray-900); margin-bottom: 0.25rem;">
                                Report: ${report.participant_name || 'Anonymous'} - ${dateStr.split(',')[0]}
                            </h2>
                            <div class="flex items-center gap-2">
                                <div class="agent-icon" style="width: 24px; height: 24px; background: ${report.agent?.color || '#6366f1'}20; font-size: 0.875rem;">${report.agent?.icon || '🤖'}</div>
                                <span style="font-weight: 600; color: var(--gray-900);">${report.agent?.name || 'Agent'}</span>
                                <span style="color: var(--gray-400);">|</span>
                                <span style="color: var(--gray-500);">${report.participant_name || 'Anonymous'}</span>
                            </div>
                        </div>
                        <button class="report-download-btn" onclick="ReportDetailPage.downloadReport()">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>

                    ${report.overall_score !== null && report.overall_score !== undefined ? `
                        <div class="report-score-section">
                            <div class="report-score-large">
                                <i class="fas fa-star" style="color: #f59e0b; font-size: 2.5rem; vertical-align: middle; margin-right: 0.25rem;"></i>
                                ${Math.round(report.overall_score)}<span style="font-size: 2rem; color: var(--gray-400); font-weight: 400;">/100</span>
                            </div>
                            <div class="report-score-label">Overall Score</div>
                        </div>
                    ` : ''}

                    ${report.summary ? `<div class="report-section"><h3 class="report-section-title">Summary</h3><p class="report-text">${report.summary}</p></div>` : ''}
                    ${feedbackText ? `<div class="report-section"><h3 class="report-section-title">Overall Feedback</h3><p class="report-text">${feedbackText}</p></div>` : ''}
                    ${strengths.length > 0 ? `<div class="report-section"><h3 class="report-section-title">Strengths</h3><ul class="strength-list">${strengths.map(item => `<li>${item}</li>`).join('')}</ul></div>` : ''}
                    ${improvements.length > 0 ? `<div class="report-section"><h3 class="report-section-title">Areas for Improvement</h3><ul class="improvement-list">${improvements.map(item => `<li>${item}</li>`).join('')}</ul></div>` : ''}
                    ${insights.length > 0 ? `<div class="report-section"><h3 class="report-section-title">Key Insights</h3><ul class="key-insights-list">${insights.map(item => `<li>${item}</li>`).join('')}</ul></div>` : ''}

                    <div class="report-footer">Generated on ${dateStr}</div>
                </div>
            `;

        } catch (error) {
            console.error(error);
            Toast.error('Failed to load report');
            Router.navigate('/reports');
        }
    },

    downloadReport() {
        const report = this.currentReport;
        if (!report) { Toast.error('No report data available'); return; }

        const parsed = this._parseFeedback(report.feedback);
        const strengths = parsed.strengths.length > 0 ? parsed.strengths : (Array.isArray(report.strengths) ? report.strengths : []);
        const improvements = parsed.improvements.length > 0 ? parsed.improvements : (Array.isArray(report.improvements) ? report.improvements : []);
        const insights = parsed.insights.length > 0 ? parsed.insights : (Array.isArray(report.key_insights) ? report.key_insights : []);
        const feedbackText = parsed.text || (strengths.length === 0 && improvements.length === 0 ? report.feedback : '');
        const dateStr = App.formatDate ? App.formatDate(report.created_at) : new Date(report.created_at).toLocaleString();
        const score = report.overall_score !== null && report.overall_score !== undefined ? Math.round(report.overall_score) : null;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Report - ${report.participant_name || 'Anonymous'} - ${dateStr}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; color: #1f2937; background: #f9fafb; padding: 2rem; }
        .report-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .report-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid #f3f4f6; }
        .report-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.25rem; }
        .report-agent { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280; }
        .score-section { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 2rem; text-align: center; border-bottom: 1px solid #f3f4f6; }
        .score-value { font-size: 3.5rem; font-weight: 700; color: #d97706; line-height: 1; margin-bottom: 0.25rem; }
        .section { padding: 1.5rem 2rem; border-bottom: 1px solid #f3f4f6; }
        .section-title { font-size: 1rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem; }
        .section-text { color: #4b5563; line-height: 1.7; font-size: 0.9375rem; }
        .list { list-style: none; padding: 0; margin: 0; }
        .list li { display: flex; gap: 0.75rem; margin-bottom: 0.625rem; font-size: 0.9375rem; color: #374151; line-height: 1.6; }
        .list.strengths li::before { content: "✓"; color: #10b981; font-weight: 700; flex-shrink: 0; }
        .list.improvements li::before { content: "—"; color: #f59e0b; font-weight: 700; flex-shrink: 0; }
        .list.insights li::before { content: "●"; color: #6366f1; font-weight: 700; flex-shrink: 0; font-size: 0.6rem; margin-top: 0.5rem; }
        .report-footer { padding: 1.25rem 2rem; background: #f9fafb; color: #9ca3af; font-size: 0.8125rem; text-align: center; }
        @media print { body { padding: 0; background: white; } .report-container { box-shadow: none; border-radius: 0; } .no-print { display: none !important; } }
    </style>
</head>
<body>
    <div style="text-align: center; margin-bottom: 1rem;" class="no-print">
        <button onclick="window.print()" style="padding: 10px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer;">📥 Save as PDF</button>
    </div>
    <div class="report-container">
        <div class="report-header">
            <div>
                <div class="report-title">Report: ${report.participant_name || 'Anonymous'} - ${dateStr.split(',')[0]}</div>
                <div class="report-agent"><span>${report.agent?.icon || '🤖'}</span><strong>${report.agent?.name || 'Agent'}</strong><span style="color:#d1d5db;">|</span><span>${report.participant_name || 'Anonymous'}</span></div>
            </div>
        </div>
        ${score !== null ? `<div class="score-section"><div class="score-value">⭐ ${score}<span style="font-size:2rem;color:#9ca3af;font-weight:400;">/100</span></div><div>Overall Score</div></div>` : ''}
        ${report.summary ? `<div class="section"><div class="section-title">Summary</div><div class="section-text">${report.summary}</div></div>` : ''}
        ${feedbackText ? `<div class="section"><div class="section-title">Overall Feedback</div><div class="section-text">${feedbackText}</div></div>` : ''}
        ${strengths.length > 0 ? `<div class="section"><div class="section-title">Strengths</div><ul class="list strengths">${strengths.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
        ${improvements.length > 0 ? `<div class="section"><div class="section-title">Areas for Improvement</div><ul class="list improvements">${improvements.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
        ${insights.length > 0 ? `<div class="section"><div class="section-title">Key Insights</div><ul class="list insights">${insights.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
        <div class="report-footer">Generated on ${dateStr} &nbsp;•&nbsp; PersonaFlow</div>
    </div>
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    }
};
