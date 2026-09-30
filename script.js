/* =========================================================
   Elvijs Strads — Portfolio
   GSAP + Lenis + canvas + counters + rotator + Tier 2 craft + Tier 3
   ========================================================= */
(function () {
    'use strict';

    // Global guard: log any runtime error so issues are visible in any browser
    window.addEventListener('error', function (e) {
        console.error('[Portfolio] Runtime error:', e.message, e.filename, e.lineno);
    });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer  = window.matchMedia('(pointer: fine)').matches;
    const isMobile     = window.matchMedia('(max-width: 768px)').matches;

    /* ---------------------------------------------------------
       1. LENIS SMOOTH SCROLL (defensive)
       --------------------------------------------------------- */
    let lenis = null;
    try {
        if (typeof Lenis !== 'undefined' && !reduceMotion) {
            lenis = new Lenis({
                duration: 1.15,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                wheelMultiplier: 0.9,
            });
            function raf(time) {
                if (!document.hidden) lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        }
    } catch (err) {
        console.warn('[Portfolio] Lenis init failed, falling back to native scroll:', err);
        lenis = null;
    }

    /* ---------------------------------------------------------
       2. GSAP SETUP (defensive)
       --------------------------------------------------------- */
    let hasGsap = false;
    try {
        hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
        if (hasGsap) {
            gsap.registerPlugin(ScrollTrigger);
            if (lenis) lenis.on('scroll', ScrollTrigger.update);
        }
    } catch (err) {
        console.warn('[Portfolio] GSAP init failed, using CSS fallbacks:', err);
        hasGsap = false;
    }

    /* ---------------------------------------------------------
       3. NAV / PROGRESS / SCROLL
       --------------------------------------------------------- */
    const navbar       = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks     = document.getElementById('navLinks');
    const progressBar  = document.getElementById('progressBar');
    const mainEl       = document.getElementById('main');

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const p = docHeight > 0 ? window.scrollY / docHeight : 0;
            if (progressBar) progressBar.style.transform = 'scaleX(' + p + ')';
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
            ticking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------------------------------------------------------
       4. MOBILE MENU
       --------------------------------------------------------- */
    function setMenu(open) {
        navLinks.classList.toggle('active', open);
        mobileToggle.setAttribute('aria-expanded', String(open));
        mobileToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (mainEl) mainEl.inert = open;
    }

    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setMenu(!navLinks.classList.contains('active'));
    });
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            setMenu(false);
            mobileToggle.focus();
        }
    });

    /* ---------------------------------------------------------
       5. SMOOTH ANCHOR SCROLL
       --------------------------------------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            setMenu(false);

            if (lenis) {
                lenis.scrollTo(target, { offset: -70, duration: 1.2 });
            } else {
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        });
    });

    /* ---------------------------------------------------------
       6. SCROLL SPY
       --------------------------------------------------------- */
    const sections   = document.querySelectorAll('main section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');
    let currentId = '';

    const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            if (id === currentId) return;
            currentId = id;
            navAnchors.forEach(a => {
                const active = a.getAttribute('href') === '#' + id;
                a.classList.toggle('active', active);
                if (active) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
            const newHash = id === 'hero' ? window.location.pathname : '#' + id;
            history.replaceState(null, '', newHash);
        });
    }, { threshold: 0.4 });
    sections.forEach(s => spy.observe(s));

    /* ---------------------------------------------------------
       7. SCROLL REVEAL
       --------------------------------------------------------- */
    const revealEls = document.querySelectorAll('.reveal');

    if (hasGsap && !reduceMotion) {
        revealEls.forEach(el => {
            gsap.fromTo(el,
                { opacity: 0, y: 40 },
                {
                    opacity: 1, y: 0,
                    duration: 1.1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 88%',
                        toggleActions: 'play none none none',
                    }
                }
            );
        });

        document.querySelectorAll('.section-header').forEach(header => {
            ScrollTrigger.create({
                trigger: header,
                start: 'top 82%',
                once: true,
                onEnter: () => header.classList.add('is-visible'),
            });
        });
    } else {
        revealEls.forEach(el => el.classList.add('visible'));
        document.querySelectorAll('.section-header').forEach(h => h.classList.add('is-visible'));
    }

    /* ---------------------------------------------------------
       8. STAT COUNTERS
       --------------------------------------------------------- */
    function formatFinal(format, from, to) {
        if (format === 'arrow')   return from + '→' + to;
        if (format === 'range')   return from + '-' + to + 'h';
        if (format === 'percent') return '~' + to + '%';
        return String(to);
    }

    function animateMetric(el) {
        if (el.dataset.animated === 'true') return;
        el.dataset.animated = 'true';

        const from   = parseInt(el.dataset.from || '0', 10);
        const to     = parseInt(el.dataset.to   || '0', 10);
        const format = el.dataset.format || '';

        if (reduceMotion) {
            el.textContent = formatFinal(format, from, to);
            return;
        }

        el.classList.add('is-counting');
        const duration = 1400;
        const t0 = performance.now();

        function frame(now) {
            const p = Math.min((now - t0) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const current = Math.round(to * ease);

            if (format === 'arrow')        el.textContent = from + '→' + current;
            else if (format === 'range')   el.textContent = from + '-' + current + 'h';
            else if (format === 'percent') el.textContent = '~' + current + '%';
            else                            el.textContent = String(current);

            if (p < 1) requestAnimationFrame(frame);
            else {
                el.textContent = formatFinal(format, from, to);
                el.classList.remove('is-counting');
                el.classList.add('is-complete');
            }
        }
        requestAnimationFrame(frame);
    }

    const metrics = document.querySelectorAll('[data-metric]');
    if (metrics.length) {
        const mObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                animateMetric(entry.target);
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.55 });
        metrics.forEach(m => mObserver.observe(m));
    }

    /* ---------------------------------------------------------
       9. HERO ROLE ROTATOR
       --------------------------------------------------------- */
    (function roleRotator() {
        const el = document.getElementById('heroRole');
        if (!el || reduceMotion) return;

        let roles;
        try { roles = JSON.parse(el.dataset.roles || '[]'); } catch (e) { return; }
        if (roles.length < 2) return;

        let i = 0;
        setInterval(() => {
            if (document.hidden) return;
            i = (i + 1) % roles.length;
            el.classList.add('is-swapping');
            setTimeout(() => {
                el.textContent = roles[i];
                el.classList.remove('is-swapping');
            }, 550);
        }, 4200);
    })();

    /* ---------------------------------------------------------
       10. NODE NETWORK
       --------------------------------------------------------- */
    (function nodeNetwork() {
        const canvas = document.getElementById('heroCanvas');
        if (!canvas || reduceMotion || isMobile) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        let w = 0, h = 0, dpr = 1;
        let nodes = [];
        let raf = null;
        let visible = true;
        let pointer = { x: -9999, y: -9999 };

        const LINK_DIST = 150;
        const REPEL_DIST = 110;
        const nodeCount = () => Math.min(52, Math.max(20, Math.floor(window.innerWidth / 30)));

        function getAccent() {
            return getComputedStyle(document.documentElement)
                .getPropertyValue('--accent-cyan').trim() || '#00d4ff';
        }

        function resize() {
            const r = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = r.width;
            h = r.height;
            canvas.width  = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        }

        function build() {
            const n = nodeCount();
            nodes = Array.from({ length: n }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.22,
                vy: (Math.random() - 0.5) * 0.22,
                r: Math.random() * 1.4 + 0.9,
                pulse: 0,
            }));
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);
            const col = getAccent();

            for (let i = 0; i < nodes.length; i++) {
                const p = nodes[i];

                if (finePointer && pointer.x > -100) {
                    const dx = p.x - pointer.x;
                    const dy = p.y - pointer.y;
                    const d = Math.hypot(dx, dy);
                    if (d < REPEL_DIST && d > 0.01) {
                        const f = (1 - d / REPEL_DIST) * 0.6;
                        p.x += (dx / d) * f;
                        p.y += (dy / d) * f;
                    }
                }

                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                if (p.pulse > 0) p.pulse *= 0.94;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r + p.pulse * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.55 + p.pulse * 0.4;
                ctx.fill();
            }

            for (let i = 0; i < nodes.length; i++) {
                const p = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const q = nodes[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const d = Math.hypot(dx, dy);
                    if (d < LINK_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.globalAlpha = (1 - d / LINK_DIST) * 0.22;
                        ctx.strokeStyle = col;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        if (d < LINK_DIST * 0.35) {
                            p.pulse = Math.max(p.pulse, 1 - d / (LINK_DIST * 0.35));
                            q.pulse = Math.max(q.pulse, 1 - d / (LINK_DIST * 0.35));
                        }
                    }
                }
            }
            ctx.globalAlpha = 1;
            if (visible) raf = requestAnimationFrame(draw);
        }

        function start() { if (!raf) raf = requestAnimationFrame(draw); }
        function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            visible ? start() : stop();
        }, { threshold: 0 }).observe(canvas);

        document.addEventListener('visibilitychange', () => {
            document.hidden ? stop() : (visible && start());
        });

        if (finePointer) {
            window.addEventListener('pointermove', (e) => {
                const r = canvas.getBoundingClientRect();
                pointer.x = e.clientX - r.left;
                pointer.y = e.clientY - r.top;
            }, { passive: true });
            window.addEventListener('pointerleave', () => {
                pointer.x = -9999; pointer.y = -9999;
            });
        }

        let rt;
        window.addEventListener('resize', () => {
            clearTimeout(rt);
            rt = setTimeout(resize, 180);
        }, { passive: true });

        resize();
        start();
    })();

    /* ---------------------------------------------------------
       11. TIER 2 — CRAFT LAYER
       --------------------------------------------------------- */

    /* 11a. Magnetic buttons */
    (function magneticButtons() {
        if (!finePointer || reduceMotion) return;

        document.querySelectorAll('[data-magnetic]').forEach(el => {
            const maxOffset = 7;
            let raf = null;
            let targetX = 0, targetY = 0;
            let currentX = 0, currentY = 0;

            function loop() {
                currentX += (targetX - currentX) * 0.18;
                currentY += (targetY - currentY) * 0.18;
                if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
                    currentX = targetX; currentY = targetY;
                    el.style.transform = 'translate3d(' + currentX + 'px, ' + currentY + 'px, 0)';
                    raf = null;
                    return;
                }
                el.style.transform = 'translate3d(' + currentX + 'px, ' + currentY + 'px, 0)';
                raf = requestAnimationFrame(loop);
            }

            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
                const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
                targetX = Math.max(-1, Math.min(1, dx)) * maxOffset;
                targetY = Math.max(-1, Math.min(1, dy)) * maxOffset;
                if (!raf) raf = requestAnimationFrame(loop);
            }, { passive: true });

            el.addEventListener('pointerleave', () => {
                targetX = 0; targetY = 0;
                if (!raf) raf = requestAnimationFrame(loop);
            });
        });
    })();

    /* 11b. Card cursor glow */
    (function cardGlow() {
        if (!finePointer || reduceMotion) return;
        document.querySelectorAll('[data-glow]').forEach(card => {
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--gx', (e.clientX - r.left) + 'px');
                card.style.setProperty('--gy', (e.clientY - r.top) + 'px');
            }, { passive: true });
        });
    })();

    /* 11c. Copy email + toast */
    const toastEl = document.getElementById('toast');
    let toastTimer = null;

    function showToast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400);
    }

    async function copyText(value) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
            ta.remove();
            return ok;
        }
    }

    document.querySelectorAll('[data-copy-email]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = btn.getAttribute('data-copy-email');
            const ok = await copyText(email);
            showToast(ok ? 'Email copied to clipboard' : 'Copy failed — ' + email);
        });
    });

    /* 11d. Certification flip cards (cross-fade; works everywhere) */
    (function certFlips() {
        document.querySelectorAll('[data-flip]').forEach(card => {
            function toggle() {
                const next = card.getAttribute('aria-pressed') !== 'true';
                card.setAttribute('aria-pressed', String(next));
            }

            card.addEventListener('click', (e) => {
                if (e.target.closest('a, button')) return;
                toggle();
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        });
    })();

    /* ---------------------------------------------------------
       12. TIER 3 — THEME TOGGLE (hardened)
       --------------------------------------------------------- */
    (function themeToggle() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        function getStoredTheme() {
            try { return localStorage.getItem('theme'); } catch (e) { return null; }
        }
        function setStoredTheme(value) {
            try { localStorage.setItem('theme', value); } catch (e) {}
        }
        function currentTheme() {
            return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        }
        function applyTheme(theme) {
            if (theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
        function sync() {
            const isLight = currentTheme() === 'light';
            btn.setAttribute('aria-pressed', String(isLight));
            btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
        }

        sync();

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const next = currentTheme() === 'light' ? 'dark' : 'light';
            applyTheme(next);
            setStoredTheme(next);
            sync();

            if (hasGsap && ScrollTrigger && typeof ScrollTrigger.refresh === 'function') {
                requestAnimationFrame(function () {
                    try { ScrollTrigger.refresh(); } catch (err) {}
                });
            }
        });
    })();

    /* ---------------------------------------------------------
       13. TIER 3 — LIVE LOCAL TIME (Europe/Riga)
       --------------------------------------------------------- */
    (function liveClock() {
        const el = document.getElementById('localTime');
        if (!el) return;

        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Riga',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        function update() {
            try {
                el.textContent = formatter.format(new Date());
            } catch (e) {
                const d = new Date();
                el.textContent =
                    String(d.getHours()).padStart(2, '0') + ':' +
                    String(d.getMinutes()).padStart(2, '0');
            }
        }

        update();
        setInterval(() => { if (!document.hidden) update(); }, 30000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) update();
        });
    })();

    /* ---------------------------------------------------------
       14. GITHUB FETCH
       --------------------------------------------------------- */
    function sanitize(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function fetchProjects() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        const CACHE_KEY = 'gh-repos-v1';
        const CACHE_TTL = 1000 * 60 * 30;

        try {
            let repos = null;
            try {
                const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
                if (cached && Date.now() - cached.t < CACHE_TTL) repos = cached.d;
            } catch (e) {}

            if (!repos) {
                const res = await fetch(
                    'https://api.github.com/users/ElvijsCoder/repos?sort=updated&per_page=6',
                    { headers: { Accept: 'application/vnd.github+json' } }
                );
                if (!res.ok) throw new Error('Fetch failed: ' + res.status);
                repos = await res.json();
                try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: repos }));
                } catch (e) {}
            }

            if (!repos.length) {
                grid.innerHTML =
                    '<div class="projects-empty"><p>No public repositories yet.</p>' +
                    '<a href="https://github.com/ElvijsCoder" target="_blank" rel="noopener noreferrer">Visit GitHub Profile →</a></div>';
                return;
            }

            const langColors = {
                'Python': '#3572A5', 'JavaScript': '#f1e05a', 'TypeScript': '#2b7489',
                'HTML': '#e34c26', 'CSS': '#563d7c', 'Jupyter Notebook': '#DA5B0B',
                'Java': '#b07219', 'C++': '#f34b7d', 'Go': '#00ADD8', 'Rust': '#dea584'
            };

            grid.innerHTML = repos.map(repo => {
                const color = langColors[repo.language] || '#8b8b8b';
                const name  = sanitize(repo.name);
                const desc  = sanitize(repo.description);
                const lang  = sanitize(repo.language);
                const url   = sanitize(repo.html_url);
                const stars = Number(repo.stargazers_count) || 0;
                return '' +
                    '<div class="project-card reveal" data-glow>' +
                        '<div class="project-header">' +
                            '<h3 class="project-name">' +
                                '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + name + '</a>' +
                            '</h3>' +
                            '<div class="project-stars" aria-label="' + stars + ' stars">' +
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="#d4a853" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                                stars +
                            '</div>' +
                        '</div>' +
                        '<p class="project-desc">' + (desc || 'No description available') + '</p>' +
                        '<div class="project-footer">' +
                            '<div class="project-lang">' +
                                '<span class="lang-dot" style="background: ' + color + '"></span>' +
                                (lang || 'Unknown') +
                            '</div>' +
                            '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="project-link">View Code →</a>' +
                        '</div>' +
                    '</div>';
            }).join('');

            const newCards = grid.querySelectorAll('.reveal');

            if (hasGsap && !reduceMotion) {
                newCards.forEach((el, i) => {
                    gsap.fromTo(el,
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 0.8, delay: i * 0.06, ease: 'power3.out' }
                    );
                });
            } else {
                newCards.forEach(el => el.classList.add('visible'));
            }

            if (finePointer && !reduceMotion) {
                grid.querySelectorAll('[data-glow]').forEach(card => {
                    card.addEventListener('pointermove', (e) => {
                        const r = card.getBoundingClientRect();
                        card.style.setProperty('--gx', (e.clientX - r.left) + 'px');
                        card.style.setProperty('--gy', (e.clientY - r.top) + 'px');
                    }, { passive: true });
                });
            }
        } catch (err) {
            grid.innerHTML =
                '<div class="projects-empty"><p>Unable to load GitHub repositories right now.</p>' +
                '<a href="https://github.com/ElvijsCoder" target="_blank" rel="noopener noreferrer">Visit GitHub Profile →</a></div>';
        }
    }

    fetchProjects();

})();
