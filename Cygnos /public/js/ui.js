/**
 * Cygnos UI Interactions
 * Handles all user interface interactions
 */
class UiManager {
    constructor() {
        this.initElements();
        this.attachEventListeners();
        this.markdownRenderer = this.setupMarkdownRenderer();
        this.isProcessing = false;
        
        // モバイルサポートの状態
        this.isMobile = window.innerWidth < 768;
        this.sidebarActive = false;
        
        // テーマの初期設定
        this.applyTheme();
        
        // リサイズイベントの設定
        this.setupResizeListener();
    }
    
    /**
     * Initialize UI elements
     */
    initElements() {
        // Chat elements
        this.chatMessages = document.getElementById('task-chat-messages');
        this.userInput = document.getElementById('task-user-input');
        this.sendButton = document.getElementById('task-send-message');
        this.clearChatButton = document.getElementById('clear-chat');
        this.exportChatButton = document.getElementById('export-chat');
        
        // File handling elements
        this.uploadButton = document.getElementById('task-upload-file');
        this.fileInput = document.getElementById('file-input');
        this.filePreviewModal = document.getElementById('file-preview-modal');
        this.filePreviewContainer = document.getElementById('file-preview-container');
        this.confirmUploadButton = document.getElementById('confirm-upload');
        
        // Voice input
        this.voiceInputButton = document.getElementById('voice-input');
        
        // Processing panel
        this.processingPanel = document.querySelector('.processing-panel');
        this.togglePanelButton = document.getElementById('toggle-panel');
        this.panelContent = document.querySelector('.panel-content');
        
        // Mobile navigation elements
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.hamburgerButton = document.querySelector('.hamburger-menu');
        
        // Settings modal
        this.settingsElements = {
            modal: document.getElementById('settings-modal'),
            geminiApiKey: document.getElementById('gemini-api-key'),
            openRouterApiKey: document.getElementById('openrouter-api-key'),
            autonomyLevel: document.getElementById('autonomy-level'),
            allowWebSearch: document.getElementById('allow-web-search'),
            allowCodeExecution: document.getElementById('allow-code-execution'),
            allowFileAccess: document.getElementById('allow-file-access'),
            saveConversationHistory: document.getElementById('save-conversation-history'),
            saveButton: document.getElementById('save-settings')
        };
        
        // Close modal buttons
        this.closeModalButtons = document.querySelectorAll('.close-modal');
        
        // Selected files
        this.selectedFiles = [];
        
        // ナビゲーション項目
        this.navItems = document.querySelectorAll('.main-nav li a');
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Send message
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (this.userInput) {
            this.userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // 自動リサイズのための入力イベント
            this.userInput.addEventListener('input', () => this.resizeTextarea());
        }
        
        // Clear chat
        if (this.clearChatButton) {
            this.clearChatButton.addEventListener('click', () => this.clearChat());
        }
        
        // Export chat
        if (this.exportChatButton) {
            this.exportChatButton.addEventListener('click', () => this.exportChat());
        }
        
        // File upload
        if (this.uploadButton && this.fileInput) {
            this.uploadButton.addEventListener('click', () => this.openFileSelector());
            this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }
        
        if (this.confirmUploadButton) {
            this.confirmUploadButton.addEventListener('click', () => this.confirmFileUpload());
        }
        
        // Voice input
        if (this.voiceInputButton) {
            this.voiceInputButton.addEventListener('click', () => this.toggleVoiceInput());
        }
        
        // Processing panel
        if (this.togglePanelButton) {
            this.togglePanelButton.addEventListener('click', () => this.toggleProcessingPanel());
        }
        
        // Mobile navigation
        if (this.hamburgerButton) {
            this.hamburgerButton.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (this.isMobile && this.sidebarActive) {
                // サイドバー自体またはハンバーガーメニューをクリックした場合は何もしない
                if (e.target.closest('.sidebar') || e.target.closest('.hamburger-menu')) {
                    return;
                }
                this.toggleSidebar(false); // サイドバーを閉じる
            }
        });
        
        // Settings
        if (document.querySelector('.main-nav')) {
            document.querySelector('.main-nav').addEventListener('click', (e) => {
                if (e.target.closest('li:nth-child(4)') || e.target.closest('a') && e.target.closest('a').querySelector('i.fa-cog')) {
                    e.preventDefault();
                    this.openSettings();
                }
            });
        }
        
        if (this.settingsElements.saveButton) {
            this.settingsElements.saveButton.addEventListener('click', () => this.saveSettings());
        }
        
        // Close modals
        this.closeModalButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.modal.active').forEach(modal => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // ナビゲーション項目のアクティブ状態管理
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('a[href="#settings"]')) {
                    this.setActiveNavItem(item);
                    
                    // モバイルではナビゲーション後にサイドバーを閉じる
                    if (this.isMobile) {
                        this.toggleSidebar(false);
                    }
                }
            });
        });
        
        // テーマ切り替え
        const themeToggle = document.querySelector('.theme-toggle button');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // 通知閉じるボタン
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-close')) {
                const notification = e.target.closest('.notification');
                if (notification) {
                    notification.classList.remove('visible');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }
            }
        });
    }
    
    /**
     * Set up resize listener for responsive behavior
     */
    setupResizeListener() {
        window.addEventListener('resize', () => {
            // 画面サイズに基づいてモバイルモードを切り替える
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            
            // モバイルからデスクトップに切り替わった場合、サイドバーを表示
            if (wasMobile && !this.isMobile) {
                this.sidebar.classList.remove('active');
                this.sidebarActive = false;
            }
            
            // textarea の高さを調整
            if (this.userInput) {
                this.resizeTextarea();
            }
        });
    }
    
    /**
     * Toggle sidebar visibility
     * @param {boolean} force - Optional forced state
     */
    toggleSidebar(force) {
        const newState = force !== undefined ? force : !this.sidebarActive;
        
        if (newState) {
            this.sidebar.classList.add('active');
            this.sidebarActive = true;
        } else {
            this.sidebar.classList.remove('active');
            this.sidebarActive = false;
        }
    }
    
    /**
     * Set active navigation item
     * @param {HTMLElement} item - Navigation item to activate
     */
    setActiveNavItem(item) {
        this.navItems.forEach(navItem => {
            navItem.parentElement.classList.remove('active');
        });
        
        item.parentElement.classList.add('active');
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // テーマ切り替えボタンのアイコンとツールチップを更新
        this.updateThemeToggleButton(newTheme);
        
        // イベント発火
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    }
    
    /**
     * Apply saved theme or default
     */
    applyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // テーマ切り替えボタンのアイコンとツールチップを更新
        this.updateThemeToggleButton(savedTheme);
    }
    
    /**
     * Update theme toggle button appearance
     * @param {string} theme - Current theme
     */
    updateThemeToggleButton(theme) {
        const themeButton = document.querySelector('.theme-toggle button');
        const themeIcon = themeButton ? themeButton.querySelector('i') : null;
        const themeTooltip = themeButton ? themeButton.querySelector('.tooltip-text') : null;
        
        if (themeIcon) {
            themeIcon.className = theme === 'light' 
                ? 'fas fa-moon' 
                : 'fas fa-sun';
        }
        
        if (themeTooltip) {
            themeTooltip.textContent = theme === 'light' 
                ? 'ダークモードに切り替え' 
                : 'ライトモードに切り替え';
        }
    }
    
    /**
     * Handle sending a message
     */
    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message && this.selectedFiles.length === 0) return;
        
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        // Disable input during processing
        this.userInput.disabled = true;
        this.sendButton.disabled = true;
        
        try {
            // Add user message to UI
            this.addMessage(message, 'user');
            
            // Clear input
            this.userInput.value = '';
            this.resizeTextarea();
            
            // Add message to memory
            memorySystem.addMessage({
                role: 'user',
                content: message
            });
            
            // Add processing message
            const processingMessageId = this.addMessage(CYGNOS_CONFIG.systemMessages.processingMessage, 'assistant', true);
            
            // Process files if any
            let fileContents = [];
            if (this.selectedFiles.length > 0) {
                for (const file of this.selectedFiles) {
                    try {
                        if (file.type.startsWith('image/')) {
                            // Handle image files (for multimodal requests)
                            fileContents.push(file);
                        } else {
                            // Handle text files
                            const content = await this.readFileContent(file);
                            fileContents.push({
                                name: file.name,
                                type: file.type,
                                content: content
                            });
                            
                            // Add file content to memory
                            memorySystem.addMemoryItem({
                                content: `File: ${file.name}\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`,
                                type: 'file',
                                source: 'user',
                                metadata: {
                                    filename: file.name,
                                    filetype: file.type
                                }
                            });
                        }
                    } catch (error) {
                        console.error('ファイル処理エラー:', error);
                    }
                }
                
                // Clear selected files
                this.selectedFiles = [];
            }
            
            // Check if API keys are set
            if (!settingsManager.hasRequiredApiKeys()) {
                // Remove processing message
                this.removeMessage(processingMessageId);
                
                // Add error message
                this.addMessage('API キーが設定されていません。設定から API キーを入力してください。', 'system');
                
                // Add to memory
                memorySystem.addMessage({
                    role: 'assistant',
                    content: 'API キーが設定されていません。設定から API キーを入力してください。'
                });
                
                // Open settings modal
                this.openSettings();
                return;
            }
            
            // Generate and execute plan based on user message
            await this.processUserRequest(message, processingMessageId, fileContents);
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            this.addMessage(`${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`, 'system');
            
            memorySystem.addMessage({
                role: 'assistant',
                content: `${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`
            });
        } finally {
            // Re-enable input
            this.userInput.disabled = false;
            this.sendButton.disabled = false;
            this.isProcessing = false;
            
            // Focus input
            this.userInput.focus();
        }
    }
    
    /**
     * Process user request and generate plan
     * @param {string} message - User message
     * @param {string} processingMessageId - Processing message ID
     * @param {Array} fileContents - Array of file contents
     */
    async processUserRequest(message, processingMessageId, fileContents) {
        try {
            // Generate plan
            const steps = await processorSystem.generatePlan(message);
            
            // Remove processing message
            this.removeMessage(processingMessageId);
            
            // Add plan steps to UI
            steps.forEach((step, index) => {
                this.addMessage(`ステップ ${index + 1}: ${step.title}\n${step.description}`, 'assistant');
            });
            
            // Execute first step
            await this.processNextStep();
        } catch (error) {
            console.error('計画生成エラー:', error);
            this.addMessage(`${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`, 'system');
            
            memorySystem.addMessage({
                role: 'assistant',
                content: `${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`
            });
        }
    }
    
    /**
     * Process next step in the plan
     */
    async processNextStep() {
        try {
            const result = await processorSystem.executeNextStep();
            
            // Add step result to UI
            this.addMessage(result.result, 'assistant');
            
            // Add result to memory
            memorySystem.addMessage({
                role: 'assistant',
                content: result.result
            });
            
            // Continue to next step if available
            if (result.status === 'paused') {
                this.addMessage('次のステップを実行するには「次へ」と入力してください。', 'system');
            } else if (result.status === 'completed') {
                this.addMessage('タスクが完了しました。', 'system');
            }
        } catch (error) {
            console.error('ステップ実行エラー:', error);
            this.addMessage(`${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`, 'system');
            
            memorySystem.addMessage({
                role: 'assistant',
                content: `${CYGNOS_CONFIG.systemMessages.errorMessage} (${error.message})`
            });
        }
    }
    
    /**
     * Add a message to the chat UI
     * @param {string} message - Message content
     * @param {string} role - Message role (user, assistant, system)
     * @param {boolean} isProcessing - Whether this is a processing message
     * @returns {string} - Message element ID
     */
    addMessage(message, role, isProcessing = false) {
        const messageId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        messageElement.id = messageId;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isProcessing) {
            messageContent.innerHTML = `<p>${message} <span class="loading-spinner"></span></p>`;
        } else if (role === 'user') {
            messageContent.textContent = message;
        } else {
            // Render markdown for assistant and system messages
            if (CYGNOS_CONFIG.ui.markdownRendering) {
                messageContent.innerHTML = this.renderMarkdown(message);
                
                // コードブロックにコピーボタンを追加
                this.addCopyButtonsToCodeBlocks(messageContent);
            } else {
                messageContent.textContent = message;
            }
        }
        
        messageElement.appendChild(messageContent);
        
        // Add timestamp
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        messageInfo.textContent = new Date().toLocaleTimeString();
        messageElement.appendChild(messageInfo);
        
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        return messageId;
    }
    
    /**
     * Scroll to the bottom of the chat container
     * @param {boolean} smooth - Whether to use smooth scrolling
     */
    scrollToBottom(smooth = false) {
        if (this.chatMessages) {
            if (smooth) {
                this.chatMessages.scrollTo({
                    top: this.chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            } else {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }
    }
    
    /**
     * Add copy buttons to code blocks in a message
     * @param {HTMLElement} messageContent - Message content element
     */
    addCopyButtonsToCodeBlocks(messageContent) {
        const codeBlocks = messageContent.querySelectorAll('.code-block');
        
        codeBlocks.forEach(block => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = 'コピー';
            
            copyButton.addEventListener('click', () => {
                const code = block.querySelector('pre').textContent;
                navigator.clipboard.writeText(code)
                    .then(() => {
                        // 一時的に成功表示
                        copyButton.textContent = 'コピーしました！';
                        setTimeout(() => {
                            copyButton.textContent = 'コピー';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('クリップボードへのコピーに失敗しました:', err);
                        copyButton.textContent = 'コピー失敗';
                        setTimeout(() => {
                            copyButton.textContent = 'コピー';
                        }, 2000);
                    });
            });
            
            block.appendChild(copyButton);
        });
    }
    
    /**
     * Remove a message from the chat UI
     * @param {string} messageId - Message element ID
     */
    removeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }
    
    /**
     * Clear the chat UI and memory
     */
    clearChat() {
        if (confirm('会話をクリアしますか？この操作は元に戻せません。')) {
            this.chatMessages.innerHTML = '';
            this.addMessage(CYGNOS_CONFIG.systemMessages.welcomeMessage, 'system');
            memorySystem.clearCurrentConversation();
            
            // 成功通知を表示
            this.showNotification('会話をクリアしました', 'success');
        }
    }
    
    /**
     * Export the current chat
     */
    exportChat() {
        try {
            memorySystem.exportData();
            this.showNotification('会話をエクスポートしました', 'success');
        } catch (error) {
            console.error('会話エクスポートエラー:', error);
            this.showNotification('会話のエクスポートに失敗しました', 'error');
        }
    }
    
    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     * @param {number} duration - Display duration in ms (default: 5000)
     */
    showNotification(message, type = 'info', duration = 5000) {
        // 古い通知を削除
        const oldNotifications = document.querySelectorAll('.notification');
        oldNotifications.forEach(notification => {
            notification.remove();
        });
        
        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // アイコンの設定
        let icon;
        switch (type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            default:
                icon = 'fas fa-info-circle';
        }
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span class="notification-message">${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // アニメーションのために少し遅らせて表示
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // 指定時間後に削除
        const timer = setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
        
        // クローズボタンを手動でクリックした場合はタイマーをクリア
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                clearTimeout(timer);
                notification.classList.remove('visible');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
        }
    }

    /**
     * Open file selector
     */
    openFileSelector() {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }
    
    /**
     * Handle file selection
     * @param {Event} event - File input change event
     */
    handleFileSelection(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this.selectedFiles = Array.from(files);
            this.showFilePreview();
        }
    }
    
    /**
     * Show file preview modal
     */
    showFilePreview() {
        if (!this.filePreviewContainer) return;
        
        this.filePreviewContainer.innerHTML = '';
        
        this.selectedFiles.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-preview-item';
            
            const fileIcon = document.createElement('i');
            fileIcon.className = this.getFileIconClass(file.type);
            
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('span');
            fileSize.className = 'file-size';
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileElement.appendChild(fileIcon);
            fileElement.appendChild(fileName);
            fileElement.appendChild(fileSize);
            
            this.filePreviewContainer.appendChild(fileElement);
        });
        
        this.openModal(this.filePreviewModal);
    }
    
    /**
     * Get file icon class based on file type
     * @param {string} fileType - File MIME type
     * @returns {string} - Icon class
     */
    getFileIconClass(fileType) {
        if (fileType.startsWith('image/')) {
            return 'fas fa-file-image';
        } else if (fileType.startsWith('video/')) {
            return 'fas fa-file-video';
        } else if (fileType.startsWith('audio/')) {
            return 'fas fa-file-audio';
        } else if (fileType === 'application/pdf') {
            return 'fas fa-file-pdf';
        } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return 'fas fa-file-word';
        } else if (fileType === 'application/vnd.ms-excel' || fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return 'fas fa-file-excel';
        } else if (fileType === 'application/vnd.ms-powerpoint' || fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            return 'fas fa-file-powerpoint';
        } else if (fileType.startsWith('text/')) {
            return 'fas fa-file-alt';
        } else {
            return 'fas fa-file';
        }
    }
    
    /**
     * Format file size to human-readable string
     * @param {number} size - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(size) {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        } else if (size < 1024 * 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        } else {
            return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        }
    }
    
    /**
     * Confirm file upload and close preview modal
     */
    confirmFileUpload() {
        this.closeModal(this.filePreviewModal);
        
        // Add file names to chat
        this.selectedFiles.forEach(file => {
            this.addMessage(`ファイルをアップロードしました: ${file.name}`, 'user');
        });
    }
    
    /**
     * Read file content as text
     * @param {File} file - File object
     * @returns {Promise<string>} - File content
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
    
    /**
     * Resize textarea based on content
     */
    resizeTextarea() {
        if (!this.userInput) return;
        
        this.userInput.style.height = 'auto';
        const newHeight = Math.min(this.userInput.scrollHeight, 150);
        this.userInput.style.height = newHeight + 'px';
        
        // モバイルでは高さの変更に合わせてscrollToBottomを呼び出し
        if (this.isMobile) {
            this.scrollToBottom();
        }
    }
    
    /**
     * Toggle voice input
     */
    toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showNotification('お使いのブラウザは音声入力をサポートしていません', 'error');
            return;
        }
        
        if (this.isListening) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    /**
     * Start voice input
     */
    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) return;
        
        this.recognition = new webkitSpeechRecognition();
        this.recognition.lang = 'ja-JP';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.voiceInputButton.classList.add('listening');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.userInput.value = transcript;
            this.resizeTextarea();
        };
        
        this.recognition.onerror = (event) => {
            console.error('音声入力エラー:', event.error);
            this.showNotification('音声入力中にエラーが発生しました', 'error');
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.voiceInputButton.classList.remove('listening');
        };
        
        this.recognition.start();
    }
    
    /**
     * Stop voice input
     */
    stopVoiceInput() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }
    
    /**
     * Toggle processing panel visibility
     */
    toggleProcessingPanel() {
        this.panelContent.classList.toggle('expanded');
        
        const icon = this.togglePanelButton.querySelector('i');
        if (icon) {
            if (this.panelContent.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
    }
    
    /**
     * Open settings modal and load current settings
     */
    openSettings() {
        // Load current settings
        this.settingsElements.geminiApiKey.value = settingsManager.getApiKey('gemini');
        this.settingsElements.openRouterApiKey.value = settingsManager.getApiKey('openRouter');
        this.settingsElements.autonomyLevel.value = settingsManager.getUserSetting('autonomyLevel');
        this.settingsElements.allowWebSearch.checked = settingsManager.getUserSetting('allowWebSearch');
        this.settingsElements.allowCodeExecution.checked = settingsManager.getUserSetting('allowCodeExecution');
        this.settingsElements.allowFileAccess.checked = settingsManager.getUserSetting('allowFileAccess');
        this.settingsElements.saveConversationHistory.checked = settingsManager.getUserSetting('saveConversationHistory');
        
        // Open modal
        this.openModal(this.settingsElements.modal);
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        // Update API keys
        settingsManager.updateApiKey('gemini', this.settingsElements.geminiApiKey.value.trim());
        settingsManager.updateApiKey('openRouter', this.settingsElements.openRouterApiKey.value.trim());
        
        // Update user settings
        settingsManager.updateUserSetting('autonomyLevel', this.settingsElements.autonomyLevel.value);
        settingsManager.updateUserSetting('allowWebSearch', this.settingsElements.allowWebSearch.checked);
        settingsManager.updateUserSetting('allowCodeExecution', this.settingsElements.allowCodeExecution.checked);
        settingsManager.updateUserSetting('allowFileAccess', this.settingsElements.allowFileAccess.checked);
        settingsManager.updateUserSetting('saveConversationHistory', this.settingsElements.saveConversationHistory.checked);
        
        // Close modal
        this.closeModal(this.settingsElements.modal);
        
        // Show confirmation notification
        this.showNotification('設定が保存されました', 'success');
    }
    
    /**
     * Open a modal
     * @param {HTMLElement} modal - Modal element
     */
    openModal(modal) {
        if (modal) {
            modal.classList.add('active');
            
            // モーダルが開いているときはbodyのスクロールを無効化
            document.body.style.overflow = 'hidden';
            
            // フォーカス管理
            const focusableElement = modal.querySelector('input, button, select, textarea');
            if (focusableElement) {
                setTimeout(() => {
                    focusableElement.focus();
                }, 100);
            }
        }
    }
    
    /**
     * Close a modal
     * @param {HTMLElement} modal - Modal element
     */
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            
            // bodyのスクロールを再有効化
            document.body.style.overflow = '';
            
            // ユーザー入力にフォーカスを戻す
            if (this.userInput) {
                this.userInput.focus();
            }
        }
    }
    
    /**
     * Setup markdown renderer
     * @returns {Function} - Markdown renderer function
     */
    setupMarkdownRenderer() {
        // 強化されたマークダウンレンダラー
        return (markdown) => {
            if (!markdown) return '';
            
            let html = markdown
                // コードブロック
                .replace(/```(.*?)\n([\s\S]*?)```/g, (match, lang, code) => {
                    return `<div class="code-block${lang ? ' language-' + lang : ''}"><pre>${this.escapeHtml(code.trim())}</pre></div>`;
                })
                // インラインコード
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                // 見出し
                .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                // 太字
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>')
                // 斜体
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/_(.*?)_/g, '<em>$1</em>')
                // リスト
                .replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li>$1</li>')
                .replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<li value="$1">$2</li>')
                // リストのラッピング
                .replace(/(<li>.*?<\/li>)(?!\s*<li>)/gs, '<ul>$1</ul>')
                .replace(/(<li value=.*?<\/li>)(?!\s*<li value=)/gs, '<ol>$1</ol>')
                // リンク
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                // 画像
                .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" title="$1" class="markdown-image">')
                // 水平線
                .replace(/^\s*---\s*$/gm, '<hr>')
                // 引用
                .replace(/^\>\s+(.*?)$/gm, '<blockquote>$1</blockquote>')
                // 段落
                .replace(/\n\n/g, '</p><p>');
            
            html = '<p>' + html + '</p>';
            
            // ネストした要素の修正
            html = html.replace(/<ul>(\s*<ul>)/g, '<ul>');
            html = html.replace(/(<\/ul>\s*)<\/ul>/g, '</ul>');
            html = html.replace(/<ol>(\s*<ol>)/g, '<ol>');
            html = html.replace(/(<\/ol>\s*)<\/ol>/g, '</ol>');
            
            // blockquoteの連結
            html = html.replace(/<\/blockquote><blockquote>/g, '<br>');
            
            // メッセージ内で会話の引用を適切に表示
            html = html.replace(/<p>User: (.*?)<\/p>/g, '<div class="quote-user"><strong>あなた:</strong> $1</div>');
            html = html.replace(/<p>Assistant: (.*?)<\/p>/g, '<div class="quote-assistant"><strong>AI:</strong> $1</div>');
            
            // すべてのコンテンツにmarkdownクラスを適用
            html = `<div class="markdown">${html}</div>`;
            
            return html;
        };
    }
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped HTML
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }
    
    /**
     * Render markdown to HTML
     * @param {string} markdown - Markdown text
     * @returns {string} - HTML
     */
    renderMarkdown(markdown) {
        return this.markdownRenderer(markdown);
    }
}

// Initialize UI Manager
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UiManager();
});
