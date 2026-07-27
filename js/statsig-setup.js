// Statsig: feature gates / experiments only.
// Amplitude remains the source of truth for analytics events and session replay.
// Do not enable Statsig Auto Capture or Session Replay here.
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
        getClient: function () {
            return client;
        }
    };
})();
