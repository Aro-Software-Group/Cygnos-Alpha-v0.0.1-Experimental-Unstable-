// メインアプリケーションファイル
import * as Config from './config.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';
import * as Chat from './chat.js';

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// アプリケーションの初期化関数
function initApp() {
    // 設定を初期化
    Config.initializeSettings();
    
    // ローカルストレージから会話履歴を読み込む
    Storage.loadConversationsFromLocalStorage();
    
    // UIの更新
    updateChatHistoryUI();
    
    // モデル選択UIを更新
    updateModelSelectionUI();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // 設定モーダルの設定
    setupSettingsModal();
}

// モデル選択UIの更新
function updateModelSelectionUI() {
    const modelSelect = document.getElementById('model-select');
    
    // セレクトボックスをクリア
    modelSelect.innerHTML = '';
    
    // モデルの分類
    const groupedModels = Config.getGroupedModels();
    
    // Gemini モデル用のグループを作成
    const geminiGroup = document.createElement('optgroup');
    geminiGroup.label = 'Gemini';
    
    groupedModels.gemini.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.dataset.provider = model.provider;
        if (Config.getCurrentModel() === model.id && Config.getCurrentProvider() === 'gemini') {
            option.selected = true;
        }
        geminiGroup.appendChild(option);
    });
    
    // Requesty モデル用のグループを作成
    const requestyGroup = document.createElement('optgroup');
    requestyGroup.label = 'Requesty';
    
    groupedModels.requesty.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.dataset.provider = 'requesty';
        if (Config.getCurrentModel() === model.id && Config.getCurrentProvider() === 'requesty') {
            option.selected = true;
        }
        requestyGroup.appendChild(option);
    });
    
    // セレクトボックスに追加
    modelSelect.appendChild(geminiGroup);
    modelSelect.appendChild(requestyGroup);
}

// イベントリスナーの設定
function setupEventListeners() {
    // モデル選択の変更を監視
    document.getElementById('model-select').addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provider = selectedOption.dataset.provider;
        Config.setCurrentModel(e.target.value, provider);
    });
    
    // 送信ボタンのイベントリスナー
    document.getElementById('send-btn').addEventListener('click', handleSendMessage);
    
    // テキストエリアのEnterキーで送信
    document.getElementById('user-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // 新規チャットボタンのイベントリスナー
    document.querySelector('.new-chat-btn').addEventListener('click', handleNewChat);
    
    // 会話アクションボタンのイベントリスナー
    document.getElementById('conversation-actions-btn').addEventListener('click', handleConversationActions);
    
    // サジェスションカードをクリックしたときの処理
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const suggestion = card.querySelector('h3').textContent;
            UI.setInputValue(suggestion);
            handleSendMessage();
        });
    });
    
    // 設定ボタンのイベントリスナー
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);

    // クリックイベントをボディで委譲処理してボタン動作を保証
    document.body.addEventListener('click', (e) => {
        // 新規チャット
        if (e.target.closest('.new-chat-btn')) {
            e.preventDefault(); handleNewChat();
        }
        // 送信
        if (e.target.closest('#send-btn')) {
            e.preventDefault(); handleSendMessage();
        }
        // 設定
        if (e.target.closest('#settings-btn')) {
            e.preventDefault(); openSettingsModal();
        }
        // 会話アクション
        if (e.target.closest('#conversation-actions-btn')) {
            e.preventDefault(); handleConversationActions();
        }
        // APIキー保存
        if (e.target.closest('#save-api-key')) {
            e.preventDefault(); document.getElementById('save-api-key').click();
        }
        // 設定保存
        if (e.target.closest('#save-settings')) {
            e.preventDefault(); document.getElementById('save-settings').click();
        }
        
        // メニュー項目のイベント処理
        if (e.target.closest('#clear-conversation')) {
            e.preventDefault();
            handleClearConversation();
        }
        if (e.target.closest('#delete-all-conversations')) {
            e.preventDefault();
            handleDeleteAllConversations();
        }
    });

    // 設定モーダル内のタブ切り替え機能
    document.querySelectorAll('.tab-header .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // すべてのタブからactiveクラスを削除
            document.querySelectorAll('.tab-header .tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // クリックされたタブにactiveクラスを追加
            tab.classList.add('active');
            
            // すべてのタブペインを非表示にする
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // 対応するタブペインを表示する
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 設定モーダルの設定
function setupSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close');
    const saveSettingsBtn = document.getElementById('save-settings');
    const toggleGeminiApiKeyBtn = document.getElementById('toggle-gemini-api-key');
    const toggleRequestyApiKeyBtn = document.getElementById('toggle-requesty-api-key');
    const saveGeminiApiKeyBtn = document.getElementById('save-gemini-api-key');
    const saveRequestyApiKeyBtn = document.getElementById('save-requesty-api-key');
    const temperatureInput = document.getElementById('temperature-input');
    const temperatureValue = document.getElementById('temperature-value');
    const themeSelect = document.getElementById('theme-select');
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const requestyApiKeyInput = document.getElementById('requesty-api-key-input');
    
    // 現在の設定を表示
    const currentSettings = Config.getSettings();
    geminiApiKeyInput.value = currentSettings.geminiApiKey || '';
    requestyApiKeyInput.value = currentSettings.requestyApiKey || '';
    temperatureInput.value = currentSettings.temperature;
    temperatureValue.textContent = currentSettings.temperature;
    themeSelect.value = currentSettings.theme;
    
    // 閉じるボタンのイベント
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // モーダル外をクリックしたときに閉じる
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Gemini APIキーの表示/非表示切り替え
    toggleGeminiApiKeyBtn.addEventListener('click', () => {
        if (geminiApiKeyInput.type === 'password') {
            geminiApiKeyInput.type = 'text';
            toggleGeminiApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            geminiApiKeyInput.type = 'password';
            toggleGeminiApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
    
    // Requesty APIキーの表示/非表示切り替え
    toggleRequestyApiKeyBtn.addEventListener('click', () => {
        if (requestyApiKeyInput.type === 'password') {
            requestyApiKeyInput.type = 'text';
            toggleRequestyApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            requestyApiKeyInput.type = 'password';
            toggleRequestyApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
    
    // Gemini APIキー保存ボタン
    saveGeminiApiKeyBtn.addEventListener('click', () => {
        const apiKey = geminiApiKeyInput.value.trim();
        if (apiKey) {
            Config.setGeminiApiKey(apiKey);
            showToast('Gemini APIキーが保存されました');
        } else {
            showToast('APIキーを入力してください', 'error');
        }
    });
    
    // Requesty APIキー保存ボタン
    saveRequestyApiKeyBtn.addEventListener('click', () => {
        const apiKey = requestyApiKeyInput.value.trim();
        if (apiKey) {
            Config.setRequestyApiKey(apiKey);
            showToast('Requesty APIキーが保存されました');
        } else {
            showToast('APIキーを入力してください', 'error');
        }
    });
    
    // Temperature調整
    temperatureInput.addEventListener('input', () => {
        temperatureValue.textContent = temperatureInput.value;
    });
    
    // 設定保存ボタン
    saveSettingsBtn.addEventListener('click', () => {
        const newSettings = {
            theme: themeSelect.value,
            temperature: parseFloat(temperatureInput.value),
            geminiApiKey: geminiApiKeyInput.value.trim(),
            requestyApiKey: requestyApiKeyInput.value.trim()
        };
        
        Config.saveSettings(newSettings);
        modal.style.display = 'none';
        showToast('設定が保存されました');
    });
}

// 設定モーダルを開く
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
}

// トースト通知を表示
function showToast(message, type = 'success') {
    // すでに存在するトーストを削除
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // トーストを作成
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // ボディに追加
    document.body.appendChild(toast);
    
    // アニメーションクラスを追加
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 一定時間後に削除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// チャット履歴UIの更新
function updateChatHistoryUI() {
    UI.updateChatHistoryUI(
        Storage.getAllConversations(),
        Storage.getCurrentConversationId(),
        handleConversationSelect,
        handleDeleteConversation
    );
}

// 新規チャット作成処理
function handleNewChat() {
    // 新しいチャットを作成
    Storage.createNewConversation(Config.getCurrentModel());
    
    // UIの更新
    updateChatHistoryUI();
    
    // メッセージエリアをクリア
    UI.clearMessagesUI();
    UI.showMessagesUI();
    
    // 入力フィールドをクリア
    UI.clearInputField();
    UI.controlInputField(true);
}

// 会話選択時の処理
function handleConversationSelect(conversationId) {
    // 現在の会話IDを設定
    Storage.setCurrentConversationId(conversationId);
    
    // 選択された会話を取得
    const conversation = Storage.getConversation(conversationId);
    
    if (conversation) {
        // 現在のモデルを設定
        Config.setCurrentModel(conversation.model);
        document.getElementById('model-select').value = conversation.model;
        
        // メッセージを表示
        UI.clearMessagesUI();
        UI.showMessagesUI();
        
        conversation.messages.forEach(message => {
            const role = message.role === 'user' ? 'user' : 'assistant';
            UI.addMessageToUI(role, message.content);
        });
        
        // チャット履歴UIの更新
        updateChatHistoryUI();
    }
}

// 会話削除時の処理
function handleDeleteConversation(conversationId) {
    UI.showConfirmDialog('この会話を削除しますか？', () => {
        // 会話を削除
        if (Storage.deleteConversation(conversationId)) {
            // 会話が削除された場合、UIを更新
            updateChatHistoryUI();
            
            // 現在の会話IDをチェック
            if (!Storage.getCurrentConversationId()) {
                // 会話がない場合はウェルカムスクリーンを表示
                UI.clearMessagesUI();
                UI.showWelcomeScreen();
            } else {
                // 他の会話がある場合は選択されている会話を表示
                handleConversationSelect(Storage.getCurrentConversationId());
            }
            
            showToast('会話が削除されました');
        }
    });
}

// 会話アクションボタンクリック時の処理
function handleConversationActions() {
    const menu = UI.showConversationActionsMenu();
    
    // メニュー項目にイベントリスナーを追加
    if (menu) {
        menu.querySelector('#clear-conversation').addEventListener('click', handleClearConversation);
        menu.querySelector('#delete-all-conversations').addEventListener('click', handleDeleteAllConversations);
    }
}

// 現在の会話をクリアする処理
function handleClearConversation() {
    const currentConversationId = Storage.getCurrentConversationId();
    if (!currentConversationId) {
        showToast('クリアする会話がありません', 'error');
        return;
    }
    
    UI.showConfirmDialog('現在の会話のメッセージをすべて削除しますか？', () => {
        if (Storage.clearConversationMessages(currentConversationId)) {
            UI.clearMessagesUI();
            UI.showMessagesUI();
            showToast('会話がクリアされました');
            
            // 会話のタイトルをリセット
            Storage.updateConversationTitle(currentConversationId, '新しいチャット');
            updateChatHistoryUI();
        }
    });
}

// すべての会話を削除する処理
function handleDeleteAllConversations() {
    UI.showConfirmDialog('すべての会話履歴を削除しますか？この操作は元に戻せません。', () => {
        if (Storage.deleteAllConversations()) {
            updateChatHistoryUI();
            UI.clearMessagesUI();
            UI.showWelcomeScreen();
            showToast('すべての会話履歴が削除されました');
        }
    });
}

// メッセージ送信処理
async function handleSendMessage() {
    const userInput = UI.getInputValue();
    
    // 入力が空の場合は何もしない
    if (!userInput) return;
    
    // 現在のプロバイダーに対応するAPIキーが設定されていない場合は設定モーダルを開く
    if (!Config.hasCurrentApiKey()) {
        openSettingsModal();
        showToast(`${Config.getCurrentProvider() === 'gemini' ? 'Gemini' : 'Requesty'} APIキーを設定してください`, 'error');
        return;
    }
    
    // 初めてのメッセージなら新しいチャットを作成
    if (!Storage.getCurrentConversationId()) {
        handleNewChat();
    }
    
    // 現在の会話を取得
    const conversation = Storage.getCurrentConversation();
    
    // ユーザーのメッセージをUIに追加
    UI.addMessageToUI('user', userInput);
    
    // 入力フィールドをクリアして無効化
    UI.clearInputField();
    UI.controlInputField(false);
    
    // ローディングメッセージを表示
    const loadingMsgId = 'loading-' + Date.now();
    UI.addMessageToUI('assistant', 'Thinking...', loadingMsgId);
    
    try {
        // ユーザーメッセージを作成
        const userMessage = Chat.createUserMessage(userInput);
        
        // 会話にユーザーメッセージを追加
        Storage.addMessageToConversation(conversation.id, userMessage);
        
        // 会話履歴をAPI用に変換
        const history = Chat.formatHistoryForApi(conversation.messages.slice(0, -1));
        
        // APIリクエストを送信（プロバイダに応じた関数を呼び出す）
        const response = await Chat.fetchAIResponse(userInput, history);
        
        // ローディングメッセージを削除
        UI.removeMessageElement(loadingMsgId);
        
        // AIの応答をUIに追加
        UI.addMessageToUI('assistant', response);
        
        // AIのメッセージを作成
        const assistantMessage = Chat.createAssistantMessage(response);
        
        // 会話にAIメッセージを追加
        Storage.addMessageToConversation(conversation.id, assistantMessage);
        
        // 会話のタイトルを更新（初めてのメッセージならタイトルを設定）
        if (conversation.messages.length === 2) {
            const title = Chat.extractTitleFromUserMessage(userInput);
            Storage.updateConversationTitle(conversation.id, title);
            updateChatHistoryUI();
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // ローディングメッセージを削除
        UI.removeMessageElement(loadingMsgId);
        
        // エラーメッセージを表示
        UI.addMessageToUI('assistant', 'エラーが発生しました: ' + error.message);
        showToast('エラー: ' + error.message, 'error');
    } finally {
        // 入力フィールドを再び有効化
        UI.controlInputField(true);
    }
}