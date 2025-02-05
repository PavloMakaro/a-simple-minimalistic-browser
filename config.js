module.exports = {
    APP_VERSION: '0.1.1',
    APP_NAME: 'Simple Browser',
    DEFAULT_SEARCH_ENGINE: 'https://www.google.com/search?q=',
    DEFAULT_HOME_PAGE: 'home.html',
    SUPPORTED_PROTOCOLS: ['http:', 'https:', 'file:', 'data:'],
    MAX_TABS: 50,
    SETTINGS: {
        enablePiP: true,
        enableDevTools: true,
        enableIncognito: true,
        autoUpdateCheck: true,
        saveHistory: true,
        defaultDownloadPath: null
    },
    RELEASE_NOTES: {
        version: '0.1.1',
        date: '2024-03-20',
        changes: [
            'Initial beta release',
            'Basic browsing functionality',
            'Custom themes support',
            'Picture-in-Picture mode',
            'Developer tools',
            'Keyboard shortcuts'
        ],
        knownIssues: [
            'Some websites may not load properly',
            'PiP mode might be unstable',
            'Theme settings may reset after update'
        ]
    }
}; 