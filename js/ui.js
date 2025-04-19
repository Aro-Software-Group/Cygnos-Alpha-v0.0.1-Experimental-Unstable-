// UI関連の機能を提供するモジュール

// メッセージをUIに追加する関数
function addMessageToUI(role, content, elementId = null) {
    const messagesContainer = document.getElementById('messages');
    
    // ウェルカムスクリーンを非表示にする
    document.getElementById('welcome-screen').style.display = 'none';
    
    // メッセージ表示エリアを表示する
    messagesContainer.style.display = 'flex';
    
    // メッセージ要素を作成
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    if (elementId) {
        messageDiv.id = elementId;
    }
    
    // アバターを作成
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    // メッセージコンテンツを作成
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // メッセージテキストを作成
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Thinkingメッセージの場合は特別な表示を適用
    if (content === 'Thinking...') {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'thinking-text';
        textSpan.textContent = '考え中';
        
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'thinking-dots';
        
        // 3つのドットを追加
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'thinking-dot';
            dotsDiv.appendChild(dot);
        }
        
        thinkingDiv.appendChild(textSpan);
        thinkingDiv.appendChild(dotsDiv);
        textDiv.appendChild(thinkingDiv);
    } else if (role === 'assistant') {
        // Markdownライクなフォーマットを適用
        textDiv.innerHTML = formatMessage(content);
    } else {
        textDiv.textContent = content;
    }
    
    // 要素を組み立てる
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // スクロールを一番下に移動
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// チャット履歴UIを更新する関数
function updateChatHistoryUI(conversations, currentConversationId, onConversationSelect, onConversationDelete) {
    const chatHistoryContainer = document.querySelector('.chat-history');
    chatHistoryContainer.innerHTML = '';
    
    conversations.forEach(conversation => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (conversation.id === currentConversationId) {
            chatItem.classList.add('active');
        }
        
        // チャットアイテムの内容
        chatItem.innerHTML = `
            <div class="chat-item-content">
                <i class="fas fa-comment"></i>
                <span class="chat-title">${conversation.title}</span>
            </div>
            <div class="chat-item-actions">
                <button class="delete-chat-btn" title="会話を削除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // チャットアイテムクリックイベント
        chatItem.querySelector('.chat-item-content').addEventListener('click', () => onConversationSelect(conversation.id));
        
        // 削除ボタンのイベント
        if (onConversationDelete) {
            chatItem.querySelector('.delete-chat-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // 親要素へのクリックイベント伝播を防止
                onConversationDelete(conversation.id);
            });
        }
        
        chatHistoryContainer.appendChild(chatItem);
    });
    
    // 会話がない場合のメッセージ
    if (conversations.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-history-message';
        emptyMessage.textContent = '会話履歴がありません';
        chatHistoryContainer.appendChild(emptyMessage);
    }
}

// 特定のメッセージ要素を削除する関数
function removeMessageElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.remove();
        return true;
    }
    return false;
}

// メッセージ表示エリアをクリアする関数
function clearMessagesUI() {
    document.getElementById('messages').innerHTML = '';
}

// ウェルカムスクリーンを表示する関数
function showWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'flex';
    document.getElementById('messages').style.display = 'none';
}

// メッセージエリアを表示する関数
function showMessagesUI() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('messages').style.display = 'flex';
}

// 入力フィールドを制御する関数
function controlInputField(enabled) {
    const inputField = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    
    inputField.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (enabled) {
        inputField.focus();
    }
}

// 入力フィールドの値を取得する関数
function getInputValue() {
    return document.getElementById('user-input').value.trim();
}

// 入力フィールドをクリアする関数
function clearInputField() {
    document.getElementById('user-input').value = '';
}

// 入力フィールドにテキストをセットする関数
function setInputValue(text) {
    document.getElementById('user-input').value = text;
}

// メッセージをフォーマットする関数（コードブロックやテキスト整形）
function formatMessage(text) {
    if (!text) return '';
    
    // フェンスドコードブロックを処理（```で囲まれた部分）
    text = text.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, language, code) => {
        language = language.trim();
        const languageClass = language ? ` class="language-${language}"` : '';
        return `<pre><code${languageClass}>${escapeHtml(code)}</code></pre>`;
    });
    
    // インラインコードを処理（`で囲まれた部分）
    text = text.replace(/`([^`]+)`/g, (match, code) => {
        return `<code>${escapeHtml(code)}</code>`;
    });
    
    // 見出し（#）を処理
    text = text.replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${content}</h${level}>`;
    });
    
    // 箇条書きリスト（*、-、+）を処理
    text = text.replace(/^(\s*)([*\-+])\s+(.*?)$/gm, (match, indent, bullet, content) => {
        return `${indent}<ul><li>${content}</li></ul>`;
    });
    
    // 番号付きリストを処理
    text = text.replace(/^(\s*)(\d+)\.\s+(.*?)$/gm, (match, indent, number, content) => {
        return `${indent}<ol start="${number}"><li>${content}</li></ol>`;
    });
    
    // 太字（**text**）を処理
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 斜体（*text*）を処理
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // 打ち消し線（~~text~~）を処理
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // リンクを処理
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 改行を<br>に変換
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// HTMLをエスケープする関数
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 会話履歴アクションメニューを表示する関数
function showConversationActionsMenu() {
    // メニューがすでに存在するなら削除
    let menu = document.querySelector('.conversation-actions-menu');
    if (menu) {
        menu.remove();
        return;
    }
    
    // メニューを作成
    menu = document.createElement('div');
    menu.className = 'conversation-actions-menu';
    
    // メニュー項目
    menu.innerHTML = `
        <div class="menu-item" id="clear-conversation">
            <i class="fas fa-eraser"></i> 現在の会話をクリア
        </div>
        <div class="menu-item" id="delete-all-conversations">
            <i class="fas fa-trash-alt"></i> 全ての会話を削除
        </div>
    `;
    
    // ボディに追加
    document.body.appendChild(menu);
    
    // 位置を設定
    const actionsBtn = document.getElementById('conversation-actions-btn');
    const rect = actionsBtn.getBoundingClientRect();
    
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    
    // メニュー外クリックで閉じる
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== actionsBtn) {
            menu.remove();
        }
    }, { once: true });
    
    return menu;
}

// 確認ダイアログを表示する関数
function showConfirmDialog(message, onConfirm, onCancel) {
    // 既存のダイアログがあれば削除
    const existingDialog = document.querySelector('.confirm-dialog-overlay');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // ダイアログオーバーレイを作成
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    // ダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    dialog.innerHTML = `
        <div class="confirm-dialog-message">${message}</div>
        <div class="confirm-dialog-buttons">
            <button class="cancel-btn">キャンセル</button>
            <button class="confirm-btn">確認</button>
        </div>
    `;
    
    // オーバーレイにダイアログを追加
    overlay.appendChild(dialog);
    
    // ボディに追加
    document.body.appendChild(overlay);
    
    // ボタンにイベントリスナーを追加
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
        if (onConfirm) onConfirm();
        overlay.remove();
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        if (onCancel) onCancel();
        overlay.remove();
    });
    
    // キーボードイベント（Escキーでキャンセル、Enterキーで確定）
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (onCancel) onCancel();
            overlay.remove();
        } else if (e.key === 'Enter') {
            if (onConfirm) onConfirm();
            overlay.remove();
        }
    });
    
    return overlay;
}

// 外部から利用できるようにエクスポート
export {
    addMessageToUI,
    updateChatHistoryUI,
    removeMessageElement,
    clearMessagesUI,
    showWelcomeScreen,
    showMessagesUI,
    controlInputField,
    getInputValue,
    clearInputField,
    setInputValue,
    formatMessage,
    showConversationActionsMenu,
    showConfirmDialog
};