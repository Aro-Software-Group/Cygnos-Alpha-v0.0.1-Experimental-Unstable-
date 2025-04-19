// js/requesty.js
// Requesty Router APIを利用し、複数モデルに対応するサンプルスクリプト
const fetch = require('node-fetch');

// サポートするモデル一覧
const SUPPORTED_MODELS = [
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
    'anthropic/claude-3-7-sonnet-20250219',
    'deepseek/deepseek-chat-v3-0324',
    'deepseek/deepseek-r1-distill-qwen-1.5b'
];

// コマンドライン引数
// node requesty.js <mode> <model> <API_KEY>
// mode: stream or normal
const [,, mode, model, API_KEY] = process.argv;

if (!mode || !model || !API_KEY || (mode !== 'stream' && mode !== 'normal')) {
    console.error('Usage: node requesty.js <mode> <model> <YOUR_API_KEY>');
    console.error('Mode: "stream" or "normal"');
    console.error('Supported models:', SUPPORTED_MODELS.join(', '));
    process.exit(1);
}

if (!SUPPORTED_MODELS.includes(model)) {
    console.error(`Error: Unsupported model '${model}'.`);
    console.error('Available models:');
    SUPPORTED_MODELS.forEach(m => console.error(`- ${m}`));
    process.exit(1);
}

async function makeNormalRequest() {
    const url = 'https://router.requesty.ai/v1/chat/completions';

    try {
        console.log(`Sending request to ${model}...`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello, tell me about Requesty Router and how it can be used for different AI models.' }
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            process.exit(1);
        }

        const data = await response.json();
        
        console.log("\n===== 応答結果 =====\n");
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            console.log(data.choices[0].message.content);
        } else {
            console.log(JSON.stringify(data, null, 2));
        }

        // トークン使用状況の表示（存在する場合）
        if (data.usage) {
            console.log("\n===== トークン使用状況 =====");
            console.log(`プロンプトトークン数: ${data.usage.prompt_tokens}`);
            console.log(`回答トークン数: ${data.usage.completion_tokens}`);
            console.log(`合計トークン数: ${data.usage.total_tokens}`);
        }
    } catch (err) {
        console.error('Request failed:', err.message);
        process.exit(1);
    }
}

async function makeStreamRequest() {
    const url = 'https://router.requesty.ai/v1/chat/completions';

    try {
        console.log(`Sending streaming request to ${model}...`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello, tell me about Requesty Router and how it can be used for different AI models.' }
                ],
                temperature: 0.7,
                max_tokens: 800,
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                console.error('API Error:', errorData);
            } catch {
                console.error('API Error:', errorText);
            }
            process.exit(1);
        }

        // ストリーミングレスポンスを逐次処理
        console.log("\n===== ストリーミング応答 =====\n");
        
        // レスポンスをテキストストリームとして読み込む
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data:') && line !== 'data: [DONE]') {
                    try {
                        const jsonData = JSON.parse(line.substring(5).trim());
                        if (jsonData.choices && jsonData.choices.length > 0) {
                            const delta = jsonData.choices[0].delta;
                            if (delta && delta.content) {
                                process.stdout.write(delta.content);
                            }
                        }
                    } catch (e) {
                        // JSONパースエラーは無視（コメント行など）
                    }
                }
            }
        }
        console.log('\n\n===== ストリーミング終了 =====');
    } catch (err) {
        console.error('Streaming request failed:', err.message);
        process.exit(1);
    }
}

// モードに応じて実行する関数を選択
if (mode === 'stream') {
    makeStreamRequest();
} else {
    makeNormalRequest();
}