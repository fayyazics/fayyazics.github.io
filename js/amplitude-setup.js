// Amplitude: Analytics init, Session Replay, Web Experiment, and Feature Flags
(function () {
    'use strict';

    var API_KEY = '1ce437130da0f6268eb2efbf0375ee14';
    var DEPLOYMENT_KEY = 'client-Vfe82ZGCD6aZVoLOXJA1WosPUStnWJHd';

    if (!window.amplitude) {
        console.error('[Amplitude] Browser SDK failed to load');
        return;
    }

    // Install Session Replay before init so it shares analytics deviceId/sessionId.
    // Do not pass deviceId here — overriding it causes device ID mismatch.
    if (window.sessionReplay && typeof window.sessionReplay.plugin === 'function') {
        window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
    } else {
        console.warn('[Amplitude] Session Replay plugin not loaded');
    }

    window.amplitude.init(API_KEY, {
        autocapture: { elementInteractions: true }
    });

    if (window.Experiment && window.Experiment.initializeWithAmplitudeAnalytics) {
        window.experiment = window.Experiment.initializeWithAmplitudeAnalytics(DEPLOYMENT_KEY);
        window.experiment.fetch().catch(function (err) {
            console.error('[Amplitude Experiment] fetch failed:', err);
        });
    }

    window.PortfolioExperiment = {
        variant: function (flagKey, fallback) {
            if (!window.experiment) {
                return fallback ? { value: fallback } : { value: null };
            }
            return window.experiment.variant(flagKey, fallback);
        },
        ready: function () {
            return window.experiment ? window.experiment.fetch() : Promise.resolve();
        }
    };
})();
