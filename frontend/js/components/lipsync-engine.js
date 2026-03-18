/**
 * PersonaFlow - LipSync Engine
 * Ported from TalkingHead (MIT License, Mika Suominen)
 * Converts English text to Oculus LipSync Visemes with timing data
 * 
 * Viseme set: aa, E, I, O, U, PP, SS, TH, DD, FF, kk, nn, RR, CH, sil
 * These map directly to RPM model morph targets: viseme_aa, viseme_E, etc.
 */

const LipSyncEngine = {

    // ─── Letter-to-Sound Rules (NRL Report 7948) ───
    // Each rule: { regex, move, visemes[] }
    _rulesCompiled: false,
    _rules: {},

    // Viseme durations in relative units (1 = average)
    visemeDurations: {
        'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'PP': 1.08,
        'SS': 1.23, 'TH': 1, 'DD': 1.05, 'FF': 1.00, 'kk': 1.21, 'nn': 0.88,
        'RR': 0.88, 'CH': 1.1, 'sil': 1
    },

    // Pauses in relative units
    specialDurations: { ' ': 1, ',': 3, '-': 0.5, "'": 0.5 },

    // All viseme names (Oculus LipSync)
    visemeNames: ['aa', 'E', 'I', 'O', 'U', 'PP', 'SS', 'TH', 'DD', 'FF', 'kk', 'nn', 'RR', 'CH', 'sil'],

    // Viseme-to-blendshape intensity mapping for non-viseme morph targets
    // This adds jaw movement and supplementary expressions to make lip sync more visible
    visemeBlendshapes: {
        'aa': { jawOpen: 0.35 },
        'E': { jawOpen: 0.20 },
        'I': { jawOpen: 0.12 },
        'O': { jawOpen: 0.30 },
        'U': { jawOpen: 0.15 },
        'PP': { jawOpen: 0.02 },
        'SS': { jawOpen: 0.05 },
        'TH': { jawOpen: 0.08 },
        'DD': { jawOpen: 0.10 },
        'FF': { jawOpen: 0.05 },
        'kk': { jawOpen: 0.12 },
        'nn': { jawOpen: 0.08 },
        'RR': { jawOpen: 0.10 },
        'CH': { jawOpen: 0.08 },
        'sil': { jawOpen: 0.0 }
    },

    /**
     * Initialize the rules engine. Called once on first use.
     */
    init() {
        if (this._rulesCompiled) return;

        // Raw letter-to-sound rules from NRL Report 7948
        const rawRules = {
            'A': [
                "[A] =aa", " [ARE] =aa RR", " [AR]O=aa RR", "[AR]#=E RR",
                " ^[AS]#=E SS", "[A]WA=aa", "[AW]=aa", " :[ANY]=E nn I",
                "[A]^+#=E", "#:[ALLY]=aa nn I", " [AL]#=aa nn", "[AGAIN]=aa kk E nn",
                "#:[AG]E=I kk", "[A]^+:#=aa", ":[A]^+ =E", "[A]^%=E",
                " [ARR]=aa RR", "[ARR]=aa RR", " :[AR] =aa RR", "[AR] =E",
                "[AR]=aa RR", "[AIR]=E RR", "[AI]=E", "[AY]=E", "[AU]=aa",
                "#:[AL] =aa nn", "#:[ALS] =aa nn SS", "[ALK]=aa kk", "[AL]^=aa nn",
                " :[ABLE]=E PP aa nn", "[ABLE]=aa PP aa nn", "[ANG]+=E nn kk", "[A]=aa"
            ],
            'B': [
                " [BE]^#=PP I", "[BEING]=PP I I nn", " [BOTH] =PP O TH",
                " [BUS]#=PP I SS", "[BUIL]=PP I nn", "[B]=PP"
            ],
            'C': [
                " [CH]^=kk", "^E[CH]=kk", "[CH]=CH", " S[CI]#=SS aa",
                "[CI]A=SS", "[CI]O=SS", "[CI]EN=SS", "[C]+=SS",
                "[CK]=kk", "[COM]%=kk aa PP", "[C]=kk"
            ],
            'D': [
                "#:[DED] =DD I DD", ".E[D] =DD", "#^:E[D] =DD", " [DE]^#=DD I",
                " [DO] =DD U", " [DOES]=DD aa SS", " [DOING]=DD U I nn",
                " [DOW]=DD aa", "[DU]A=kk U", "[D]=DD"
            ],
            'E': [
                "#:[E] =", "'^:[E] =", " :[E] =I", "#[ED] =DD", "#:[E]D =",
                "[EV]ER=E FF", "[E]^%=I", "[ERI]#=I RR I", "[ERI]=E RR I",
                "#:[ER]#=E", "[ER]#=E RR", "[ER]=E", " [EVEN]=I FF E nn",
                "#:[E]W=", "@[EW]=U", "[EW]=I U", "[E]O=I", "#:&[ES] =I SS",
                "#:[E]S =", "#:[ELY] =nn I", "#:[EMENT]=PP E nn DD", "[EFUL]=FF U nn",
                "[EE]=I", "[EARN]=E nn", " [EAR]^=E", "[EAD]=E DD", "#:[EA] =I aa",
                "[EA]SU=E", "[EA]=I", "[EIGH]=E", "[EI]=I", " [EYE]=aa", "[EY]=I",
                "[EU]=I U", "[E]=E"
            ],
            'F': [
                "[FUL]=FF U nn", "[F]=FF"
            ],
            'G': [
                "[GIV]=kk I FF", " [G]I^=kk", "[GE]T=kk E", "SU[GGES]=kk kk E SS",
                "[GG]=kk", " B#[G]=kk", "[G]+=kk", "[GREAT]=kk RR E DD",
                "#[GH]=", "[G]=kk"
            ],
            'H': [
                " [HAV]=I aa FF", " [HERE]=I I RR", " [HOUR]=aa EE", "[HOW]=I aa",
                "[H]#=I", "[H]="
            ],
            'I': [
                " [IN]=I nn", " [I] =aa", "[IN]D=aa nn", "[IER]=I E",
                "#:R[IED] =I DD", "[IED] =aa DD", "[IEN]=I E nn", "[IE]T=aa E",
                " :[I]%=aa", "[I]%=I", "[IE]=I", "[I]^+:#=I", "[IR]#=aa RR",
                "[IZ]%=aa SS", "[IS]%=aa SS", "[I]D%=aa", "+^[I]^+=I",
                "[I]T%=aa", "#^:[I]^+=I", "[I]^+=aa", "[IR]=E", "[IGH]=aa",
                "[ILD]=aa nn DD", "[IGN] =aa nn", "[IGN]^=aa nn", "[IGN]%=aa nn",
                "[IQUE]=I kk", "[I]=I"
            ],
            'J': ["[J]=kk"],
            'K': [" [K]N=", "[K]=kk"],
            'L': ["[LO]C#=nn O", "L[L]=", "#^:[L]%=aa nn", "[LEAD]=nn I DD", "[L]=nn"],
            'M': ["[MOV]=PP U FF", "[M]=PP"],
            'N': [
                "E[NG]+=nn kk", "[NG]R=nn kk", "[NG]#=nn kk", "[NGL]%=nn kk aa nn",
                "[NG]=nn", "[NK]=nn kk", " [NOW] =nn aa", "[N]=nn"
            ],
            'O': [
                "[OF] =aa FF", "[OROUGH]=E O", "#:[OR] =E", "#:[ORS] =E SS",
                "[OR]=aa RR", " [ONE]=FF aa nn", "[OW]=O", " [OVER]=O FF E",
                "[OV]=aa FF", "[O]^%=O", "[O]^EN=O", "[O]^I#=O", "[OL]D=O nn",
                "[OUGHT]=aa DD", "[OUGH]=aa FF", " [OU]=aa", "H[OU]S#=aa",
                "[OUS]=aa SS", "[OUR]=aa RR", "[OULD]=U DD", "^[OU]^L=aa",
                "[OUP]=U OO", "[OU]=aa", "[OY]=O", "[OING]=O I nn", "[OI]=O",
                "[OOR]=aa RR", "[OOK]=U kk", "[OOD]=U DD", "[OO]=U", "[O]E=O",
                "[O] =O", "[OA]=O", " [ONLY]=O nn nn I", " [ONCE]=FF aa nn SS",
                "[ON'T]=O nn DD", "C[O]N=aa", "[O]NG=aa", " ^:[O]N=aa",
                "I[ON]=aa nn", "#:[ON] =aa nn", "#^[ON]=aa nn", "[O]ST =O",
                "[OF]^=aa FF", "[OTHER]=aa TH E", "[OSS] =aa SS", "#^:[OM]=aa PP",
                "[O]=aa"
            ],
            'P': [
                "[PH]=FF", "[PEOP]=PP I PP", "[POW]=PP aa", "[PUT] =PP U DD",
                "[P]=PP"
            ],
            'Q': ["[QUAR]=kk FF aa RR", "[QU]=kk FF", "[Q]=kk"],
            'R': [" [RE]^#=RR I", "[R]=RR"],
            'S': [
                "[SH]=SS", "#[SION]=SS aa nn", "[SOME]=SS aa PP", "#[SUR]#=SS E",
                "[SUR]#=SS E", "#[SU]#=SS U", "#[SSU]#=SS U", "#[SED] =SS DD",
                "#[S]#=SS", "[SAID]=SS E DD", "^[SION]=SS aa nn", "[S]S=",
                ".[S] =SS", "#:.E[S] =SS", "#^:##[S] =SS", "#^:#[S] =SS",
                "U[S] =SS", " :#[S] =SS", " [SCH]=SS kk", "[S]C+=",
                "#[SM]=SS PP", "#[SN]'=SS aa nn", "[S]=SS"
            ],
            'T': [
                " [THE] =TH aa", "[TO] =DD U", "[THAT] =TH aa DD", " [THIS] =TH I SS",
                " [THEY]=TH E", " [THERE]=TH E RR", "[THER]=TH E", "[THEIR]=TH E RR",
                " [THAN] =TH aa nn", " [THEM] =TH E PP", "[THESE] =TH I SS",
                " [THEN]=TH E nn", "[THROUGH]=TH RR U", "[THOSE]=TH O SS",
                "[THOUGH] =TH O", " [THUS]=TH aa SS", "[TH]=TH", "#:[TED] =DD I DD",
                "S[TI]#N=CH", "[TI]O=SS", "[TI]A=SS", "[TIEN]=SS aa nn",
                "[TUR]#=CH E", "[TU]A=CH U", " [TWO]=DD U", "[T]=DD"
            ],
            'U': [
                " [UN]I=I U nn", " [UN]=aa nn", " [UPON]=aa PP aa nn",
                "@[UR]#=U RR", "[UR]#=I U RR", "[UR]=E", "[U]^ =aa",
                "[U]^^=aa", "[UY]=aa", " G[U]#=", "G[U]%=", "G[U]#=FF",
                "#N[U]=I U", "@[U]=I", "[U]=I U"
            ],
            'V': ["[VIEW]=FF I U", "[V]=FF"],
            'W': [
                " [WERE]=FF E", "[WA]S=FF aa", "[WA]T=FF aa", "[WHERE]=FF E RR",
                "[WHAT]=FF aa DD", "[WHOL]=I O nn", "[WHO]=I U", "[WH]=FF",
                "[WAR]=FF aa RR", "[WOR]^=FF E", "[WR]=RR", "[W]=FF"
            ],
            'X': [" [X]=SS", "[X]=kk SS"],
            'Y': [
                "[YOUNG]=I aa nn", " [YOU]=I U", " [YES]=I E SS", " [Y]=I",
                "#^:[Y] =I", "#^:[Y]I=I", " :[Y] =aa", " :[Y]#=aa",
                " :[Y]^+:#=I", " :[Y]^#=I", "[Y]=I"
            ],
            'Z': ["[Z]=SS"]
        };

        // Operator definitions for rule patterns
        const ops = {
            '#': '[AEIOUY]+',
            '.': '[BDVGJLMNRWZ]',
            '%': '(?:ER|E|ES|ED|ING|ELY)',
            '&': '(?:[SCGZXJ]|CH|SH)',
            '@': '(?:[TSRDLZNJ]|TH|CH|SH)',
            '^': '[BCDFGHJKLMNPQRSTVWXZ]',
            '+': '[EIY]',
            ':': '[BCDFGHJKLMNPQRSTVWXZ]*',
            ' ': '\\b'
        };

        // Compile rules to regex
        Object.keys(rawRules).forEach(key => {
            this._rules[key] = rawRules[key].map(rule => {
                const posL = rule.indexOf('[');
                const posR = rule.indexOf(']');
                const posE = rule.indexOf('=');
                const strLeft = rule.substring(0, posL);
                const strLetters = rule.substring(posL + 1, posR);
                const strRight = rule.substring(posR + 1, posE);
                const strVisemes = rule.substring(posE + 1);

                const o = { regex: '', move: 0, visemes: [] };

                let exp = '';
                exp += [...strLeft].map(x => ops[x] || x).join('');
                const ctxLetters = [...strLetters];
                ctxLetters[0] = ctxLetters[0].toLowerCase();
                exp += ctxLetters.join('');
                o.move = ctxLetters.length;
                exp += [...strRight].map(x => ops[x] || x).join('');
                o.regex = new RegExp(exp);

                if (strVisemes.length) {
                    strVisemes.split(' ').forEach(viseme => {
                        o.visemes.push(viseme);
                    });
                }

                return o;
            });
        });

        this._rulesCompiled = true;
        console.log('LipSyncEngine: Initialized with', Object.keys(this._rules).length, 'letter rules');
    },

    /**
     * Pre-process text: remove special chars, convert numbers to words, etc.
     * @param {string} s - Input text
     * @returns {string} Cleaned text
     */
    preProcessText(s) {
        // Symbols to words
        const symbols = { '%': 'percent', '€': 'euros', '&': 'and', '+': 'plus', '$': 'dollars' };
        let r = s.replace(/[#_*":;]/g, '');
        r = r.replace(/[%€&+$]/g, (sym) => ' ' + (symbols[sym] || '') + ' ');

        // Simple number-to-word conversion for common cases
        r = r.replace(/\b(\d+)\b/g, (match) => {
            const n = parseInt(match);
            if (n >= 0 && n <= 20) {
                const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
                    'eighteen', 'nineteen', 'twenty'];
                return words[n];
            }
            // For larger numbers, just spell out digits
            return match.split('').map(d => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][parseInt(d)] || d).join(' ');
        });

        r = r.replace(/(\D)\1\1+/g, '$1$1') // max 2 repeating chars
            .replace(/  +/g, ' ')
            .trim();

        return r;
    },

    /**
     * Convert a word to Oculus LipSync Visemes with timing
     * @param {string} w - Word to convert
     * @returns {Object} { visemes: string[], times: number[], durations: number[] }
     */
    wordToVisemes(w) {
        this.init();

        const o = { words: w.toUpperCase(), visemes: [], times: [], durations: [], i: 0 };
        let t = 0;

        const chars = [...o.words];
        while (o.i < chars.length) {
            const c = chars[o.i];
            const ruleset = this._rules[c];
            if (ruleset) {
                let matched = false;
                for (let i = 0; i < ruleset.length; i++) {
                    const rule = ruleset[i];
                    const test = o.words.substring(0, o.i) + c.toLowerCase() + o.words.substring(o.i + 1);
                    const matches = test.match(rule.regex);
                    if (matches) {
                        rule.visemes.forEach(viseme => {
                            if (o.visemes.length && o.visemes[o.visemes.length - 1] === viseme) {
                                const d = 0.7 * (this.visemeDurations[viseme] || 1);
                                o.durations[o.durations.length - 1] += d;
                                t += d;
                            } else {
                                const d = this.visemeDurations[viseme] || 1;
                                o.visemes.push(viseme);
                                o.times.push(t);
                                o.durations.push(d);
                                t += d;
                            }
                        });
                        o.i += rule.move;
                        matched = true;
                        break;
                    }
                }
                if (!matched) o.i++;
            } else {
                o.i++;
                t += this.specialDurations[c] || 0;
            }
        }

        return o;
    },

    /**
     * Convert full text to a viseme timeline scaled to a given audio duration
     * @param {string} text - Full text to convert
     * @param {number} audioDuration - Audio duration in seconds
     * @returns {Object[]} Array of { time, viseme, duration, intensity }
     */
    textToVisemes(text, audioDuration) {
        this.init();

        const processedText = this.preProcessText(text);
        const words = processedText.split(/\s+/).filter(w => w.length > 0);

        if (words.length === 0) return [];

        // Build the full viseme sequence with relative timing
        let allVisemes = [];
        let totalRelativeTime = 0;

        words.forEach((word, wi) => {
            // Strip trailing punctuation — keep it for pause calculation but don't feed to viseme rules
            const punctMatch = word.match(/[.,!?;:…]+$/);
            const cleanWord = punctMatch ? word.slice(0, -punctMatch[0].length) : word;
            const punct = punctMatch ? punctMatch[0] : '';

            if (cleanWord.length > 0) {
                const result = this.wordToVisemes(cleanWord);
                if (result.visemes.length > 0) {
                    const wordDuration = result.times[result.visemes.length - 1] + result.durations[result.visemes.length - 1];
                    result.visemes.forEach((viseme, vi) => {
                        allVisemes.push({
                            viseme: viseme,
                            relTime: totalRelativeTime + result.times[vi],
                            relDuration: result.durations[vi]
                        });
                    });
                    totalRelativeTime += wordDuration;
                }
            }

            // Punctuation-aware pauses — insert explicit silence viseme so mouth closes
            let pauseDuration;
            if (punct.includes('…') || punct.includes('...')) {
                pauseDuration = 4.0;
            } else if (punct.includes('.') || punct.includes('!') || punct.includes('?')) {
                pauseDuration = 3.0;
            } else if (punct.includes(',') || punct.includes(';') || punct.includes(':')) {
                pauseDuration = 1.8;
            } else {
                pauseDuration = 0.8;
            }

            // Insert a silence viseme at the pause start so the mouth closes
            allVisemes.push({
                viseme: 'sil',
                relTime: totalRelativeTime,
                relDuration: pauseDuration
            });
            totalRelativeTime += pauseDuration;
        });

        if (allVisemes.length === 0 || totalRelativeTime === 0) return [];

        // Scale relative times to actual audio duration
        // Leave small margin at start and end for natural feel
        const startMargin = 0.05; // 50ms
        const endMargin = 0.15;   // 150ms
        const effectiveDuration = audioDuration - startMargin - endMargin;
        const scale = effectiveDuration / totalRelativeTime;

        const timeline = allVisemes.map(v => ({
            time: startMargin + v.relTime * scale,
            viseme: v.viseme,
            duration: v.relDuration * scale,
            // PP and FF are bilabial/labiodental — more visible
            intensity: (v.viseme === 'PP' || v.viseme === 'FF') ? 0.9 : 0.7
        }));

        // Add initial and final silence
        timeline.unshift({ time: 0, viseme: 'sil', duration: startMargin, intensity: 0 });
        timeline.push({ time: audioDuration - endMargin, viseme: 'sil', duration: endMargin, intensity: 0 });

        return timeline;
    },

    /**
     * Get the active viseme at a given time from a timeline
     * @param {Object[]} timeline - Viseme timeline from textToVisemes()
     * @param {number} currentTime - Current audio playback time in seconds
     * @returns {Object} { viseme, intensity, progress } where progress is 0-1 within the viseme
     */
    getActiveViseme(timeline, currentTime) {
        if (!timeline || timeline.length === 0) return { viseme: 'sil', intensity: 0, progress: 0 };

        // Find the active viseme
        let active = timeline[0];
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (currentTime >= timeline[i].time) {
                active = timeline[i];
                break;
            }
        }

        // Find the next viseme for blending
        let nextIdx = -1;
        for (let i = 0; i < timeline.length; i++) {
            if (timeline[i].time > currentTime) {
                nextIdx = i;
                break;
            }
        }

        const elapsed = currentTime - active.time;
        const progress = active.duration > 0 ? Math.min(1, elapsed / active.duration) : 1;

        // Envelope: quick attack, sustain, decay
        let envelope;
        if (progress < 0.15) {
            // Attack phase — ramp up quickly
            envelope = progress / 0.15;
        } else if (progress < 0.7) {
            // Sustain — full intensity
            envelope = 1.0;
        } else {
            // Decay — ramp down
            envelope = 1.0 - ((progress - 0.7) / 0.3);
        }
        envelope = Math.max(0, Math.min(1, envelope));

        return {
            viseme: active.viseme,
            intensity: active.intensity * envelope,
            progress: progress,
            nextViseme: nextIdx >= 0 ? timeline[nextIdx].viseme : 'sil'
        };
    }
};
