// Amplitude: Analytics init, Web Experiment, and Feature Flags
(function () {
    'use strict';

    var API_KEY = '1ce437130da0f6268eb2efbf0375ee14';
    var DEPLOYMENT_KEY = 'client-Vfe82ZGCD6aZVoLOXJA1WosPUStnWJHd';

    if (window.AMPLITUDE_SESSION_REPLAY && window.sessionReplay) {
        window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
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
