// チャット機能の中核を提供するモジュール
import { 
    getApiUrl, 
    CONFIG, 
    getCurrentProvider, 
    getCurrentApiKey,
    getRequestyApiKey,
    getCurrentModel  // 追加: 現在のモデル取得
} from './config.js';
import { addMessageToConversation, getCurrentConversation } from './storage.js';

// APIレスポンスを取得する関数（プロバイダーに応じて適切なAPIを呼び出す）
async function fetchAIResponse(userMessage, history) {
    const provider = getCurrentProvider();
    
    if (provider === 'gemini') {
        return fetchGeminiResponse(userMessage, history);
    } else if (provider === 'requesty') {
        return fetchRequestyResponse(userMessage, history);
    } else {
        throw new Error('Unknown provider');
    }
}

// Gemini APIを呼び出す関数
async function fetchGeminiResponse(userMessage, history) {
    const url = getApiUrl();
    
    // 会話履歴に新しいメッセージを追加
    const messages = [...history, { role: 'user', parts: [{ text: userMessage }] }];
    
    const requestBody = {
        contents: messages,
        generationConfig: CONFIG.GENERATION_CONFIG
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'API request failed');
    }
    
    const data = await response.json();
    
    // レスポンスからテキストを抽出
    let responseText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        data.candidates[0].content.parts.forEach(part => {
            if (part.text) {
                responseText += part.text;
            }
        });
    } else {
        throw new Error('Invalid response format from Gemini API');
    }
    
    return responseText;
}

// Requesty APIを呼び出す関数
async function fetchRequestyResponse(userMessage, history) {
    // プロキシサーバー経由でCORSを回避
    const model = getCurrentModel();
    const proxyUrl = `${window.location.protocol}//${window.location.hostname}:3000/api/requesty`;
    const url = proxyUrl;
    const apiKey = getRequestyApiKey();
    
    // Requestyフォーマットの会話履歴を作成
    const requestyMessages = formatHistoryForRequesty(history);
    
    // ユーザーメッセージを追加
    requestyMessages.push({
        role: 'user',
        content: userMessage
    });
    
    // システムメッセージが無い場合は追加
    if (!requestyMessages.some(msg => msg.role === 'system')) {
        requestyMessages.unshift({
            role: 'system',
            content: 'You are a helpful assistant.'
        });
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: requestyMessages,
                temperature: CONFIG.GENERATION_CONFIG.temperature
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.error || `API request failed: ${response.status}`);
            } catch (e) {
                throw new Error(`API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
            }
        }
        
        const data = await response.json();
        
        // Requesty APIのレスポンスからテキストを抽出
        // フォーマットはプロバイダによって異なるため、複数のケースに対応
        if (data.message?.content) {
            // Claude/OpenAI形式
            return data.message.content;
        } else if (data.choices && data.choices.length > 0) {
            // OpenAI互換形式
            return data.choices[0].message?.content || '';
        } else if (data.content) {
            // 直接コンテンツがある場合
            return data.content;
        } else {
            console.error('Unknown response format from Requesty:', data);
            throw new Error('Unknown response format from Requesty API');
        }
    } catch (error) {
        console.error('Error calling Requesty API:', error);
        throw error;
    }
}

// チャット履歴をGemini APIリクエスト用の形式に変換する関数
function formatHistoryForApi(messages) {
    if (getCurrentProvider() === 'gemini') {
        return formatHistoryForGemini(messages);
    } else {
        return formatHistoryForRequesty(messages);
    }
}

// Gemini用にメッセージ履歴を変換
function formatHistoryForGemini(messages) {
    return messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : (msg.role === 'user' ? 'user' : 'system'),
        parts: [{ text: msg.content }]
    }));
}

// Requesty用にメッセージ履歴を変換
function formatHistoryForRequesty(messages) {
    return messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : (msg.role === 'user' ? 'user' : 'system'),
        content: msg.content
    }));
}

// ユーザーメッセージを作成する関数
function createUserMessage(content) {
    return {
        role: 'user',
        content: content,
        timestamp: new Date().toISOString()
    };
}

// AIメッセージを作成する関数
function createAssistantMessage(content) {
    return {
        role: 'model',
        content: content,
        timestamp: new Date().toISOString()
    };
}

// 会話からタイトルを抽出する関数
function extractTitleFromUserMessage(message) {
    // 最初の30文字を取得し、必要なら省略記号を追加
    return message.substring(0, 30) + (message.length > 30 ? '...' : '');
}

// 外部から利用できるようにエクスポート
export {
    fetchAIResponse,
    fetchGeminiResponse,
    fetchRequestyResponse,
    formatHistoryForApi,
    formatHistoryForGemini,
    formatHistoryForRequesty,
    createUserMessage,
    createAssistantMessage,
    extractTitleFromUserMessage
};