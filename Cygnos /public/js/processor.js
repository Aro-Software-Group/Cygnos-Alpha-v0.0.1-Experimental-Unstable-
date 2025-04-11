/**
 * Cygnos Processor System
 * Handles task planning, reasoning, and execution
 */

class ProcessorSystem {
    constructor() {
        this.currentTask = null;
        this.steps = [];
        this.currentStepIndex = -1;
        this.isProcessing = false;
        this.processStepsElement = document.getElementById('process-steps');
    }

    /**
     * Initialize a new task
     * @param {string} taskDescription - Description of the task
     * @returns {Object} - Task object
     */
    initTask(taskDescription) {
        this.currentTask = {
            id: this._generateId(),
            description: taskDescription,
            status: 'planning',
            startTime: new Date().toISOString(),
            endTime: null,
            result: null
        };
        
        this.steps = [];
        this.currentStepIndex = -1;
        this._renderProcessingSteps();
        
        return this.currentTask;
    }

    /**
     * Generate a plan for the current task
     * @param {string} userInput - User input
     * @returns {Promise<Array>} - Array of steps
     */
    async generatePlan(userInput) {
        if (!this.currentTask) {
            this.initTask(userInput);
        }
        
        this.isProcessing = true;
        this._updateTaskStatus('planning');
        
        try {
            // Add planning step
            const planningStep = {
                id: this._generateId(),
                title: 'タスクの計画',
                description: 'タスクを分析して実行計画を生成しています',
                status: 'running',
                startTime: new Date().toISOString(),
                endTime: null,
                result: null
            };
            
            this.steps.push(planningStep);
            this.currentStepIndex = 0;
            this._renderProcessingSteps();
            
            // Get context from memory
            const recentMessages = memorySystem.getMessagesForContext();
            const relevantMemory = memorySystem.getRelevantMemory(userInput, 3);
            
            // Prepare planning prompt
            const planningPrompt = this._createPlanningPrompt(userInput, recentMessages, relevantMemory);
            
            // Call API with planning prompt
            const response = await apiService.sendRequest({
                prompt: planningPrompt,
                systemPrompt: SYSTEM_PROMPTS.planning
            });
            
            // Parse steps from response
            const plan = this._parsePlanFromResponse(response.text);
            
            // Update planning step status
            planningStep.status = 'completed';
            planningStep.endTime = new Date().toISOString();
            planningStep.result = `${plan.length} ステップの計画を生成しました`;
            
            // Add steps from plan
            plan.forEach(stepInfo => {
                this.steps.push({
                    id: this._generateId(),
                    title: stepInfo.title,
                    description: stepInfo.description,
                    status: 'waiting',
                    startTime: null,
                    endTime: null,
                    result: null,
                    requires_confirmation: stepInfo.requires_confirmation || false
                });
            });
            
            this._renderProcessingSteps();
            this._updateTaskStatus('ready');
            
            return this.steps;
        } catch (error) {
            console.error('計画生成エラー:', error);
            
            if (this.steps.length > 0) {
                this.steps[0].status = 'error';
                this.steps[0].endTime = new Date().toISOString();
                this.steps[0].result = `エラー: ${error.message}`;
            }
            
            this._renderProcessingSteps();
            this._updateTaskStatus('error');
            
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Begin executing the plan
     * @param {boolean} autoExecute - Whether to automatically execute all steps
     * @returns {Promise<Object>} - Execution result
     */
    async executePlan(autoExecute = false) {
        if (!this.currentTask || this.steps.length <= 1) {
            throw new Error('実行可能な計画がありません');
        }
        
        this._updateTaskStatus('executing');
        
        // Skip planning step
        this.currentStepIndex = 1;
        
        try {
            await this._executeCurrentStep();
            
            // If autoExecute is true and autonomy level is high, continue executing steps
            if (autoExecute && settingsManager.getUserSetting('autonomyLevel') === 'high') {
                return this._continueExecution();
            }
            
            return {
                status: 'paused',
                currentStep: this.currentStepIndex,
                totalSteps: this.steps.length - 1 // Exclude planning step
            };
        } catch (error) {
            console.error('計画実行エラー:', error);
            this._updateTaskStatus('error');
            
            throw error;
        }
    }

    /**
     * Continue plan execution
     * @returns {Promise<Object>} - Execution result
     */
    async _continueExecution() {
        while (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            await this._executeCurrentStep();
            
            // If step requires confirmation, pause execution
            if (this.steps[this.currentStepIndex].requires_confirmation && 
                settingsManager.getUserSetting('autonomyLevel') !== 'high') {
                return {
                    status: 'paused',
                    currentStep: this.currentStepIndex,
                    totalSteps: this.steps.length - 1
                };
            }
        }
        
        this._updateTaskStatus('completed');
        this.currentTask.endTime = new Date().toISOString();
        
        return {
            status: 'completed',
            currentStep: this.currentStepIndex,
            totalSteps: this.steps.length - 1
        };
    }

    /**
     * Execute next step in plan
     * @returns {Promise<Object>} - Step execution result
     */
    async executeNextStep() {
        if (!this.currentTask || this.currentStepIndex >= this.steps.length - 1) {
            throw new Error('実行可能な次のステップがありません');
        }
        
        this.currentStepIndex++;
        
        try {
            const result = await this._executeCurrentStep();
            
            // If this was the last step, mark task as completed
            if (this.currentStepIndex === this.steps.length - 1) {
                this._updateTaskStatus('completed');
                this.currentTask.endTime = new Date().toISOString();
            }
            
            return result;
        } catch (error) {
            console.error('ステップ実行エラー:', error);
            
            const currentStep = this.steps[this.currentStepIndex];
            currentStep.status = 'error';
            currentStep.endTime = new Date().toISOString();
            currentStep.result = `エラー: ${error.message}`;
            
            this._renderProcessingSteps();
            
            throw error;
        }
    }

    /**
     * Execute current step
     * @returns {Promise<Object>} - Step execution result
     */
    async _executeCurrentStep() {
        const currentStep = this.steps[this.currentStepIndex];
        
        currentStep.status = 'running';
        currentStep.startTime = new Date().toISOString();
        this._renderProcessingSteps();
        
        try {
            // Get context from memory
            const recentMessages = memorySystem.getMessagesForContext(5); // Fewer messages for execution context
            
            // Prepare execution prompt
            const executionPrompt = this._createExecutionPrompt(currentStep, recentMessages);
            
            // Call API with execution prompt
            const response = await apiService.sendRequest({
                prompt: executionPrompt,
                systemPrompt: SYSTEM_PROMPTS.execution
            });
            
            // Process and save results
            const result = this._processExecutionResponse(response.text);
            
            currentStep.status = 'completed';
            currentStep.endTime = new Date().toISOString();
            currentStep.result = result;
            
            // Add to memory if meaningful
            if (result && result.length > 10) {
                memorySystem.addMemoryItem({
                    content: result,
                    type: 'step_result',
                    source: 'agent',
                    metadata: {
                        step_title: currentStep.title,
                        task_id: this.currentTask.id
                    }
                });
            }
            
            this._renderProcessingSteps();
            
            return {
                stepId: currentStep.id,
                status: 'completed',
                result: result
            };
        } catch (error) {
            currentStep.status = 'error';
            currentStep.endTime = new Date().toISOString();
            currentStep.result = `エラー: ${error.message}`;
            
            this._renderProcessingSteps();
            
            throw error;
        }
    }

    /**
     * Create planning prompt
     * @param {string} userInput - User input
     * @param {Array} recentMessages - Recent messages
     * @param {Array} relevantMemory - Relevant memory items
     * @returns {string} - Planning prompt
     */
    _createPlanningPrompt(userInput, recentMessages, relevantMemory) {
        let prompt = `ユーザーからの指示: ${userInput}\n\n`;
        
        // Add context from recent conversation
        if (recentMessages.length > 0) {
            prompt += "最近の会話:\n";
            recentMessages.forEach(msg => {
                prompt += `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}\n`;
            });
            prompt += "\n";
        }
        
        // Add relevant memory items
        if (relevantMemory.length > 0) {
            prompt += "関連する記憶:\n";
            relevantMemory.forEach(item => {
                prompt += `- ${item.content}\n`;
            });
            prompt += "\n";
        }
        
        // Add planning instructions
        prompt += `
あなたはCygnos AIエージェントです。上記の指示を実行するための詳細な計画を立ててください。
各ステップは次の形式で、JSON形式で提供してください:

[
  {
    "title": "ステップのタイトル",
    "description": "詳細な説明",
    "requires_confirmation": true/false
  },
  ...
]

以下のことを考慮してください:
1. ステップは論理的な順序で並べてください
2. 各ステップは具体的かつ実行可能であるべきです
3. 重要な決定や潜在的なリスクを伴うステップには requires_confirmation を true に設定してください
4. 計画は実行可能で、与えられたタスクを完全に解決するものであるべきです

JSON形式のみで回答してください。追加の説明は不要です。
`;
        
        return prompt;
    }

    /**
     * Create execution prompt
     * @param {Object} step - Step to execute
     * @param {Array} recentMessages - Recent messages
     * @returns {string} - Execution prompt
     */
    _createExecutionPrompt(step, recentMessages) {
        let prompt = `現在実行中のステップ: ${step.title}\n`;
        prompt += `ステップの説明: ${step.description}\n\n`;
        
        // Add context from recent conversation
        if (recentMessages.length > 0) {
            prompt += "関連する会話コンテキスト:\n";
            recentMessages.forEach(msg => {
                prompt += `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}\n`;
            });
            prompt += "\n";
        }
        
        // Add execution instructions
        prompt += `
あなたはCygnos AIエージェントです。上記のステップを実行し、その結果を提供してください。
あなたの応答は、このステップの実行結果として直接ユーザーに表示されます。

以下のことを考慮してください:
1. このステップの範囲内でのみ実行してください。将来のステップについて言及しないでください。
2. 明確で具体的な結果を提供してください。
3. ステップの実行に必要な推論や思考プロセスを含めてください。
4. 結論や重要なポイントを強調してください。

あなたの応答は、このステップの実行結果として直接ユーザーに表示されます。
`;
        
        return prompt;
    }

    /**
     * Parse plan from API response
     * @param {string} responseText - API response text
     * @returns {Array} - Parsed plan steps
     */
    _parsePlanFromResponse(responseText) {
        try {
            // Try to extract JSON from the response text
            const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // If no JSON found, try to parse the entire response as JSON
            return JSON.parse(responseText);
        } catch (error) {
            console.error('計画の解析エラー:', error);
            
            // Fallback: extract steps from text format if JSON parsing fails
            const steps = [];
            const stepMatches = responseText.matchAll(/(?:ステップ|Step)\s*(\d+)\s*[:.]\s*([^\n]+)(?:\n|$)((?:.(?!\n(?:ステップ|Step)\s*\d+\s*[:.]))*)/gs);
            
            for (const match of stepMatches) {
                steps.push({
                    title: match[2].trim(),
                    description: match[3].trim(),
                    requires_confirmation: match[3].toLowerCase().includes('確認') || match[3].toLowerCase().includes('リスク')
                });
            }
            
            return steps.length > 0 ? steps : [
                {
                    title: '情報収集',
                    description: 'このタスクに必要な情報を収集します',
                    requires_confirmation: false
                },
                {
                    title: 'タスク実行',
                    description: 'タスクを実行し、結果を生成します',
                    requires_confirmation: false
                }
            ];
        }
    }

    /**
     * Process execution response
     * @param {string} responseText - API response text
     * @returns {string} - Processed result
     */
    _processExecutionResponse(responseText) {
        return responseText.trim();
    }

    /**
     * Update task status
     * @param {string} status - New status
     */
    _updateTaskStatus(status) {
        if (this.currentTask) {
            this.currentTask.status = status;
        }
    }

    /**
     * Render processing steps in UI
     */
    _renderProcessingSteps() {
        if (!this.processStepsElement) {
            this.processStepsElement = document.getElementById('process-steps');
            if (!this.processStepsElement) return;
        }
        
        this.processStepsElement.innerHTML = '';
        
        this.steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'process-step';
            stepEl.dataset.stepId = step.id;
            
            const stepHeader = document.createElement('div');
            stepHeader.className = 'step-header';
            
            const stepTitle = document.createElement('div');
            stepTitle.className = 'step-title';
            stepTitle.textContent = `${index}. ${step.title}`;
            
            const stepStatus = document.createElement('div');
            stepStatus.className = `step-status ${step.status}`;
            
            switch (step.status) {
                case 'waiting':
                    stepStatus.textContent = '待機中';
                    break;
                case 'running':
                    stepStatus.innerHTML = '<span class="loading-spinner"></span> 実行中';
                    break;
                case 'completed':
                    stepStatus.textContent = '完了';
                    break;
                case 'error':
                    stepStatus.textContent = 'エラー';
                    break;
            }
            
            stepHeader.appendChild(stepTitle);
            stepHeader.appendChild(stepStatus);
            
            const stepDetails = document.createElement('div');
            stepDetails.className = 'step-details';
            stepDetails.textContent = step.description;
            
            stepEl.appendChild(stepHeader);
            stepEl.appendChild(stepDetails);
            
            if (step.result) {
                const stepResult = document.createElement('div');
                stepResult.className = 'step-result';
                stepResult.textContent = step.result;
                stepEl.appendChild(stepResult);
            }
            
            this.processStepsElement.appendChild(stepEl);
        });
        
        // Expand panel for visibility if steps are available
        if (this.steps.length > 0) {
            const panelContent = document.querySelector('.panel-content');
            if (panelContent && !panelContent.classList.contains('expanded')) {
                panelContent.classList.add('expanded');
            }
        }
    }

    /**
     * Generate a unique ID
     * @returns {string} - Unique ID
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}

// System prompts for different functions
const SYSTEM_PROMPTS = {
    planning: `あなたはCygnos AIエージェントで、ユーザーのタスクを実行するための計画を立案する役割を担っています。
タスクを達成するために必要なステップを特定し、論理的な順序で整理してください。
各ステップは具体的で、実行可能で、明確であるべきです。
重要な決定や潜在的なリスクを伴うステップには確認が必要であることを示してください。
計画はJSON形式で返してください。`,

    execution: `あなたはCygnos AIエージェントで、計画の個々のステップを実行する役割を担っています。
現在のステップに集中し、必要な推論や分析を行い、明確な結果を提供してください。
あなたの応答は、このステップの実行結果として直接ユーザーに表示されます。
簡潔かつ情報量豊富な回答を心がけてください。`,

    reasoning: `あなたはCygnos AIエージェントで、推論と問題解決に特化しています。
与えられた情報や状況を分析し、論理的な推論を行って結論を導き出してください。
推論のプロセスを段階的に示し、考慮した仮説や証拠を明示してください。
不確実性がある場合は、それを率直に認め、複数の可能性を検討してください。`
};

// Initialize Processor System
const processorSystem = new ProcessorSystem(); 