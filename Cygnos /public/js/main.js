/**
 * Cygnos Main
 * Entry point for the Cygnos AI agent application
 */

// Check for API keys on startup
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Add welcome message
    if (document.getElementById('task-chat-messages').children.length === 0) {
        uiManager.addMessage(CYGNOS_CONFIG.systemMessages.welcomeMessage, 'system');
    }
    
    // Initialize a new conversation if none exists
    if (!memorySystem.currentConversation) {
        memorySystem.initConversation();
    }
    
    // Check if API keys are set
    if (!settingsManager.hasRequiredApiKeys()) {
        setTimeout(() => {
            uiManager.addMessage('Cygnosを使用するには、API キーの設定が必要です。設定から API キーを入力してください。', 'system');
            uiManager.openSettings();
        }, 1000);
    }
    
    // Set up panel toggle
    const panelContent = document.querySelector('.panel-content');
    if (panelContent) {
        // Start with panel collapsed
        panelContent.classList.remove('expanded');
    }
    
    // Add event listeners for navigation
    setupNavigation();
    
    // Add keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Focus input
    document.getElementById('task-user-input').focus();
    
    // Initialize task manager
    if (typeof TaskManager !== 'undefined') {
        window.taskManager = new TaskManager();
    }
}

/**
 * Set up navigation event listeners
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.main-nav li a');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get the section to show
            const sectionId = item.getAttribute('data-section');
            
            if (sectionId) {
                // Remove active class from all nav items
                navItems.forEach(navItem => navItem.parentNode.classList.remove('active'));
                
                // Add active class to clicked item
                item.parentNode.classList.add('active');
                
                // Hide all sections
                sections.forEach(section => section.classList.remove('active'));
                
                // Show the selected section
                const targetSection = document.getElementById(`${sectionId}-section`);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
                
                // Handle specific section initializations
                handleSectionInitialization(sectionId);
            }
        });
    });
    
    // Also handle sidebar toggle for mobile
    const toggleSidebarBtns = document.querySelectorAll('.hamburger-menu');
    toggleSidebarBtns.forEach(btn => {
        btn.addEventListener('click', toggleSidebar);
    });
}

/**
 * Handle initialization for specific sections
 * @param {string} sectionId - Section identifier
 */
function handleSectionInitialization(sectionId) {
    switch (sectionId) {
        case 'tasks':
            // Refresh task list if task manager exists
            if (window.taskManager) {
                window.taskManager.renderTasks();
            }
            break;
        case 'history':
            showConversationHistory();
            break;
        case 'settings':
            // Move settings from modal to inline view
            populateSettingsSection();
            break;
    }
}

/**
 * Toggle sidebar visibility (for mobile)
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('active');
        mainContent.classList.toggle('sidebar-active');
    }
}

/**
 * Populate settings section with content from the modal
 */
function populateSettingsSection() {
    const settingsContainer = document.querySelector('.settings-container');
    const settingsModalBody = document.querySelector('#settings-modal .modal-body');
    
    if (settingsContainer && settingsModalBody) {
        // Clone settings content from modal to inline section
        if (settingsContainer.children.length === 0) {
            settingsContainer.innerHTML = settingsModalBody.innerHTML;
            
            // Add event listeners to the inline settings
            const saveBtn = document.createElement('button');
            saveBtn.className = 'primary-button';
            saveBtn.textContent = '設定を保存';
            saveBtn.addEventListener('click', () => {
                // Use the same save logic as in the settings modal
                if (typeof settingsManager !== 'undefined' && settingsManager.saveSettings) {
                    settingsManager.saveSettings();
                }
            });
            
            settingsContainer.appendChild(saveBtn);
        }
    }
}

/**
 * Show conversation history
 */
function showConversationHistory() {
    const historyContainer = document.getElementById('history-container');
    const conversations = memorySystem.conversations;
    
    if (!historyContainer) return;
    
    // Clear container
    historyContainer.innerHTML = '';
    
    if (conversations.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-history"></i>
            <h3>会話履歴がありません</h3>
            <p>会話を開始すると、ここに履歴が表示されます</p>
        `;
        historyContainer.appendChild(emptyState);
        return;
    }
    
    // Add conversation items
    conversations.forEach(conversation => {
        const date = new Date(conversation.createdAt).toLocaleDateString();
        const time = new Date(conversation.createdAt).toLocaleTimeString();
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.conversationId = conversation.id;
        
        let snippet = '';
        if (conversation.messages.length > 0) {
            const userMessages = conversation.messages.filter(m => m.role === 'user');
            if (userMessages.length > 0) {
                snippet = userMessages[0].content.substring(0, 100) + (userMessages[0].content.length > 100 ? '...' : '');
            }
        }
        
        historyItem.innerHTML = `
            <div class="history-header">
                <div class="history-title">${conversation.title || '無題の会話'}</div>
                <div class="history-date">${date} ${time}</div>
            </div>
            <div class="history-snippet">${snippet}</div>
        `;
        
        historyItem.addEventListener('click', () => {
            loadConversation(conversation.id);
            
            // Switch to chat view
            const chatNavItem = document.querySelector('a[data-section="chat"]');
            if (chatNavItem) {
                chatNavItem.click();
            }
        });
        
        historyContainer.appendChild(historyItem);
    });
}

/**
 * Load a specific conversation
 * @param {string} conversationId - Conversation ID
 */
function loadConversation(conversationId) {
    try {
        const conversation = memorySystem.loadConversation(conversationId);
        
        // Clear chat UI
        document.getElementById('task-chat-messages').innerHTML = '';
        
        // Add system welcome message
        uiManager.addMessage(CYGNOS_CONFIG.systemMessages.welcomeMessage, 'system');
        
        // Add conversation messages
        conversation.messages.forEach(message => {
            uiManager.addMessage(message.content, message.role);
        });
        
        // Add success message
        uiManager.addMessage(`"${conversation.title}" を読み込みました。`, 'system');
    } catch (error) {
        uiManager.addMessage(`会話の読み込みエラー: ${error.message}`, 'system');
    }
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+/ - Open settings
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            const settingsNavItem = document.querySelector('a[data-section="settings"]');
            if (settingsNavItem) {
                settingsNavItem.click();
            }
        }
        
        // Escape - Close modals
        if (e.key === 'Escape') {
            const activeModals = document.querySelectorAll('.modal.active');
            if (activeModals.length > 0) {
                e.preventDefault();
                activeModals.forEach(modal => {
                    uiManager.closeModal(modal);
                });
            }
        }
        
        // Alt+T - Switch to tasks
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            const tasksNavItem = document.querySelector('a[data-section="tasks"]');
            if (tasksNavItem) {
                tasksNavItem.click();
            }
        }
        
        // Alt+C - Switch to chat
        if (e.altKey && e.key === 'c') {
            e.preventDefault();
            const chatNavItem = document.querySelector('a[data-section="chat"]');
            if (chatNavItem) {
                chatNavItem.click();
            }
        }
    });
}

/**
 * Handle errors
 * @param {Error} error - Error object
 */
function handleError(error) {
    console.error('アプリケーションエラー:', error);
    
    // Show error notification
    if (themeManager) {
        const errorMessage = `${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`;
        showErrorNotification(errorMessage);
    }
    
    // Add error message to chat
    if (uiManager) {
        uiManager.addMessage(`${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`, 'system');
    }
}

/**
 * Show error notification
 * @param {string} message - Error message
 */
function showErrorNotification(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
        errorDiv.classList.remove('visible');
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 5000);
}

// Additional event listener for the "create first task" button
document.addEventListener('DOMContentLoaded', () => {
    const createFirstTaskBtn = document.getElementById('create-first-task');
    if (createFirstTaskBtn) {
        createFirstTaskBtn.addEventListener('click', () => {
            if (window.taskManager) {
                window.taskManager.openTaskModal();
            }
        });
    }
});

// Global error handling
window.onerror = (message, source, lineno, colno, error) => {
    handleError(error || new Error(message));
    return true; // Prevent default error handling
};

window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason);
}); 
