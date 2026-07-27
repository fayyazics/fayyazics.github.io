// Statsig: feature gates / experiments + manual event logging.
// Custom events are dual-written from PortfolioAnalytics (see analytics.js).
// Do not enable Statsig Auto Capture or Session Replay — Amplitude owns those.
(function () {
    'use strict';

    var CLIENT_KEY = 'client-K6ptdOG7Q0k7qZIeKBRymuI760m9bQCT68zKJW45dry';

    if (!window.Statsig || !window.Statsig.StatsigClient) {
        console.error('[Statsig] Client SDK failed to load');
        return;
    }

    var StatsigClient = window.Statsig.StatsigClient;

    // Anonymous user — Stable ID is generated/persisted by the SDK for device-level targeting.
    var client = new StatsigClient(CLIENT_KEY, {});

    client.initializeAsync().catch(function (err) {
        console.error('[Statsig] initializeAsync failed:', err);
    });

    function toMetadata(properties) {
        if (!properties || typeof properties !== 'object') {
            return undefined;
        }
        var metadata = {};
        Object.keys(properties).forEach(function (key) {
            var value = properties[key];
            metadata[key] = value == null ? '' : String(value);
        });
        return metadata;
    }

    function logEvent(eventName, value, metadata) {
        if (!eventName) {
            return;
        }
        // Statsig logEvent(eventName, value, metadata) — value is optional.
        if (metadata === undefined && value !== null && typeof value === 'object') {
            client.logEvent(eventName, null, toMetadata(value));
            return;
        }
        client.logEvent(eventName, value == null ? null : value, toMetadata(metadata));
    }

    window.statsigClient = client;

    window.PortfolioStatsig = {
        ready: function () {
            return client.initializeAsync();
        },
        checkGate: function (gateName) {
            return client.checkGate(gateName);
        },
        getExperiment: function (experimentName) {
            return client.getExperiment(experimentName);
        },
        getDynamicConfig: function (configName) {
            return client.getDynamicConfig(configName);
        },
        logEvent: logEvent,
        flush: function () {
            return client.flush();
        },
        getClient: function () {
            return client;
        }
    };
})();
