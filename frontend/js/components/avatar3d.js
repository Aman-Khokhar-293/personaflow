/**
 * PersonaFlow - 3D Avatar Renderer (Vanilla Three.js)
 * Renders a realistic 3D talking avatar in the video call AI panel
 * Ported from React Three Fiber to vanilla Three.js
 */

const Avatar3D = {
    scene: null,
    camera: null,
    renderer: null,
    mixer: null,
    clock: null,
    container: null,
    animationFrameId: null,
    morphTargetDictionaryBody: null,
    morphTargetDictionaryLowerTeeth: null,
    gltfScene: null,
    blinkData: null,
    isInitialized: false,
    isSpeaking: false,
    currentAudio: null,
    lipSyncClips: [],
    onSpeakEnd: null,

    // ─── Real-time viseme lip sync state ───
    visemeTimeline: null,       // Timeline from LipSyncEngine
    bodyMesh: null,             // Reference to primary mesh for morph target access
    teethMesh: null,            // Reference to teeth mesh
    currentVisemeTargets: {},   // Current target values for each viseme morph
    appliedVisemeValues: {},    // Currently applied (smoothed) values
    moodTargets: {},            // Facial expression targets based on mood
    appliedMoodValues: {},      // Currently applied mood values
    microExpressionTimer: 0,   // Timer for random micro-expressions
    currentMood: 'neutral',    // Current mood state

    // ─── TalkingHead-style animation layers ───
    headBone: null,             // Head bone for rotation
    neckBone: null,             // Neck bone for rotation
    spineBone: null,            // Spine2 bone for torso sway

    // Breathing
    breathTimer: 0,
    breathCycleDuration: 3.5,   // seconds per breath cycle

    // Eye blink (procedural)
    blinkTimer: 0,
    blinkNextAt: 3,             // seconds until next blink
    blinkPhase: 'idle',         // 'idle' | 'closing' | 'closed' | 'opening'
    blinkPhaseTimer: 0,
    isDoubleBlink: false,
    blinkCount: 0,

    // Eye gaze
    gazeTimer: 0,
    gazeNextAt: 3,
    gazeTargetX: 0,             // Target eye look horizontal
    gazeTargetY: 0,             // Target eye look vertical
    gazeCurrentX: 0,
    gazeCurrentY: 0,

    // Head/body sway
    headSwayTime: 0,            // Accumulator for sine-based head sway
    headSwayTargetX: 0,
    headSwayTargetY: 0,
    headSwayTargetZ: 0,
    headSwayCurrentX: 0,
    headSwayCurrentY: 0,
    headSwayCurrentZ: 0,

    // Gesture state
    activeGesture: null,        // 'nod' | 'shake' | null
    gestureTimer: 0,
    gesturePhase: 0,

    /**
     * Initialize the 3D avatar in the given container
     */
    async init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Avatar3D: Container not found:', containerId);
            return false;
        }

        try {
            this.clock = new THREE.Clock();
            this.scene = new THREE.Scene();

            // Orthographic camera — zoomed in on face/upper body
            const aspect = this.container.clientWidth / this.container.clientHeight;
            const zoom = 1600;
            this.camera = new THREE.OrthographicCamera(
                -aspect / 2 * (1 / zoom * 1000),
                aspect / 2 * (1 / zoom * 1000),
                1 / zoom * 500,
                -1 / zoom * 500,
                0.01,
                100
            );
            // Position camera at eye level, slightly in front, looking straight at the face
            this.camera.position.set(0, 1.62, 1);
            this.camera.lookAt(0, 1.62, 0);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.physicallyCorrectLights = true;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.container.appendChild(this.renderer.domElement);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(1, 2, 3);
            this.scene.add(dirLight);

            const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
            fillLight.position.set(-1, 1, -1);
            this.scene.add(fillLight);

            // Load HDR environment map
            await this.loadEnvironment();

            // Load blink data
            await this.loadBlinkData();

            // Load background
            await this.loadBackground();

            // Load 3D model
            await this.loadModel();

            // Load idle animation
            await this.loadIdleAnimation();

            // Start blink animation (disabled — now using procedural blink in animate())
            // this.startBlinkAnimation();

            // Handle resize
            this.resizeHandler = () => this.onResize();
            window.addEventListener('resize', this.resizeHandler);

            // Start render loop
            this.isInitialized = true;
            this.animate();

            console.log('Avatar3D: Initialized successfully');
            return true;
        } catch (error) {
            console.error('Avatar3D: Initialization failed:', error);
            return false;
        }
    },

    /**
     * Load HDR environment map
     */
    loadEnvironment() {
        return new Promise((resolve) => {
            try {
                const rgbeLoader = new THREE.RGBELoader();
                rgbeLoader.load('/3d-assets/images/photo_studio_loft_hall_1k.hdr', (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    this.scene.environment = texture;
                    resolve();
                }, undefined, () => {
                    console.warn('Avatar3D: HDR environment load failed, using fallback');
                    resolve();
                });
            } catch (e) {
                console.warn('Avatar3D: RGBELoader not available, skipping HDR');
                resolve();
            }
        });
    },

    /**
     * Load blink animation data
     */
    async loadBlinkData() {
        try {
            const response = await fetch('/3d-assets/blendDataBlink.json');
            this.blinkData = await response.json();
        } catch (e) {
            console.warn('Avatar3D: Blink data load failed');
            this.blinkData = null;
        }
    },

    /**
     * Load background image
     */
    loadBackground() {
        return new Promise((resolve) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load('/3d-assets/images/background.jpg', (texture) => {
                texture.encoding = THREE.sRGBEncoding;
                // Calculate plane size to fill the entire camera view at z=-4
                const zoom = 1400;
                const aspect = this.container.clientWidth / this.container.clientHeight;
                const viewWidth = aspect * (1000 / zoom);
                const viewHeight = 2 * (500 / zoom);
                // Add generous padding to ensure full coverage
                const scale = 1.15;
                const bgGeometry = new THREE.PlaneGeometry(viewWidth * scale, viewHeight * scale);
                const bgMaterial = new THREE.MeshBasicMaterial({ map: texture });
                this.bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
                this.bgMesh.position.set(0, 1.62, -4);
                this.scene.add(this.bgMesh);
                resolve();
            }, undefined, () => {
                console.warn('Avatar3D: Background load failed');
                resolve();
            });
        });
    },

    /**
     * Load the Ready Player Me GLB 3D model (self-contained with embedded textures)
     */
    loadModel() {
        return new Promise((resolve, reject) => {
            // Show loading state
            if (this.container) {
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'avatar-loading';
                loadingDiv.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:0.875rem;z-index:10;';
                loadingDiv.innerHTML = '<div style="text-align:center"><div class="avatar-spinner"></div><div style="margin-top:12px">Loading 3D Avatar...</div></div>';
                this.container.appendChild(loadingDiv);
            }

            // RPM models are self-contained GLBs — no separate textures needed
            const gltfLoader = new THREE.GLTFLoader();
            gltfLoader.load('/3d-assets/rpm-model.glb', (gltf) => {
                this.gltfScene = gltf.scene;
                this.mixer = new THREE.AnimationMixer(gltf.scene);

                // Collect all meshes that have morph targets (RPM spreads them across Wolf3D_Head, Wolf3D_Teeth, etc.)
                this.morphMeshes = [];
                this.morphTargetDictionaryBody = null; // Primary morph dict (from head mesh)
                this.bodyMesh = null;
                this.teethMesh = null;

                gltf.scene.traverse((node) => {
                    if (node.type === 'Mesh' || node.type === 'SkinnedMesh') {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        node.frustumCulled = false;

                        // Enhance embedded materials for better rendering
                        if (node.material) {
                            node.material.envMapIntensity = 0.6;

                            // Enhance skin appearance on head/body meshes
                            if (node.name.includes('Head') || node.name.includes('Body')) {
                                node.material.roughness = Math.min(node.material.roughness || 1.0, 0.8);
                            }
                            // Make eyes more reflective
                            if (node.name.includes('Eye')) {
                                node.material.roughness = 0.1;
                                node.material.envMapIntensity = 0.8;
                            }
                        }

                        // Collect meshes with morph targets
                        if (node.morphTargetInfluences && node.morphTargetInfluences.length > 0 && node.morphTargetDictionary) {
                            this.morphMeshes.push(node);
                            console.log('Avatar3D: Morphable mesh found:', node.name, '— morph targets:', Object.keys(node.morphTargetDictionary).length);

                            // Use the mesh with the most morph targets as the primary (usually Head)
                            if (!this.morphTargetDictionaryBody || Object.keys(node.morphTargetDictionary).length > Object.keys(this.morphTargetDictionaryBody).length) {
                                this.morphTargetDictionaryBody = node.morphTargetDictionary;
                                this.bodyMesh = node;
                            }

                            // Track teeth mesh specifically
                            if (node.name.includes('Teeth')) {
                                this.morphTargetDictionaryLowerTeeth = node.morphTargetDictionary;
                                this.teethMesh = node;
                            }
                        }
                    }

                    // Store key bones for animation
                    if (node.isBone) {
                        if (node.name.includes('Head') && !this.headBone) this.headBone = node;
                        else if (node.name.includes('Neck') && !this.neckBone) this.neckBone = node;
                        else if ((node.name.includes('Spine2') || node.name.includes('Spine1')) && !this.spineBone) this.spineBone = node;
                    }

                    // Handle LineSegments (eyebrows etc.) — hide them for cleaner look
                    if (node.type === 'LineSegments') {
                        node.visible = false;
                    }
                });

                if (this.morphMeshes.length > 0) {
                    const visemeKeys = Object.keys(this.morphTargetDictionaryBody || {}).filter(k => k.startsWith('viseme'));
                    console.log('Avatar3D: RPM model loaded —', this.morphMeshes.length, 'morphable meshes, visemes:', visemeKeys);
                } else {
                    console.warn('Avatar3D: No morphable meshes found in RPM model!');
                }

                // Log discovered bones
                console.log('Avatar3D: Bones found — Head:', this.headBone?.name, 'Neck:', this.neckBone?.name, 'Spine:', this.spineBone?.name);

                // Store initial bone rotations for resetting
                if (this.headBone) this._headBoneInitQuat = this.headBone.quaternion.clone();
                if (this.neckBone) this._neckBoneInitQuat = this.neckBone.quaternion.clone();
                if (this.spineBone) this._spineBoneInitQuat = this.spineBone.quaternion.clone();

                this.scene.add(gltf.scene);

                // Remove loading indicator
                const loadingEl = document.getElementById('avatar-loading');
                if (loadingEl) loadingEl.remove();

                resolve();
            }, (progress) => {
                // Update loading progress
                if (progress.total > 0) {
                    const pct = Math.round(progress.loaded / progress.total * 100);
                    const loadingEl = document.getElementById('avatar-loading');
                    if (loadingEl) {
                        loadingEl.querySelector('div > div:last-child').textContent = `Loading 3D Avatar... ${pct}%`;
                    }
                }
            }, (error) => {
                console.error('Avatar3D: Model load error:', error);
                const loadingEl = document.getElementById('avatar-loading');
                if (loadingEl) loadingEl.querySelector('div > div:last-child').textContent = 'Failed to load 3D model';
                reject(error);
            });
        });
    },

    /**
     * Load idle animation from FBX
     */
    loadIdleAnimation() {
        return new Promise((resolve) => {
            if (!this.mixer) { resolve(); return; }

            try {
                const fbxLoader = new THREE.FBXLoader();
                fbxLoader.load('/3d-assets/idle.fbx', (fbx) => {
                    if (fbx.animations && fbx.animations.length > 0) {
                        const clip = fbx.animations[0];

                        // Filter to only head/neck/spine tracks
                        clip.tracks = clip.tracks.filter(track =>
                            track.name.includes('Head') ||
                            track.name.includes('Neck') ||
                            track.name.includes('Spine2') ||
                            track.name.includes('Spine1')
                        );

                        // RPM models use Armature bone names (sometimes with mixamorig prefix)
                        // Try to find the actual bone names in the scene
                        const findBone = (nameContains) => {
                            let found = null;
                            if (this.gltfScene) {
                                this.gltfScene.traverse(n => {
                                    if (n.isBone && n.name.includes(nameContains) && !found) {
                                        found = n.name;
                                    }
                                });
                            }
                            return found;
                        };

                        const headBone = findBone('Head') || 'Head';
                        const neckBone = findBone('Neck') || 'Neck';
                        const spineBone = findBone('Spine2') || findBone('Spine1') || 'Spine2';

                        clip.tracks = clip.tracks.map(track => {
                            if (track.name.includes('Head')) track.name = headBone + '.quaternion';
                            else if (track.name.includes('Neck')) track.name = neckBone + '.quaternion';
                            else if (track.name.includes('Spine')) track.name = spineBone + '.quaternion';
                            return track;
                        });

                        const action = this.mixer.clipAction(clip);
                        action.play();
                    }
                    resolve();
                }, undefined, () => {
                    console.warn('Avatar3D: Idle animation load failed');
                    resolve();
                });
            } catch (e) {
                console.warn('Avatar3D: FBXLoader not available');
                resolve();
            }
        });
    },

    /**
     * Start blink animation — works across all morphable meshes
     */
    startBlinkAnimation() {
        if (!this.blinkData || !this.mixer || !this.morphMeshes || this.morphMeshes.length === 0) return;

        // Apply blink on each morphable mesh that has eyeBlink targets
        this.morphMeshes.forEach(mesh => {
            if (!mesh.morphTargetDictionary) return;
            const blinkClip = ThreeConverter.createAnimation(
                this.blinkData,
                mesh.morphTargetDictionary,
                mesh.name
            );
            if (blinkClip) {
                const action = this.mixer.clipAction(blinkClip);
                action.play();
            }
        });
    },

    // ─── Mood presets for facial expressions ───
    moodPresets: {
        neutral: {},
        happy: {
            browInnerUp: 0.12, cheekSquintLeft: 0.15, cheekSquintRight: 0.15,
            eyeSquintLeft: 0.10, eyeSquintRight: 0.10,
            mouthSmileLeft: 0.12, mouthSmileRight: 0.12,
            mouthDimpleLeft: 0.05, mouthDimpleRight: 0.05
        },
        question: {
            browInnerUp: 0.25, browOuterUpLeft: 0.18, browOuterUpRight: 0.18,
            eyeWideLeft: 0.10, eyeWideRight: 0.10,
            mouthPucker: 0.03
        },
        emphasis: {
            browInnerUp: 0.20, browOuterUpLeft: 0.14, browOuterUpRight: 0.14,
            eyeWideLeft: 0.08, eyeWideRight: 0.08,
            jawForward: 0.03
        },
        warm: {
            eyeSquintLeft: 0.12, eyeSquintRight: 0.12,
            cheekSquintLeft: 0.10, cheekSquintRight: 0.10,
            mouthSmileLeft: 0.06, mouthSmileRight: 0.06,
            noseSneerLeft: 0.03, noseSneerRight: 0.03
        },
        surprise: {
            browInnerUp: 0.25, browOuterUpLeft: 0.22, browOuterUpRight: 0.22,
            eyeWideLeft: 0.18, eyeWideRight: 0.18, jawOpen: 0.08,
            mouthFunnel: 0.04
        },
        concerned: {
            browInnerUp: 0.18, browDownLeft: 0.10, browDownRight: 0.10,
            mouthFrownLeft: 0.08, mouthFrownRight: 0.08,
            mouthPressLeft: 0.05, mouthPressRight: 0.05
        },
        thinking: {
            browInnerUp: 0.12, browDownLeft: 0.06,
            eyeSquintLeft: 0.10, eyeLookUpLeft: 0.08, eyeLookUpRight: 0.08,
            mouthPucker: 0.06, mouthLeft: 0.04
        },
        confident: {
            browDownLeft: 0.05, browDownRight: 0.05,
            cheekSquintLeft: 0.06, cheekSquintRight: 0.06,
            mouthSmileLeft: 0.10, mouthSmileRight: 0.10,
            jawForward: 0.04, noseSneerLeft: 0.02, noseSneerRight: 0.02
        }
    },

    /**
     * Detect mood from text sentence
     */
    detectMood(sentence) {
        const s = sentence.toLowerCase();
        if (s.includes('?')) return 'question';
        if (s.includes('!')) return 'surprise';
        const happyWords = ['happy', 'great', 'wonderful', 'love', 'amazing', 'good', 'welcome', 'thank',
            'thanks', 'please', 'glad', 'excited', 'awesome', 'fantastic', 'beautiful', 'excellent', 'enjoy',
            'congratulations', 'perfect', 'brilliant', 'fun', 'nice', 'cool', 'sweet'];
        if (happyWords.some(w => s.includes(w))) return 'happy';
        const concernWords = ['sorry', 'unfortunately', 'problem', 'issue', 'difficult', 'hard', 'worry',
            'concern', 'afraid', 'bad', 'wrong', 'fail', 'mistake', 'error', 'trouble'];
        if (concernWords.some(w => s.includes(w))) return 'concerned';
        const thinkWords = ['think', 'consider', 'perhaps', 'maybe', 'probably', 'might', 'could',
            'wonder', 'imagine', 'suppose', 'hmm', 'well', 'let me', 'actually'];
        if (thinkWords.some(w => s.includes(w))) return 'thinking';
        const emphasisWords = ['important', 'key', 'critical', 'must', 'need', 'now', 'first',
            'today', 'special', 'attention', 'remember', 'never', 'always', 'absolutely', 'definitely'];
        if (emphasisWords.some(w => s.includes(w))) return 'emphasis';
        const confidentWords = ['sure', 'certain', 'know', 'clearly', 'exactly', 'right', 'yes',
            'correct', 'true', 'fact', 'indeed', 'obviously', 'of course'];
        if (confidentWords.some(w => s.includes(w))) return 'confident';
        return 'warm';
    },

    /**
     * Speak with real-time viseme lip-sync animation
     * Uses LipSyncEngine to generate viseme timeline, applies in animate() loop
     */
    async speak(text, onEnd) {
        if (this.isSpeaking) this.stopSpeaking();
        this.isSpeaking = true;
        this.onSpeakEnd = onEnd;

        try {
            // Call TTS endpoint (just need audio now, not blendData)
            console.log('Avatar3D: Calling /api/avatar/talk...');
            const response = await fetch('/api/avatar/talk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('TTS request failed');

            const data = await response.json();
            const { audioUrl } = data;

            if (!this.isSpeaking) return; // User may have interrupted

            if (audioUrl) {
                this.currentAudio = new Audio(audioUrl);

                // Wait for audio metadata to get real duration
                await new Promise((resolve) => {
                    this.currentAudio.addEventListener('loadedmetadata', resolve, { once: true });
                    this.currentAudio.addEventListener('canplaythrough', resolve, { once: true });
                    this.currentAudio.load();
                    setTimeout(resolve, 3000);
                });

                if (!this.isSpeaking) return;

                const audioDuration = this.currentAudio.duration;
                console.log('Avatar3D: Audio duration:', audioDuration, 'seconds');

                // Generate viseme timeline using LipSyncEngine (frontend-side)
                if (typeof LipSyncEngine !== 'undefined' && this.morphMeshes && this.morphMeshes.length > 0) {
                    this.visemeTimeline = LipSyncEngine.textToVisemes(text, audioDuration);
                    console.log('Avatar3D: Generated', this.visemeTimeline.length, 'viseme events for', audioDuration.toFixed(2) + 's audio');

                    // Detect mood for facial expressions
                    this.currentMood = this.detectMood(text);
                    this.moodTargets = { ...(this.moodPresets[this.currentMood] || {}) };
                    console.log('Avatar3D: Mood detected:', this.currentMood);

                    // Detect and trigger head gestures (nod/shake)
                    this.detectGestures(text);
                } else {
                    console.warn('Avatar3D: LipSyncEngine not available or bodyMesh not loaded');
                    this.visemeTimeline = null;
                }

                this.currentAudio.onended = () => this.onAudioEnd();
                this.currentAudio.onerror = () => {
                    console.error('Avatar3D: Audio playback error');
                    this.onAudioEnd();
                };
                this.currentAudio.play().catch(err => {
                    console.error('Avatar3D: Audio play failed:', err);
                    this.onAudioEnd();
                });
            }

            return true;
        } catch (error) {
            console.error('Avatar3D: Speak failed:', error);
            this.isSpeaking = false;
            if (this.onSpeakEnd) this.onSpeakEnd();
            return false;
        }
    },

    /**
     * Handle audio playback end — reset all viseme morph targets
     */
    onAudioEnd() {
        this.isSpeaking = false;
        this.visemeTimeline = null;
        this.currentVisemeTargets = {};
        this.moodTargets = {};
        this.microExpressionTimer = 0;

        // Reset all viseme morph targets to 0
        this.resetVisemeMorphTargets();

        // Stop any old-style lip-sync clips (backward compat)
        this.lipSyncClips.forEach(action => action.stop());
        this.lipSyncClips = [];
        this.currentAudio = null;

        if (this.onSpeakEnd) {
            this.onSpeakEnd();
            this.onSpeakEnd = null;
        }
    },

    /**
     * Stop any active audio and speech animation
     */
    stopSpeaking() {
        this.isSpeaking = false;
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) {}
            this.currentAudio = null;
        }
        this.visemeTimeline = null;
        this.currentVisemeTargets = {};
        this.moodTargets = {};
        this.resetVisemeMorphTargets();
    },

    /**
     * Reset all viseme and expression morph targets to 0
     */
    resetVisemeMorphTargets() {
        if (!this.morphMeshes || this.morphMeshes.length === 0) return;

        const visemeKeys = LipSyncEngine?.visemeNames || [];
        const exprKeys = ['jawOpen', 'mouthSmileLeft', 'mouthSmileRight', 'browInnerUp',
            'browOuterUpLeft', 'browOuterUpRight', 'eyeSquintLeft', 'eyeSquintRight',
            'eyeWideLeft', 'eyeWideRight', 'cheekSquintLeft', 'cheekSquintRight',
            'cheekPuff', 'noseSneerLeft', 'noseSneerRight'];

        // Reset on ALL morphable meshes
        this.morphMeshes.forEach(mesh => {
            if (!mesh.morphTargetDictionary) return;
            visemeKeys.forEach(v => {
                const key = 'viseme_' + v;
                if (key in mesh.morphTargetDictionary) {
                    mesh.morphTargetInfluences[mesh.morphTargetDictionary[key]] = 0;
                }
            });
            exprKeys.forEach(key => {
                if (key in mesh.morphTargetDictionary) {
                    mesh.morphTargetInfluences[mesh.morphTargetDictionary[key]] = 0;
                }
            });
        });

        this.appliedVisemeValues = {};
        this.appliedMoodValues = {};
    },

    /**
     * Set a morph target value on the body mesh directly
     */
    setMorphTarget(name, value) {
        if (!this.morphMeshes || this.morphMeshes.length === 0) return;
        const clamped = Math.max(0, Math.min(1, value));
        // Apply to ALL morphable meshes that have this morph target
        this.morphMeshes.forEach(mesh => {
            if (mesh.morphTargetDictionary && name in mesh.morphTargetDictionary) {
                mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] = clamped;
            }
        });
    },

    // ═══════════════════════════════════════════════════════════
    // TalkingHead-style Animation Update Methods
    // ═══════════════════════════════════════════════════════════

    /**
     * Continuous breathing — chest rises and falls using chestInhale morph target
     */
    updateBreathing(delta) {
        this.breathTimer += delta;
        const cycleDuration = this.isSpeaking ? 2.8 : this.breathCycleDuration;
        const phase = (this.breathTimer % cycleDuration) / cycleDuration;
        // Smooth breathing curve: 0→peak→0 using sin
        const breathValue = Math.sin(phase * Math.PI) * 0.4;
        this.setMorphTarget('chestInhale', breathValue);
    },

    /**
     * Procedural eye blink — single + occasional double blinks with realistic timing
     * State machine: idle → closing → closed → opening → idle
     */
    updateBlink(delta) {
        switch (this.blinkPhase) {
            case 'idle':
                this.blinkTimer += delta;
                if (this.blinkTimer >= this.blinkNextAt) {
                    this.blinkPhase = 'closing';
                    this.blinkPhaseTimer = 0;
                    this.blinkTimer = 0;
                    this.isDoubleBlink = Math.random() < 0.15;
                    this.blinkCount = 0;
                }
                break;
            case 'closing':
                this.blinkPhaseTimer += delta;
                const closeProgress = Math.min(this.blinkPhaseTimer / 0.06, 1);
                this.setMorphTarget('eyeBlinkLeft', closeProgress);
                this.setMorphTarget('eyeBlinkRight', closeProgress);
                if (closeProgress >= 1) {
                    this.blinkPhase = 'closed';
                    this.blinkPhaseTimer = 0;
                }
                break;
            case 'closed':
                this.blinkPhaseTimer += delta;
                const holdDuration = 0.05 + Math.random() * 0.10;
                if (this.blinkPhaseTimer >= holdDuration) {
                    this.blinkPhase = 'opening';
                    this.blinkPhaseTimer = 0;
                }
                break;
            case 'opening':
                this.blinkPhaseTimer += delta;
                const openProgress = Math.min(this.blinkPhaseTimer / 0.08, 1);
                this.setMorphTarget('eyeBlinkLeft', 1 - openProgress);
                this.setMorphTarget('eyeBlinkRight', 1 - openProgress);
                if (openProgress >= 1) {
                    this.blinkCount++;
                    if (this.isDoubleBlink && this.blinkCount < 2) {
                        // Double blink: small pause then blink again
                        this.blinkPhase = 'closing';
                        this.blinkPhaseTimer = 0;
                    } else {
                        this.blinkPhase = 'idle';
                        this.blinkPhaseTimer = 0;
                        // Gaussian-ish random: 2-6s, more frequent when speaking
                        const base = this.isSpeaking ? 1.5 : 2.5;
                        const range = this.isSpeaking ? 2.5 : 4.0;
                        this.blinkNextAt = base + Math.random() * range;
                    }
                }
                break;
        }
    },

    /**
     * Natural eye gaze — eyes look around randomly using morph targets
     */
    updateEyeGaze(delta) {
        this.gazeTimer += delta;
        if (this.gazeTimer >= this.gazeNextAt) {
            this.gazeTimer = 0;
            if (this.isSpeaking && Math.random() < 0.7) {
                // During speech, mostly maintain eye contact (center)
                this.gazeTargetX = (Math.random() - 0.5) * 0.15;
                this.gazeTargetY = (Math.random() - 0.5) * 0.10;
                this.gazeNextAt = 2 + Math.random() * 4;
            } else {
                // Idle: look around more freely
                this.gazeTargetX = (Math.random() - 0.5) * 0.5;
                this.gazeTargetY = -0.1 + Math.random() * 0.4;
                this.gazeNextAt = 1.5 + Math.random() * 3;
            }
        }

        // Smooth interpolation toward target
        const gazeSmoothing = 1 - Math.exp(-4 * delta);
        this.gazeCurrentX += (this.gazeTargetX - this.gazeCurrentX) * gazeSmoothing;
        this.gazeCurrentY += (this.gazeTargetY - this.gazeCurrentY) * gazeSmoothing;

        // Apply via morph targets (split into left/right for natural look)
        if (this.gazeCurrentX > 0) {
            this.setMorphTarget('eyeLookOutLeft', this.gazeCurrentX);
            this.setMorphTarget('eyeLookInRight', this.gazeCurrentX);
            this.setMorphTarget('eyeLookInLeft', 0);
            this.setMorphTarget('eyeLookOutRight', 0);
        } else {
            this.setMorphTarget('eyeLookInLeft', -this.gazeCurrentX);
            this.setMorphTarget('eyeLookOutRight', -this.gazeCurrentX);
            this.setMorphTarget('eyeLookOutLeft', 0);
            this.setMorphTarget('eyeLookInRight', 0);
        }
        if (this.gazeCurrentY > 0) {
            this.setMorphTarget('eyeLookDownLeft', this.gazeCurrentY);
            this.setMorphTarget('eyeLookDownRight', this.gazeCurrentY);
            this.setMorphTarget('eyeLookUpLeft', 0);
            this.setMorphTarget('eyeLookUpRight', 0);
        } else {
            this.setMorphTarget('eyeLookUpLeft', -this.gazeCurrentY);
            this.setMorphTarget('eyeLookUpRight', -this.gazeCurrentY);
            this.setMorphTarget('eyeLookDownLeft', 0);
            this.setMorphTarget('eyeLookDownRight', 0);
        }
    },

    /**
     * Natural head/body sway — multi-frequency sine waves applied to Head bone
     * Ported from TalkingHead's bodyRotateX/Y/Z system
     */
    updateHeadSway(delta) {
        if (!this.headBone) return;

        this.headSwayTime += delta;
        const t = this.headSwayTime;

        // Multi-frequency Perlin-like noise for organic movement
        // Each axis uses 2-3 layered sine waves at different frequencies
        if (this.isSpeaking) {
            // More animated during speech
            this.headSwayTargetX = Math.sin(t * 0.7) * 0.04 + Math.sin(t * 1.9) * 0.03 + Math.sin(t * 3.1) * 0.02;
            this.headSwayTargetY = Math.sin(t * 0.5) * 0.06 + Math.sin(t * 1.3) * 0.03;
            this.headSwayTargetZ = Math.sin(t * 0.8) * 0.03 + Math.sin(t * 2.1) * 0.02;
        } else {
            // Gentle idle drift
            this.headSwayTargetX = Math.sin(t * 0.3) * 0.02 + Math.sin(t * 0.8) * 0.015;
            this.headSwayTargetY = Math.sin(t * 0.2) * 0.04 + Math.sin(t * 0.6) * 0.02;
            this.headSwayTargetZ = Math.sin(t * 0.4) * 0.015 + Math.sin(t * 0.9) * 0.01;
        }

        // Smooth interpolation
        const swaySmooth = 1 - Math.exp(-3 * delta);
        this.headSwayCurrentX += (this.headSwayTargetX - this.headSwayCurrentX) * swaySmooth;
        this.headSwayCurrentY += (this.headSwayTargetY - this.headSwayCurrentY) * swaySmooth;
        this.headSwayCurrentZ += (this.headSwayTargetZ - this.headSwayCurrentZ) * swaySmooth;

        // Apply rotation to head bone using quaternion
        if (this._headBoneInitQuat && !this.activeGesture) {
            const euler = new THREE.Euler(
                this.headSwayCurrentX,
                this.headSwayCurrentY,
                this.headSwayCurrentZ,
                'XYZ'
            );
            const swayQuat = new THREE.Quaternion().setFromEuler(euler);
            this.headBone.quaternion.copy(this._headBoneInitQuat).multiply(swayQuat);
        }

        // Subtle spine sway (half the head amplitude for natural look)
        if (this.spineBone && this._spineBoneInitQuat && !this.activeGesture) {
            const spineEuler = new THREE.Euler(
                this.headSwayCurrentX * 0.3,
                this.headSwayCurrentY * 0.4,
                this.headSwayCurrentZ * 0.3,
                'XYZ'
            );
            const spineQuat = new THREE.Quaternion().setFromEuler(spineEuler);
            this.spineBone.quaternion.copy(this._spineBoneInitQuat).multiply(spineQuat);
        }
    },

    /**
     * Head nod gesture — quick up-down rotations for agreement
     */
    headNod() {
        if (this.activeGesture) return;
        this.activeGesture = 'nod';
        this.gestureTimer = 0;
        this.gesturePhase = 0;
    },

    /**
     * Head shake gesture — quick left-right rotations for disagreement
     */
    headShake() {
        if (this.activeGesture) return;
        this.activeGesture = 'shake';
        this.gestureTimer = 0;
        this.gesturePhase = 0;
    },

    /**
     * Update active gesture animation (nod or shake)
     */
    updateGesture(delta) {
        if (!this.activeGesture || !this.headBone || !this._headBoneInitQuat) return;

        this.gestureTimer += delta;

        if (this.activeGesture === 'nod') {
            // 3 nods: 0.15s down, 0.15s up each = 0.9s total
            const nodAngle = 0.12; // radians
            const nodSpeed = 0.15; // seconds per half-nod
            const totalDuration = 6 * nodSpeed;

            if (this.gestureTimer >= totalDuration) {
                this.activeGesture = null;
                return;
            }

            const phase = this.gestureTimer / nodSpeed;
            const cyclePhase = phase % 2; // 0-2 per nod
            const angle = cyclePhase < 1
                ? nodAngle * Math.sin(cyclePhase * Math.PI) // down
                : 0; // back up

            const euler = new THREE.Euler(angle, 0, 0, 'XYZ');
            const gestureQuat = new THREE.Quaternion().setFromEuler(euler);
            // Layer on top of current sway
            const swayEuler = new THREE.Euler(this.headSwayCurrentX, this.headSwayCurrentY, this.headSwayCurrentZ, 'XYZ');
            const swayQuat = new THREE.Quaternion().setFromEuler(swayEuler);
            this.headBone.quaternion.copy(this._headBoneInitQuat).multiply(swayQuat).multiply(gestureQuat);
        }

        if (this.activeGesture === 'shake') {
            // 4 shakes: left-right-left-right
            const shakeAngle = 0.10;
            const shakeSpeed = 0.12;
            const totalDuration = 8 * shakeSpeed;

            if (this.gestureTimer >= totalDuration) {
                this.activeGesture = null;
                return;
            }

            const phase = this.gestureTimer / shakeSpeed;
            const cyclePhase = phase % 2;
            const direction = Math.floor(phase / 2) % 2 === 0 ? -1 : 1;
            const angle = direction * shakeAngle * Math.sin(cyclePhase * Math.PI);

            const euler = new THREE.Euler(0, angle, 0, 'XYZ');
            const gestureQuat = new THREE.Quaternion().setFromEuler(euler);
            const swayEuler = new THREE.Euler(this.headSwayCurrentX, this.headSwayCurrentY, this.headSwayCurrentZ, 'XYZ');
            const swayQuat = new THREE.Quaternion().setFromEuler(swayEuler);
            this.headBone.quaternion.copy(this._headBoneInitQuat).multiply(swayQuat).multiply(gestureQuat);
        }
    },

    /**
     * Detect and trigger gestures from spoken text
     */
    detectGestures(text) {
        const s = text.toLowerCase();
        const yesWords = ['yes', 'yeah', 'yep', 'sure', 'absolutely', 'definitely',
            'correct', 'right', 'agree', 'of course', 'certainly', 'exactly', 'indeed'];
        const noWords = ['no', 'nope', 'never', 'disagree', 'wrong', 'incorrect',
            'not really', 'don\'t think', 'negative'];
        if (yesWords.some(w => s.includes(w))) {
            setTimeout(() => this.headNod(), 300 + Math.random() * 500);
        } else if (noWords.some(w => s.includes(w))) {
            setTimeout(() => this.headShake(), 300 + Math.random() * 500);
        }
    },

    /**
     * Stop current speech
     */
    stopSpeaking() {
        this.isSpeaking = false;
        this.visemeTimeline = null;
        this.currentVisemeTargets = {};
        this.moodTargets = {};

        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        // Reset viseme morph targets
        this.resetVisemeMorphTargets();

        this.lipSyncClips.forEach(action => action.stop());
        this.lipSyncClips = [];
    },

    /**
     * Animation render loop — includes real-time viseme lip sync
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        if (this.mixer) {
            this.mixer.update(delta);
        }

        // ─── Always-on animation layers (run even when not speaking) ───
        this.updateBreathing(delta);
        this.updateBlink(delta);
        this.updateEyeGaze(delta);
        this.updateHeadSway(delta);
        this.updateGesture(delta);

        // ─── Real-time viseme lip sync ───
        if (this.isSpeaking && this.visemeTimeline && this.currentAudio && this.morphMeshes && this.morphMeshes.length > 0) {
            // Small time offset to compensate for audio decode/playback latency
            const timeOffset = 0.12;
            const currentTime = this.currentAudio.currentTime + timeOffset;
            const activeViseme = LipSyncEngine.getActiveViseme(this.visemeTimeline, currentTime);

            // Build target values for all viseme morphs
            const targets = {};
            LipSyncEngine.visemeNames.forEach(v => { targets['viseme_' + v] = 0; });

            // Set active viseme
            if (activeViseme.viseme !== 'sil') {
                targets['viseme_' + activeViseme.viseme] = activeViseme.intensity;

                // Blend a small amount of the next viseme for smooth transitions
                if (activeViseme.nextViseme && activeViseme.nextViseme !== 'sil' && activeViseme.progress > 0.6) {
                    const blendFactor = (activeViseme.progress - 0.6) / 0.4; // 0 to 1 in last 40%
                    targets['viseme_' + activeViseme.nextViseme] = activeViseme.intensity * blendFactor * 0.3;
                }
            }

            // Apply viseme morph targets with near-instant interpolation
            // Factor 40 at 60fps → ~49% per frame = very responsive, no perceptible delay
            const smoothing = 1 - Math.exp(-40 * delta);
            for (const [key, target] of Object.entries(targets)) {
                const current = this.appliedVisemeValues[key] || 0;
                const newValue = current + (target - current) * smoothing;
                this.appliedVisemeValues[key] = newValue;
                this.setMorphTarget(key, newValue);
            }

            // Apply supplementary jawOpen from viseme (makes lip sync more visible)
            const visemeBlend = LipSyncEngine.visemeBlendshapes?.[activeViseme.viseme];
            if (visemeBlend) {
                for (const [key, val] of Object.entries(visemeBlend)) {
                    const target = val * activeViseme.intensity;
                    const current = this.appliedVisemeValues['_' + key] || 0;
                    const newValue = current + (target - current) * smoothing;
                    this.appliedVisemeValues['_' + key] = newValue;
                    this.setMorphTarget(key, newValue);
                }
            } else {
                // Decay jawOpen when no viseme blend
                const cur = this.appliedVisemeValues['_jawOpen'] || 0;
                if (cur > 0.001) {
                    const nv = cur * (1 - smoothing);
                    this.appliedVisemeValues['_jawOpen'] = nv;
                    this.setMorphTarget('jawOpen', nv);
                }
            }

            // ─── Mood-based facial expressions ───
            const moodSmoothing = 1 - Math.exp(-3 * delta); // Slower, more gradual
            for (const [key, target] of Object.entries(this.moodTargets)) {
                const current = this.appliedMoodValues[key] || 0;
                const newValue = current + (target - current) * moodSmoothing;
                this.appliedMoodValues[key] = newValue;
                this.setMorphTarget(key, newValue);
            }

            // ─── Micro-expressions & gestures during speech ───
            this.microExpressionTimer -= delta;
            if (this.microExpressionTimer <= 0) {
                this.microExpressionTimer = 0.8 + Math.random() * 1.2; // every 0.8-2.0s (more frequent)
                const microType = Math.random();
                const mood = this.moodPresets[this.currentMood] || {};

                if (microType < 0.20) {
                    // Brow flash — emphasis gesture
                    this.moodTargets.browInnerUp = (mood.browInnerUp || 0) + 0.10 + Math.random() * 0.12;
                    this.moodTargets.browOuterUpLeft = (mood.browOuterUpLeft || 0) + 0.06;
                    this.moodTargets.browOuterUpRight = (mood.browOuterUpRight || 0) + 0.06;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.browInnerUp = mood.browInnerUp || 0;
                            this.moodTargets.browOuterUpLeft = mood.browOuterUpLeft || 0;
                            this.moodTargets.browOuterUpRight = mood.browOuterUpRight || 0;
                        }
                    }, 350);
                } else if (microType < 0.35) {
                    // Subtle squint — thinking/processing
                    const v = 0.06 + Math.random() * 0.10;
                    this.moodTargets.eyeSquintLeft = (mood.eyeSquintLeft || 0) + v;
                    this.moodTargets.eyeSquintRight = (mood.eyeSquintRight || 0) + v;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.eyeSquintLeft = mood.eyeSquintLeft || 0;
                            this.moodTargets.eyeSquintRight = mood.eyeSquintRight || 0;
                        }
                    }, 500);
                } else if (microType < 0.50) {
                    // Smile flicker — warmth/engagement
                    const smileV = 0.06 + Math.random() * 0.08;
                    this.moodTargets.mouthSmileLeft = (mood.mouthSmileLeft || 0) + smileV;
                    this.moodTargets.mouthSmileRight = (mood.mouthSmileRight || 0) + smileV;
                    this.moodTargets.cheekSquintLeft = (mood.cheekSquintLeft || 0) + smileV * 0.5;
                    this.moodTargets.cheekSquintRight = (mood.cheekSquintRight || 0) + smileV * 0.5;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.mouthSmileLeft = mood.mouthSmileLeft || 0;
                            this.moodTargets.mouthSmileRight = mood.mouthSmileRight || 0;
                            this.moodTargets.cheekSquintLeft = mood.cheekSquintLeft || 0;
                            this.moodTargets.cheekSquintRight = mood.cheekSquintRight || 0;
                        }
                    }, 600);
                } else if (microType < 0.65) {
                    // Head nod — agreement/acknowledgment via morph targets
                    this.moodTargets.jawOpen = (mood.jawOpen || 0) + 0.03;
                    this.moodTargets.noseSneerLeft = (mood.noseSneerLeft || 0) + 0.04;
                    this.moodTargets.noseSneerRight = (mood.noseSneerRight || 0) + 0.04;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.jawOpen = mood.jawOpen || 0;
                            this.moodTargets.noseSneerLeft = mood.noseSneerLeft || 0;
                            this.moodTargets.noseSneerRight = mood.noseSneerRight || 0;
                        }
                    }, 300);
                } else if (microType < 0.78) {
                    // Eye widen — attention/interest
                    this.moodTargets.eyeWideLeft = (mood.eyeWideLeft || 0) + 0.08 + Math.random() * 0.06;
                    this.moodTargets.eyeWideRight = (mood.eyeWideRight || 0) + 0.08 + Math.random() * 0.06;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.eyeWideLeft = mood.eyeWideLeft || 0;
                            this.moodTargets.eyeWideRight = mood.eyeWideRight || 0;
                        }
                    }, 400);
                } else if (microType < 0.88) {
                    // Mouth dimple — contemplation gesture
                    this.moodTargets.mouthDimpleLeft = (mood.mouthDimpleLeft || 0) + 0.10;
                    this.moodTargets.mouthDimpleRight = (mood.mouthDimpleRight || 0) + 0.10;
                    this.moodTargets.mouthPressLeft = (mood.mouthPressLeft || 0) + 0.05;
                    this.moodTargets.mouthPressRight = (mood.mouthPressRight || 0) + 0.05;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.mouthDimpleLeft = mood.mouthDimpleLeft || 0;
                            this.moodTargets.mouthDimpleRight = mood.mouthDimpleRight || 0;
                            this.moodTargets.mouthPressLeft = mood.mouthPressLeft || 0;
                            this.moodTargets.mouthPressRight = mood.mouthPressRight || 0;
                        }
                    }, 500);
                } else {
                    // Nose sneer — subtle character gesture
                    const sneerV = 0.04 + Math.random() * 0.05;
                    this.moodTargets.noseSneerLeft = (mood.noseSneerLeft || 0) + sneerV;
                    this.moodTargets.noseSneerRight = (mood.noseSneerRight || 0) + sneerV * 0.6;
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            this.moodTargets.noseSneerLeft = mood.noseSneerLeft || 0;
                            this.moodTargets.noseSneerRight = mood.noseSneerRight || 0;
                        }
                    }, 350);
                }
            }
        } else if (!this.isSpeaking) {
            // When not speaking, decay all applied values smoothly to 0
            const decaySmoothing = 1 - Math.exp(-5 * delta);
            let hasValues = false;
            for (const [key, val] of Object.entries(this.appliedVisemeValues)) {
                if (Math.abs(val) > 0.001) {
                    hasValues = true;
                    const newValue = val * (1 - decaySmoothing);
                    this.appliedVisemeValues[key] = newValue;
                    const morphKey = key.startsWith('_') ? key.substring(1) : key;
                    this.setMorphTarget(morphKey, newValue);
                }
            }
            for (const [key, val] of Object.entries(this.appliedMoodValues)) {
                if (Math.abs(val) > 0.001) {
                    hasValues = true;
                    const newValue = val * (1 - decaySmoothing);
                    this.appliedMoodValues[key] = newValue;
                    this.setMorphTarget(key, newValue);
                }
            }
            if (!hasValues) {
                this.appliedVisemeValues = {};
                this.appliedMoodValues = {};
            }
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    /**
     * Handle window resize
     */
    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const zoom = 1600;

        this.camera.left = -aspect / 2 * (1 / zoom * 1000);
        this.camera.right = aspect / 2 * (1 / zoom * 1000);
        this.camera.top = 1 / zoom * 500;
        this.camera.bottom = -1 / zoom * 500;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        // Resize background to fill the new viewport
        if (this.bgMesh) {
            const viewWidth = aspect * (1000 / zoom);
            const viewHeight = 2 * (500 / zoom);
            const scale = 1.15;
            this.bgMesh.geometry.dispose();
            this.bgMesh.geometry = new THREE.PlaneGeometry(viewWidth * scale, viewHeight * scale);
        }
    },

    /**
     * Clean up all resources
     */
    destroy() {
        this.stopSpeaking();

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mixer = null;
        this.gltfScene = null;
        this.isInitialized = false;
        this.morphTargetDictionaryBody = null;
        this.morphTargetDictionaryLowerTeeth = null;
        this.morphMeshes = [];
        this.bodyMesh = null;
        this.teethMesh = null;

        console.log('Avatar3D: Destroyed');
    }
};
