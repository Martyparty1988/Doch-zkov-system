/**
 * finance.js
 * Modul pro správu financí
 */

import storageManager from './storage.js';
import { 
    formatDateCZ, 
    generateId, 
    parseNumber
} from './utils.js';
import { 
    notifications, 
    dialogs, 
    loading
} from './ui.js';

/**
 * Třída pro správu financí
 */
class FinanceManager {
    constructor() {
        // DOM elementy
        this.financeForm = null;
        this.editFinanceIdInput = null;
        this.saveFinanceButton = null;
        this.cancelFinanceEditButton = null;
        this.financeTableBody = null;
        this.financeCategorySelect = null;
        
        // Event listeners pro externí události
        this.eventListeners = {
            onFinanceAdded: [],
            onFinanceEdited: [],
            onFinanceDeleted: []
        };
    }

    /**
     * Inicializace správce financí
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.financeForm = document.getElementById('finance-form');
        this.editFinanceIdInput = document.getElementById('edit-finance-id');
        this.saveFinanceButton = document.getElementById('save-finance-button');
        this.cancelFinanceEditButton = document.getElementById('cancel-finance-edit-button');
        this.financeTableBody = document.getElementById('finance-table');
        this.financeCategorySelect = document.getElementById('finance-category');
        
        // Přidání event listenerů pro formulář
        if (this.financeForm) {
            this.financeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Přidání event listenerů pro zrušení editace
        if (this.cancelFinanceEditButton) {
            this.cancelFinanceEditButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelEdit();
            });
        }
        
        // Nastavení dnešního data pro finanční záznam
        const dateInput = document.getElementById('finance-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        // Poslouchání na změny sekcí
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.sectionId === 'finance') {
                this.renderFinances();
            }
        });
        
        // Počáteční vykreslení financí
        await this.renderFinances();
    }

    /**
     * Zpracování odeslání formuláře
     * @param {Event} e Event objekt
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            loading.show();
            
            const type = document.getElementById('finance-type').value;
            const description = document.getElementById('finance-description').value;
            const amount = parseNumber(document.getElementById('finance-amount').value);
            const currency = document.getElementById('finance-currency').value;
            const date = document.getElementById('finance-date').value;
            const category = this.financeCategorySelect ? this.financeCategorySelect.value : '';
            
            // Validace
            if (!description) {
                notifications.error('Zadejte popis');
                return;
            }
            
            if (isNaN(amount) || amount <= 0) {
                notifications.error('Zadejte platnou částku');
                return;
            }
            
            if (!date) {
                notifications.error('Zadejte platné datum');
                return;
            }
            
            // Přidat kategorii, pokud je nová a jedná se o výdaj
            if (category && type === 'expense') {
                const expenseCategories = await storageManager.get('settings', 'expenseCategories');
                if (expenseCategories && !expenseCategories.categories.includes(category)) {
                    expenseCategories.categories.push(category);
                    await storageManager.put('settings', expenseCategories);
                    
                    // Vyvolat událost pro aktualizaci kategorií
                    document.dispatchEvent(new CustomEvent('categoriesUpdated'));
                }
            }
            
            const editId = this.editFinanceIdInput.value;
            
            // Vytvoření záznamu
            const finance = {
                id: editId || generateId(),
                type,
                description,
                amount,
                currency,
                date,
                category
            };
            
            if (editId) {
                // Editace existujícího záznamu
                await storageManager.put('finances', finance);
                
                // Resetovat formulář pro přidání nového záznamu
                this.saveFinanceButton.textContent = 'Přidat';
                this.cancelFinanceEditButton.style.display = 'none';
                this.editFinanceIdInput.value = '';
                
                notifications.success('Záznam byl upraven');
                
                // Vyvolání událostí
                this.triggerEvent('onFinanceEdited', finance);
            } else {
                // Přidat nový záznam
                await storageManager.add('finances', finance);
                
                notifications.success('Záznam byl přidán');
                
                // Vyvolání událostí
                this.triggerEvent('onFinanceAdded', finance);
            }
            
            // Aktualizace UI
            await this.renderFinances();
            
            // Reset formuláře
            this.financeForm.reset();
            document.getElementById('finance-date').valueAsDate = new Date();
        } catch (error) {
            console.error('Chyba při zpracování formuláře:', error);
            notifications.error('Chyba při zpracování formuláře');
        } finally {
            loading.hide();
        }
    }

    /**
     * Zrušení editace
     */
    cancelEdit() {
        this.saveFinanceButton.textContent = 'Přidat';
        this.cancelFinanceEditButton.style.display = 'none';
        this.editFinanceIdInput.value = '';
        this.financeForm.reset();
        document.getElementById('finance-date').valueAsDate = new Date();
    }

    /**
     * Editace finančního záznamu
     * @param {string} id ID záznamu
     */
    async editFinance(id) {
        try {
            loading.show();
            
            const finance = await storageManager.get('finances', id);
            if (!finance) return;
            
            // Naplnit formulář daty
            document.getElementById('finance-type').value = finance.type;
            document.getElementById('finance-description').value = finance.description;
            document.getElementById('finance-amount').value = finance.amount;
            document.getElementById('finance-currency').value = finance.currency;
            document.getElementById('finance-date').value = finance.date;
            
            // Nastavit kategorii, pokud existuje
            if (this.financeCategorySelect && finance.category) {
                for (let i = 0; i < this.financeCategorySelect.options.length; i++) {
                    if (this.financeCategorySelect.options[i].value === finance.category) {
                        this.financeCategorySelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Nastavit ID editovaného záznamu a změnit text tlačítka
            this.editFinanceIdInput.value = id;
            this.saveFinanceButton.textContent = 'Uložit změny';
            this.cancelFinanceEditButton.style.display = 'block';
            
            // Přeskrolovat na formulář
            this.financeForm.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Chyba při editaci záznamu:', error);
            notifications.error('Chyba při načítání záznamu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Smazání finančního záznamu
     * @param {string} id ID záznamu
     */
    async deleteFinance(id) {
        try {
            const confirmed = await dialogs.confirm('Opravdu chcete smazat tento záznam?');
            if (!confirmed) return;
            
            loading.show();
            
            // Kontrola, zda záznam není splátka dluhu
            const finance = await storageManager.get('finances', id);
            if (finance && finance.debtId) {
                // Aktualizovat dluh - odečíst splátku
                const debt = await storageManager.get('debts', finance.debtId);
                if (debt) {
                    debt.paid = Math.max(0, (debt.paid || 0) - finance.amount);
                    await storageManager.put('debts', debt);
                }
            }
            
            await storageManager.delete('finances', id);
            
            notifications.success('Záznam byl smazán');
            
            // Aktualizace UI
            await this.renderFinances();
            
            // Vyvolání událostí
            this.triggerEvent('onFinanceDeleted', { id });
        } catch (error) {
            console.error('Chyba při mazání záznamu:', error);
            notifications.error('Chyba při mazání záznamu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Vykreslení seznamu financí
     */
    async renderFinances() {
        if (!this.financeTableBody) return;
        
        try {
            loading.show();
            
            // Vyčistit tabulku
            this.financeTableBody.innerHTML = '';
            
            // Načtení všech finančních záznamů
            const finances = await storageManager.getAll('finances');
            
            // Seřadit finance od nejnovějších
            const sortedFinances = [...finances].sort((a, b) => {
                // Nejprve podle data
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });
            
            // Zobrazit zprávu, pokud nejsou žádné záznamy
            if (sortedFinances.length === 0) {
                const row = this.financeTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 7;
                cell.textContent = 'Žádné finanční záznamy';
                cell.style.textAlign = 'center';
                cell.style.padding = '2rem';
                cell.style.color = '#888';
                return;
            }
            
            // Vykreslení záznamů
            sortedFinances.forEach(finance => {
                const row = this.financeTableBody.insertRow();
                row.dataset.id = finance.id;
                
                // Vytvoření buněk
                const typeCell = row.insertCell();
                typeCell.textContent = finance.type === 'income' ? 'Příjem' : 'Výdaj';
                
                const descriptionCell = row.insertCell();
                descriptionCell.textContent = finance.description;
                
                const amountCell = row.insertCell();
                amountCell.textContent = finance.amount.toFixed(2);
                
                const currencyCell = row.insertCell();
                currencyCell.textContent = finance.currency;
                
                const dateCell = row.insertCell();
                dateCell.textContent = formatDateCZ(finance.date);
                
                const categoryCell = row.insertCell();
                categoryCell.textContent = finance.category || '';
                
                // Tlačítka pro akce
                const actionsCell = row.insertCell();
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'action-buttons';
                
                // Tlačítko pro editaci
                const editButton = document.createElement('button');
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.className = 'edit-btn';
                editButton.setAttribute('aria-label', 'Upravit záznam');
                editButton.dataset.id = finance.id;
                editButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.editFinance(finance.id);
                });
                
                // Tlačítko pro smazání
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.setAttribute('aria-label', 'Smazat záznam');
                deleteButton.dataset.id = finance.id;
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.deleteFinance(finance.id);
                });
                
                actionsDiv.appendChild(editButton);
                actionsDiv.appendChild(deleteButton);
                actionsCell.appendChild(actionsDiv);
            });
        } catch (error) {
            console.error('Chyba při vykreslování finančních záznamů:', error);
            notifications.error('Chyba při načítání finančních záznamů');
        } finally {
            loading.hide();
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
const financeManager = new FinanceManager();
export default financeManager;