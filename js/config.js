// AIサービスの設定
const CONFIG = {
    // Gemini API設定
    GEMINI: {
        API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
        AVAILABLE_MODELS: [
            'gemini-2.5-flash-preview-04-17',
            'gemini-2.5-pro-exp-03-25',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro'
        ]
    },
    // Requesty API設定
    REQUESTY: {
        API_BASE_URL: 'https://router.requesty.ai/v1',
        AVAILABLE_MODELS: [
            'openai/gpt-4.1-nano',
            'openai/gpt-4.1-mini',
            'openai/o4-mini:high',
            'openai/o4-mini',
            'openai/gpt-4.1',
            'openai/o3-2025-04-16',
            'xai/grok-3-mini-beta:high',
            'xai/grok-3-mini-beta',
            'groq/qwen-qwq-32b',
            'anthropic/claude-3-5-haiku-20241022',
            'anthropic/claude-3-5-sonnet-20241022',
            'anthropic/claude-3-7-sonnet-20250219'
        ]
    },
    DEFAULT_MODEL: 'gemini-2.0-flash',
    DEFAULT_PROVIDER: 'gemini',
    GENERATION_CONFIG: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
    },
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        SYSTEM: 'system'
    }
};

// 全モデルのリストを取得するヘルパー関数
function getAllModels() {
    return [
        ...CONFIG.GEMINI.AVAILABLE_MODELS.map(model => ({ id: model, provider: 'gemini', name: model })),
        ...CONFIG.REQUESTY.AVAILABLE_MODELS.map(model => ({ id: model, provider: 'requesty', name: model }))
    ];
}

// APIキーの保存と取得
let GEMINI_API_KEY = '';
let REQUESTY_API_KEY = '';

// 現在選択されているモデルとプロバイダー
let currentModel = CONFIG.DEFAULT_MODEL;
let currentProvider = CONFIG.DEFAULT_PROVIDER;

// 現在のテーマ
let currentTheme = CONFIG.THEMES.LIGHT;

// 設定オブジェクト
let settings = {
    theme: CONFIG.THEMES.LIGHT,
    temperature: 0.7,
    geminiApiKey: '',
    requestyApiKey: '',
    lastUsedModel: CONFIG.DEFAULT_MODEL,
    lastUsedProvider: CONFIG.DEFAULT_PROVIDER
};

// 設定を初期化する
function initializeSettings() {
    // ローカルストレージから設定を読み込む
    const savedSettings = localStorage.getItem('cygnos_settings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            settings = { ...settings, ...parsedSettings };
            
            // テーマを適用
            applyTheme(settings.theme);
            
            // APIキーを設定
            if (settings.geminiApiKey) {
                GEMINI_API_KEY = settings.geminiApiKey;
            }
            if (settings.requestyApiKey) {
                REQUESTY_API_KEY = settings.requestyApiKey;
            }
            
            // 最後に使用したモデルとプロバイダーを設定
            if (settings.lastUsedModel) {
                currentModel = settings.lastUsedModel;
            }
            if (settings.lastUsedProvider) {
                currentProvider = settings.lastUsedProvider;
            }
            
            // 温度設定を適用
            CONFIG.GENERATION_CONFIG.temperature = settings.temperature;
            
            return true;
        } catch (error) {
            console.error('設定の読み込みエラー:', error);
            return false;
        }
    }
    return false;
}

// テーマを適用する
function applyTheme(theme) {
    currentTheme = theme;
    
    if (theme === CONFIG.THEMES.SYSTEM) {
        // システムの設定に合わせる
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // システムのテーマ変更を検知するリスナーを設定
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (currentTheme === CONFIG.THEMES.SYSTEM) {
                    if (e.matches) {
                        document.body.classList.add('dark-theme');
                    } else {
                        document.body.classList.remove('dark-theme');
                    }
                }
            });
        }
    } else if (theme === CONFIG.THEMES.DARK) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// 設定を保存する
function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    
    // APIキーを設定
    if (newSettings.geminiApiKey !== undefined) {
        GEMINI_API_KEY = newSettings.geminiApiKey;
    }
    if (newSettings.requestyApiKey !== undefined) {
        REQUESTY_API_KEY = newSettings.requestyApiKey;
    }
    
    // モデル設定を保存
    if (newSettings.lastUsedModel !== undefined) {
        currentModel = newSettings.lastUsedModel;
    }
    if (newSettings.lastUsedProvider !== undefined) {
        currentProvider = newSettings.lastUsedProvider;
    }
    
    // 温度設定を適用
    if (newSettings.temperature !== undefined) {
        CONFIG.GENERATION_CONFIG.temperature = newSettings.temperature;
    }
    
    // テーマを適用
    if (newSettings.theme !== undefined) {
        applyTheme(newSettings.theme);
    }
    
    // ローカルストレージに保存
    localStorage.setItem('cygnos_settings', JSON.stringify(settings));
    
    return true;
}

// Gemini APIキーを取得する
function getGeminiApiKey() {
    return GEMINI_API_KEY;
}

// Requesty APIキーを取得する
function getRequestyApiKey() {
    return REQUESTY_API_KEY;
}

// 現在のプロバイダーのAPIキーを取得する
function getCurrentApiKey() {
    return currentProvider === 'gemini' ? GEMINI_API_KEY : REQUESTY_API_KEY;
}

// Gemini APIキーを設定する
function setGeminiApiKey(key) {
    GEMINI_API_KEY = key;
    saveSettings({ geminiApiKey: key });
}

// Requesty APIキーを設定する
function setRequestyApiKey(key) {
    REQUESTY_API_KEY = key;
    saveSettings({ requestyApiKey: key });
}

// 現在のAPIキーが設定されているかチェック
function hasCurrentApiKey() {
    return currentProvider === 'gemini' ? !!GEMINI_API_KEY : !!REQUESTY_API_KEY;
}

// 現在のモデルを取得
function getCurrentModel() {
    return currentModel;
}

// 現在のプロバイダーを取得
function getCurrentProvider() {
    return currentProvider;
}

// モデルを設定
function setCurrentModel(model, provider) {
    // プロバイダーの自動検出
    if (!provider) {
        if (CONFIG.GEMINI.AVAILABLE_MODELS.includes(model)) {
            provider = 'gemini';
        } else if (CONFIG.REQUESTY.AVAILABLE_MODELS.includes(model)) {
            provider = 'requesty';
        } else {
            return false;
        }
    }
    
    // プロバイダー別にモデルをチェック
    if (provider === 'gemini' && CONFIG.GEMINI.AVAILABLE_MODELS.includes(model)) {
        currentModel = model;
        currentProvider = provider;
        saveSettings({ lastUsedModel: model, lastUsedProvider: provider });
        return true;
    } else if (provider === 'requesty' && CONFIG.REQUESTY.AVAILABLE_MODELS.includes(model)) {
        currentModel = model;
        currentProvider = provider;
        saveSettings({ lastUsedModel: model, lastUsedProvider: provider });
        return true;
    }
    return false;
}

// APIのURLを取得
function getApiUrl() {
    if (currentProvider === 'gemini') {
        return `${CONFIG.GEMINI.API_BASE_URL}/${currentModel}:generateContent?key=${GEMINI_API_KEY}`;
    } else if (currentProvider === 'requesty') {
        return `${CONFIG.REQUESTY.API_BASE_URL}/${currentModel}`;
    }
    return '';
}

// 設定値を取得
function getSettings() {
    return { ...settings };
}

// モデルの表示名を取得
function getModelDisplayName(modelId) {
    // プロバイダー名を抽出
    const parts = modelId.split('/');
    if (parts.length > 1) {
        // Requesty形式の場合はプロバイダー/モデル名形式
        return `${parts[0].toUpperCase()}: ${parts.slice(1).join('/')}`;
    }
    // それ以外はそのまま返す
    return modelId;
}

// モデルのグループ化された一覧を取得
function getGroupedModels() {
    return {
        gemini: CONFIG.GEMINI.AVAILABLE_MODELS.map(model => ({ id: model, provider: 'gemini', name: model })),
        requesty: CONFIG.REQUESTY.AVAILABLE_MODELS.map(model => ({ id: model, provider: 'requesty', name: getModelDisplayName(model) }))
    };
}

// 設定を外部から利用できるようにエクスポート
export {
    CONFIG,
    getGeminiApiKey,
    getRequestyApiKey,
    getCurrentApiKey,
    setGeminiApiKey,
    setRequestyApiKey,
    hasCurrentApiKey,
    getCurrentModel,
    getCurrentProvider,
    setCurrentModel,
    getApiUrl,
    initializeSettings,
    saveSettings,
    getSettings,
    applyTheme,
    getAllModels,
    getGroupedModels,
    getModelDisplayName
};