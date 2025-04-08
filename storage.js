/**
 * storage.js
 * Implementace úložiště dat s využitím IndexedDB a vyrovnávací paměti
 */

class StorageManager {
    constructor() {
        this.dbName = 'pracovniVykazyDB';
        this.dbVersion = 1;
        this.db = null;
        this.cache = {}; // Vyrovnávací paměť pro snížení přístupů do IndexedDB
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Inicializace databáze
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            // Zjistíme, zda je IndexedDB podporována
            if (!window.indexedDB) {
                console.warn('IndexedDB není podporována, používám fallback na localStorage');
                this.useLocalStorage = true;
                this._loadFromLocalStorage();
                this.isInitialized = true;
                resolve();
                return;
            }

            // Otevřeme databázi
            const request = indexedDB.open(this.dbName, this.dbVersion);

            // Vytvoření nebo aktualizace struktury databáze
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Vytvoření úložišť objektů (tables)
                if (!db.objectStoreNames.contains('workLogs')) {
                    db.createObjectStore('workLogs', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('finances')) {
                    db.createObjectStore('finances', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('debts')) {
                    db.createObjectStore('debts', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
                    
                    // Přidání výchozích nastavení
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore('settings');
                    
                    store.put({ id: 'rentSettings', amount: 0, day: 1 });
                    store.put({ id: 'taskCategories', categories: [] });
                    store.put({ id: 'expenseCategories', categories: [] });
                    store.put({ id: 'timerState', data: {
                        startTime: null,
                        pauseTime: null,
                        isRunning: false,
                        person: 'maru',
                        activity: ''
                    }});
                }
            };

            // Úspěšné otevření databáze
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                resolve();
                
                // Migrace dat z localStorage, pokud existují
                this._migrateFromLocalStorage();
            };

            // Chyba při otevření databáze
            request.onerror = (event) => {
                console.error('Chyba při otevírání IndexedDB:', event.target.error);
                this.useLocalStorage = true;
                this._loadFromLocalStorage();
                this.isInitialized = true;
                resolve();
            };
        });

        return this.initPromise;
    }

    /**
     * Migrace dat z localStorage do IndexedDB
     * @private
     */
    async _migrateFromLocalStorage() {
        // Zkontrolujeme, zda jsme již provedli migraci
        const migrated = localStorage.getItem('dbMigrated');
        if (migrated === 'true') return;

        // Načteme data z localStorage
        const workLogs = JSON.parse(localStorage.getItem('workLogs')) || [];
        const finances = JSON.parse(localStorage.getItem('finances')) || [];
        const debts = JSON.parse(localStorage.getItem('debts')) || [];
        const rentSettings = JSON.parse(localStorage.getItem('rentSettings')) || { amount: 0, day: null };
        const taskCategories = JSON.parse(localStorage.getItem('taskCategories')) || [];
        const expenseCategories = JSON.parse(localStorage.getItem('expenseCategories')) || [];
        const timerState = {
            startTime: localStorage.getItem('timerStartTime') ? parseInt(localStorage.getItem('timerStartTime')) : null,
            pauseTime: localStorage.getItem('timerPauseTime') ? parseInt(localStorage.getItem('timerPauseTime')) : null,
            isRunning: localStorage.getItem('timerIsRunning') === 'true',
            person: localStorage.getItem('currentTimerPerson') || 'maru',
            activity: localStorage.getItem('currentTimerActivity') || ''
        };

        // Uložíme data do IndexedDB
        for (const log of workLogs) {
            await this.add('workLogs', log);
        }

        for (const finance of finances) {
            await this.add('finances', finance);
        }

        for (const debt of debts) {
            await this.add('debts', debt);
        }

        await this.put('settings', { id: 'rentSettings', ...rentSettings });
        await this.put('settings', { id: 'taskCategories', categories: taskCategories });
        await this.put('settings', { id: 'expenseCategories', categories: expenseCategories });
        await this.put('settings', { id: 'timerState', data: timerState });

        // Označíme migraci jako dokončenou
        localStorage.setItem('dbMigrated', 'true');
    }

    /**
     * Načtení dat z localStorage (fallback)
     * @private
     */
    _loadFromLocalStorage() {
        this.cache.workLogs = JSON.parse(localStorage.getItem('workLogs')) || [];
        this.cache.finances = JSON.parse(localStorage.getItem('finances')) || [];
        this.cache.debts = JSON.parse(localStorage.getItem('debts')) || [];
        this.cache.settings = {
            rentSettings: JSON.parse(localStorage.getItem('rentSettings')) || { amount: 0, day: null },
            taskCategories: JSON.parse(localStorage.getItem('taskCategories')) || [],
            expenseCategories: JSON.parse(localStorage.getItem('expenseCategories')) || [],
            timerState: {
                data: {
                    startTime: localStorage.getItem('timerStartTime') ? parseInt(localStorage.getItem('timerStartTime')) : null,
                    pauseTime: localStorage.getItem('timerPauseTime') ? parseInt(localStorage.getItem('timerPauseTime')) : null,
                    isRunning: localStorage.getItem('timerIsRunning') === 'true',
                    person: localStorage.getItem('currentTimerPerson') || 'maru',
                    activity: localStorage.getItem('currentTimerActivity') || ''
                }
            }
        };
    }

    /**
     * Uložení dat do localStorage (fallback)
     * @private
     */
    _saveToLocalStorage() {
        if (this.cache.workLogs) localStorage.setItem('workLogs', JSON.stringify(this.cache.workLogs));
        if (this.cache.finances) localStorage.setItem('finances', JSON.stringify(this.cache.finances));
        if (this.cache.debts) localStorage.setItem('debts', JSON.stringify(this.cache.debts));
        
        if (this.cache.settings) {
            if (this.cache.settings.rentSettings) localStorage.setItem('rentSettings', JSON.stringify(this.cache.settings.rentSettings));
            if (this.cache.settings.taskCategories) localStorage.setItem('taskCategories', JSON.stringify(this.cache.settings.taskCategories.categories));
            if (this.cache.settings.expenseCategories) localStorage.setItem('expenseCategories', JSON.stringify(this.cache.settings.expenseCategories.categories));
            
            if (this.cache.settings.timerState && this.cache.settings.timerState.data) {
                const timerState = this.cache.settings.timerState.data;
                localStorage.setItem('timerStartTime', timerState.startTime ? timerState.startTime.toString() : '');
                localStorage.setItem('timerPauseTime', timerState.pauseTime ? timerState.pauseTime.toString() : '');
                localStorage.setItem('timerIsRunning', timerState.isRunning.toString());
                localStorage.setItem('currentTimerPerson', timerState.person);
                localStorage.setItem('currentTimerActivity', timerState.activity);
            }
        }
    }

    /**
     * Přidání položky do úložiště
     * @param {string} storeName Název úložiště
     * @param {object} data Data k uložení
     * @returns {Promise} Promise, který se vyřeší po uložení dat
     */
    async add(storeName, data) {
        await this.init();

        // Fallback pro localStorage
        if (this.useLocalStorage) {
            if (!this.cache[storeName]) this.cache[storeName] = [];
            this.cache[storeName].push(data);
            this._saveToLocalStorage();
            return data.id;
        }

        // Přidání do vyrovnávací paměti
        if (!this.cache[storeName]) this.cache[storeName] = [];
        this.cache[storeName].push(data);

        // Přidání do IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(data.id);
            request.onerror = (event) => {
                console.error(`Chyba při přidávání do ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Aktualizace položky v úložišti
     * @param {string} storeName Název úložiště
     * @param {object} data Data k aktualizaci
     * @returns {Promise} Promise, který se vyřeší po aktualizaci dat
     */
    async put(storeName, data) {
        await this.init();

        // Fallback pro localStorage
        if (this.useLocalStorage) {
            if (storeName === 'settings') {
                if (!this.cache.settings) this.cache.settings = {};
                this.cache.settings[data.id] = data;
            } else {
                if (!this.cache[storeName]) this.cache[storeName] = [];
                const index = this.cache[storeName].findIndex(item => item.id === data.id);
                if (index !== -1) {
                    this.cache[storeName][index] = data;
                } else {
                    this.cache[storeName].push(data);
                }
            }
            this._saveToLocalStorage();
            return data.id;
        }

        // Aktualizace ve vyrovnávací paměti
        if (storeName === 'settings') {
            if (!this.cache.settings) this.cache.settings = {};
            this.cache.settings[data.id] = data;
        } else {
            if (!this.cache[storeName]) this.cache[storeName] = [];
            const index = this.cache[storeName].findIndex(item => item.id === data.id);
            if (index !== -1) {
                this.cache[storeName][index] = data;
            } else {
                this.cache[storeName].push(data);
            }
        }

        // Aktualizace v IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(data.id);
            request.onerror = (event) => {
                console.error(`Chyba při aktualizaci v ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Získání všech položek z úložiště
     * @param {string} storeName Název úložiště
     * @returns {Promise<Array>} Promise, který se vyřeší s polem všech položek
     */
    async getAll(storeName) {
        await this.init();

        // Vrátit data z vyrovnávací paměti, pokud existují
        if (this.cache[storeName]) {
            return [...this.cache[storeName]];
        }

        // Fallback pro localStorage
        if (this.useLocalStorage) {
            return this.cache[storeName] || [];
        }

        // Načtení z IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                this.cache[storeName] = request.result;
                resolve([...request.result]);
            };
            request.onerror = (event) => {
                console.error(`Chyba při načítání z ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Získání položky podle ID
     * @param {string} storeName Název úložiště
     * @param {string} id ID položky
     * @returns {Promise<object>} Promise, který se vyřeší s nalezenou položkou
     */
    async get(storeName, id) {
        await this.init();

        // Pokusit se najít položku ve vyrovnávací paměti
        if (this.cache[storeName]) {
            if (storeName === 'settings') {
                return this.cache.settings[id];
            } else {
                const item = this.cache[storeName].find(item => item.id === id);
                if (item) return { ...item };
            }
        }

        // Fallback pro localStorage
        if (this.useLocalStorage) {
            if (storeName === 'settings') {
                return this.cache.settings ? this.cache.settings[id] : null;
            } else {
                return (this.cache[storeName] || []).find(item => item.id === id);
            }
        }

        // Načtení z IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                if (storeName === 'settings') {
                    if (!this.cache.settings) this.cache.settings = {};
                    this.cache.settings[id] = request.result;
                } else {
                    if (!this.cache[storeName]) this.cache[storeName] = [];
                    // Aktualizovat nebo přidat do cache
                    const index = this.cache[storeName].findIndex(item => item.id === id);
                    if (index !== -1) {
                        this.cache[storeName][index] = request.result;
                    } else {
                        this.cache[storeName].push(request.result);
                    }
                }
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error(`Chyba při načítání z ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Odstranění položky z úložiště
     * @param {string} storeName Název úložiště
     * @param {string} id ID položky
     * @returns {Promise} Promise, který se vyřeší po odstranění položky
     */
    async delete(storeName, id) {
        await this.init();

        // Fallback pro localStorage
        if (this.useLocalStorage) {
            if (storeName === 'settings') {
                if (this.cache.settings) delete this.cache.settings[id];
            } else {
                if (this.cache[storeName]) {
                    this.cache[storeName] = this.cache[storeName].filter(item => item.id !== id);
                }
            }
            this._saveToLocalStorage();
            return;
        }

        // Odstranění z vyrovnávací paměti
        if (storeName === 'settings') {
            if (this.cache.settings) delete this.cache.settings[id];
        } else {
            if (this.cache[storeName]) {
                this.cache[storeName] = this.cache[storeName].filter(item => item.id !== id);
            }
        }

        // Odstranění z IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => {
                console.error(`Chyba při odstraňování z ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Zálohování všech dat
     * @returns {Promise<object>} Promise, který se vyřeší s kompletními daty
     */
    async backup() {
        await this.init();
        
        // Získání všech dat
        const workLogs = await this.getAll('workLogs');
        const finances = await this.getAll('finances');
        const debts = await this.getAll('debts');
        
        // Získání nastavení
        let rentSettings = await this.get('settings', 'rentSettings');
        let taskCategories = await this.get('settings', 'taskCategories');
        let expenseCategories = await this.get('settings', 'expenseCategories');
        let timerState = await this.get('settings', 'timerState');
        
        // Výchozí hodnoty
        if (!rentSettings) rentSettings = { amount: 0, day: 1 };
        if (!taskCategories) taskCategories = { categories: [] };
        if (!expenseCategories) expenseCategories = { categories: [] };
        if (!timerState) timerState = { data: { startTime: null, pauseTime: null, isRunning: false, person: 'maru', activity: '' } };
        
        // Vytvoření zálohových dat
        return {
            timestamp: Date.now(),
            version: this.dbVersion,
            data: {
                workLogs,
                finances,
                debts,
                settings: {
                    rentSettings,
                    taskCategories,
                    expenseCategories,
                    timerState
                }
            }
        };
    }

    /**
     * Obnovení dat ze zálohy
     * @param {object} backupData Data zálohy
     * @returns {Promise} Promise, který se vyřeší po obnovení dat
     */
    async restore(backupData) {
        if (!backupData || !backupData.data) {
            throw new Error('Neplatná záložní data');
        }

        await this.init();

        try {
            // Vyčištění stávajících dat
            if (!this.useLocalStorage) {
                const workLogsStore = this.db.transaction(['workLogs'], 'readwrite').objectStore('workLogs');
                const financesStore = this.db.transaction(['finances'], 'readwrite').objectStore('finances');
                const debtsStore = this.db.transaction(['debts'], 'readwrite').objectStore('debts');
                const settingsStore = this.db.transaction(['settings'], 'readwrite').objectStore('settings');

                await Promise.all([
                    this._clearObjectStore(workLogsStore),
                    this._clearObjectStore(financesStore),
                    this._clearObjectStore(debtsStore),
                    this._clearObjectStore(settingsStore)
                ]);
            }

            // Obnovení dat z zálohy
            const { workLogs, finances, debts, settings } = backupData.data;

            // Obnovení dat
            for (const log of workLogs) {
                await this.add('workLogs', log);
            }

            for (const finance of finances) {
                await this.add('finances', finance);
            }

            for (const debt of debts) {
                await this.add('debts', debt);
            }

            // Obnovení nastavení
            await this.put('settings', settings.rentSettings);
            await this.put('settings', settings.taskCategories);
            await this.put('settings', settings.expenseCategories);
            await this.put('settings', settings.timerState);

            // Vyčištění cache
            this.cache = {};
            this.cache.workLogs = workLogs;
            this.cache.finances = finances;
            this.cache.debts = debts;
            this.cache.settings = settings;

            // Pokud používáme localStorage, aktualizujeme ho
            if (this.useLocalStorage) {
                this._saveToLocalStorage();
            }

            return true;
        } catch (error) {
            console.error('Chyba při obnovování ze zálohy:', error);
            throw error;
        }
    }

    /**
     * Vyčištění úložiště objektů
     * @param {IDBObjectStore} store Úložiště objektů
     * @returns {Promise} Promise, který se vyřeší po vyčištění úložiště
     * @private
     */
    _clearObjectStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}

// Vytvoření a export instance pro globální použití
const storageManager = new StorageManager();
export default storageManager;