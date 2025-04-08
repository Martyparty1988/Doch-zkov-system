/**
 * debt.js
 * Modul pro správu dluhů a splátek
 */

import storageManager from './storage.js';
import { generateId, parseNumber } from './utils.js';
import { notifications, dialogs, loading } from './ui.js';

/**
 * Třída pro správu dluhů a splátek
 */
class DebtManager {
    constructor() {
        // DOM elementy
        this.debtForm = null;
        this.editDebtIdInput = null;
        this.saveDebtButton = null;
        this.cancelDebtEditButton = null;
        this.debtsListDiv = null;
        
        // Formulář pro splátky
        this.paymentForm = null;
        this.editPaymentIdInput = null;
        this.savePaymentButton = null;
        this.cancelPaymentEditButton = null;
        this.paymentPersonSelect = null;
        this.paymentDebtIdSelect = null;
        
        // Event listeners pro externí události
        this.eventListeners = {
            onDebtAdded: [],
            onDebtEdited: [],
            onDebtDeleted: [],
            onPaymentAdded: [],
            onPaymentEdited: [],
            onPaymentDeleted: []
        };
    }

    /**
     * Inicializace správce dluhů
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.debtForm = document.getElementById('debt-form');
        this.editDebtIdInput = document.getElementById('edit-debt-id');
        this.saveDebtButton = document.getElementById('save-debt-button');
        this.cancelDebtEditButton = document.getElementById('cancel-debt-edit-button');
        this.debtsListDiv = document.getElementById('debts-list');
        
        this.paymentForm = document.getElementById('payment-form');
        this.editPaymentIdInput = document.getElementById('edit-payment-id');
        this.savePaymentButton = document.getElementById('save-payment-button');
        this.cancelPaymentEditButton = document.getElementById('cancel-payment-edit-button');
        this.paymentPersonSelect = document.getElementById('payment-person');
        this.paymentDebtIdSelect = document.getElementById('payment-debt-id');
        
        // Přidání event listenerů pro formuláře
        if (this.debtForm) {
            this.debtForm.addEventListener('submit', (e) => this.handleDebtFormSubmit(e));
        }
        
        if (this.paymentForm) {
            this.paymentForm.addEventListener('submit', (e) => this.handlePaymentFormSubmit(e));
        }
        
        // Přidání event listenerů pro zrušení editace
        if (this.cancelDebtEditButton) {
            this.cancelDebtEditButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelDebtEdit();
            });
        }
        
        if (this.cancelPaymentEditButton) {
            this.cancelPaymentEditButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelPaymentEdit();
            });
        }
        
        // Přidání event listenerů pro změnu osoby při platbě
        if (this.paymentPersonSelect) {
            this.paymentPersonSelect.addEventListener('change', () => this.populateDebtSelect());
        }
        
        // Poslouchání na změny sekcí
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.sectionId === 'srazky') {
                this.renderDebts();
                this.populateDebtSelect();
            }
        });
        
        // Počáteční vykreslení dluhů
        await this.renderDebts();
        await this.populateDebtSelect();
    }

    /**
     * Zpracování odeslání formuláře pro dluh
     * @param {Event} e Event objekt
     */
    async handleDebtFormSubmit(e) {
        e.preventDefault();
        
        try {
            loading.show();
            
            const person = document.getElementById('debt-person').value;
            const description = document.getElementById('debt-description').value;
            const amount = parseNumber(document.getElementById('debt-amount').value);
            const currency = document.getElementById('debt-currency').value;
            
            // Validace
            if (!description) {
                notifications.error('Zadejte popis dluhu');
                return;
            }
            
            if (isNaN(amount) || amount <= 0) {
                notifications.error('Zadejte platnou částku dluhu');
                return;
            }
            
            const editId = this.editDebtIdInput.value;
            
            // Vytvoření záznamu
            const debt = {
                id: editId || generateId(),
                person,
                description,
                amount,
                currency,
                paid: editId ? (await storageManager.get('debts', editId))?.paid || 0 : 0
            };
            
            if (editId) {
                // Editace existujícího záznamu
                await storageManager.put('debts', debt);
                
                // Resetovat formulář pro přidání nového záznamu
                this.saveDebtButton.textContent = 'Přidat dluh';
                this.cancelDebtEditButton.style.display = 'none';
                this.editDebtIdInput.value = '';
                
                notifications.success('Dluh byl upraven');
                
                // Vyvolání událostí
                this.triggerEvent('onDebtEdited', debt);
            } else {
                // Přidat nový záznam
                await storageManager.add('debts', debt);
                
                notifications.success('Dluh byl přidán');
                
                // Vyvolání událostí
                this.triggerEvent('onDebtAdded', debt);
            }
            
            // Aktualizace UI
            await this.renderDebts();
            await this.populateDebtSelect();
            
            // Reset formuláře
            this.debtForm.reset();
        } catch (error) {
            console.error('Chyba při zpracování formuláře dluhu:', error);
            notifications.error('Chyba při zpracování formuláře');
        } finally {
            loading.hide();
        }
    }

    /**
     * Zpracování odeslání formuláře pro splátku
     * @param {Event} e Event objekt
     */
    async handlePaymentFormSubmit(e) {
        e.preventDefault();
        
        try {
            loading.show();
            
            const person = this.paymentPersonSelect.value;
            const description = document.getElementById('payment-description').value;
            const amount = parseNumber(document.getElementById('payment-amount').value);
            const currency = document.getElementById('payment-currency').value;
            const debtId = this.paymentDebtIdSelect ? this.paymentDebtIdSelect.value : '';
            
            // Validace
            if (!description) {
                notifications.error('Zadejte popis splátky');
                return;
            }
            
            if (isNaN(amount) || amount <= 0) {
                notifications.error('Zadejte platnou částku splátky');
                return;
            }
            
            if (!debtId) {
                notifications.error('Vyberte dluh ke splácení');
                return;
            }
            
            const editId = this.editPaymentIdInput.value;
            let oldDebtId = '';
            let oldAmount = 0;
            
            if (editId) {
                // Editace existující splátky - najít původní záznam
                const payment = await storageManager.get('finances', editId);
                if (payment) {
                    // Uložit původní hodnoty pro aktualizaci dluhu
                    oldDebtId = payment.debtId;
                    oldAmount = payment.amount;
                    
                    // Pokud se mění dluh, odečíst splátku od původního dluhu
                    if (oldDebtId && oldDebtId !== debtId) {
                        const oldDebt = await storageManager.get('debts', oldDebtId);
                        if (oldDebt) {
                            oldDebt.paid = Math.max(0, (oldDebt.paid || 0) - oldAmount);
                            await storageManager.put('debts', oldDebt);
                        }
                    }
                    
                    // Aktualizovat záznam splátky
                    payment.description = `Splátka dluhu: ${description}`;
                    payment.amount = amount;
                    payment.currency = currency;
                    payment.debtId = debtId;
                    
                    await storageManager.put('finances', payment);
                }
                
                // Resetovat formulář pro přidání nové splátky
                this.savePaymentButton.textContent = 'Přidat splátku';
                this.cancelPaymentEditButton.style.display = 'none';
                this.editPaymentIdInput.value = '';
                
                notifications.success('Splátka byla upravena');
                
                // Vyvolání událostí
                this.triggerEvent('onPaymentEdited', { id: editId, debtId, amount });
            } else {
                // Přidat nový záznam do financí
                const payment = {
                    id: generateId(),
                    type: 'expense',
                    description: `Splátka dluhu: ${description}`,
                    amount,
                    currency,
                    date: new Date().toISOString().slice(0, 10),
                    debtId: debtId,
                    person: person
                };
                
                await storageManager.add('finances', payment);
                
                notifications.success('Splátka byla přidána');
                
                // Vyvolání událostí
                this.triggerEvent('onPaymentAdded', payment);
            }
            
            // Aktualizovat splátku v dluhu
            if (debtId) {
                const debt = await storageManager.get('debts', debtId);
                if (debt) {
                    // Pokud jde o editaci, přidat jen rozdíl ve splátce
                    if (editId && oldDebtId === debtId) {
                        debt.paid = (debt.paid || 0) - oldAmount + amount;
                    } else {
                        debt.paid = (debt.paid || 0) + amount;
                    }
                    await storageManager.put('debts', debt);
                }
            }
            
            // Aktualizace UI
            await this.renderDebts();
            await this.populateDebtSelect();
            
            // Reset formuláře
            this.paymentForm.reset();
        } catch (error) {
            console.error('Chyba při zpracování formuláře splátky:', error);
            notifications.error('Chyba při zpracování formuláře');
        } finally {
            loading.hide();
        }
    }

    /**
     * Zrušení editace dluhu
     */
    cancelDebtEdit() {
        this.saveDebtButton.textContent = 'Přidat dluh';
        this.cancelDebtEditButton.style.display = 'none';
        this.editDebtIdInput.value = '';
        this.debtForm.reset();
    }

    /**
     * Zrušení editace splátky
     */
    cancelPaymentEdit() {
        this.savePaymentButton.textContent = 'Přidat splátku';
        this.cancelPaymentEditButton.style.display = 'none';
        this.editPaymentIdInput.value = '';
        this.paymentForm.reset();
    }

    /**
     * Editace dluhu
     * @param {string} id ID dluhu
     */
    async editDebt(id) {
        try {
            loading.show();
            
            const debt = await storageManager.get('debts', id);
            if (!debt) return;
            
            // Naplnit formulář daty
            document.getElementById('debt-person').value = debt.person;
            document.getElementById('debt-description').value = debt.description;
            document.getElementById('debt-amount').value = debt.amount;
            document.getElementById('debt-currency').value = debt.currency;
            
            // Nastavit ID editovaného záznamu a změnit text tlačítka
            this.editDebtIdInput.value = id;
            this.saveDebtButton.textContent = 'Uložit změny';
            this.cancelDebtEditButton.style.display = 'block';
            
            // Přeskrolovat na formulář
            this.debtForm.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Chyba při editaci dluhu:', error);
            notifications.error('Chyba při načítání dluhu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Editace splátky
     * @param {string} id ID splátky
     */
    async editPayment(id) {
        try {
            loading.show();
            
            const payment = await storageManager.get('finances', id);
            if (!payment || !payment.debtId) return;
            
            // Naplnit formulář daty
            this.paymentPersonSelect.value = payment.person || 'maru';
            document.getElementById('payment-description').value = payment.description.replace('Splátka dluhu: ', '');
            document.getElementById('payment-amount').value = payment.amount;
            document.getElementById('payment-currency').value = payment.currency;
            
            // Aktualizovat seznam dluhů a vybrat správný dluh
            await this.populateDebtSelect();
            if (payment.debtId) {
                if (this.paymentDebtIdSelect) {
                    setTimeout(() => { // Dát čas na aktualizaci seznamu
                        for (let i = 0; i < this.paymentDebtIdSelect.options.length; i++) {
                            if (this.paymentDebtIdSelect.options[i].value === payment.debtId) {
                                this.paymentDebtIdSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }, 100);
                }
            }
            
            // Nastavit ID editovaného záznamu a změnit text tlačítka
            this.editPaymentIdInput.value = id;
            this.savePaymentButton.textContent = 'Uložit změny';
            this.cancelPaymentEditButton.style.display = 'block';
            
            // Přeskrolovat na formulář
            this.paymentForm.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Chyba při editaci splátky:', error);
            notifications.error('Chyba při načítání splátky');
        } finally {
            loading.hide();
        }
    }

    /**
     * Smazání dluhu
     * @param {string} id ID dluhu
     */
    async deleteDebt(id) {
        try {
            // Najít splátky tohoto dluhu
            const finances = await storageManager.getAll('finances');
            const paymentsToRemove = finances.filter(f => f.debtId === id);
            
            let confirmed = await dialogs.confirm('Opravdu chcete smazat tento dluh?');
            if (!confirmed) return;
            
            // Pokud existují splátky, zobrazit další potvrzení
            if (paymentsToRemove.length > 0) {
                confirmed = await dialogs.confirm(
                    `Tento dluh má ${paymentsToRemove.length} splátk${paymentsToRemove.length > 1 ? 'y' : 'u'}. ` +
                    `Opravdu chcete smazat dluh i všechny jeho splátky?`
                );
                if (!confirmed) return;
            }
            
            loading.show();
            
            // Smazat dluh
            await storageManager.delete('debts', id);
            
            // Smazat splátky tohoto dluhu
            for (const payment of paymentsToRemove) {
                await storageManager.delete('finances', payment.id);
            }
            
            notifications.success('Dluh byl smazán');
            
            // Aktualizace UI
            await this.renderDebts();
            await this.populateDebtSelect();
            
            // Vyvolání událostí
            this.triggerEvent('onDebtDeleted', { id, removedPayments: paymentsToRemove.length });
        } catch (error) {
            console.error('Chyba při mazání dluhu:', error);
            notifications.error('Chyba při mazání dluhu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Naplnění výběru dluhů pro splátky
     */
    async populateDebtSelect() {
        if (!this.paymentDebtIdSelect) return;
        
        try {
            // Vyčistit select
            this.paymentDebtIdSelect.innerHTML = '<option value="">-- Vyberte dluh --</option>';
            
            // Získat vybranou osobu
            const selectedPerson = this.paymentPersonSelect ? this.paymentPersonSelect.value : 'maru';
            
            // Načíst všechny dluhy
            const debts = await storageManager.getAll('debts');
            
            // Přidat pouze dluhy pro vybranou osobu
            const personDebts = debts.filter(debt => debt.person === selectedPerson);
            
            personDebts.forEach(debt => {
                const remaining = debt.amount - (debt.paid || 0);
                if (remaining > 0) {
                    const option = document.createElement('option');
                    option.value = debt.id;
                    option.textContent = `${debt.description}: ${remaining.toFixed(2)} ${debt.currency}`;
                    this.paymentDebtIdSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Chyba při naplňování výběru dluhů:', error);
        }
    }

    /**
     * Vykreslení seznamu dluhů
     */
    async renderDebts() {
        if (!this.debtsListDiv) return;
        
        try {
            loading.show();
            
            // Vyčistit kontejner
            this.debtsListDiv.innerHTML = '';
            
            // Načíst všechny dluhy
            const debts = await storageManager.getAll('debts');
            
            // Seskupit dluhy podle měny (bez rozdělení na osoby)
            const debtsByCurrency = {};
            
            debts.forEach(debt => {
                if (!debtsByCurrency[debt.currency]) {
                    debtsByCurrency[debt.currency] = [];
                }
                debtsByCurrency[debt.currency].push(debt);
            });
            
            // Zobrazit zprávu, pokud nejsou žádné dluhy
            if (Object.keys(debtsByCurrency).length === 0) {
                this.debtsListDiv.innerHTML = '<p class="no-records">Žádné dluhy</p>';
                return;
            }
            
            // Vykreslit dluhy pro každou měnu
            for (const currency in debtsByCurrency) {
                const currencyDiv = document.createElement('div');
                currencyDiv.className = 'debt-currency';
                currencyDiv.innerHTML = `<h4>${currency}</h4><ul class="debts-list"></ul>`;
                const ul = currencyDiv.querySelector('ul');
                
                let totalDebt = 0;
                let totalPaid = 0;
                
                debtsByCurrency[currency].forEach(debt => {
                    const li = document.createElement('li');
                    li.dataset.id = debt.id;
                    
                    const remaining = debt.amount - (debt.paid || 0);
                    const personName = debt.person === 'maru' ? 'Maru' : 'Marty';
                    li.innerHTML = `<span>${personName}: ${debt.description}: ${debt.amount} ${debt.currency} (Zbývá: ${remaining.toFixed(2)} ${debt.currency})</span>`;
                    
                    // Tlačítka pro akce
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'action-buttons';
                    
                    // Tlačítko pro editaci
                    const editButton = document.createElement('button');
                    editButton.innerHTML = '<i class="fas fa-edit"></i>';
                    editButton.className = 'edit-btn';
                    editButton.setAttribute('aria-label', 'Upravit dluh');
                    editButton.dataset.id = debt.id;
                    editButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.editDebt(debt.id);
                    });
                    
                    // Tlačítko pro smazání
                    const deleteButton = document.createElement('button');
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.className = 'delete-btn';
                    deleteButton.setAttribute('aria-label', 'Smazat dluh');
                    deleteButton.dataset.id = debt.id;
                    deleteButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.deleteDebt(debt.id);
                    });
                    
                    actionsDiv.appendChild(editButton);
                    actionsDiv.appendChild(deleteButton);
                    li.appendChild(actionsDiv);
                    
                    ul.appendChild(li);
                    totalDebt += debt.amount;
                    totalPaid += (debt.paid || 0);
                });
                
                const totalRemainingDebt = totalDebt - totalPaid;
                const totalLi = document.createElement('li');
                totalLi.className = 'debt-total';
                totalLi.innerHTML = `<strong>Celkem: ${totalDebt.toFixed(2)} ${currency} (Zbývá: ${totalRemainingDebt.toFixed(2)} ${currency})</strong>`;
                ul.appendChild(totalLi);
                
                this.debtsListDiv.appendChild(currencyDiv);
            }
        } catch (error) {
            console.error('Chyba při vykreslování dluhů:', error);
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
const debtManager = new DebtManager();
export default debtManager;