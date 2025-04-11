/**
 * Cygnos Configuration
 * This file contains all configuration options for the Cygnos AI agent.
 */

const CYGNOS_CONFIG = {
    // API Configuration
    apis: {
        gemini: {
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            models: {
                text: 'gemini-1.5-pro',
                vision: 'gemini-1.5-pro-vision',
            },
            maxTokens: 4096,
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
        },
        openRouter: {
            baseUrl: 'https://openrouter.ai/api/v1',
            defaultModel: 'anthropic/claude-3-opus:beta',
            alternativeModels: [
                'anthropic/claude-3-sonnet:beta',
                'anthropic/claude-3-haiku:beta',
                'meta-llama/llama-3-70b-instruct',
                'openai/gpt-4o',
                'google/gemini-1.5-pro',
            ],
            maxTokens: 4000,
            temperature: 0.7,
            topP: 0.95,
        }
    },

    // Memory Configuration
    memory: {
        maxMessagesInContext: 20,
        maxStoredConversations: 50,
        maxMemoryItems: 100,
    },

    // Agent Capabilities
    capabilities: {
        webSearch: true,
        codeExecution: true,
        fileProcessing: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedFileTypes: [
                'text/plain', 'text/markdown', 'text/csv',
                'application/json', 'application/pdf',
                'image/jpeg', 'image/png', 'image/gif',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        },
        tools: [
            {
                id: 'web_search',
                name: 'Web検索',
                description: 'インターネット上で情報を検索します',
                enabled: true
            },
            {
                id: 'code_interpreter',
                name: 'コード実行',
                description: 'Pythonコードを実行して結果を取得します',
                enabled: true
            },
            {
                id: 'file_analyzer',
                name: 'ファイル分析',
                description: 'アップロードされたファイルの内容を分析します',
                enabled: true
            }
        ]
    },

    // UI Configuration
    ui: {
        theme: 'light', // 'light' or 'dark'
        codeHighlighting: true,
        markdownRendering: true,
        showProcessingSteps: true,
        textToSpeech: false
    },

    // System Messages
    systemMessages: {
        welcomeMessage: 'Cygnos AIエージェントへようこそ。どのようにお手伝いできますか？',
        errorMessage: 'エラーが発生しました。もう一度お試しください。',
        processingMessage: '考えています...',
    },

    // Default User Settings
    defaultSettings: {
        autonomyLevel: 'medium', // 'high', 'medium', 'low'
        saveConversationHistory: true,
        allowWebSearch: true,
        allowCodeExecution: true,
        allowFileAccess: false,
    },

    // Storage Keys
    storageKeys: {
        apiKeys: 'cygnos_api_keys',
        userSettings: 'cygnos_user_settings',
        conversations: 'cygnos_conversations',
        memory: 'cygnos_memory'
    },

    // Debug Mode
    debug: false
};

// Settings Manager
class SettingsManager {
    constructor() {
        this.loadSettings();
    }

    loadSettings() {
        try {
            // Load API Keys
            const savedApiKeys = localStorage.getItem(CYGNOS_CONFIG.storageKeys.apiKeys);
            this.apiKeys = savedApiKeys ? JSON.parse(savedApiKeys) : {
                gemini: '',
                openRouter: ''
            };

            // Load User Settings
            const savedSettings = localStorage.getItem(CYGNOS_CONFIG.storageKeys.userSettings);
            this.userSettings = savedSettings ? JSON.parse(savedSettings) : { ...CYGNOS_CONFIG.defaultSettings };
        } catch (error) {
            console.error('Error loading settings:', error);
            this.apiKeys = { gemini: '', openRouter: '' };
            this.userSettings = { ...CYGNOS_CONFIG.defaultSettings };
        }
    }

    saveSettings() {
        try {
            localStorage.setItem(CYGNOS_CONFIG.storageKeys.apiKeys, JSON.stringify(this.apiKeys));
            localStorage.setItem(CYGNOS_CONFIG.storageKeys.userSettings, JSON.stringify(this.userSettings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    updateApiKey(service, key) {
        if (service in this.apiKeys) {
            this.apiKeys[service] = key;
            this.saveSettings();
            return true;
        }
        return false;
    }

    updateUserSetting(setting, value) {
        if (setting in this.userSettings) {
            this.userSettings[setting] = value;
            this.saveSettings();
            return true;
        }
        return false;
    }

    hasRequiredApiKeys() {
        return !!(this.apiKeys.gemini || this.apiKeys.openRouter);
    }

    getApiKey(service) {
        return this.apiKeys[service] || '';
    }

    getUserSetting(setting) {
        return this.userSettings[setting];
    }

    resetSettings() {
        this.userSettings = { ...CYGNOS_CONFIG.defaultSettings };
        this.saveSettings();
    }
}

// Initialize Settings Manager
const settingsManager = new SettingsManager(); 