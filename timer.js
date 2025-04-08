/**
 * timer.js
 * Modul pro správu časovače
 */

import storageManager from './storage.js';
import { formatTime, calculateMinutesBetween, generateId, getHourlyRate, calculateDeduction } from './utils.js';
import { notifications } from './ui.js';

/**
 * Třída pro správu časovače
 */
class TimerManager {
    constructor() {
        // DOM elementy
        this.timerTimeDisplay = null;
        this.timerStartButton = null;
        this.timerPauseButton = null;
        this.timerStopButton = null;
        this.timerPersonDisplay = null;
        this.timerActivitySelect = null;
        this.timerActivityDisplay = null;
        this.timerNoteInput = null;
        
        // Hlavičkový časovač
        this.headerTimer = null;
        this.headerTimerTime = null;
        this.headerTimerPerson = null;
        this.headerTimerActivity = null;
        
        // Aktuální stav
        this.timerInterval = null;
        this.isRunning = false;
        this.currentPerson = 'maru';
        this.currentActivity = '';
        
        // Event listeners pro externí události
        this.eventListeners = {
            onTimerStart: [],
            onTimerPause: [],
            onTimerStop: []
        };
    }

    /**
     * Inicializace časovače
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.timerTimeDisplay = document.getElementById('timer-time');
        this.timerStartButton = document.getElementById('timer-start');
        this.timerPauseButton = document.getElementById('timer-pause');
        this.timerStopButton = document.getElementById('timer-stop');
        this.timerPersonDisplay = document.getElementById('timer-person');
        this.timerActivitySelect = document.getElementById('timer-activity');
        this.timerActivityDisplay = document.getElementById('timer-activity-display');
        this.timerNoteInput = document.getElementById('timer-note-input');
        
        this.headerTimer = document.getElementById('header-timer');
        this.headerTimerTime = document.getElementById('header-timer-time');
        this.headerTimerPerson = document.getElementById('header-timer-person');
        this.headerTimerActivity = document.getElementById('header-timer-activity');

        // Načtení stavu časovače z úložiště
        await this.loadTimerState();
        
        // Přidání event listenerů pro tlačítka
        if (this.timerStartButton) {
            this.timerStartButton.addEventListener('click', () => this.startTimer());
        }
        
        if (this.timerPauseButton) {
            this.timerPauseButton.addEventListener('click', () => this.pauseTimer());
        }
        
        if (this.timerStopButton) {
            this.timerStopButton.addEventListener('click', () => this.stopTimer());
        }
        
        // Přidání event listenerů pro výběr osoby
        const personRadios = document.querySelectorAll('#timer-person-select input[type="radio"]');
        personRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                this.currentPerson = event.target.value;
                this.saveTimerState();
            });
        });
        
        // Přidání event listenerů pro výběr aktivity
        if (this.timerActivitySelect) {
            this.timerActivitySelect.addEventListener('change', (e) => {
                this.currentActivity = e.target.value;
                this.saveTimerState();
            });
        }
        
        // Aktualizace UI
        this.updateTimerDisplay();
        this.updateButtonStates();
    }

    /**
     * Načtení stavu časovače z úložiště
     * @returns {Promise} Promise, který se vyřeší po načtení stavu
     */
    async loadTimerState() {
        try {
            const timerState = await storageManager.get('settings', 'timerState');
            
            if (timerState && timerState.data) {
                const state = timerState.data;
                this.isRunning = state.isRunning;
                this.currentPerson = state.person || 'maru';
                this.currentActivity = state.activity || '';
                
                // Nastavit radio button pro osobu
                const personRadio = document.querySelector(`#timer-person-select input[value="${this.currentPerson}"]`);
                if (personRadio) {
                    personRadio.checked = true;
                }
                
                // Nastavit aktivitu v selectu časovače
                if (this.timerActivitySelect && this.currentActivity) {
                    for (let i = 0; i < this.timerActivitySelect.options.length; i++) {
                        if (this.timerActivitySelect.options[i].value === this.currentActivity) {
                            this.timerActivitySelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                // Restartovat interval, pokud je časovač spuštěn
                if (this.isRunning) {
                    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
                }
            }
        } catch (error) {
            console.error('Chyba při načítání stavu časovače:', error);
        }
    }

    /**
     * Uložení stavu časovače do úložiště
     * @returns {Promise} Promise, který se vyřeší po uložení stavu
     */
    async saveTimerState() {
        try {
            const timerState = await storageManager.get('settings', 'timerState') || { id: 'timerState', data: {} };
            
            timerState.data = {
                startTime: timerState.data.startTime,
                pauseTime: timerState.data.pauseTime,
                isRunning: this.isRunning,
                person: this.currentPerson,
                activity: this.currentActivity
            };
            
            await storageManager.put('settings', timerState);
        } catch (error) {
            console.error('Chyba při ukládání stavu časovače:', error);
        }
    }

    /**
     * Aktualizace zobrazení časovače
     */
    async updateTimerDisplay() {
        try {
            const timerState = await storageManager.get('settings', 'timerState');
            
            if (!timerState || !timerState.data || !timerState.data.startTime) {
                if (this.timerTimeDisplay) this.timerTimeDisplay.textContent = '00:00:00';
                if (this.headerTimer) this.headerTimer.classList.add('hidden');
                return;
            }
            
            const state = timerState.data;
            
            let runningTime;
            if (state.isRunning) {
                runningTime = Date.now() - state.startTime;
            } else if (state.pauseTime) {
                runningTime = state.pauseTime - state.startTime;
            } else {
                runningTime = 0;
            }
            
            const totalSeconds = Math.floor(runningTime / 1000);
            const timeString = formatTime(totalSeconds);
            
            // Aktualizace hlavního časovače
            if (this.timerTimeDisplay) this.timerTimeDisplay.textContent = timeString;
            if (this.timerPersonDisplay) this.timerPersonDisplay.textContent = state.person === 'maru' ? 'Maru' : 'Marty';
            if (this.timerActivityDisplay) this.timerActivityDisplay.textContent = state.activity || '';
            
            // Aktualizace časovače v hlavičce
            if (state.isRunning) {
                if (this.headerTimer) this.headerTimer.classList.remove('hidden');
                if (this.headerTimerTime) this.headerTimerTime.textContent = timeString;
                if (this.headerTimerPerson) this.headerTimerPerson.textContent = state.person === 'maru' ? 'Maru' : 'Marty';
                if (this.headerTimerActivity) this.headerTimerActivity.textContent = state.activity || '';
            } else {
                if (this.headerTimer) this.headerTimer.classList.add('hidden');
            }
        } catch (error) {
            console.error('Chyba při aktualizaci zobrazení časovače:', error);
        }
    }

    /**
     * Aktualizace stavů tlačítek
     */
    async updateButtonStates() {
        try {
            const timerState = await storageManager.get('settings', 'timerState');
            
            if (this.isRunning) {
                if (this.timerStartButton) this.timerStartButton.disabled = true;
                if (this.timerPauseButton) this.timerPauseButton.disabled = false;
                if (this.timerStopButton) this.timerStopButton.disabled = false;
            } else {
                if (this.timerStartButton) this.timerStartButton.disabled = false;
                if (this.timerPauseButton) this.timerPauseButton.disabled = true;
                
                // Tlačítko stop je povoleno pouze pokud je časovač spuštěn nebo pozastaven
                if (this.timerStopButton) {
                    this.timerStopButton.disabled = !(timerState && timerState.data && timerState.data.startTime);
                }
            }
        } catch (error) {
            console.error('Chyba při aktualizaci stavů tlačítek:', error);
        }
    }

    /**
     * Spuštění časovače
     */
    async startTimer() {
        if (this.isRunning) return;
        
        try {
            // Zkontrolovat, zda je vybrána aktivita
            if (this.timerActivitySelect && this.timerActivitySelect.value === '') {
                notifications.warning('Prosím vyberte úkol před spuštěním časovače');
                return;
            }
            
            this.isRunning = true;
            
            // Načtení aktuálního stavu časovače
            let timerState = await storageManager.get('settings', 'timerState');
            if (!timerState) timerState = { id: 'timerState', data: {} };
            
            let startTime;
            if (timerState.data.startTime && timerState.data.pauseTime) {
                // Pokračovat po pauze
                const pauseDuration = Date.now() - timerState.data.pauseTime;
                startTime = timerState.data.startTime + pauseDuration;
            } else {
                // Nový časovač
                startTime = Date.now();
                this.currentActivity = this.timerActivitySelect ? this.timerActivitySelect.value : '';
                
                // Přidat novou kategorii úkolu, pokud neexistuje
                if (this.currentActivity) {
                    const taskCategories = await storageManager.get('settings', 'taskCategories');
                    if (taskCategories && !taskCategories.categories.includes(this.currentActivity)) {
                        taskCategories.categories.push(this.currentActivity);
                        await storageManager.put('settings', taskCategories);
                        
                        // Vyvolat událost pro aktualizaci kategorií
                        document.dispatchEvent(new CustomEvent('categoriesUpdated'));
                    }
                }
            }
            
            // Aktualizace stavu časovače
            timerState.data.startTime = startTime;
            timerState.data.pauseTime = null;
            timerState.data.isRunning = true;
            timerState.data.person = this.currentPerson;
            timerState.data.activity = this.currentActivity;
            
            // Uložení stavu časovače
            await storageManager.put('settings', timerState);
            
            // Spuštění intervalu pro aktualizaci zobrazení
            this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
            
            // Aktualizace UI
            this.updateTimerDisplay();
            this.updateButtonStates();
            
            // Vyvolání událostí
            this.triggerEvent('onTimerStart', {
                person: this.currentPerson,
                activity: this.currentActivity,
                startTime
            });
        } catch (error) {
            console.error('Chyba při spuštění časovače:', error);
            notifications.error('Chyba při spuštění časovače');
        }
    }

    /**
     * Pozastavení časovače
     */
    async pauseTimer() {
        if (!this.isRunning) return;
        
        try {
            this.isRunning = false;
            clearInterval(this.timerInterval);
            
            // Načtení aktuálního stavu časovače
            const timerState = await storageManager.get('settings', 'timerState');
            if (!timerState) return;
            
            // Aktualizace stavu časovače
            timerState.data.pauseTime = Date.now();
            timerState.data.isRunning = false;
            
            // Uložení stavu časovače
            await storageManager.put('settings', timerState);
            
            // Aktualizace UI
            this.updateTimerDisplay();
            this.updateButtonStates();
            
            // Vyvolání událostí
            this.triggerEvent('onTimerPause', {
                person: this.currentPerson,
                activity: this.currentActivity,
                startTime: timerState.data.startTime,
                pauseTime: timerState.data.pauseTime
            });
        } catch (error) {
            console.error('Chyba při pozastavení časovače:', error);
            notifications.error('Chyba při pozastavení časovače');
        }
    }

    /**
     * Zastavení a uložení časovače
     */
    async stopTimer() {
        try {
            // Načtení aktuálního stavu časovače
            const timerState = await storageManager.get('settings', 'timerState');
            if (!timerState || !timerState.data.startTime) return;
            
            this.isRunning = false;
            clearInterval(this.timerInterval);
            
            // Výpočet odpracovaného času
            let runningTime;
            if (timerState.data.isRunning) {
                runningTime = Date.now() - timerState.data.startTime;
            } else if (timerState.data.pauseTime) {
                runningTime = timerState.data.pauseTime - timerState.data.startTime;
            } else {
                runningTime = 0;
            }
            
            // Vytvoření záznamu o práci
            const endTime = new Date();
            const durationInMinutes = Math.round(runningTime / (1000 * 60));
            const startTimeObj = new Date(timerState.data.startTime);
            const now = new Date();
            const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const earnings = (durationInMinutes / 60) * getHourlyRate(timerState.data.person);
            const deduction = calculateDeduction(earnings, timerState.data.person);
            
            // Získat hodnotu poznámky z textového pole
            const note = this.timerNoteInput ? this.timerNoteInput.value : '';
            
            // Vytvoření záznamu o práci
            const workLog = {
                id: generateId(),
                person: timerState.data.person,
                date: dateString,
                start: `${String(startTimeObj.getHours()).padStart(2, '0')}:${String(startTimeObj.getMinutes()).padStart(2, '0')}`,
                end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
                break: 0,
                worked: durationInMinutes,
                earnings: earnings,
                deduction: deduction,
                activity: timerState.data.activity,
                note: note
            };
            
            // Uložení záznamu o práci
            await storageManager.add('workLogs', workLog);
            
            // Resetování stavu časovače
            timerState.data.startTime = null;
            timerState.data.pauseTime = null;
            timerState.data.isRunning = false;
            
            // Uložení stavu časovače
            await storageManager.put('settings', timerState);
            
            // Vyčištění pole pro poznámku
            if (this.timerNoteInput) this.timerNoteInput.value = '';
            
            // Aktualizace UI
            this.updateTimerDisplay();
            this.updateButtonStates();
            
            // Zobrazení notifikace
            notifications.success(`Záznam byl uložen (${durationInMinutes} minut)`);
            
            // Vyvolání událostí
            this.triggerEvent('onTimerStop', {
                person: timerState.data.person,
                activity: timerState.data.activity,
                startTime: timerState.data.startTime,
                duration: durationInMinutes,
                earnings: earnings,
                deduction: deduction,
                workLog
            });
        } catch (error) {
            console.error('Chyba při zastavení časovače:', error);
            notifications.error('Chyba při zastavení časovače');
        }
    }

    /**
     * Registrace event listeneru
     * @param {string} eventName Název události
     * @param {Function} callback Callback funkce
     */
    on(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].push(callback);
        }
    }

    /**
     * Odstranění event listeneru
     * @param {string} eventName Název události
     * @param {Function} callback Callback funkce
     */
    off(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(cb => cb !== callback);
        }
    }

    /**
     * Vyvolání události
     * @param {string} eventName Název události
     * @param {Object} data Data události
     */
    triggerEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                callback(data);
            });
        }
    }
}

// Vytvoření a export instance pro globální použití
const timerManager = new TimerManager();
export default timerManager;