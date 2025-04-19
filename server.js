// server.js
// Requestyを使用するための簡易Expressサーバー
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定とJSONパーサーの設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// モデルリストの取得
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

// ルートパスのハンドラ - HTMLを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Requestyのモデルリストを取得するエンドポイント
app.get('/api/models', (req, res) => {
    res.json({ models: SUPPORTED_MODELS });
});

// Requesty APIへのプロキシリクエスト
app.post('/api/chat', async (req, res) => {
    const { model, prompt, apiKey, stream } = req.body;

    if (!model || !prompt || !apiKey) {
        return res.status(400).json({ error: 'モデル、プロンプト、APIキーが必要です' });
    }

    const url = 'https://router.requesty.ai/v1/chat/completions';

    try {
        // ストリーミングが必要な場合は、クライアントに直接ストリーミング
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        { role: 'user', content: prompt }
                    ],
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 800
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return res.status(response.status).json({ error: errorText });
            }

            // サーバーからクライアントへのストリーミング処理
            const reader = response.body.getReader();
            
            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            res.write('data: [DONE]\n\n');
                            res.end();
                            break;
                        }
                        
                        const chunk = Buffer.from(value).toString('utf-8');
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.includes('data:')) {
                                res.write(`${line}\n\n`);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Stream processing error:', err);
                    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                    res.end();
                }
            };
            
            processStream();
        } else {
            // ストリーミングでない場合は通常のリクエスト
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 800
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                return res.status(response.status).json({ error: data });
            }

            res.json(data);
        }
    } catch (err) {
        console.error('Request failed:', err);
        res.status(500).json({ error: 'サーバーエラー: ' + err.message });
    }
});

// サーバーの起動
app.listen(PORT, () => {
    console.log(`サーバーが起動しました。http://localhost:${PORT}`);
});