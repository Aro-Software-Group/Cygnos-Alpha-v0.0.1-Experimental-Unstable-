// チャット履歴を保存する配列
let conversations = [];
let currentConversationId = null;

// 会話をローカルストレージから読み込む関数
function loadConversationsFromLocalStorage() {
    const savedConversations = localStorage.getItem('gemini_conversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
        return true;
    }
    return false;
}

// 会話をローカルストレージに保存する関数
function saveConversationsToLocalStorage() {
    localStorage.setItem('gemini_conversations', JSON.stringify(conversations));
}

// 新規チャットを作成する関数
function createNewConversation(model) {
    // 新しい会話IDを生成
    const newId = Date.now().toString();
    
    // 新しい会話オブジェクトを作成
    const newConversation = {
        id: newId,
        title: '新しいチャット',
        messages: [],
        model: model,
        timestamp: new Date().toISOString()
    };
    
    // 会話リストに追加
    conversations.unshift(newConversation);
    currentConversationId = newId;
    
    // ローカルストレージに保存
    saveConversationsToLocalStorage();
    
    return newConversation;
}

// 会話を取得する関数
function getConversation(conversationId) {
    return conversations.find(conv => conv.id === conversationId);
}

// 現在の会話を取得する関数
function getCurrentConversation() {
    if (!currentConversationId) return null;
    return getConversation(currentConversationId);
}

// 現在の会話IDを設定する関数
function setCurrentConversationId(id) {
    currentConversationId = id;
}

// 現在の会話IDを取得する関数
function getCurrentConversationId() {
    return currentConversationId;
}

// 全ての会話を取得する関数
function getAllConversations() {
    return conversations;
}

// メッセージを追加する関数
function addMessageToConversation(conversationId, message) {
    const conversation = getConversation(conversationId);
    if (conversation) {
        conversation.messages.push(message);
        saveConversationsToLocalStorage();
        return true;
    }
    return false;
}

// 会話のタイトルを更新する関数
function updateConversationTitle(conversationId, title) {
    const conversation = getConversation(conversationId);
    if (conversation) {
        conversation.title = title;
        saveConversationsToLocalStorage();
        return true;
    }
    return false;
}

// 会話を削除する関数
function deleteConversation(conversationId) {
    const initialLength = conversations.length;
    conversations = conversations.filter(conv => conv.id !== conversationId);
    
    // 会話が実際に削除されたか確認
    if (initialLength !== conversations.length) {
        // 削除された会話が現在の会話だった場合、currentConversationIdをリセット
        if (conversationId === currentConversationId) {
            currentConversationId = conversations.length > 0 ? conversations[0].id : null;
        }
        
        // ローカルストレージに保存
        saveConversationsToLocalStorage();
        return true;
    }
    return false;
}

// 全ての会話を削除する関数
function deleteAllConversations() {
    conversations = [];
    currentConversationId = null;
    saveConversationsToLocalStorage();
    return true;
}

// 会話からメッセージを削除する関数
function deleteMessageFromConversation(conversationId, messageIndex) {
    const conversation = getConversation(conversationId);
    if (conversation && conversation.messages.length > messageIndex) {
        // メッセージを削除
        conversation.messages.splice(messageIndex, 1);
        saveConversationsToLocalStorage();
        return true;
    }
    return false;
}

// 会話から全てのメッセージを削除する関数
function clearConversationMessages(conversationId) {
    const conversation = getConversation(conversationId);
    if (conversation) {
        conversation.messages = [];
        saveConversationsToLocalStorage();
        return true;
    }
    return false;
}

// 外部から利用できるようにエクスポート
export {
    loadConversationsFromLocalStorage,
    saveConversationsToLocalStorage,
    createNewConversation,
    getConversation,
    getCurrentConversation,
    setCurrentConversationId,
    getCurrentConversationId,
    getAllConversations,
    addMessageToConversation,
    updateConversationTitle,
    deleteConversation,
    deleteAllConversations,
    deleteMessageFromConversation,
    clearConversationMessages
};