/**
 * PersonaFlow - Onboarding Flow
 * Multi-step welcome modal shown once to new users
 */

const Onboarding = {
    currentStep: 0,
    steps: [
        {
            icon: '🎉',
            title: 'Welcome to PersonaFlow!',
            desc: 'You\'re about to build your first AI conversation agent. It takes less than 2 minutes and no technical knowledge required.',
            visual: `<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
                <div style="background:var(--primary-50,#eef2ff);border-radius:12px;padding:1rem;text-align:center;flex:1;min-width:100px;">
                    <div style="font-size:1.75rem;margin-bottom:0.5rem;">🤖</div>
                    <div style="font-size:0.75rem;font-weight:600;color:var(--primary-600,#4f46e5);">Create Agents</div>
                </div>
                <div style="background:var(--primary-50,#eef2ff);border-radius:12px;padding:1rem;text-align:center;flex:1;min-width:100px;">
                    <div style="font-size:1.75rem;margin-bottom:0.5rem;">💬</div>
                    <div style="font-size:0.75rem;font-weight:600;color:var(--primary-600,#4f46e5);">Chat & Video Call</div>
                </div>
                <div style="background:var(--primary-50,#eef2ff);border-radius:12px;padding:1rem;text-align:center;flex:1;min-width:100px;">
                    <div style="font-size:1.75rem;margin-bottom:0.5rem;">📊</div>
                    <div style="font-size:0.75rem;font-weight:600;color:var(--primary-600,#4f46e5);">Get Reports</div>
                </div>
            </div>`
        },
        {
            icon: '🤖',
            title: 'What is an AI Agent?',
            desc: 'An agent is an AI persona with a specific role, personality, and purpose — like a Sales Coach, Customer Support Rep, or Interview Trainer.',
            visual: `<div style="background:var(--gray-50,#f9fafb);border-radius:12px;padding:1.25rem;margin-top:1rem;border:1px solid var(--gray-200,#e5e7eb);">
                <div style="font-weight:600;margin-bottom:0.75rem;color:var(--gray-700,#374151);">Example: Sales Coach Agent</div>
                <div style="display:flex;gap:0.75rem;align-items:flex-start;margin-bottom:0.75rem;">
                    <div style="width:36px;height:36px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">💼</div>
                    <div style="background:#6366f120;padding:0.75rem;border-radius:8px;font-size:0.85rem;color:var(--gray-700,#374151);">
                        "Tell me about your product. I'm looking for something to solve our reporting problem..."
                    </div>
                </div>
                <div style="display:flex;gap:0.75rem;align-items:flex-start;justify-content:flex-end;">
                    <div style="background:var(--primary-500,#6366f1);padding:0.75rem;border-radius:8px;font-size:0.85rem;color:white;max-width:75%;">
                        "Sure! Our platform integrates with all your existing tools and cuts report time by 80%..."
                    </div>
                </div>
            </div>`
        },
        {
            icon: '🚀',
            title: 'Three ways to start',
            desc: 'Create an agent from scratch, use a pre-built template, or use the shared link someone sent you.',
            visual: `<div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:1rem;">
                <div style="display:flex;gap:0.75rem;align-items:center;padding:0.75rem;background:var(--gray-50,#f9fafb);border-radius:10px;border:1px solid var(--gray-200,#e5e7eb);">
                    <div style="font-size:1.5rem;">✨</div>
                    <div>
                        <div style="font-weight:600;font-size:0.875rem;">Templates</div>
                        <div style="font-size:0.8rem;color:var(--gray-500,#6b7280);">Start with Sales Coach, Interview Prep, and more — ready in 1 click</div>
                    </div>
                </div>
                <div style="display:flex;gap:0.75rem;align-items:center;padding:0.75rem;background:var(--gray-50,#f9fafb);border-radius:10px;border:1px solid var(--gray-200,#e5e7eb);">
                    <div style="font-size:1.5rem;">🛠️</div>
                    <div>
                        <div style="font-weight:600;font-size:0.875rem;">Build from Scratch</div>
                        <div style="font-size:0.8rem;color:var(--gray-500,#6b7280);">Full 4-step wizard to define role, behavior, output & appearance</div>
                    </div>
                </div>
                <div style="display:flex;gap:0.75rem;align-items:center;padding:0.75rem;background:var(--gray-50,#f9fafb);border-radius:10px;border:1px solid var(--gray-200,#e5e7eb);">
                    <div style="font-size:1.5rem;">🔗</div>
                    <div>
                        <div style="font-weight:600;font-size:0.875rem;">Share Links</div>
                        <div style="font-size:0.8rem;color:var(--gray-500,#6b7280);">Share any agent via a link — with password, expiry & usage limits</div>
                    </div>
                </div>
            </div>`
        },
        {
            icon: '🎊',
            title: 'You\'re all set!',
            desc: 'Let\'s create your first agent. Try a template for the fastest start, or build one from scratch.',
            visual: `<div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;">
                <a href="#/templates" onclick="Onboarding.finish()" class="btn btn-primary" style="flex:1;justify-content:center;text-align:center;text-decoration:none;">
                    ✨ Browse Templates
                </a>
                <a href="#/agents/new" onclick="Onboarding.finish()" class="btn btn-secondary" style="flex:1;justify-content:center;text-align:center;text-decoration:none;">
                    🛠️ Build from Scratch
                </a>
            </div>`
        }
    ],

    shouldShow() {
        return !localStorage.getItem('pf-onboarded');
    },

    show() {
        if (!this.shouldShow()) return;
        this.currentStep = 0;
        this.renderModal();
    },

    renderModal() {
        // Dismiss any existing onboarding modal first
        document.getElementById('onboarding-overlay')?.remove();

        const step = this.steps[this.currentStep];
        const total = this.steps.length;
        const isLast = this.currentStep === total - 1;

        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
        `;

        overlay.innerHTML = `
            <div style="
                background: var(--surface, #ffffff);
                border-radius: 20px;
                padding: 2rem;
                max-width: 480px;
                width: calc(100% - 2rem);
                box-shadow: 0 25px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
                position: relative;
            ">
                <!-- Skip button -->
                <button onclick="Onboarding.finish()" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; color: var(--gray-400,#9ca3af);
                    cursor: pointer; font-size: 0.85rem; padding: 0.25rem 0.5rem;
                    border-radius: 6px; transition: background 0.2s;
                " onmouseover="this.style.background='var(--gray-100,#f3f4f6)'" onmouseout="this.style.background='none'">
                    Skip ✕
                </button>

                <!-- Step indicator dots -->
                <div style="display:flex;gap:0.4rem;justify-content:center;margin-bottom:1.5rem;">
                    ${this.steps.map((_, i) => `
                        <div style="
                            width: ${i === this.currentStep ? '24px' : '8px'};
                            height: 8px;
                            border-radius: 4px;
                            background: ${i === this.currentStep ? 'var(--primary-500,#6366f1)' : 'var(--gray-200,#e5e7eb)'};
                            transition: all 0.3s ease;
                        "></div>
                    `).join('')}
                </div>

                <!-- Icon -->
                <div style="text-align:center;font-size:3rem;margin-bottom:1rem;">${step.icon}</div>

                <!-- Title -->
                <h2 style="text-align:center;margin:0 0 0.75rem;font-size:1.4rem;font-weight:700;color:var(--gray-900,#111827);">
                    ${step.title}
                </h2>

                <!-- Description -->
                <p style="text-align:center;color:var(--gray-500,#6b7280);margin:0 0 0.5rem;line-height:1.6;">
                    ${step.desc}
                </p>

                <!-- Visual content -->
                ${step.visual}

                <!-- Navigation -->
                ${!isLast ? `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;">
                        <button onclick="Onboarding.prev()"
                            style="background:none;border:none;cursor:pointer;color:var(--gray-400,#9ca3af);font-size:0.875rem;padding:0.5rem;${this.currentStep === 0 ? 'visibility:hidden' : ''}"
                        >
                            ← Back
                        </button>
                        <button onclick="Onboarding.next()" class="btn btn-primary">
                            Next →
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.finish();
        });
    },

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.renderModal();
        }
    },

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderModal();
        }
    },

    finish() {
        localStorage.setItem('pf-onboarded', '1');
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => overlay.remove(), 200);
        }
    }
};
