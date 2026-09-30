/* =========================================================
   Elvijs Strads — Portfolio
   Vanilla JS. No dependencies.
   ========================================================= */
(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ===== NAV / PROGRESS / SCROLL =====
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
            progressBar.style.transform = 'scaleX(' + p + ')';
            navbar.classList.toggle('scrolled', window.scrollY > 50);
            ticking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ===== MOBILE MENU =====
    function setMenu(open) {
        navLinks.classList.toggle('active', open);
        mobileToggle.setAttribute('aria-expanded', String(open));
        mobileToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        // Trap focus inside the menu: make the rest of the page inert
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

    // ===== SMOOTH SCROLL =====
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            setMenu(false);
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    });

    // ===== SCROLL SPY =====
    const sections   = document.querySelectorAll('main section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');
    let currentId = '';

    const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            if (id === currentId) return; // avoid spamming replaceState
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

    // ===== SCROLL REVEAL =====
    const items = document.querySelectorAll('.reveal');
    let revealObserver = null;

    if (reduceMotion) {
        items.forEach(el => el.classList.add('visible'));
    } else {
        revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

        items.forEach(el => revealObserver.observe(el));
    }

    // ===== GITHUB FETCH (cached to survive rate limits) =====
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
                    '<div class="project-card reveal">' +
                        '<div class="project-header">' +
                            '<h3 class="project-name">' +
                                '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + name + '</a>' +
                            '</h3>' +
                            '<div class="project-stars" aria-label="' + stars + ' stars">' +
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffd700" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
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
            if (revealObserver) {
                newCards.forEach(el => revealObserver.observe(el));
            } else {
                newCards.forEach(el => el.classList.add('visible'));
            }
        } catch (err) {
            grid.innerHTML =
                '<div class="projects-empty"><p>Unable to load GitHub repositories right now.</p>' +
                '<a href="https://github.com/ElvijsCoder" target="_blank" rel="noopener noreferrer">Visit GitHub Profile →</a></div>';
        }
    }

    fetchProjects();
})();
