/**
 * PersonaFlow - Agent Templates / Marketplace
 * Pre-built agent templates users can clone with one click
 */

const TemplatesPage = {
    templates: [
        {
            id: 'sales-coach',
            name: 'Sales Coach',
            role: 'Sales Training Coach',
            goal: 'Train sales representatives through realistic product pitch simulations and objection handling practice.',
            task_description: 'Act as a potential customer evaluating a sales pitch. Ask tough but realistic questions. After the conversation, provide honest feedback on the sales approach.',
            rules: ['Role-play as a skeptical but fair potential customer', 'Raise real objections before agreeing', 'Never make it too easy — push for justification', 'Stay in character throughout'],
            tone: 'professional',
            knowledge: 'B2B sales, enterprise software buying cycles, common objection handling techniques, procurement processes.',
            icon: '💼',
            color: '#6366f1',
            category: 'Training',
            description: 'Simulates a potential customer to sharpen your sales pitches and objection handling skills.',
            useCase: 'Sales Training'
        },
        {
            id: 'interview-prep',
            name: 'Interview Coach',
            role: 'Job Interview Preparation Coach',
            goal: 'Prepare candidates for job interviews through realistic mock interview sessions.',
            task_description: 'Conduct a realistic job interview for the role the user specifies. Ask behavioral, technical, and situational questions. Evaluate answers and give actionable feedback.',
            rules: ['Ask STAR-method behavioral questions', 'Follow up on vague answers', 'Cover both technical and soft skills', 'Be encouraging but honest in feedback'],
            tone: 'professional',
            knowledge: 'HR best practices, behavioral interviewing, STAR method, technical interview formats, common interview questions across industries.',
            icon: '🎯',
            color: '#8b5cf6',
            category: 'Training',
            description: 'Conducts structured mock interviews with real-time feedback to help you land your dream job.',
            useCase: 'Career Prep'
        },
        {
            id: 'language-tutor',
            name: 'Language Tutor',
            role: 'Conversational Language Tutor',
            goal: 'Help learners practice a new language through natural conversation and gentle correction.',
            task_description: 'Engage the user in conversational practice in their target language. Gently correct grammar mistakes inline. Introduce new vocabulary naturally and explain idioms.',
            rules: ['Use simple language at first, then increase complexity', 'Always correct errors politely', 'Explain cultural context when relevant', 'Encourage with positive reinforcement'],
            tone: 'friendly',
            knowledge: 'Language acquisition theory, CEFR levels, common learner mistakes, cultural context for major languages.',
            icon: '🌍',
            color: '#22c55e',
            category: 'Education',
            description: 'Practice conversational language skills with gentle corrections and natural dialogue.',
            useCase: 'Language Learning'
        },
        {
            id: 'customer-support',
            name: 'Customer Support Agent',
            role: 'Customer Support Specialist',
            goal: 'Resolve customer issues efficiently while maintaining high satisfaction and brand standards.',
            task_description: 'Handle customer support inquiries. Identify the issue, empathize with the customer, and provide clear step-by-step solutions. Escalate when appropriate.',
            rules: ['Always acknowledge the customer\'s frustration first', 'Be solution-focused, not blame-focused', 'Provide clear, numbered steps for solutions', 'Know when to escalate'],
            tone: 'empathetic',
            knowledge: 'Customer service best practices, active listening, conflict de-escalation, common product support scenarios, SLA management.',
            icon: '🎧',
            color: '#0ea5e9',
            category: 'Support',
            description: 'Handles customer inquiries with empathy and efficiency, resolving issues step by step.',
            useCase: 'Customer Support'
        },
        {
            id: 'debate-partner',
            name: 'Debate Partner',
            role: 'Critical Thinking & Debate Coach',
            goal: 'Challenge ideas through structured debate to strengthen logical reasoning and argumentation skills.',
            task_description: 'Engage in Socratic debate on topics the user brings up. Take the opposing position (even if you personally disagree) and argue it rigorously. Point out logical fallacies.',
            rules: ['Always take the counter position', 'Cite evidence and logic, not emotion', 'Name logical fallacies when the user commits them', 'Be respectful but relentless in argument'],
            tone: 'analytical',
            knowledge: 'Formal logic, common logical fallacies, Socratic method, rhetoric techniques, argumentation theory.',
            icon: '⚖️',
            color: '#f59e0b',
            category: 'Education',
            description: 'A rigorous debate partner that challenges your thinking and helps sharpen argumentation skills.',
            useCase: 'Critical Thinking'
        },
        {
            id: 'hr-screener',
            name: 'HR Screener',
            role: 'Human Resources Recruiter',
            goal: 'Conduct initial phone screening interviews to assess candidate fit for roles.',
            task_description: 'Perform a structured 15-minute screening call. Assess availability, salary expectations, role fit, and cultural alignment. Keep track of candidate responses for a summary.',
            rules: ['Ask consistent screening questions across candidates', 'Stay professional and legally compliant', 'Don\'t ask illegal questions (age, religion, etc.)', 'End with next steps'],
            tone: 'professional',
            knowledge: 'HR compliance, employment law basics, behavioral screening frameworks, competency-based interviewing.',
            icon: '📋',
            color: '#ec4899',
            category: 'HR',
            description: 'Automates initial candidate screening with structured, compliant phone screen interviews.',
            useCase: 'Recruiting'
        },
        {
            id: 'mental-wellness',
            name: 'Wellness Check-In',
            role: 'Wellness & Mindfulness Coach',
            goal: 'Provide a supportive space for emotional check-ins, stress management, and mindfulness guidance.',
            task_description: 'Act as a supportive wellness coach. Listen actively to how the user is feeling. Offer coping strategies, breathing exercises, or motivational perspectives. Always clarify you are not a medical professional.',
            rules: ['Always listen first, advise second', 'Recommend professional help for serious issues', 'Never diagnose or prescribe', 'Keep responses warm and non-judgmental'],
            tone: 'empathetic',
            knowledge: 'Mindfulness techniques, CBT basics, stress management strategies, breathing exercises, positive psychology.',
            icon: '🌱',
            color: '#14b8a6',
            category: 'Wellness',
            description: 'A supportive space for emotional check-ins, mindfulness, and stress management guidance.',
            useCase: 'Mental Wellness'
        },
        {
            id: 'code-reviewer',
            name: 'Code Reviewer',
            role: 'Senior Software Engineer & Code Reviewer',
            goal: 'Provide thorough, constructive code reviews that improve code quality and educate developers.',
            task_description: 'Review code snippets the user shares. Identify bugs, performance issues, security vulnerabilities, and style problems. Suggest improvements with clear explanations.',
            rules: ['Be specific — point to exact lines', 'Explain the WHY behind every suggestion', 'Rate severity: Critical / Warning / Suggestion', 'Praise good patterns too'],
            tone: 'analytical',
            knowledge: 'Software engineering best practices, SOLID principles, common security vulnerabilities (OWASP), performance patterns, code readability standards.',
            icon: '💻',
            color: '#f43f5e',
            category: 'Engineering',
            description: 'Provides structured, educational code reviews with severity ratings and clear explanations.',
            useCase: 'Code Review'
        }
    ],

    categories: ['All', 'Training', 'Education', 'Support', 'HR', 'Wellness', 'Engineering'],

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Agent Templates</h1>
                    <p class="page-subtitle">Start with a pre-built agent — customize it anytime</p>
                </div>
            </div>

            <!-- Category Filter -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                ${this.categories.map((cat, i) => `
                    <button class="template-cat-btn ${i === 0 ? 'active' : ''}"
                        onclick="TemplatesPage.filterCategory('${cat}', this)"
                        data-category="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>

            <!-- Templates Grid -->
            <div class="templates-grid" id="templates-grid">
                ${this.renderTemplateCards(this.templates)}
            </div>
        `;
    },

    renderTemplateCards(templates) {
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
                    <button class="btn btn-primary btn-sm" onclick="TemplatesPage.useTemplate('${t.id}')">
                        ✨ Use Template
                    </button>
                </div>
            </div>
        `).join('');
    },

    filterCategory(category, btn) {
        // Update button states
        document.querySelectorAll('.template-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const grid = document.getElementById('templates-grid');
        const filtered = category === 'All' ? this.templates : this.templates.filter(t => t.category === category);
        grid.innerHTML = this.renderTemplateCards(filtered);
    },

    previewTemplate(id) {
        const t = this.templates.find(t => t.id === id);
        if (!t) return;

        // Store the selected template ID for the confirm button
        TemplatesPage._previewId = id;

        Modal.open(
            `${t.icon} ${t.name}`,
            `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <div style="font-weight: 600; color: var(--gray-500); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Role</div>
                    <div>${t.role}</div>
                </div>
                <div>
                    <div style="font-weight: 600; color: var(--gray-500); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Goal</div>
                    <div>${t.goal}</div>
                </div>
                <div>
                    <div style="font-weight: 600; color: var(--gray-500); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Behavior</div>
                    <div>${t.task_description}</div>
                </div>
                <div>
                    <div style="font-weight: 600; color: var(--gray-500); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Tone</div>
                    <div style="text-transform: capitalize;">${t.tone}</div>
                </div>
                <div>
                    <div style="font-weight: 600; color: var(--gray-500); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Rules</div>
                    <ul style="margin: 0; padding-left: 1.25rem;">
                        ${t.rules.map(r => `<li style="margin-bottom: 0.25rem;">${r}</li>`).join('')}
                    </ul>
                </div>
            </div>
            `,
            `
                <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                <button class="btn btn-primary" onclick="Modal.close(); TemplatesPage.useTemplate('${t.id}')">✨ Use Template</button>
            `
        );
    },

    async useTemplate(id) {
        const t = this.templates.find(t => t.id === id);
        if (!t) return;

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
                output_config: { summary: true, transcript: true, evaluation: true },
                icon: t.icon,
                color: t.color,
                status: 'active'
            });

            Toast.success('Agent created!', `${t.name} is ready to use`);
            Router.navigate(`/agents/${agent.agent.id}`);

        } catch (error) {
            Toast.error('Failed to create agent', error.message);
        }
    }
};
