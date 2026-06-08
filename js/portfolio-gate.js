// Route visitors to redesign or legacy pages based on the portfolio-redesign flag.
(function () {
    'use strict';

    var FLAG_KEY = 'portfolio-redesign';
    var REDESIGN_VARIANT = 'on';
    var GATE_TIMEOUT_MS = 1500;

    var PAGE_PAIRS = [
        { redesign: '/index.html', legacy: '/index-legacy.html' },
        { redesign: '/about.html', legacy: '/index-legacy.html' },
        { redesign: '/photography.html', legacy: '/photography-legacy.html' },
        { redesign: '/fun.html', legacy: '/photography-legacy.html' },
        { redesign: '/agrity.html', legacy: '/agrity-legacy.html' },
        { redesign: '/bluebear.html', legacy: '/bluebear-legacy.html' },
        { redesign: '/mobileredesign.html', legacy: '/mobileredesign-legacy.html' },
        { redesign: '/chorushomepage.html', legacy: '/chorushomepage-legacy.html' },
        { redesign: '/chorusmobile.html', legacy: '/chorusmobile-legacy.html' },
        { redesign: '/quickpolls.html', legacy: '/quickpolls-legacy.html' }
    ];

    var redesignToLegacy = {};
    var legacyToRedesign = {};

    var REDESIGN_ALIASES = {
        '/fun.html': '/photography.html'
    };

    PAGE_PAIRS.forEach(function (pair) {
        redesignToLegacy[pair.redesign] = pair.legacy;
        legacyToRedesign[pair.legacy] = pair.redesign;
    });

    function normalizePath(pathname) {
        if (!pathname || pathname === '/') {
            return '/index.html';
        }
        if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === '/') {
            pathname = pathname.slice(0, -1);
        }
        return pathname;
    }

    function samePage(left, right) {
        if (left === right) {
            return true;
        }
        var homePaths = { '/index.html': true, '/': true };
        return homePaths[left] && homePaths[right];
    }

    function getPageKind(path) {
        if (legacyToRedesign[path]) {
            return 'legacy';
        }
        if (redesignToLegacy[path]) {
            return 'redesign';
        }
        return null;
    }

    function buildTargetUrl(targetPath) {
        return targetPath + window.location.search + window.location.hash;
    }

    function revealPage() {
        document.documentElement.classList.remove('portfolio-gate-pending');
        document.documentElement.classList.add('portfolio-gate-ready');
    }

    function trackExposure(variantValue) {
        if (!window.amplitude || !window.amplitude.track) {
            return;
        }
        window.amplitude.track('Portfolio Redesign Flag Evaluated', {
            flag_key: FLAG_KEY,
            variant: variantValue,
            page_path: window.location.pathname
        });
    }

    function applyGate() {
        var path = normalizePath(window.location.pathname);
        var pageKind = getPageKind(path);

        if (!pageKind) {
            revealPage();
            return;
        }

        var evaluate = function () {
            if (!window.PortfolioExperiment) {
                revealPage();
                return;
            }

            window.PortfolioExperiment.ready().then(function () {
                var variant = window.PortfolioExperiment.variant(FLAG_KEY, 'off');
                var redesignEnabled = variant.value === REDESIGN_VARIANT;
                var targetPath;

                if (redesignEnabled) {
                    if (pageKind === 'legacy') {
                        targetPath = legacyToRedesign[path];
                    } else if (REDESIGN_ALIASES[path]) {
                        targetPath = REDESIGN_ALIASES[path];
                    } else {
                        targetPath = path;
                    }
                } else {
                    targetPath = pageKind === 'redesign' ? redesignToLegacy[path] : path;
                }

                trackExposure(variant.value || 'off');

                if (!samePage(path, targetPath)) {
                    window.location.replace(buildTargetUrl(targetPath));
                    return;
                }

                revealPage();
            }).catch(function () {
                revealPage();
            });
        };

        window.setTimeout(function () {
            if (document.documentElement.classList.contains('portfolio-gate-pending')) {
                revealPage();
            }
        }, GATE_TIMEOUT_MS);

        evaluate();
    }

    document.documentElement.classList.add('portfolio-gate-pending');
    applyGate();
})();
