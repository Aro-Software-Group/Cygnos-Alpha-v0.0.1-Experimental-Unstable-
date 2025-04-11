/**
 * Cygnos タスク管理システム
 * タスクの作成、編集、削除、状態管理を行います
 */
class TaskManager {
    constructor() {
        this.tasks = [];
        this.selectedTaskId = null;
        this.isProcessing = false;
        
        // DOM要素
        this.elements = {
            // タスクリスト関連
            taskList: document.getElementById('task-list-container'),
            emptyState: document.getElementById('empty-task-state'),
            quickTaskInput: document.getElementById('quick-task-input'),
            addTaskBtn: document.getElementById('add-task-btn'),
            createFirstTaskBtn: document.getElementById('create-first-task'),
            
            // タスク詳細表示関連
            currentTaskTitle: document.getElementById('current-task-title'),
            taskStatusBadge: document.getElementById('task-status-badge'),
            taskChatMessages: document.getElementById('task-chat-messages'),
            taskUserInput: document.getElementById('task-user-input'),
            taskSendMessage: document.getElementById('task-send-message'),
            
            // フィルター関連
            searchInput: document.getElementById('search-tasks'),
            filterStatus: document.getElementById('filter-status'),
            filterPriority: document.getElementById('filter-priority'),
            
            // モーダル関連
            taskModal: document.getElementById('task-modal'),
            taskModalTitle: document.getElementById('task-modal-title'),
            taskForm: document.getElementById('task-form'),
            taskIdInput: document.getElementById('task-id'),
            taskTitleInput: document.getElementById('task-title'),
            taskDescriptionInput: document.getElementById('task-description'),
            taskAiInstructionsInput: document.getElementById('task-ai-instructions'),
            taskDueDateInput: document.getElementById('task-due-date'),
            taskPriorityInput: document.getElementById('task-priority'),
            saveTaskBtn: document.getElementById('save-task'),
            cancelTaskBtn: document.getElementById('cancel-task'),
            
            // 処理パネル関連
            processSteps: document.getElementById('process-steps'),
            togglePanelBtn: document.getElementById('toggle-panel'),
            panelContent: document.querySelector('.panel-content')
        };
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // 初期データの読み込み
        this.loadTasks();
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // クイックタスク追加
        this.elements.addTaskBtn.addEventListener('click', () => this.openTaskModal());
        
        // クイック追加ボタン（ビジュアル設定した追加ボタン）
        const quickAddBtn = document.querySelector('.quick-add-btn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => this.handleQuickTaskAdd());
        }
        
        this.elements.quickTaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleQuickTaskAdd();
            }
        });
        
        // 最初のタスク作成ボタン
        if (this.elements.createFirstTaskBtn) {
            this.elements.createFirstTaskBtn.addEventListener('click', () => this.openTaskModal());
        }
        
        // タスク保存・キャンセル
        this.elements.saveTaskBtn.addEventListener('click', () => this.saveTask());
        this.elements.cancelTaskBtn.addEventListener('click', () => this.closeTaskModal());
        
        // フィルター適用
        this.elements.searchInput.addEventListener('input', () => this.applyFilters());
        this.elements.filterStatus.addEventListener('change', () => this.applyFilters());
        this.elements.filterPriority.addEventListener('change', () => this.applyFilters());
        
        // タスクメッセージ送信
        this.elements.taskSendMessage.addEventListener('click', () => this.sendTaskMessage());
        this.elements.taskUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTaskMessage();
            }
        });
        
        // 処理パネルの切り替え
        this.elements.togglePanelBtn.addEventListener('click', () => {
            this.elements.panelContent.classList.toggle('expanded');
            const icon = this.elements.togglePanelBtn.querySelector('i');
            if (icon) {
                icon.className = this.elements.panelContent.classList.contains('expanded') 
                    ? 'fas fa-chevron-up' 
                    : 'fas fa-chevron-down';
            }
        });
        
        // モーダルを閉じる
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => this.closeTaskModal());
        });
        
        // モーダル外クリックで閉じる
        this.elements.taskModal.addEventListener('click', (e) => {
            if (e.target === this.elements.taskModal) {
                this.closeTaskModal();
            }
        });
    }
    
    /**
     * タスクデータをロード
     */
    loadTasks() {
        // ローカルストレージからタスクデータを取得
        const savedTasks = localStorage.getItem('cygnos_tasks');
        
        if (savedTasks) {
            try {
                this.tasks = JSON.parse(savedTasks);
                // タスクを日付順で並べ替え
                this.sortTasks();
                this.renderTaskList();
            } catch (error) {
                console.error('タスクデータの読み込みに失敗しました:', error);
                this.tasks = [];
            }
        } else {
            this.tasks = [];
        }
        
        // 最初のタスクを選択（存在する場合）
        if (this.tasks.length > 0) {
            this.selectTask(this.tasks[0].id);
        }
        
        // 空の状態の表示を更新
        this.updateEmptyState();
    }
    
    /**
     * タスクデータを保存
     */
    saveTasks() {
        localStorage.setItem('cygnos_tasks', JSON.stringify(this.tasks));
    }
    
    /**
     * タスクリストを並べ替え
     */
    sortTasks() {
        // デフォルトは更新日時の降順
        this.tasks.sort((a, b) => {
            // 優先事項: ステータス（進行中を上位に）
            const statusOrder = {
                'in-progress': 0,
                'pending': 1,
                'paused': 2,
                'completed': 3,
                'failed': 4,
                'cancelled': 5
            };
            
            const statusCompare = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusCompare !== 0) return statusCompare;
            
            // 次に優先度
            const priorityOrder = {
                'high': 0,
                'normal': 1,
                'low': 2
            };
            
            const priorityCompare = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
            if (priorityCompare !== 0) return priorityCompare;
            
            // 最後に更新日時
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }
    
    /**
     * タスクリストを描画
     */
    renderTaskList() {
        if (!this.elements.taskList) return;
        
        // タスクリストをクリア
        this.elements.taskList.innerHTML = '';
        
        // フィルタリングされたタスクを取得
        const filteredTasks = this.getFilteredTasks();
        
        // 表示するタスクがない場合
        if (filteredTasks.length === 0) {
            this.updateEmptyState(true);
            return;
        }
        
        // 空の状態を非表示
        this.updateEmptyState(false);
        
        // タスクリストの作成
        const taskListElement = document.createElement('div');
        taskListElement.className = 'task-list';
        this.elements.taskList.appendChild(taskListElement);
        
        // タスクアイテムを追加
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskListElement.appendChild(taskElement);
        });
    }
    
    /**
     * タスク要素を作成
     * @param {Object} task タスクデータ
     * @returns {HTMLElement} タスク要素
     */
    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.status}`;
        taskElement.dataset.taskId = task.id;
        
        if (this.selectedTaskId === task.id) {
            taskElement.classList.add('active');
        }
        
        // タスクのステータスに応じたアイコン
        let statusIcon = '';
        switch (task.status) {
            case 'pending':
                statusIcon = '<i class="fas fa-hourglass-half"></i>';
                break;
            case 'in-progress':
                statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
                break;
            case 'completed':
                statusIcon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'failed':
                statusIcon = '<i class="fas fa-times-circle"></i>';
                break;
            case 'paused':
                statusIcon = '<i class="fas fa-pause-circle"></i>';
                break;
            case 'cancelled':
                statusIcon = '<i class="fas fa-ban"></i>';
                break;
            default:
                statusIcon = '<i class="fas fa-circle"></i>';
        }
        
        // 優先度に応じたクラス
        const priorityClass = task.priority || 'normal';
        
        // 説明がない場合のプレースホルダー
        const description = task.description || '説明はありません';
        
        // AI指示がない場合のプレースホルダー
        const aiInstructions = task.aiInstructions || 'AI指示はありません';
        
        // 期限の表示形式
        let dueDateDisplay = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // 今日、明日、または日付を表示
            if (dueDate.toDateString() === today.toDateString()) {
                dueDateDisplay = '今日';
            } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                dueDateDisplay = '明日';
            } else {
                dueDateDisplay = dueDate.toLocaleDateString('ja-JP');
            }
        } else {
            dueDateDisplay = '期限なし';
        }
        
        // 更新日時の表示形式
        const updatedAt = new Date(task.updatedAt).toLocaleString('ja-JP');
        
        // タスク要素のHTML
        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-title-container">
                    <div class="task-status ${task.status}">
                        ${statusIcon}
                    </div>
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-priority ${priorityClass}">
                        ${task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中'}
                    </span>
                </div>
                <div class="task-actions">
                    <button class="run-task" title="タスクを実行">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="edit-task" title="タスクを編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-task" title="タスクを削除">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="task-details">
                <div class="task-detail">
                    <i class="far fa-calendar-alt"></i>
                    <span>${dueDateDisplay}</span>
                </div>
                <div class="task-detail">
                    <i class="far fa-clock"></i>
                    <span>${updatedAt}</span>
                </div>
            </div>
            <div class="task-description">${description}</div>
            <div class="task-ai-instructions">
                <i class="fas fa-robot"></i> ${aiInstructions}
            </div>
        `;
        
        // クリックイベントの設定
        taskElement.addEventListener('click', (e) => {
            // アクションボタン以外がクリックされた場合
            if (!e.target.closest('.task-actions')) {
                this.selectTask(task.id);
            }
        });
        
        // 実行ボタン
        const runTaskBtn = taskElement.querySelector('.run-task');
        if (runTaskBtn) {
            runTaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.runTask(task.id);
            });
        }
        
        // 編集ボタン
        const editTaskBtn = taskElement.querySelector('.edit-task');
        if (editTaskBtn) {
            editTaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTaskModal(task.id);
            });
        }
        
        // 削除ボタン
        const deleteTaskBtn = taskElement.querySelector('.delete-task');
        if (deleteTaskBtn) {
            deleteTaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(task.id);
            });
        }
        
        return taskElement;
    }
    
    /**
     * フィルター適用後のタスクを取得
     * @returns {Array} フィルター適用後のタスク配列
     */
    getFilteredTasks() {
        // 検索条件
        const searchTerm = this.elements.searchInput ? this.elements.searchInput.value.toLowerCase() : '';
        const statusFilter = this.elements.filterStatus ? this.elements.filterStatus.value : 'all';
        const priorityFilter = this.elements.filterPriority ? this.elements.filterPriority.value : 'all';
        
        return this.tasks.filter(task => {
            // 検索フィルター
            const matchesSearch = 
                task.title.toLowerCase().includes(searchTerm) || 
                (task.description && task.description.toLowerCase().includes(searchTerm)) ||
                (task.aiInstructions && task.aiInstructions.toLowerCase().includes(searchTerm));
            
            // ステータスフィルター
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            
            // 優先度フィルター
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            
            return matchesSearch && matchesStatus && matchesPriority;
        });
    }
    
    /**
     * フィルターを適用してタスクリストを更新
     */
    applyFilters() {
        this.renderTaskList();
    }
    
    /**
     * 空の状態表示を更新
     */
    updateEmptyState(isEmpty = false) {
        if (!this.elements.emptyState) return;
        
        if (isEmpty) {
            this.elements.emptyState.style.display = 'flex';
        } else {
            this.elements.emptyState.style.display = 'none';
        }
    }
    
    /**
     * タスクを選択
     * @param {string} taskId タスクID
     */
    selectTask(taskId) {
        if (this.isProcessing) return;
        
        this.selectedTaskId = taskId;
        
        // すべてのタスク項目から active クラスを削除
        document.querySelectorAll('.task-item').forEach(el => {
            el.classList.remove('active');
        });
        
        // 選択されたタスク項目に active クラスを追加
        const selectedElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        if (selectedElement) {
            selectedElement.classList.add('active');
        }
        
        // タスクの詳細情報を表示
        this.displayTaskDetails(taskId);
    }
    
    /**
     * タスク詳細を表示
     * @param {string} taskId タスクID
     */
    displayTaskDetails(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // タスクタイトルの表示
        this.elements.currentTaskTitle.textContent = task.title;
        
        // ステータスバッジの更新
        let statusText = '';
        let statusIcon = '';
        
        switch (task.status) {
            case 'pending':
                statusText = '保留中';
                statusIcon = '<i class="fas fa-circle"></i>';
                break;
            case 'in-progress':
                statusText = '進行中';
                statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
                break;
            case 'completed':
                statusText = '完了';
                statusIcon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'failed':
                statusText = '失敗';
                statusIcon = '<i class="fas fa-times-circle"></i>';
                break;
            case 'paused':
                statusText = '一時停止';
                statusIcon = '<i class="fas fa-pause-circle"></i>';
                break;
            case 'cancelled':
                statusText = 'キャンセル';
                statusIcon = '<i class="fas fa-ban"></i>';
                break;
            default:
                statusText = '未定義';
                statusIcon = '<i class="fas fa-question-circle"></i>';
        }
        
        this.elements.taskStatusBadge.className = `task-status-badge ${task.status}`;
        this.elements.taskStatusBadge.innerHTML = `${statusIcon} <span>${statusText}</span>`;
        
        // チャットメッセージの表示
        this.elements.taskChatMessages.innerHTML = '';
        
        if (task.messages && task.messages.length > 0) {
            task.messages.forEach(message => {
                this.addMessageToChat(message.content, message.role);
            });
            
            // スクロールを一番下に
            this.elements.taskChatMessages.scrollTop = this.elements.taskChatMessages.scrollHeight;
        } else {
            // メッセージがない場合の初期表示
            this.elements.taskChatMessages.innerHTML = `
                <div class="message system">
                    <div class="message-content">
                        <p>タスク「${task.title}」が開始されました。</p>
                        <p>AIエージェントに具体的な指示を送ってタスクを進めてください。</p>
                    </div>
                    <div class="message-info">${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        }
        
        // 処理ステップの表示更新
        this.displayProcessSteps(task);
        
        // 入力欄を有効化
        this.elements.taskUserInput.disabled = false;
        this.elements.taskSendMessage.disabled = false;
    }
    
    /**
     * 処理ステップを表示
     * @param {Object} task タスクデータ
     */
    displayProcessSteps(task) {
        if (!this.elements.processSteps) return;
        
        this.elements.processSteps.innerHTML = '';
        
        if (!task.steps || task.steps.length === 0) {
            this.elements.processSteps.innerHTML = `
                <div class="empty-state" style="padding: 10px;">
                    <p>まだ処理ステップはありません</p>
                </div>
            `;
            return;
        }
        
        task.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'process-step';
            
            let iconClass = 'pending';
            if (index < task.currentStepIndex) {
                iconClass = 'completed';
            } else if (index === task.currentStepIndex) {
                iconClass = 'current';
            }
            
            stepElement.innerHTML = `
                <div class="process-step-icon ${iconClass}">
                    ${iconClass === 'completed' ? '<i class="fas fa-check"></i>' : 
                      iconClass === 'current' ? '<i class="fas fa-cog fa-spin"></i>' : 
                      '<i class="fas fa-circle"></i>'}
                </div>
                <div class="process-step-text">
                    ${step.name}
                </div>
            `;
            
            this.elements.processSteps.appendChild(stepElement);
        });
    }
    
    /**
     * クイックタスク追加を処理
     */
    handleQuickTaskAdd() {
        const input = this.elements.quickTaskInput;
        if (!input) return;
        
        const value = input.value.trim();
        if (value) {
            const taskData = {
                title: value,
                description: '',
                dueDate: '',
                priority: 'normal',
                aiInstructions: '',
                status: 'pending'
            };
            
            this.createTask(taskData);
            input.value = '';
            input.focus();
        }
    }
    
    /**
     * タスクモーダルを開く
     * @param {string} taskId 編集するタスクのID（省略時は新規作成）
     */
    openTaskModal(taskId = null) {
        // モーダルのリセット
        this.elements.taskForm.reset();
        
        if (taskId) {
            // 既存タスクの編集
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            this.elements.taskModalTitle.textContent = 'タスクを編集';
            this.elements.taskIdInput.value = task.id;
            this.elements.taskTitleInput.value = task.title;
            this.elements.taskDescriptionInput.value = task.description || '';
            this.elements.taskAiInstructionsInput.value = task.aiInstructions || '';
            this.elements.taskDueDateInput.value = task.dueDate || '';
            this.elements.taskPriorityInput.value = task.priority || 'normal';
        } else {
            // 新規タスク作成
            this.elements.taskModalTitle.textContent = '新規タスク';
            this.elements.taskIdInput.value = '';
            
            // 今日の日付を設定
            const today = new Date().toISOString().split('T')[0];
            this.elements.taskDueDateInput.value = today;
        }
        
        // モーダルを表示
        this.elements.taskModal.classList.add('active');
    }
    
    /**
     * タスクモーダルを閉じる
     */
    closeTaskModal() {
        this.elements.taskModal.classList.remove('active');
    }
    
    /**
     * タスクを保存
     */
    saveTask() {
        // バリデーション
        const title = this.elements.taskTitleInput.value.trim();
        if (!title) {
            this.showNotification('タスク名を入力してください', 'error');
            return;
        }
        
        const taskId = this.elements.taskIdInput.value;
        const isNewTask = !taskId;
        
        // タスクデータの取得
        const taskData = {
            title: title,
            description: this.elements.taskDescriptionInput.value.trim(),
            aiInstructions: this.elements.taskAiInstructionsInput.value.trim(),
            dueDate: this.elements.taskDueDateInput.value,
            priority: this.elements.taskPriorityInput.value
        };
        
        if (isNewTask) {
            // 新規タスク作成
            const newTask = this.createTask(taskData);
            this.tasks.unshift(newTask);
            this.showNotification('新しいタスクを作成しました', 'success');
            
            // 新しいタスクを選択
            this.selectTask(newTask.id);
        } else {
            // 既存タスク更新
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;
            
            // タスクを更新（ステータスと既存メッセージは保持）
            const updatedTask = {
                ...this.tasks[taskIndex],
                ...taskData,
                updatedAt: new Date().toISOString()
            };
            
            this.tasks[taskIndex] = updatedTask;
            this.showNotification('タスクを更新しました', 'success');
            
            // 更新したタスクの表示も更新
            if (this.selectedTaskId === taskId) {
                this.displayTaskDetails(taskId);
            }
        }
        
        // タスクを保存して表示を更新
        this.saveTasks();
        this.sortTasks();
        this.renderTaskList();
        
        // モーダルを閉じる
        this.closeTaskModal();
    }
    
    /**
     * 新しいタスクオブジェクトを作成
     * @param {Object} taskData タスクデータ
     * @returns {Object} タスクオブジェクト
     */
    createTask(taskData) {
        const now = new Date().toISOString();
        return {
            id: 'task_' + Math.random().toString(36).substr(2, 9),
            title: taskData.title,
            description: taskData.description || '',
            aiInstructions: taskData.aiInstructions || '',
            status: 'pending',
            priority: taskData.priority || 'normal',
            dueDate: taskData.dueDate || null,
            createdAt: now,
            updatedAt: now,
            messages: [],
            steps: [],
            currentStepIndex: 0,
            aiResponses: []
        };
    }
    
    /**
     * タスクを削除
     * @param {string} taskId 削除するタスクのID
     */
    deleteTask(taskId) {
        if (!confirm('このタスクを削除してもよろしいですか？この操作は元に戻せません。')) {
            return;
        }
        
        // タスクを配列から削除
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        this.tasks.splice(taskIndex, 1);
        
        // タスクを保存して表示を更新
        this.saveTasks();
        this.renderTaskList();
        
        // 削除したタスクが選択中だった場合
        if (this.selectedTaskId === taskId) {
            // 別のタスクを選択するか、空の状態を表示
            if (this.tasks.length > 0) {
                this.selectTask(this.tasks[0].id);
            } else {
                this.selectedTaskId = null;
                this.elements.currentTaskTitle.textContent = 'タスクを選択してください';
                this.elements.taskStatusBadge.className = 'task-status-badge';
                this.elements.taskStatusBadge.innerHTML = '<i class="fas fa-circle"></i> <span>未選択</span>';
                
                // チャットメッセージをクリア
                this.elements.taskChatMessages.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-robot"></i>
                        <h3>タスクが選択されていません</h3>
                        <p>左側のリストからタスクを選択するか、新しいタスクを作成してください。</p>
                    </div>
                `;
                
                // 入力欄を無効化
                this.elements.taskUserInput.disabled = true;
                this.elements.taskSendMessage.disabled = true;
            }
        }
        
        this.showNotification('タスクを削除しました', 'success');
    }
    
    /**
     * タスクを実行
     * @param {string} taskId 実行するタスクのID
     */
    runTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // タスクのステータスを「進行中」に変更
        task.status = 'in-progress';
        task.updatedAt = new Date().toISOString();
        
        // タスクを選択して表示
        this.selectTask(taskId);
        
        // AIからの最初の応答を追加
        const startMessage = {
            role: 'assistant',
            content: `タスク「${task.title}」を開始します。どのようにお手伝いしましょうか？`
        };
        
        // メッセージをタスクに追加
        if (!task.messages) task.messages = [];
        task.messages.push(startMessage);
        
        // UIにメッセージを表示
        this.addMessageToChat(startMessage.content, startMessage.role);
        
        // タスクの実行ステップを設定
        task.steps = [
            { name: 'タスクの理解', status: 'completed' },
            { name: '情報収集', status: 'current' },
            { name: '実行計画の策定', status: 'pending' },
            { name: 'タスクの実行', status: 'pending' },
            { name: '結果の確認と修正', status: 'pending' },
            { name: 'タスクの完了', status: 'pending' }
        ];
        task.currentStepIndex = 1;
        
        // 処理ステップを表示
        this.displayProcessSteps(task);
        
        // AIの指示があれば、その内容も表示
        if (task.aiInstructions) {
            setTimeout(() => {
                const instructionMessage = {
                    role: 'assistant',
                    content: `以下の指示に基づいて作業を進めます：\n\n"${task.aiInstructions}"`
                };
                
                // メッセージをタスクに追加
                task.messages.push(instructionMessage);
                
                // UIにメッセージを表示
                this.addMessageToChat(instructionMessage.content, instructionMessage.role);
                
                // タスクを保存
                this.saveTasks();
                this.renderTaskList();
            }, 1000);
        }
        
        // タスクを保存
        this.saveTasks();
        this.renderTaskList();
    }
    
    /**
     * タスクメッセージを送信
     */
    async sendTaskMessage() {
        if (this.isProcessing || !this.selectedTaskId) return;
        
        const message = this.elements.taskUserInput.value.trim();
        if (!message) return;
        
        // 処理中フラグを設定
        this.isProcessing = true;
        this.elements.taskUserInput.disabled = true;
        this.elements.taskSendMessage.disabled = true;
        
        // タスクの取得
        const task = this.tasks.find(t => t.id === this.selectedTaskId);
        if (!task) {
            this.isProcessing = false;
            return;
        }
        
        // ステータスが「保留中」の場合は「進行中」に変更
        if (task.status === 'pending') {
            task.status = 'in-progress';
            this.renderTaskList();
        }
        
        // 送信時間を更新
        task.updatedAt = new Date().toISOString();
        
        // ユーザーメッセージをUIに追加
        this.addMessageToChat(message, 'user');
        
        // ユーザーメッセージをタスクに追加
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        
        if (!task.messages) task.messages = [];
        task.messages.push(userMessage);
        
        // 入力欄をクリア
        this.elements.taskUserInput.value = '';
        
        try {
            // 処理メッセージを追加
            const processingMessageId = this.addMessageToChat('考えています...', 'assistant', true);
            
            // AI応答の生成（模擬的な遅延）
            setTimeout(() => {
                // 処理メッセージを削除
                this.removeMessage(processingMessageId);
                
                // AI応答の生成（実際にはAPIを呼び出す）
                const aiResponse = this.generateAIResponse(task, message);
                
                // AI応答をUIに追加
                this.addMessageToChat(aiResponse, 'assistant');
                
                // AI応答をタスクに追加
                const assistantMessage = {
                    role: 'assistant',
                    content: aiResponse,
                    timestamp: new Date().toISOString()
                };
                
                task.messages.push(assistantMessage);
                
                // 必要に応じてタスクの進行状況を更新
                this.updateTaskProgress(task);
                
                // タスクを保存
                this.saveTasks();
                this.renderTaskList();
                
                // 処理完了
                this.isProcessing = false;
                this.elements.taskUserInput.disabled = false;
                this.elements.taskSendMessage.disabled = false;
                this.elements.taskUserInput.focus();
            }, 2000);
        } catch (error) {
            console.error('タスクメッセージ送信エラー:', error);
            
            // エラーメッセージを表示
            this.addMessageToChat('メッセージの処理中にエラーが発生しました。もう一度お試しください。', 'system');
            
            // 処理完了
            this.isProcessing = false;
            this.elements.taskUserInput.disabled = false;
            this.elements.taskSendMessage.disabled = false;
        }
    }
    
    /**
     * チャットにメッセージを追加
     * @param {string} message メッセージ内容
     * @param {string} role メッセージの役割（user, assistant, system）
     * @param {boolean} isProcessing 処理中メッセージかどうか
     * @returns {string} メッセージのID
     */
    addMessageToChat(message, role, isProcessing = false) {
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
            // マークダウンレンダリング（簡易版）
            messageContent.innerHTML = this.renderMarkdown(message);
            
            // コードブロックにコピーボタンを追加
            this.addCopyButtonsToCodeBlocks(messageContent);
        }
        
        messageElement.appendChild(messageContent);
        
        // タイムスタンプを追加
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        messageInfo.textContent = new Date().toLocaleTimeString();
        messageElement.appendChild(messageInfo);
        
        this.elements.taskChatMessages.appendChild(messageElement);
        
        // 一番下にスクロール
        this.elements.taskChatMessages.scrollTop = this.elements.taskChatMessages.scrollHeight;
        
        return messageId;
    }
    
    /**
     * メッセージを削除
     * @param {string} messageId メッセージID
     */
    removeMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            messageElement.remove();
        }
    }
    
    /**
     * コードブロックにコピーボタンを追加
     * @param {HTMLElement} contentElement メッセージ内容要素
     */
    addCopyButtonsToCodeBlocks(contentElement) {
        const codeBlocks = contentElement.querySelectorAll('.code-block');
        
        codeBlocks.forEach(block => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = 'コピー';
            
            copyButton.addEventListener('click', () => {
                const code = block.querySelector('pre').textContent;
                navigator.clipboard.writeText(code)
                    .then(() => {
                        // 成功表示
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
     * マークダウンをHTMLにレンダリング（簡易版）
     * @param {string} text マークダウンテキスト
     * @returns {string} HTML
     */
    renderMarkdown(text) {
        if (!text) return '';
        
        // 簡易マークダウンパーサー
        let html = text
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
            // 段落
            .replace(/\n\n/g, '</p><p>');
        
        html = '<p>' + html + '</p>';
        
        // ネストした要素の修正
        html = html.replace(/<ul>(\s*<ul>)/g, '<ul>');
        html = html.replace(/(<\/ul>\s*)<\/ul>/g, '</ul>');
        html = html.replace(/<ol>(\s*<ol>)/g, '<ol>');
        html = html.replace(/(<\/ol>\s*)<\/ol>/g, '</ol>');
        
        return html;
    }
    
    /**
     * HTML特殊文字をエスケープ
     * @param {string} text エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }
    
    /**
     * タスクの進行状況を更新
     * @param {Object} task タスクオブジェクト
     */
    updateTaskProgress(task) {
        // タスクに進行ステップがなければ作成
        if (!task.steps || task.steps.length === 0) {
            task.steps = [
                { name: 'タスクの理解', status: 'completed' },
                { name: '情報収集', status: 'current' },
                { name: '実行計画の策定', status: 'pending' },
                { name: 'タスクの実行', status: 'pending' },
                { name: '結果の確認と修正', status: 'pending' },
                { name: 'タスクの完了', status: 'pending' }
            ];
            task.currentStepIndex = 1;
        }
        
        // メッセージの数に応じて進行ステップを更新
        // 実際のアプリケーションでは、AIの応答内容に基づいてステップを更新するロジックを実装
        const messageCount = task.messages.length;
        
        if (messageCount >= 4 && task.currentStepIndex < 2) {
            task.currentStepIndex = 2;
            task.steps[1].status = 'completed';
            task.steps[2].status = 'current';
        } else if (messageCount >= 6 && task.currentStepIndex < 3) {
            task.currentStepIndex = 3;
            task.steps[2].status = 'completed';
            task.steps[3].status = 'current';
        } else if (messageCount >= 8 && task.currentStepIndex < 4) {
            task.currentStepIndex = 4;
            task.steps[3].status = 'completed';
            task.steps[4].status = 'current';
        } else if (messageCount >= 10 && task.currentStepIndex < 5) {
            task.currentStepIndex = 5;
            task.steps[4].status = 'completed';
            task.steps[5].status = 'current';
            
            // 最後のステップに到達したら、完了の提案を表示
            setTimeout(() => {
                this.addMessageToChat('タスクが完了に近づいています。満足できる結果が得られたら、タスクを完了としてマークしてください。', 'system');
            }, 1000);
        }
        
        // 処理ステップ表示を更新
        this.displayProcessSteps(task);
    }
    
    /**
     * AI応答を生成（デモ用）
     * @param {Object} task タスク
     * @param {string} userMessage ユーザーメッセージ
     * @returns {string} AI応答
     */
    generateAIResponse(task, userMessage) {
        // 実際のアプリケーションでは、AIモデルに対してAPIリクエストを行う
        // ここではデモのため、簡単な応答を返す
        
        const responses = [
            `「${task.title}」タスクについて理解しました。詳細な計画を立てましょう。\n\n1. 問題の分析\n2. 解決策の提案\n3. 実行計画の作成\n\nどの部分から取り組みましょうか？`,
            
            `承知しました。このタスクには以下の情報が必要そうです：\n\n- 期限：${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '設定なし'}\n- 優先度：${task.priority}\n\n具体的にどのような成果物を期待されていますか？`,
            
            `素晴らしい進捗です。以下のアプローチを提案します：\n\n\`\`\`\n1. まず${task.title}のための情報収集\n2. 収集した情報の分析\n3. 実装方針の決定\n4. テストと検証\n\`\`\`\n\nこのアプローチでよろしいでしょうか？`,
            
            `以下のリソースが参考になるかもしれません：\n\n- [公式ドキュメント](https://example.com/docs)\n- [チュートリアル](https://example.com/tutorial)\n\n何か特定の部分で詳細が必要であれば教えてください。`,
            
            `タスクの実行中です...\n\n中間結果をいくつか共有します：\n\n* 第一段階が完了しました\n* 次の段階に進んでいます\n* 予想通りの進捗状況です\n\n何か調整が必要でしょうか？`,
            
            `コードサンプルを作成しました：\n\n\`\`\`javascript\nfunction processTask(taskId) {\n  // タスク処理ロジック\n  console.log('Processing task:', taskId);\n  return true;\n}\n\`\`\`\n\nこれをどのように実装するか提案があれば教えてください。`,
            
            `タスクの進捗状況：\n\n- [x] 要件分析\n- [x] 解決策の設計\n- [ ] 実装\n- [ ] テスト\n- [ ] 文書化\n\n現在実装段階に取り組んでいます。何か優先すべき部分はありますか？`,
            
            `フィードバックに基づいて以下の修正を行いました：\n\n1. パフォーマンスの改善\n2. ユーザーインターフェースの調整\n3. ドキュメントの追加\n\n他に修正が必要な点はありますか？`,
            
            `タスクがほぼ完了しました。以下が最終的な成果です：\n\n* すべての要件を満たしています\n* テストが完了しました\n* ドキュメントが整備されています\n\n最終確認をお願いします。`
        ];
        
        // メッセージの数に基づいて応答を選択（循環）
        const messageIndex = (task.messages.length - 1) % responses.length;
        return responses[messageIndex];
    }
    
    /**
     * 通知を表示
     * @param {string} message 通知メッセージ
     * @param {string} type 通知タイプ（success, error, info, warning）
     * @param {number} duration 表示時間（ミリ秒）
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 既存の通知を削除
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });
        
        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i>';
        }
        
        notification.innerHTML = `
            ${icon}
            <span class="notification-message">${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // 表示アニメーション
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // 自動的に非表示
        const timer = setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
        
        // 閉じるボタン
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            clearTimeout(timer);
            notification.classList.remove('visible');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }
}

// タスクマネージャーのインスタンス化
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});