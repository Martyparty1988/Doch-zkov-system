/**
 * app.js
 * Hlavní aplikační soubor
 */

import storageManager from './storage.js';
import timerManager from './timer.js';
import workLogManager from './worklog.js';
import financeManager from './finance.js';
import deductionManager from './deductions.js';
import debtManager from './debt.js';
import chartManager from './charts.js';
import exportManager from './export.js';
import { getCurrentDateString } from './utils.js';
import { loading, notifications } from './ui.js';

/**
 * Třída pro hlavní aplikaci
 */
class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializace aplikace
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        try {
            if (this.initialized) return;
            
            // Zobrazení loading indikátoru
            loading.show();
            
            console.log('Inicializace aplikace...');
            
            // Inicializace úložiště
            await storageManager.init();
            console.log('Úložiště inicializováno');
            
            // Kontrola a vytvoření výchozích dat
            await this.initializeDefaultData();
            
            // Inicializace jednotlivých modulů
            await this.initializeModules();
            
            // Naplnění selectů s kategoriemi
            this.populateSelects();
            
            // Nastavení dnešního data ve formulářích
            this.setTodayDateInForms();
            
            // Přidání event listeneru pro změny kategorií
            document.addEventListener('categoriesUpdated', () => {
                this.populateSelects();
            });
            
            // Přidání event listeneru pro obnovu dat ze zálohy
            document.addEventListener('dataRestored', () => {
                notifications.success('Data byla úspěšně obnovena. Stránka bude obnovena.');
            });
            
            this.initialized = true;
            console.log('Aplikace úspěšně inicializována');
        } catch (error) {
            console.error('Chyba při inicializaci aplikace:', error);
            notifications.error('Chyba při inicializaci aplikace. Zkuste obnovit stránku.');
        } finally {
            // Skrytí loading indikátoru
            loading.hide();
        }
    }

    /**
     * Inicializace výchozích dat
     */
    async initializeDefaultData() {
        try {
            // Kontrola a vytvoření výchozích kategorií úkolů
            let taskCategories = await storageManager.get('settings', 'taskCategories');
            if (!taskCategories) {
                taskCategories = {
                    id: 'taskCategories',
                    categories: ['Programování', 'Design', 'Administrativa', 'Marketing', 'Projektové řízení']
                };
                await storageManager.put('settings', taskCategories);
            }
            
            // Kontrola a vytvoření výchozích kategorií výdajů
            let expenseCategories = await storageManager.get('settings', 'expenseCategories');
            if (!expenseCategories) {
                expenseCategories = {
                    id: 'expenseCategories',
                    categories: ['Jídlo', 'Doprava', 'Bydlení', 'Služby', 'Zábava', 'Zdraví']
                };
                await storageManager.put('settings', expenseCategories);
            }
            
            // Kontrola a vytvoření výchozího nastavení nájmu
            let rentSettings = await storageManager.get('settings', 'rentSettings');
            if (!rentSettings) {
                rentSettings = {
                    id: 'rentSettings',
                    amount: 0,
                    day: 1
                };
                await storageManager.put('settings', rentSettings);
            }
            
            // Kontrola a vytvoření výchozího stavu časovače
            let timerState = await storageManager.get('settings', 'timerState');
            if (!timerState) {
                timerState = {
                    id: 'timerState',
                    data: {
                        startTime: null,
                        pauseTime: null,
                        isRunning: false,
                        person: 'maru',
                        activity: ''
                    }
                };
                await storageManager.put('settings', timerState);
            }
        } catch (error) {
            console.error('Chyba při inicializaci výchozích dat:', error);
            throw error;
        }
    }

    /**
     * Inicializace jednotlivých modulů
     */
    async initializeModules() {
        try {
            // Inicializace správce časovače
            await timerManager.init();
            console.log('Časovač inicializován');
            
            // Inicializace správce pracovních záznamů
            await workLogManager.init();
            console.log('Správce pracovních záznamů inicializován');
            
            // Inicializace správce financí
            await financeManager.init();
            console.log('Správce financí inicializován');
            
            // Inicializace správce srážek
            await deductionManager.init();
            console.log('Správce srážek inicializován');
            
            // Inicializace správce dluhů
            await debtManager.init();
            console.log('Správce dluhů inicializován');
            
            // Inicializace správce grafů
            await chartManager.init();
            console.log('Správce grafů inicializován');
            
            // Inicializace správce exportu
            await exportManager.init();
            console.log('Správce exportu inicializován');
            
            // Inicializace nastavení
            await this.initializeSettings();
            console.log('Nastavení inicializováno');
        } catch (error) {
            console.error('Chyba při inicializaci modulů:', error);
            throw error;
        }
    }

    /**
     * Inicializace nastavení
     */
    async initializeSettings() {
        try {
            // Naplnění seznamu kategorií úkolů
            await this.renderTaskCategories();
            
            // Naplnění seznamu kategorií výdajů
            await this.renderExpenseCategories();
            
            // Nastavení hodnot pro nájem
            await this.initializeRentSettings();
            
            // Přidání event listenerů pro přidání kategorií
            this.initCategoryEvents();
            
            // Přidání event listeneru pro uložení nastavení nájmu
            this.initRentSettingsEvents();
        } catch (error) {
            console.error('Chyba při inicializaci nastavení:', error);
            throw error;
        }
    }

    /**
     * Naplnění selectů s kategoriemi
     */
    async populateSelects() {
        try {
            // Načtení kategorií
            const taskCategories = await storageManager.get('settings', 'taskCategories');
            const expenseCategories = await storageManager.get('settings', 'expenseCategories');
            
            // Seznam selectů pro kategorie úkolů
            const activitySelects = [
                { id: 'timer-activity', emptyOption: '-- Vyberte úkol --' },
                { id: 'manual-activity', emptyOption: '-- Vyberte úkol --' },
                { id: 'filter-activity', emptyOption: 'Všechny úkoly' }
            ];
            
            // Naplnění selectů s kategoriemi úkolů
            activitySelects.forEach(({ id, emptyOption }) => {
                const select = document.getElementById(id);
                if (!select) return;
                
                // Uložit aktuální hodnotu
                const currentValue = select.value;
                
                // Vyčistit options kromě první prázdné
                select.innerHTML = '';
                
                // Přidat prázdnou volbu
                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = emptyOption;
                select.appendChild(emptyOpt);
                
                // Přidat kategorie úkolů
                if (taskCategories && taskCategories.categories) {
                    taskCategories.categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        select.appendChild(option);
                    });
                }
                
                // Obnovit vybranou hodnotu
                if (currentValue) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === currentValue) {
                            select.selectedIndex = i;
                            break;
                        }
                    }
                }
            });
            
            // Naplnění selectu s kategoriemi výdajů
            const financeCategorySelect = document.getElementById('finance-category');
            if (financeCategorySelect) {
                // Uložit aktuální hodnotu
                const currentValue = financeCategorySelect.value;
                
                // Vyčistit options kromě první prázdné
                financeCategorySelect.innerHTML = '';
                
                // Přidat prázdnou volbu
                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = '-- Vyberte kategorii --';
                financeCategorySelect.appendChild(emptyOpt);
                
                // Přidat kategorie výdajů
                if (expenseCategories && expenseCategories.categories) {
                    expenseCategories.categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        financeCategorySelect.appendChild(option);
                    });
                }
                
                // Obnovit vybranou hodnotu
                if (currentValue) {
                    for (let i = 0; i < financeCategorySelect.options.length; i++) {
                        if (financeCategorySelect.options[i].value === currentValue) {
                            financeCategorySelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Chyba při naplňování selectů:', error);
        }
    }

    /**
     * Nastavení dnešního data ve formulářích
     */
    setTodayDateInForms() {
        // Seznam input elementů s typem date
        const dateInputs = [
            'manual-date',
            'finance-date'
        ];
        
        // Nastavení dnešního data
        const today = getCurrentDateString();
        
        dateInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = today;
            }
        });
    }

    /**
     * Vykreslení seznamu kategorií úkolů
     */
    async renderTaskCategories() {
        try {
            const taskCategoriesList = document.getElementById('task-categories-list');
            if (!taskCategoriesList) return;
            
            // Načtení kategorií úkolů
            const taskCategories = await storageManager.get('settings', 'taskCategories');
            if (!taskCategories || !taskCategories.categories) return;
            
            // Vyčistit seznam
            taskCategoriesList.innerHTML = '';
            
            // Přidat kategorie do seznamu
            taskCategories.categories.forEach((category, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${category}</span>`;
                
                // Tlačítko pro smazání
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.setAttribute('aria-label', 'Smazat kategorii');
                deleteButton.dataset.index = index;
                deleteButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await this.deleteTaskCategory(index);
                });
                
                li.appendChild(deleteButton);
                taskCategoriesList.appendChild(li);
            });
        } catch (error) {
            console.error('Chyba při vykreslování kategorií úkolů:', error);
        }
    }

    /**
     * Vykreslení seznamu kategorií výdajů
     */
    async renderExpenseCategories() {
        try {
            const expenseCategoriesList = document.getElementById('expense-categories-list');
            if (!expenseCategoriesList) return;
            
            // Načtení kategorií výdajů
            const expenseCategories = await storageManager.get('settings', 'expenseCategories');
            if (!expenseCategories || !expenseCategories.categories) return;
            
            // Vyčistit seznam
            expenseCategoriesList.innerHTML = '';
            
            // Přidat kategorie do seznamu
            expenseCategories.categories.forEach((category, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${category}</span>`;
                
                // Tlačítko pro smazání
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.setAttribute('aria-label', 'Smazat kategorii');
                deleteButton.dataset.index = index;
                deleteButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await this.deleteExpenseCategory(index);
                });
                
                li.appendChild(deleteButton);
                expenseCategoriesList.appendChild(li);
            });
        } catch (error) {
            console.error('Chyba při vykreslování kategorií výdajů:', error);
        }
    }

    /**
     * Inicializace nastavení nájmu
     */
    async initializeRentSettings() {
        try {
            // Načtení nastavení nájmu
            const rentSettings = await storageManager.get('settings', 'rentSettings');
            if (!rentSettings) return;
            
            // Nastavení hodnot v inputech
            const rentAmountInput = document.getElementById('rent-amount');
            const rentDayInput = document.getElementById('rent-day');
            
            if (rentAmountInput && rentSettings.amount !== undefined) {
                rentAmountInput.value = rentSettings.amount;
            }
            
            if (rentDayInput && rentSettings.day !== undefined) {
                rentDayInput.value = rentSettings.day;
            }
        } catch (error) {
            console.error('Chyba při inicializaci nastavení nájmu:', error);
        }
    }

    /**
     * Inicializace event listenerů pro kategorie
     */
    initCategoryEvents() {
        // Přidání kategorie úkolu
        const addTaskCategoryButton = document.getElementById('add-task-category');
        const newTaskCategoryInput = document.getElementById('new-task-category');
        
        if (addTaskCategoryButton && newTaskCategoryInput) {
            addTaskCategoryButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.addTaskCategory(newTaskCategoryInput.value);
            });
        }
        
        // Přidání kategorie výdajů
        const addExpenseCategoryButton = document.getElementById('add-expense-category');
        const newExpenseCategoryInput = document.getElementById('new-expense-category');
        
        if (addExpenseCategoryButton && newExpenseCategoryInput) {
            addExpenseCategoryButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.addExpenseCategory(newExpenseCategoryInput.value);
            });
        }
    }

    /**
     * Inicializace event listenerů pro nastavení nájmu
     */
    initRentSettingsEvents() {
        const saveRentSettingsButton = document.getElementById('save-rent-settings');
        if (!saveRentSettingsButton) return;
        
        saveRentSettingsButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.saveRentSettings();
        });
    }

    /**
     * Přidání kategorie úkolu
     * @param {string} categoryName Název kategorie
     */
    async addTaskCategory(categoryName) {
        try {
            loading.show();
            
            const category = categoryName.trim();
            if (!category) {
                notifications.warning('Zadejte název kategorie');
                return;
            }
            
            // Načtení kategorií úkolů
            const taskCategories = await storageManager.get('settings', 'taskCategories');
            if (!taskCategories) return;
            
            // Kontrola, zda kategorie již existuje
            if (taskCategories.categories.includes(category)) {
                notifications.warning('Tato kategorie úkolu již existuje');
                return;
            }
            
            // Přidání nové kategorie
            taskCategories.categories.push(category);
            
            // Uložení kategorií
            await storageManager.put('settings', taskCategories);
            
            // Vyčištění inputu
            const newTaskCategoryInput = document.getElementById('new-task-category');
            if (newTaskCategoryInput) {
                newTaskCategoryInput.value = '';
            }
            
            // Aktualizace UI
            await this.renderTaskCategories();
            this.populateSelects();
            
            notifications.success('Kategorie úkolu byla přidána');
        } catch (error) {
            console.error('Chyba při přidávání kategorie úkolu:', error);
            notifications.error('Chyba při přidávání kategorie úkolu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Smazání kategorie úkolu
     * @param {number} index Index kategorie
     */
    async deleteTaskCategory(index) {
        try {
            loading.show();
            
            // Načtení kategorií úkolů
            const taskCategories = await storageManager.get('settings', 'taskCategories');
            if (!taskCategories || !taskCategories.categories || index >= taskCategories.categories.length) return;
            
            // Smazání kategorie
            taskCategories.categories.splice(index, 1);
            
            // Uložení kategorií
            await storageManager.put('settings', taskCategories);
            
            // Aktualizace UI
            await this.renderTaskCategories();
            this.populateSelects();
            
            notifications.success('Kategorie úkolu byla smazána');
        } catch (error) {
            console.error('Chyba při mazání kategorie úkolu:', error);
            notifications.error('Chyba při mazání kategorie úkolu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Přidání kategorie výdajů
     * @param {string} categoryName Název kategorie
     */
    async addExpenseCategory(categoryName) {
        try {
            loading.show();
            
            const category = categoryName.trim();
            if (!category) {
                notifications.warning('Zadejte název kategorie');
                return;
            }
            
            // Načtení kategorií výdajů
            const expenseCategories = await storageManager.get('settings', 'expenseCategories');
            if (!expenseCategories) return;
            
            // Kontrola, zda kategorie již existuje
            if (expenseCategories.categories.includes(category)) {
                notifications.warning('Tato kategorie výdajů již existuje');
                return;
            }
            
            // Přidání nové kategorie
            expenseCategories.categories.push(category);
            
            // Uložení kategorií
            await storageManager.put('settings', expenseCategories);
            
            // Vyčištění inputu
            const newExpenseCategoryInput = document.getElementById('new-expense-category');
            if (newExpenseCategoryInput) {
                newExpenseCategoryInput.value = '';
            }
            
            // Aktualizace UI
            await this.renderExpenseCategories();
            this.populateSelects();
            
            notifications.success('Kategorie výdajů byla přidána');
        } catch (error) {
            console.error('Chyba při přidávání kategorie výdajů:', error);
            notifications.error('Chyba při přidávání kategorie výdajů');
        } finally {
            loading.hide();
        }
    }

    /**
     * Smazání kategorie výdajů
     * @param {number} index Index kategorie
     */
    async deleteExpenseCategory(index) {
        try {
            loading.show();
            
            // Načtení kategorií výdajů
            const expenseCategories = await storageManager.get('settings', 'expenseCategories');
            if (!expenseCategories || !expenseCategories.categories || index >= expenseCategories.categories.length) return;
            
            // Smazání kategorie
            expenseCategories.categories.splice(index, 1);
            
            // Uložení kategorií
            await storageManager.put('settings', expenseCategories);
            
            // Aktualizace UI
            await this.renderExpenseCategories();
            this.populateSelects();
            
            notifications.success('Kategorie výdajů byla smazána');
        } catch (error) {
            console.error('Chyba při mazání kategorie výdajů:', error);
            notifications.error('Chyba při mazání kategorie výdajů');
        } finally {
            loading.hide();
        }
    }

    /**
     * Uložení nastavení nájmu
     */
    async saveRentSettings() {
        try {
            loading.show();
            
            const rentAmountInput = document.getElementById('rent-amount');
            const rentDayInput = document.getElementById('rent-day');
            
            if (!rentAmountInput || !rentDayInput) return;
            
            const amount = parseFloat(rentAmountInput.value);
            const day = parseInt(rentDayInput.value);
            
            // Validace
            if (isNaN(amount) || amount < 0) {
                notifications.warning('Zadejte platnou výši nájmu');
                return;
            }
            
            if (isNaN(day) || day < 1 || day > 31) {
                notifications.warning('Zadejte platný den v měsíci (1-31)');
                return;
            }
            
            // Načtení nastavení nájmu
            let rentSettings = await storageManager.get('settings', 'rentSettings');
            if (!rentSettings) {
                rentSettings = {
                    id: 'rentSettings',
                    amount: 0,
                    day: 1
                };
            }
            
            // Aktualizace nastavení
            rentSettings.amount = amount;
            rentSettings.day = day;
            
            // Uložení nastavení
            await storageManager.put('settings', rentSettings);
            
            notifications.success('Nastavení nájmu bylo uloženo');
        } catch (error) {
            console.error('Chyba při ukládání nastavení nájmu:', error);
            notifications.error('Chyba při ukládání nastavení nájmu');
        } finally {
            loading.hide();
        }
    }
}

// Vytvoření a export instance pro globální použití
const app = new App();

// Inicializace aplikace po načtení DOMu
document.addEventListener('DOMContentLoaded', () => {
    app.init().catch(error => {
        console.error('Chyba při inicializaci aplikace:', error);
    });
});