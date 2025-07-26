class GeminiTTSApp {
    constructor() {
        this.apiKey = null;
        this.isGenerating = false;
        this.audioHistory = [];
        this.currentAudio = null;
        this.currentlyPlaying = null;
        this.selectedVoice = 'leda';
        this.sidebarState = 'expanded';
        this.isMobile = window.innerWidth <= 768;
        
        this.initializeElements();
        this.loadStoredData();
        this.setupEventListeners();
        this.checkAPIKey();
        this.updateResponsive();
    }

    initializeElements() {
        // Sidebar elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.floatingSidebar = document.getElementById('floatingSidebar');
        this.mobileSidebar = document.getElementById('mobileSidebar');
        this.historyList = document.getElementById('historyList');
        this.historyPlaceholder = document.getElementById('historyPlaceholder');
        this.audioCount = document.getElementById('audioCount');
        this.clearHistory = document.getElementById('clearHistory');
        
        // Chat elements
        this.chatLog = document.getElementById('chatLog');
        this.textInput = document.getElementById('textInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatForm = document.getElementById('chatForm');
        this.voiceSelect = document.getElementById('voiceSelect');
        
        // API Key elements
        this.apiKeySection = document.getElementById('apiKeySection');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveApiKey = document.getElementById('saveApiKey');
        
        // Status elements
        this.statusContainer = document.getElementById('statusContainer');
        this.status = document.getElementById('status');
    }

    loadStoredData() {
        // Load API key
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            this.apiKey = storedKey;
        }

        // Load audio history
        try {
            const storedHistory = localStorage.getItem('tts_audio_history');
            if (storedHistory) {
                this.audioHistory = JSON.parse(storedHistory);
                this.updateHistoryDisplay();
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }

        // Load voice preference
        const storedVoice = localStorage.getItem('tts_selected_voice');
        if (storedVoice) {
            this.selectedVoice = storedVoice;
            this.voiceSelect.value = storedVoice;
        }
    }

    setupEventListeners() {
        // Sidebar toggles
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.floatingSidebar.addEventListener('click', () => this.toggleSidebar());
        this.mobileSidebar.addEventListener('click', () => this.toggleSidebar());
        
        // API Key
        this.saveApiKey.addEventListener('click', () => this.saveAPIKey());
        this.apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveAPIKey();
        });
        
        // Chat form
        this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        this.textInput.addEventListener('input', () => this.autoResizeTextarea());
        
        // Voice selection
        this.voiceSelect.addEventListener('change', (e) => {
            this.selectedVoice = e.target.value;
            localStorage.setItem('tts_selected_voice', this.selectedVoice);
        });
        
        // History actions
        this.clearHistory.addEventListener('click', () => this.clearAudioHistory());
        
        // Responsive
        window.addEventListener('resize', () => this.updateResponsive());
    }

    checkAPIKey() {
        if (this.apiKey) {
            this.apiKeySection.style.display = 'none';
            this.chatLog.style.display = 'flex';
        } else {
            this.apiKeySection.style.display = 'flex';
            this.chatLog.style.display = 'none';
        }
    }

    saveAPIKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.showStatus('Digite uma chave da API válida!', 'error');
            return;
        }

        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.apiKeyInput.value = '';
        this.checkAPIKey();
        this.showStatus('Chave da API salva com sucesso!', 'success');
        setTimeout(() => this.hideStatus(), 2000);
    }

    toggleSidebar() {
        if (this.isMobile) {
            this.sidebarState = this.sidebarState === 'expanded' ? 'hidden' : 'expanded';
        } else {
            this.sidebarState = this.sidebarState === 'expanded' ? 'collapsed' : 'expanded';
            this.floatingSidebar.style.display = this.sidebarState === 'collapsed' ? 'flex' : 'none';
        }
        
        this.sidebar.className = `sidebar ${this.sidebarState}`;
    }

    updateResponsive() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.sidebarState = 'hidden';
                this.floatingSidebar.style.display = 'none';
            } else {
                this.sidebarState = 'expanded';
                this.floatingSidebar.style.display = 'none';
            }
            this.sidebar.className = `sidebar ${this.sidebarState}`;
        }
    }

    autoResizeTextarea() {
        this.textInput.style.height = 'auto';
        this.textInput.style.height = Math.min(this.textInput.scrollHeight, 150) + 'px';
    }

    async handleSendMessage(e) {
        e.preventDefault();
        
        if (!this.textInput.value.trim() || this.isGenerating) return;
        if (!this.apiKey) {
            this.showStatus('Configure sua chave da API primeiro!', 'error');
            return;
        }

        const text = this.textInput.value.trim();
        this.textInput.value = '';
        this.autoResizeTextarea();
        
        // Add user message
        this.addMessage(text, 'user');
        
        // Generate audio
        await this.generateAudio(text);
    }

    addMessage(text, sender, audioUrl = null) {
        const messageId = Date.now();
        const messageEl = document.createElement('div');
        messageEl.className = `message-wrapper is-${sender}`;
        messageEl.innerHTML = `
            <div class="message-avatar">
                ${sender === 'user' ? this.getUserIcon() : this.getBotIcon()}
            </div>
            <div class="message-content">
                <div class="message-bubble is-${sender}">
                    ${text}
                </div>
                <div class="message-footer">
                    <span class="message-time">${this.formatTime(new Date())}</span>
                    ${sender === 'ai' && audioUrl ? `
                        <button class="message-audio-btn" onclick="app.playAudio('${audioUrl}', ${messageId})">
                            ${this.getPlayIcon()}
                            Ouvir
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Remove welcome message if exists
        const welcomeMsg = this.chatLog.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();
        
        this.chatLog.appendChild(messageEl);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;
        
        return messageId;
    }

    async generateAudio(text) {
        this.isGenerating = true;
        this.sendBtn.disabled = true;
        this.showStatus('Gerando áudio... ⏳', 'loading');

        try {
            // Add AI message placeholder
            const messageId = this.addMessage('Gerando resposta de áudio...', 'ai');
            
            const response = await fetch('https://api.genai.gd.edu.kg/google/v1beta/models/gemini-2.5-flash-preview-tts:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: text }]
                    }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: this.selectedVoice
                                }
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const jsonResponse = await response.json();
            
            if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
                throw new Error('API retornou resposta sem candidates');
            }

            const candidate = jsonResponse.candidates[0];
            if (!candidate.content || !candidate.content.parts) {
                throw new Error('API retornou candidate sem conteúdo');
            }

            let audioFound = false;
            let accumulatedAudioDataB64 = "";
            let audioMimeType = "audio/L16";

            for (const part of candidate.content.parts) {
                if (part && 'inlineData' in part && part.inlineData) {
                    audioFound = true;
                    if (part.inlineData.data) {
                        accumulatedAudioDataB64 += part.inlineData.data;
                    }
                    if (part.inlineData.mimeType) {
                        audioMimeType = part.inlineData.mimeType;
                    }
                }
            }

            if (audioFound && accumulatedAudioDataB64) {
                const audioBlob = this.convertToWavBlob(accumulatedAudioDataB64, audioMimeType);
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Update AI message with audio
                this.updateMessageWithAudio(messageId, text, audioUrl);
                
                // Add to history
                this.addToHistory({
                    id: messageId,
                    title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                    text: text,
                    audioUrl: audioUrl,
                    timestamp: new Date()
                });
                
                // Auto play
                this.playAudio(audioUrl, messageId);
                
                this.showStatus('✅ Áudio gerado com sucesso!', 'success');
            } else {
                throw new Error('Nenhum áudio válido foi encontrado na resposta da API');
            }

        } catch (error) {
            console.error('Erro ao gerar áudio:', error);
            let errorMsg = 'Erro desconhecido';
            
            if (error.message.includes('API key not valid')) {
                errorMsg = 'Chave da API inválida';
            } else if (error.message.includes('403')) {
                errorMsg = 'Acesso negado - verifique sua chave API';
            } else if (error.message.includes('429')) {
                errorMsg = 'Muitas requisições - tente novamente em alguns segundos';
            } else {
                errorMsg = error.message;
            }
            
            this.showStatus('❌ ' + errorMsg, 'error');
        } finally {
            this.isGenerating = false;
            this.sendBtn.disabled = false;
            setTimeout(() => this.hideStatus(), 5000);
        }
    }

    updateMessageWithAudio(messageId, text, audioUrl) {
        const messages = this.chatLog.querySelectorAll('.message-wrapper.is-ai');
        const targetMessage = Array.from(messages).find(msg => 
            msg.innerHTML.includes('Gerando resposta de áudio...')
        );
        
        if (targetMessage) {
            const bubble = targetMessage.querySelector('.message-bubble');
            const footer = targetMessage.querySelector('.message-footer');
            
            bubble.textContent = text;
            footer.innerHTML = `
                <span class="message-time">${this.formatTime(new Date())}</span>
                <button class="message-audio-btn" onclick="app.playAudio('${audioUrl}', ${messageId})">
                    ${this.getPlayIcon()}
                    Ouvir
                </button>
            `;
        }
    }

    base64ToUint8Array(base64) {
        try {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            console.error("Failed to decode base64:", e);
            throw new Error("Invalid base64 string for audio data.");
        }
    }

    convertToWavBlob(base64AudioData, mimeType) {
        const sampleRate = 24000;
        const bitsPerSample = 16;
        const numChannels = 1;
        
        const audioDataBytes = this.base64ToUint8Array(base64AudioData);
        const dataSize = audioDataBytes.length;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const chunkSize = 36 + dataSize;

        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        // WAV Header
        view.setUint8(0, 'R'.charCodeAt(0)); view.setUint8(1, 'I'.charCodeAt(0));
        view.setUint8(2, 'F'.charCodeAt(0)); view.setUint8(3, 'F'.charCodeAt(0));
        view.setUint32(4, chunkSize, true);
        view.setUint8(8, 'W'.charCodeAt(0)); view.setUint8(9, 'A'.charCodeAt(0));
        view.setUint8(10, 'V'.charCodeAt(0)); view.setUint8(11, 'E'.charCodeAt(0));
        view.setUint8(12, 'f'.charCodeAt(0)); view.setUint8(13, 'm'.charCodeAt(0));
        view.setUint8(14, 't'.charCodeAt(0)); view.setUint8(15, ' '.charCodeAt(0));
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        view.setUint8(36, 'd'.charCodeAt(0)); view.setUint8(37, 'a'.charCodeAt(0));
        view.setUint8(38, 't'.charCodeAt(0)); view.setUint8(39, 'a'.charCodeAt(0));
        view.setUint32(40, dataSize, true);

        const wavBuffer = new ArrayBuffer(header.byteLength + audioDataBytes.byteLength);
        const wavView = new Uint8Array(wavBuffer);
        wavView.set(new Uint8Array(header), 0);
        wavView.set(audioDataBytes, header.byteLength);

        return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    playAudio(audioUrl, id) {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        if (this.currentlyPlaying === id) {
            this.currentlyPlaying = null;
            this.updatePlayButtons();
            return;
        }

        this.currentAudio = new Audio(audioUrl);
        this.currentlyPlaying = id;
        this.updatePlayButtons();

        this.currentAudio.play().catch(e => {
            console.error('Erro ao tocar áudio:', e);
            this.currentlyPlaying = null;
            this.updatePlayButtons();
        });

        this.currentAudio.onended = () => {
            this.currentlyPlaying = null;
            this.updatePlayButtons();
        };
    }

    updatePlayButtons() {
        // Update message audio buttons
        const messageButtons = this.chatLog.querySelectorAll('.message-audio-btn');
        messageButtons.forEach(btn => {
            const isPlaying = this.currentlyPlaying && btn.onclick.toString().includes(this.currentlyPlaying);
            btn.innerHTML = isPlaying ? 
                `${this.getPauseIcon()} Pausar` : 
                `${this.getPlayIcon()} Ouvir`;
            btn.className = `message-audio-btn ${isPlaying ? 'playing' : ''}`;
        });

        // Update history buttons
        const historyButtons = this.historyList.querySelectorAll('.play-pause-btn');
        historyButtons.forEach(btn => {
            const itemId = parseInt(btn.dataset.id);
            const isPlaying = this.currentlyPlaying === itemId;
            btn.innerHTML = isPlaying ? 
                `${this.getPauseIcon()} Pausar` : 
                `${this.getPlayIcon()} Reproduzir`;
            btn.className = `play-pause-btn ${isPlaying ? 'playing' : 'idle'}`;
        });
    }

    addToHistory(audioEntry) {
        this.audioHistory.unshift(audioEntry);
        this.updateHistoryDisplay();
        this.saveHistoryToStorage();
    }

    updateHistoryDisplay() {
        this.audioCount.textContent = `${this.audioHistory.length} áudios`;
        
        if (this.audioHistory.length === 0) {
            this.historyPlaceholder.style.display = 'block';
            this.historyList.innerHTML = '';
            return;
        }

        this.historyPlaceholder.style.display = 'none';
        this.historyList.innerHTML = this.audioHistory.map(item => `
            <div class="history-item">
                <div class="history-item__header">
                    <h4 class="history-item__title">${item.title}</h4>
                    <button class="action-btn delete" onclick="app.deleteHistoryItem(${item.id})">
                        ${this.getDeleteIcon()}
                    </button>
                </div>
                <p class="history-item__text">${item.text}</p>
                <div class="history-item__footer">
                    <span class="history-item__time">${this.formatTime(item.timestamp)}</span>
                    <button class="play-pause-btn idle" data-id="${item.id}" onclick="app.playAudio('${item.audioUrl}', ${item.id})">
                        ${this.getPlayIcon()}
                        Reproduzir
                    </button>
                </div>
            </div>
        `).join('');
        
        this.updatePlayButtons();
    }

    deleteHistoryItem(id) {
        const item = this.audioHistory.find(item => item.id === id);
        if (item) {
            URL.revokeObjectURL(item.audioUrl);
            this.audioHistory = this.audioHistory.filter(item => item.id !== id);
            this.updateHistoryDisplay();
            this.saveHistoryToStorage();
        }
    }

    clearAudioHistory() {
        if (this.audioHistory.length === 0) return;
        
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            this.audioHistory.forEach(item => URL.revokeObjectURL(item.audioUrl));
            this.audioHistory = [];
            this.updateHistoryDisplay();
            this.saveHistoryToStorage();
        }
    }

    saveHistoryToStorage() {
        try {
            localStorage.setItem('tts_audio_history', JSON.stringify(this.audioHistory));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.statusContainer.style.display = 'block';
    }

    hideStatus() {
        this.statusContainer.style.display = 'none';
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Icon methods
    getPlayIcon() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5,3 19,12 5,21 5,3"/>
        </svg>`;
    }

    getPauseIcon() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
        </svg>`;
    }

    getUserIcon() {
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>`;
    }

    getBotIcon() {
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>`;
    }

    getDeleteIcon() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
        </svg>`;
    }
}

// Initialize app
const app = new GeminiTTSApp();
