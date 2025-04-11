/**
 * Cygnos API Integration
 * Handles integration with Gemini and OpenRouter APIs
 */

class ApiService {
    constructor() {
        this.isProcessing = false;
    }

    /**
     * Send a request to Gemini API
     * @param {Object} params - Request parameters
     * @returns {Promise<Object>} - API response
     */
    async callGeminiApi(params) {
        const apiKey = settingsManager.getApiKey('gemini');
        if (!apiKey) {
            throw new Error('Gemini API キーが設定されていません。設定から API キーを入力してください。');
        }

        const { prompt, model, maxTokens, temperature } = params;
        const apiModel = model || CYGNOS_CONFIG.apis.gemini.models.text;
        const apiMaxTokens = maxTokens || CYGNOS_CONFIG.apis.gemini.maxTokens;
        const apiTemperature = temperature !== undefined ? temperature : CYGNOS_CONFIG.apis.gemini.temperature;

        const endpoint = `${CYGNOS_CONFIG.apis.gemini.baseUrl}/models/${apiModel}:generateContent?key=${apiKey}`;

        try {
            this.isProcessing = true;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: apiMaxTokens,
                        temperature: apiTemperature,
                        topP: CYGNOS_CONFIG.apis.gemini.topP,
                        topK: CYGNOS_CONFIG.apis.gemini.topK
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API エラー: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return this._processGeminiResponse(data);
        } catch (error) {
            console.error('Gemini API 呼び出しエラー:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process Gemini API response
     * @param {Object} response - API response
     * @returns {Object} - Processed response
     */
    _processGeminiResponse(response) {
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('Gemini APIからの応答が無効です');
        }

        const candidate = response.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('Gemini APIの応答形式が無効です');
        }

        const text = candidate.content.parts[0].text || '';
        
        return {
            text,
            model: response.modelId || CYGNOS_CONFIG.apis.gemini.models.text,
            usage: {
                promptTokens: response.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: (response.usageMetadata?.promptTokenCount || 0) + (response.usageMetadata?.candidatesTokenCount || 0)
            }
        };
    }

    /**
     * Send a multimodal request to Gemini API (text + images)
     * @param {Object} params - Request parameters
     * @returns {Promise<Object>} - API response
     */
    async callGeminiVisionApi(params) {
        const apiKey = settingsManager.getApiKey('gemini');
        if (!apiKey) {
            throw new Error('Gemini API キーが設定されていません。設定から API キーを入力してください。');
        }

        const { prompt, images, model, maxTokens, temperature } = params;
        const apiModel = model || CYGNOS_CONFIG.apis.gemini.models.vision;
        const apiMaxTokens = maxTokens || CYGNOS_CONFIG.apis.gemini.maxTokens;
        const apiTemperature = temperature !== undefined ? temperature : CYGNOS_CONFIG.apis.gemini.temperature;

        const endpoint = `${CYGNOS_CONFIG.apis.gemini.baseUrl}/models/${apiModel}:generateContent?key=${apiKey}`;

        try {
            this.isProcessing = true;
            
            // Prepare the request parts (text and images)
            const parts = [{ text: prompt }];
            
            // Process and add image parts
            if (images && images.length > 0) {
                for (const image of images) {
                    // Handle different image input formats (base64, URL, etc.)
                    if (typeof image === 'string' && image.startsWith('data:image')) {
                        // Base64 image data
                        const base64Data = image.split(',')[1];
                        parts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: image.split(';')[0].split(':')[1]
                            }
                        });
                    } else if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
                        // Image URL - Note: Gemini may not support direct URLs, so we might need to fetch and convert
                        throw new Error('Gemini API does not directly support image URLs. Please convert to base64 first.');
                    } else if (image instanceof File) {
                        // File object
                        const base64Data = await this._fileToBase64(image);
                        parts.push({
                            inlineData: {
                                data: base64Data.split(',')[1],
                                mimeType: image.type
                            }
                        });
                    }
                }
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        maxOutputTokens: apiMaxTokens,
                        temperature: apiTemperature,
                        topP: CYGNOS_CONFIG.apis.gemini.topP,
                        topK: CYGNOS_CONFIG.apis.gemini.topK
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini Vision API エラー: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return this._processGeminiResponse(data);
        } catch (error) {
            console.error('Gemini Vision API 呼び出しエラー:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Convert a File object to base64
     * @param {File} file - File object
     * @returns {Promise<string>} - Base64 data
     */
    async _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Send a request to OpenRouter API
     * @param {Object} params - Request parameters
     * @returns {Promise<Object>} - API response
     */
    async callOpenRouterApi(params) {
        const apiKey = settingsManager.getApiKey('openRouter');
        if (!apiKey) {
            throw new Error('OpenRouter API キーが設定されていません。設定から API キーを入力してください。');
        }

        const { prompt, systemPrompt, model, maxTokens, temperature } = params;
        const apiModel = model || CYGNOS_CONFIG.apis.openRouter.defaultModel;
        const apiMaxTokens = maxTokens || CYGNOS_CONFIG.apis.openRouter.maxTokens;
        const apiTemperature = temperature !== undefined ? temperature : CYGNOS_CONFIG.apis.openRouter.temperature;

        const endpoint = `${CYGNOS_CONFIG.apis.openRouter.baseUrl}/chat/completions`;

        try {
            this.isProcessing = true;
            
            const messages = [];
            
            // Add system message if provided
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }
            
            // Add user message
            messages.push({
                role: 'user',
                content: prompt
            });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin, // Required by OpenRouter
                    'X-Title': 'Cygnos AI' // Helps OpenRouter identify your app
                },
                body: JSON.stringify({
                    model: apiModel,
                    messages: messages,
                    max_tokens: apiMaxTokens,
                    temperature: apiTemperature,
                    top_p: CYGNOS_CONFIG.apis.openRouter.topP
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenRouter API エラー: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return this._processOpenRouterResponse(data);
        } catch (error) {
            console.error('OpenRouter API 呼び出しエラー:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process OpenRouter API response
     * @param {Object} response - API response
     * @returns {Object} - Processed response
     */
    _processOpenRouterResponse(response) {
        if (!response.choices || response.choices.length === 0) {
            throw new Error('OpenRouter APIからの応答が無効です');
        }

        const choice = response.choices[0];
        if (!choice.message || !choice.message.content) {
            throw new Error('OpenRouter APIの応答形式が無効です');
        }

        const text = choice.message.content;
        
        return {
            text,
            model: response.model || 'unknown',
            usage: response.usage || {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
            }
        };
    }

    /**
     * Send a request to the preferred API (Gemini or OpenRouter)
     * @param {Object} params - Request parameters
     * @returns {Promise<Object>} - API response
     */
    async sendRequest(params) {
        // Check which API keys are available and use the preferred one
        const geminiKey = settingsManager.getApiKey('gemini');
        const openRouterKey = settingsManager.getApiKey('openRouter');
        
        if (!geminiKey && !openRouterKey) {
            throw new Error('有効なAPI キーがありません。設定から少なくとも1つのAPI キーを入力してください。');
        }
        
        // Default to OpenRouter if both are available (higher quality models)
        if (openRouterKey) {
            return this.callOpenRouterApi(params);
        } else {
            return this.callGeminiApi(params);
        }
    }

    /**
     * Send a multimodal request (text + images)
     * @param {Object} params - Request parameters
     * @returns {Promise<Object>} - API response
     */
    async sendMultimodalRequest(params) {
        // Currently only Gemini supports multimodal inputs in our implementation
        return this.callGeminiVisionApi(params);
    }
}

// Initialize API Service
const apiService = new ApiService(); 