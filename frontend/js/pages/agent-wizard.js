/**
 * PersonaFlow - Agent Creation Wizard
 */

const AgentWizardPage = {
    currentStep: 1,
    agentData: {},
    editMode: false,
    agentId: null,

    // Inspiration ideas shown on the scratch screen
    scratchIdeas: [
        {
            icon: '🎤',
            title: 'Public Speaking Coach',
            role: 'Public Speaking & Presentation Coach',
            goal: 'Help users practice and improve their public speaking, presentation style, and confidence.',
            task_description: 'Run a live speaking drill. Ask the user to deliver a short speech on a topic, then give structured feedback on clarity, pacing, filler words, and confidence.',
            rules: ['Give honest but encouraging feedback', 'Focus on one improvement area at a time', 'Use real examples to illustrate tips'],
            tone: 'friendly',
            knowledge: 'Public speaking techniques, anti-anxiety strategies, presentation structure, storytelling frameworks, body language advice.',
            desc: 'Practice speeches and get real feedback on clarity, pacing & confidence.'
        },
        {
            icon: '🧑‍💼',
            title: 'Business Mentor',
            role: 'Startup & Business Strategy Mentor',
            goal: 'Guide entrepreneurs through business challenges, from idea validation to scaling strategies.',
            task_description: 'Mentor the user on their business idea or current problem. Ask probing questions to uncover assumptions, challenge weak points, and suggest frameworks or next actions.',
            rules: ['Ask clarifying questions before giving advice', 'Challenge assumptions respectfully', 'Reference real-world examples'],
            tone: 'professional',
            knowledge: 'Lean startup methodology, market validation, unit economics, fundraising, go-to-market strategy.',
            desc: 'A sharp mentor to challenge your business ideas and guide strategy.'
        },
        {
            icon: '🧘',
            title: 'Daily Check-In',
            role: 'Mindfulness & Wellness Companion',
            goal: 'Provide a warm, non-judgmental space for daily emotional check-ins and mental wellness support.',
            task_description: 'Start every session by checking in on how the user feels. Listen actively, then offer a coping strategy, breathing exercise, or a motivational nudge. Always clarify you are not a medical professional.',
            rules: ['Never diagnose or prescribe', 'Keep responses warm and non-judgmental', 'Recommend professional help for serious issues'],
            tone: 'friendly',
            knowledge: 'Mindfulness techniques, CBT basics, breathing exercises, positive psychology, stress management.',
            desc: 'A calming check-in companion for mindfulness and stress relief.'
        },
        {
            icon: '📚',
            title: 'Study Buddy',
            role: 'Academic Tutor & Study Partner',
            goal: 'Help students understand topics deeply through explanation, quizzes, and practice problems.',
            task_description: 'Act as a tutor for the subject the user specifies. Explain concepts clearly, create practice questions, and quiz the user. Adapt difficulty based on their responses.',
            rules: ['Explain WHY, not just HOW', 'Use simple analogies before technical detail', 'Quiz the user to test understanding'],
            tone: 'friendly',
            knowledge: 'Pedagogy, Socratic method, spaced repetition, active recall, a broad range of academic subjects.',
            desc: 'A patient tutor who explains, quizzes, and adapts to your level.'
        },
        {
            icon: '🚀',
            title: 'Product Manager',
            role: 'Senior Product Manager',
            goal: 'Help teams define product requirements, prioritize features, and align on strategy.',
            task_description: 'Run a product planning session. Help the user clarify user stories, identify the core problem, prioritize features using frameworks like RICE, and draft a roadmap narrative.',
            rules: ['Always start with the user problem, not the solution', 'Apply RICE or MoSCoW prioritization', 'Push back if scope is too broad'],
            tone: 'professional',
            knowledge: 'Product management frameworks, RICE scoring, user story mapping, OKRs, agile methodologies.',
            desc: 'A PM who helps you prioritize features and shape your product roadmap.'
        }
    ],

    async render(container, agentId = null) {
        this.currentStep = 1;
        this.agentData = {
            name: '',
            role: '',
            goal: '',
            opening_message: '',
            task_description: '',
            rules: [],
            tone: 'professional',
            knowledge: '',
            output_config: {
                summary: true,
                transcript: true,
                report: false,
                evaluation: false,
                criteria: []
            },
            icon: '🤖',
            color: '#6366f1',
            status: 'active'
        };
        this.editMode = !!agentId;
        this.agentId = agentId;

        if (this.editMode) {
            try {
                const { agent } = await API.get(`/agents/${agentId}`);
                this.agentData = { ...this.agentData, ...agent };
            } catch (error) {
                Toast.error('Failed to load agent');
                Router.navigate('/agents');
                return;
            }
            // Edit mode: skip choice screen, go straight to wizard
            this.renderWizard(container);
        } else {
            // New agent: show choice screen first
            this.showChoiceScreen(container);
        }
    },

    // ─────────────────────────────────────────────
    // CHOICE SCREEN
    // ─────────────────────────────────────────────
    showChoiceScreen(container) {
        container.innerHTML = `
            <div class="choice-screen-wrapper">
                <div class="page-header" style="text-align: center; display: block; margin-bottom: 2rem;">
                    <h1 class="page-title">Create New Agent</h1>
                    <p class="page-subtitle">How would you like to get started?</p>
                </div>

                <div class="choice-options">
                    <div class="choice-option" id="choice-scratch">
                        <div class="choice-option-icon">✍️</div>
                        <h2 class="choice-option-title">Build from Scratch</h2>
                        <p class="choice-option-desc">Design your agent step‑by‑step. Get inspiration ideas to spark your creativity.</p>
                        <button class="btn btn-primary btn-lg" id="btn-scratch">Start Building →</button>
                    </div>

                    <div class="choice-divider">
                        <span>or</span>
                    </div>

                    <div class="choice-option" id="choice-template">
                        <div class="choice-option-icon">✨</div>
                        <h2 class="choice-option-title">Use a Template</h2>
                        <p class="choice-option-desc">Pick a ready‑made agent from our library and go live in seconds.</p>
                        <button class="btn btn-outline btn-lg" id="btn-template">Browse Templates →</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-scratch').addEventListener('click', () => {
            this.showScratchScreen(container);
        });

        document.getElementById('btn-template').addEventListener('click', () => {
            this.showTemplateScreen(container);
        });
    },

    // ─────────────────────────────────────────────
    // SCRATCH SCREEN — idea inspiration
    // ─────────────────────────────────────────────
    showScratchScreen(container) {
        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Build from Scratch</h1>
                        <p class="page-subtitle">Need some inspiration? Pick an idea or start blank.</p>
                    </div>
                    <button class="btn btn-secondary" id="back-to-choice">← Back</button>
                </div>

                <div class="scratch-ideas-grid">
                    ${this.scratchIdeas.map((idea, i) => `
                        <div class="scratch-idea-card" data-index="${i}">
                            <div class="scratch-idea-icon">${idea.icon}</div>
                            <div class="scratch-idea-title">${idea.title}</div>
                            <div class="scratch-idea-desc">${idea.desc}</div>
                            <button class="btn btn-outline btn-sm scratch-idea-use" data-index="${i}">Use this idea →</button>
                        </div>
                    `).join('')}

                    <div class="scratch-idea-card scratch-idea-blank" id="start-blank">
                        <div class="scratch-idea-icon">📄</div>
                        <div class="scratch-idea-title">Start Completely Blank</div>
                        <div class="scratch-idea-desc">Open the wizard with empty fields and build your own unique agent from the ground up.</div>
                        <button class="btn btn-primary btn-sm">Start Blank →</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('back-to-choice').addEventListener('click', () => {
            this.showChoiceScreen(container);
        });

        document.getElementById('start-blank').addEventListener('click', () => {
            this.renderWizard(container);
        });

        document.querySelectorAll('.scratch-idea-use').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                const idea = this.scratchIdeas[idx];
                // Pre-fill agent data with the idea's suggestions
                this.agentData.name = idea.title;
                this.agentData.role = idea.role;
                this.agentData.goal = idea.goal;
                this.agentData.task_description = idea.task_description;
                this.agentData.rules = [...idea.rules];
                this.agentData.tone = idea.tone;
                this.agentData.knowledge = idea.knowledge;
                this.agentData.icon = idea.icon;
                this.renderWizard(container);
            });
        });
    },

    // ─────────────────────────────────────────────
    // TEMPLATE SCREEN — inline template gallery
    // ─────────────────────────────────────────────
    showTemplateScreen(container) {
        const templates = TemplatesPage.templates;

        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Choose a Template</h1>
                        <p class="page-subtitle">Select an agent template to get started instantly.</p>
                    </div>
                    <button class="btn btn-secondary" id="back-to-choice">← Back</button>
                </div>

                <!-- Category Filter -->
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                    ${TemplatesPage.categories.map((cat, i) => `
                        <button class="template-cat-btn ${i === 0 ? 'active' : ''}"
                            onclick="AgentWizardPage._filterTemplates('${cat}', this)"
                            data-category="${cat}">
                            ${cat}
                        </button>
                    `).join('')}
                </div>

                <!-- Templates Grid -->
                <div class="templates-grid" id="wizard-templates-grid">
                    ${this._renderWizardTemplateCards(templates)}
                </div>
            </div>
        `;

        document.getElementById('back-to-choice').addEventListener('click', () => {
            this.showChoiceScreen(container);
        });
    },

    _filterTemplates(category, btn) {
        document.querySelectorAll('.template-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const templates = TemplatesPage.templates;
        const filtered = category === 'All' ? templates : templates.filter(t => t.category === category);
        const grid = document.getElementById('wizard-templates-grid');
        if (grid) grid.innerHTML = this._renderWizardTemplateCards(filtered);
    },

    _renderWizardTemplateCards(templates) {
        return templates.map(t => `
            <div class="template-card" data-category="${t.category}">
                <div class="template-card-header" style="background: linear-gradient(135deg, ${t.color}22, ${t.color}11);">
                    <div class="template-icon" style="background: ${t.color}; color: white;">
                        ${t.icon}
                    </div>
                    <div style="flex: 1;">
                        <div class="template-name">${t.name}</div>
                        <div class="template-role">${t.role}</div>
                    </div>
                    <span class="template-badge">${t.useCase}</span>
                </div>
                <div class="template-card-body">
                    <p class="template-description">${t.description}</p>
                    <div class="template-tags">
                        <span class="template-tag">${t.category}</span>
                        <span class="template-tag">${t.tone}</span>
                    </div>
                </div>
                <div class="template-card-footer">
                    <button class="btn btn-outline btn-sm" onclick="TemplatesPage.previewTemplate('${t.id}')">
                        👁 Preview
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="AgentWizardPage.confirmUseTemplate('${t.id}')">
                        ✨ Use Template
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Show confirmation modal before creating from template
    confirmUseTemplate(id) {
        const t = TemplatesPage.templates.find(t => t.id === id);
        if (!t) return;

        Modal.open(
            `Use "${t.icon} ${t.name}" Template?`,
            `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: ${t.color}11; border-radius: 12px; border: 1px solid ${t.color}33;">
                    <div style="font-size: 2.5rem;">${t.icon}</div>
                    <div>
                        <div style="font-weight: 700; font-size: 1.1rem; color: var(--gray-900);">${t.name}</div>
                        <div style="color: var(--gray-500); font-size: 0.875rem;">${t.role}</div>
                    </div>
                </div>
                <p style="color: var(--gray-600); line-height: 1.6; margin: 0;">
                    This will create a fully configured agent using the <strong>${t.name}</strong> template.
                    All fields — including rules, tone, and behavior — will be pre-filled based on the template.
                </p>
                <div style="background: var(--gray-50); border-radius: 8px; padding: 0.875rem; font-size: 0.875rem; color: var(--gray-600);">
                    💡 <strong>Tip:</strong> You can edit any detail on the agent detail page after creation.
                </div>
            </div>
            `,
            `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" id="confirm-template-btn" onclick="AgentWizardPage.createFromTemplate('${id}')">
                    ✨ Yes, Create Agent
                </button>
            `
        );
    },

    async createFromTemplate(id) {
        const t = TemplatesPage.templates.find(t => t.id === id);
        if (!t) return;

        const btn = document.getElementById('confirm-template-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

        try {
            Toast.info('Creating agent...', `Setting up ${t.name}`);

            const agent = await API.post('/agents', {
                name: t.name,
                role: t.role,
                goal: t.goal,
                opening_message: `Hi! I'm ${t.name}. ${t.description} Let's get started!`,
                task_description: t.task_description,
                rules: t.rules,
                tone: t.tone,
                knowledge: t.knowledge,
                output_config: { summary: true, transcript: true, evaluation: true, criteria: [] },
                icon: t.icon,
                color: t.color,
                status: 'active'
            });

            Modal.close();
            Toast.success('Agent created!', `${t.name} is ready to use`);
            Router.navigate(`/agents/${agent.agent.id}`);
        } catch (error) {
            Toast.error('Failed to create agent', error.message);
            if (btn) { btn.disabled = false; btn.textContent = '✨ Yes, Create Agent'; }
        }
    },

    // ─────────────────────────────────────────────
    // WIZARD
    // ─────────────────────────────────────────────
    renderWizard(container) {
        container.innerHTML = `
            <div style="max-width: 700px; margin: 0 auto;">
                <div class="page-header">
                    <div>
                        <h1 class="page-title">${this.editMode ? 'Edit Agent' : 'Create New Agent'}</h1>
                        <p class="page-subtitle">Configure your AI conversation agent</p>
                    </div>
                    ${!this.editMode ? `<button class="btn btn-secondary" id="wizard-back-btn">← Back</button>` : ''}
                </div>
                
                <div class="wizard-progress">
                    <div class="wizard-step">
                        <div class="step-indicator ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}" data-step="1">
                            <div class="step-circle">1</div>
                            <span class="step-label">Identity</span>
                        </div>
                    </div>
                    <div class="step-connector ${this.currentStep > 1 ? 'completed' : ''}"></div>
                    <div class="wizard-step">
                        <div class="step-indicator ${this.currentStep >= 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}" data-step="2">
                            <div class="step-circle">2</div>
                            <span class="step-label">Behavior</span>
                        </div>
                    </div>
                    <div class="step-connector ${this.currentStep > 2 ? 'completed' : ''}"></div>
                    <div class="wizard-step">
                        <div class="step-indicator ${this.currentStep >= 3 ? 'active' : ''} ${this.currentStep > 3 ? 'completed' : ''}" data-step="3">
                            <div class="step-circle">3</div>
                            <span class="step-label">Output</span>
                        </div>
                    </div>
                    <div class="step-connector ${this.currentStep > 3 ? 'completed' : ''}"></div>
                    <div class="wizard-step">
                        <div class="step-indicator ${this.currentStep >= 4 ? 'active' : ''}" data-step="4">
                            <div class="step-circle">4</div>
                            <span class="step-label">Customize</span>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div id="wizard-content">
                        ${this.renderStep()}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-100);">
                        <button class="btn btn-secondary" id="prev-btn" ${this.currentStep === 1 ? 'style="visibility: hidden;"' : ''}>
                            ← Previous
                        </button>
                        <button class="btn btn-primary" id="next-btn">
                            ${this.currentStep === 4 ? (this.editMode ? 'Save Changes' : 'Create Agent') : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupListeners();
    },

    renderStep() {
        switch (this.currentStep) {
            case 1: return this.renderStep1();
            case 2: return this.renderStep2();
            case 3: return this.renderStep3();
            case 4: return this.renderStep4();
            default: return '';
        }
    },

    renderStep1() {
        return `
            <h3 style="margin-bottom: 1.5rem; color: var(--gray-900);">Agent Identity</h3>
            
            <div class="form-group">
                <label class="form-label">Agent Name *</label>
                <input type="text" id="agent-name" class="form-input" placeholder="e.g., Alex the Interviewer" value="${this.agentData.name}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Role *</label>
                <input type="text" id="agent-role" class="form-input" placeholder="e.g., Technical Interviewer" value="${this.agentData.role}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Main Goal</label>
                <textarea id="agent-goal" class="form-textarea" placeholder="What is the primary objective of this agent?">${this.agentData.goal}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Opening Message</label>
                <textarea id="agent-opening" class="form-textarea" placeholder="The first message the agent will send to start the conversation">${this.agentData.opening_message}</textarea>
                <div class="form-help">This message will be shown when a conversation starts</div>
            </div>
        `;
    },

    renderStep2() {
        const rulesHtml = this.agentData.rules.map((rule, i) => `
            <div class="rule-row flex items-center gap-2 mb-2">
                <input type="text" class="form-input rule-input" value="${this._escapeHtml(rule)}" data-index="${i}" style="flex: 1;" placeholder="e.g., Always be respectful">
                <button class="btn btn-icon btn-secondary remove-rule" data-index="${i}" type="button">✕</button>
            </div>
        `).join('');

        return `
            <h3 style="margin-bottom: 1.5rem; color: var(--gray-900);">Agent Behavior</h3>
            
            <div class="form-group">
                <label class="form-label">Task Description</label>
                <textarea id="agent-task" class="form-textarea" placeholder="Describe what the agent should do in conversations">${this.agentData.task_description}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Rules &amp; Constraints</label>
                <div id="rules-container">
                    ${rulesHtml}
                </div>
                <button class="btn btn-secondary btn-sm" id="add-rule-btn" type="button">+ Add Rule</button>
                <div class="form-help">Define rules the agent must follow (e.g., "Always be respectful")</div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Tone</label>
                <select id="agent-tone" class="form-select">
                    <option value="professional" ${this.agentData.tone === 'professional' ? 'selected' : ''}>Professional</option>
                    <option value="friendly" ${this.agentData.tone === 'friendly' ? 'selected' : ''}>Friendly</option>
                    <option value="formal" ${this.agentData.tone === 'formal' ? 'selected' : ''}>Formal</option>
                    <option value="casual" ${this.agentData.tone === 'casual' ? 'selected' : ''}>Casual</option>
                    <option value="empathetic" ${this.agentData.tone === 'empathetic' ? 'selected' : ''}>Empathetic</option>
                    <option value="analytical" ${this.agentData.tone === 'analytical' ? 'selected' : ''}>Analytical</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Custom Knowledge</label>
                <textarea id="agent-knowledge" class="form-textarea" placeholder="Add specific knowledge or context the agent should know about">${this.agentData.knowledge}</textarea>
            </div>
        `;
    },

    renderStep3() {
        const config = this.agentData.output_config;
        const criteriaHtml = (config.criteria || []).map((c, i) => `
            <div class="flex items-center gap-2 mb-2">
                <input type="text" class="form-input criteria-name" value="${this._escapeHtml(c.name)}" placeholder="Criteria name" style="flex: 2;">
                <input type="number" class="form-input criteria-weight" value="${c.weight}" placeholder="Weight" min="1" max="10" style="width: 80px;">
                <button class="btn btn-icon btn-secondary remove-criteria" data-index="${i}" type="button">✕</button>
            </div>
        `).join('');

        return `
            <h3 style="margin-bottom: 1.5rem; color: var(--gray-900);">Output Configuration</h3>
            
            <p style="color: var(--gray-600); margin-bottom: 1.5rem;">Choose what to generate after conversations end</p>
            
            <div class="form-group">
                <div class="toggle-wrapper mb-3">
                    <div class="toggle ${config.summary ? 'active' : ''}" id="toggle-summary"></div>
                    <span class="toggle-label">Generate Summary</span>
                </div>
                
                <div class="toggle-wrapper mb-3">
                    <div class="toggle ${config.transcript ? 'active' : ''}" id="toggle-transcript"></div>
                    <span class="toggle-label">Save Transcript</span>
                </div>
                
                <div class="toggle-wrapper mb-3">
                    <div class="toggle ${config.evaluation ? 'active' : ''}" id="toggle-evaluation"></div>
                    <span class="toggle-label">Enable Evaluation &amp; Scoring</span>
                </div>
            </div>
            
            <div id="criteria-section" style="${config.evaluation ? '' : 'display: none;'}">
                <div class="form-group">
                    <label class="form-label">Evaluation Criteria</label>
                    <div id="criteria-container">
                        ${criteriaHtml}
                    </div>
                    <button class="btn btn-secondary btn-sm" id="add-criteria-btn" type="button">+ Add Criteria</button>
                    <div class="form-help">Define criteria with weights (1-10) for scoring</div>
                </div>
            </div>
        `;
    },

    renderStep4() {
        const icons = ['🤖', '👤', '💼', '🎓', '🏢', '💡', '🎯', '📊', '🔬', '⚡', '🌟', '🚀', '🎤', '🧘', '📚', '🌍', '🎧', '⚖️', '💻', '📋', '🌱', '🧑‍💼'];
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6'];

        return `
            <h3 style="margin-bottom: 1.5rem; color: var(--gray-900);">Customize Appearance</h3>
            
            <div class="form-group">
                <label class="form-label">Choose Icon</label>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${icons.map(icon => `
                        <button class="icon-option ${this.agentData.icon === icon ? 'selected' : ''}" data-icon="${icon}" style="width: 48px; height: 48px; font-size: 1.5rem; border-radius: var(--border-radius); border: 2px solid ${this.agentData.icon === icon ? 'var(--primary-500)' : 'var(--gray-200)'}; background: white; cursor: pointer;" type="button">
                            ${icon}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Choose Color</label>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${colors.map(color => `
                        <button class="color-option ${this.agentData.color === color ? 'selected' : ''}" data-color="${color}" style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${this.agentData.color === color ? 'var(--gray-900)' : 'transparent'}; background: ${color}; cursor: pointer;" type="button"></button>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Status</label>
                <div class="toggle-wrapper">
                    <div class="toggle ${this.agentData.status === 'active' ? 'active' : ''}" id="toggle-status"></div>
                    <span class="toggle-label">${this.agentData.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            
            <div style="margin-top: 2rem; padding: 1.5rem; background: var(--gray-50); border-radius: var(--border-radius-lg);">
                <h4 style="margin-bottom: 1rem; color: var(--gray-900);">Preview</h4>
                <div class="flex items-center gap-4">
                    <div class="agent-icon" style="width: 64px; height: 64px; background: ${this.agentData.color}; font-size: 2rem;" id="preview-icon">${this.agentData.icon}</div>
                    <div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--gray-900);" id="preview-name">${this.agentData.name || 'Agent Name'}</div>
                        <div style="color: var(--gray-500);" id="preview-role">${this.agentData.role || 'Role'}</div>
                    </div>
                </div>
            </div>
        `;
    },

    setupListeners() {
        // Back button (shown on wizard when not in edit mode)
        document.getElementById('wizard-back-btn')?.addEventListener('click', () => {
            const container = document.getElementById('main-content');
            this.showScratchScreen(container);
        });

        // Previous button
        document.getElementById('prev-btn')?.addEventListener('click', () => {
            this.saveCurrentStep();
            this.currentStep--;
            this.renderWizard(document.getElementById('main-content'));
        });

        // Next button
        document.getElementById('next-btn')?.addEventListener('click', async () => {
            if (!this.validateStep()) return;
            this.saveCurrentStep();

            if (this.currentStep === 4) {
                await this.submitAgent();
            } else {
                this.currentStep++;
                this.renderWizard(document.getElementById('main-content'));
            }
        });

        this.setupStepListeners();
    },

    setupStepListeners() {
        // Step 2 — Rules
        document.getElementById('add-rule-btn')?.addEventListener('click', () => {
            // FIX: sync current rule input values to agentData BEFORE adding new entry
            const ruleInputs = document.querySelectorAll('.rule-input');
            this.agentData.rules = Array.from(ruleInputs).map(inp => inp.value);
            // Push a blank new rule
            this.agentData.rules.push('');
            // Re-render only the rules section
            document.getElementById('rules-container').innerHTML = this.agentData.rules.map((rule, i) => `
                <div class="rule-row flex items-center gap-2 mb-2">
                    <input type="text" class="form-input rule-input" value="${this._escapeHtml(rule)}" data-index="${i}" style="flex: 1;" placeholder="e.g., Always be respectful">
                    <button class="btn btn-icon btn-secondary remove-rule" data-index="${i}" type="button">✕</button>
                </div>
            `).join('');
            // Re-bind remove listeners
            this._bindRemoveRuleListeners();
            // Focus the new input
            const inputs = document.querySelectorAll('.rule-input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        });

        this._bindRemoveRuleListeners();

        // Step 3 — Toggles and Criteria
        document.getElementById('toggle-summary')?.addEventListener('click', function () {
            this.classList.toggle('active');
        });

        document.getElementById('toggle-transcript')?.addEventListener('click', function () {
            this.classList.toggle('active');
        });

        document.getElementById('toggle-evaluation')?.addEventListener('click', function () {
            this.classList.toggle('active');
            document.getElementById('criteria-section').style.display = this.classList.contains('active') ? '' : 'none';
        });

        document.getElementById('add-criteria-btn')?.addEventListener('click', () => {
            if (!this.agentData.output_config.criteria) {
                this.agentData.output_config.criteria = [];
            }
            this.agentData.output_config.criteria.push({ name: '', weight: 1 });
            this.saveCurrentStep();
            document.getElementById('wizard-content').innerHTML = this.renderStep();
            this.setupStepListeners();
        });

        document.querySelectorAll('.remove-criteria').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.agentData.output_config.criteria.splice(index, 1);
                this.saveCurrentStep();
                document.getElementById('wizard-content').innerHTML = this.renderStep();
                this.setupStepListeners();
            });
        });

        // Step 4 — Icons, Colors, Status
        document.querySelectorAll('.icon-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.icon-option').forEach(b => b.style.borderColor = 'var(--gray-200)');
                btn.style.borderColor = 'var(--primary-500)';
                this.agentData.icon = btn.dataset.icon;
                const pi = document.getElementById('preview-icon');
                if (pi) pi.textContent = btn.dataset.icon;
            });
        });

        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.style.borderColor = 'transparent');
                btn.style.borderColor = 'var(--gray-900)';
                this.agentData.color = btn.dataset.color;
                const pi = document.getElementById('preview-icon');
                if (pi) pi.style.background = btn.dataset.color;
            });
        });

        document.getElementById('toggle-status')?.addEventListener('click', function () {
            this.classList.toggle('active');
            this.nextElementSibling.textContent = this.classList.contains('active') ? 'Active' : 'Inactive';
        });
    },

    _bindRemoveRuleListeners() {
        document.querySelectorAll('.remove-rule').forEach(btn => {
            btn.addEventListener('click', () => {
                // FIX: sync inputs before removing
                const ruleInputs = document.querySelectorAll('.rule-input');
                this.agentData.rules = Array.from(ruleInputs).map(inp => inp.value);
                const index = parseInt(btn.dataset.index);
                this.agentData.rules.splice(index, 1);
                document.getElementById('rules-container').innerHTML = this.agentData.rules.map((rule, i) => `
                    <div class="rule-row flex items-center gap-2 mb-2">
                        <input type="text" class="form-input rule-input" value="${this._escapeHtml(rule)}" data-index="${i}" style="flex: 1;" placeholder="e.g., Always be respectful">
                        <button class="btn btn-icon btn-secondary remove-rule" data-index="${i}" type="button">✕</button>
                    </div>
                `).join('');
                this._bindRemoveRuleListeners();
            });
        });
    },

    _escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    validateStep() {
        if (this.currentStep === 1) {
            const name = document.getElementById('agent-name')?.value.trim();
            const role = document.getElementById('agent-role')?.value.trim();
            if (!name) { Toast.error('Agent name is required'); return false; }
            if (!role) { Toast.error('Role is required'); return false; }
        }
        return true;
    },

    saveCurrentStep() {
        switch (this.currentStep) {
            case 1:
                this.agentData.name = document.getElementById('agent-name')?.value.trim() || '';
                this.agentData.role = document.getElementById('agent-role')?.value.trim() || '';
                this.agentData.goal = document.getElementById('agent-goal')?.value.trim() || '';
                this.agentData.opening_message = document.getElementById('agent-opening')?.value.trim() || '';
                break;

            case 2:
                this.agentData.task_description = document.getElementById('agent-task')?.value.trim() || '';
                this.agentData.tone = document.getElementById('agent-tone')?.value || 'professional';
                this.agentData.knowledge = document.getElementById('agent-knowledge')?.value.trim() || '';
                // Collect all rule inputs (even empty ones mid-edit, will be filtered on submit)
                const ruleInputs = document.querySelectorAll('.rule-input');
                this.agentData.rules = Array.from(ruleInputs).map(input => input.value.trim()).filter(r => r);
                break;

            case 3:
                this.agentData.output_config = {
                    summary: document.getElementById('toggle-summary')?.classList.contains('active') ?? true,
                    transcript: document.getElementById('toggle-transcript')?.classList.contains('active') ?? true,
                    evaluation: document.getElementById('toggle-evaluation')?.classList.contains('active') ?? false,
                    criteria: []
                };
                const criteriaNames = document.querySelectorAll('.criteria-name');
                const criteriaWeights = document.querySelectorAll('.criteria-weight');
                for (let i = 0; i < criteriaNames.length; i++) {
                    const name = criteriaNames[i].value.trim();
                    const weight = parseInt(criteriaWeights[i].value) || 1;
                    if (name) { this.agentData.output_config.criteria.push({ name, weight }); }
                }
                break;

            case 4:
                this.agentData.status = document.getElementById('toggle-status')?.classList.contains('active') ? 'active' : 'inactive';
                break;
        }
    },

    async submitAgent() {
        const btn = document.getElementById('next-btn');
        btn.disabled = true;
        btn.textContent = this.editMode ? 'Saving...' : 'Creating...';

        try {
            if (this.editMode) {
                await API.put(`/agents/${this.agentId}`, this.agentData);
                Toast.success('Agent updated successfully');
            } else {
                const { agent } = await API.post('/agents', this.agentData);
                Toast.success('Agent created successfully');
            }
            Router.navigate('/agents');
        } catch (error) {
            Toast.error('Failed to save agent', error.message);
            btn.disabled = false;
            btn.textContent = this.editMode ? 'Save Changes' : 'Create Agent';
        }
    }
};
