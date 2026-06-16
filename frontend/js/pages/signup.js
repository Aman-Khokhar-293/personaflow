/**
 * PersonaFlow - Signup Page
 */

const SignupPage = {
    render(container) {
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-logo">
                        <div class="auth-logo-avatar">
                            <img src="image/favicon.png" alt="PersonaFlow">
                        </div>
                    </div>

                    <h2 class="auth-title">Create your account</h2>
                    <p class="auth-subtitle">Get started with PersonaFlow</p>

                    <!-- Social Signup Buttons -->
                    <div class="auth-social-row">
                        <button class="social-btn" title="Sign up with Google" type="button">
                            <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        </button>

                        <button class="social-btn" title="Sign up with GitHub" type="button">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" fill="#333"/></svg>
                        </button>
                    </div>

                    <div class="auth-divider"><span>or</span></div>

                    <form id="signup-form">
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <div class="auth-input-wrapper">
                                <span class="auth-input-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </span>
                                <input type="text" id="signup-name" class="form-input" placeholder="John Doe" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <div class="auth-input-wrapper">
                                <span class="auth-input-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
                                </span>
                                <input type="email" id="signup-email" class="form-input" placeholder="you@example.com" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <div class="auth-input-wrapper">
                                <span class="auth-input-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </span>
                                <input type="password" id="signup-password" class="form-input" placeholder="••••••••" required minlength="6">
                            </div>
                            <div class="form-help">Must be at least 6 characters</div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Confirm Password</label>
                            <div class="auth-input-wrapper">
                                <span class="auth-input-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </span>
                                <input type="password" id="signup-confirm" class="form-input" placeholder="••••••••" required>
                            </div>
                        </div>

                        <button type="submit" class="btn-auth-primary" id="signup-btn">
                            Create Account
                        </button>
                    </form>

                    <div class="auth-footer">
                        Already have an account? <a href="#/login">Sign in</a>
                    </div>
                </div>
            </div>
        `;

        this.setupListeners();
    },

    setupListeners() {
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            const btn = document.getElementById('signup-btn');

            if (password !== confirm) {
                Toast.error('Passwords do not match');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating account...';

            try {
                const response = await API.post('/auth/signup', { name, email, password });
                Toast.success('Account created!', 'Welcome to PersonaFlow');
                App.login(response.user);
            } catch (error) {
                Toast.error('Signup failed', error.message);
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });

        // Firebase Google Sign-Up
        const googleBtn = document.querySelector('.social-btn[title="Sign up with Google"]');
        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                if (typeof firebase === 'undefined' || !firebase.apps.length) {
                    Toast.error('Google Sign-In Unconfigured', 'Please set up your firebase-config.js credentials.');
                    return;
                }
                const provider = new firebase.auth.GoogleAuthProvider();
                try {
                    const result = await firebase.auth().signInWithPopup(provider);
                    const idToken = await result.user.getIdToken();
                    
                    Toast.info('Connecting...', 'Signing up with Google...');
                    const response = await API.post('/auth/google', { idToken });
                    Toast.success('Account created!', 'Welcome to PersonaFlow');
                    App.login(response.user);
                } catch (error) {
                    Toast.error('Google Sign-In failed', error.message);
                }
            });
        }

        // Firebase GitHub Sign-Up
        const githubBtn = document.querySelector('.social-btn[title="Sign up with GitHub"]');
        if (githubBtn) {
            githubBtn.addEventListener('click', async () => {
                if (typeof firebase === 'undefined' || !firebase.apps.length) {
                    Toast.error('GitHub Sign-In Unconfigured', 'Please set up your firebase-config.js credentials.');
                    return;
                }
                const provider = new firebase.auth.GithubAuthProvider();
                try {
                    const result = await firebase.auth().signInWithPopup(provider);
                    const idToken = await result.user.getIdToken();
                    
                    Toast.info('Connecting...', 'Signing up with GitHub...');
                    const response = await API.post('/auth/google', { idToken });
                    Toast.success('Account created!', 'Welcome to PersonaFlow');
                    App.login(response.user);
                } catch (error) {
                    Toast.error('GitHub Sign-In failed', error.message);
                }
            });
        }


    }
};

