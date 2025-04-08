/**
 * worklog.js
 * Modul pro správu pracovních záznamů
 */

import storageManager from './storage.js';
import { 
    formatDateCZ, 
    generateId, 
    getHourlyRate, 
    calculateDeduction, 
    filterData, 
    groupBy,
    isValidTime,
    minutesToHoursAndMinutes,
    parseNumber
} from './utils.js';
import { 
    notifications, 
    dialogs, 
    accordion,
    forms,
    navigation,
    loading
} from './ui.js';

/**
 * Třída pro správu pracovních záznamů
 */
class WorkLogManager {
    constructor() {
        // DOM elementy
        this.manualEntryForm = null;
        this.editLogIdInput = null;
        this.saveLogButton = null;
        this.cancelEditButton = null;
        this.manualActivitySelect = null;
        this.manualNoteInput = null;
        this.workLogsAccordion = null;
        
        // Filtry
        this.filterPerson = null;
        this.filterStartDate = null;
        this.filterEndDate = null;
        this.filterActivity = null;
        this.applyFiltersButton = null;
        this.resetFiltersButton = null;
        
        // Aktuální filtry
        this.filters = {
            person: '',
            startDate: '',
            endDate: '',
            activity: ''
        };
        
        // Event listeners pro externí události
        this.eventListeners = {
            onWorkLogAdded: [],
            onWorkLogEdited: [],
            onWorkLogDeleted: []
        };
    }

    /**
     * Inicializace správce pracovních záznamů
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.manualEntryForm = document.getElementById('manual-entry-form');
        this.editLogIdInput = document.getElementById('edit-log-id');
        this.saveLogButton = document.getElementById('save-log-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
        this.manualActivitySelect = document.getElementById('manual-activity');
        this.manualNoteInput = document.getElementById('manual-note');
        this.workLogsAccordion = document.getElementById('work-logs-accordion');
        
        this.filterPerson = document.getElementById('filter-person');
        this.filterStartDate = document.getElementById('filter-start-date');
        this.filterEndDate = document.getElementById('filter-end-date');
        this.filterActivity = document.getElementById('filter-activity');
        this.applyFiltersButton = document.getElementById('apply-filters');
        this.resetFiltersButton = document.getElementById('reset-filters');
        
        // Přidání event listenerů pro formulář
        if (this.manualEntryForm) {
            this.manualEntryForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Přidání event listenerů pro filtry
        if (this.applyFiltersButton) {
            this.applyFiltersButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }
        
        if (this.resetFiltersButton) {
            this.resetFiltersButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetFilters();
            });
        }
        
        // Přidání event listenerů pro zrušení editace
        if (this.cancelEditButton) {
            this.cancelEditButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelEdit();
            });
        }
        
        // Poslouchání na změny sekcí
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.sectionId === 'prehledy') {
                this.renderWorkLogs();
            }
        });
        
        // Nastavení dnešního data pro manuální zadání
        const dateInput = document.getElementById('manual-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
        
        // Počáteční vykreslení pracovních záznamů
        await this.renderWorkLogs();
    }

    /**
     * Zpracování odeslání formuláře
     * @param {Event} e Event objekt
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            loading.show();
            
            const person = document.getElementById('manual-person').value;
            const date = document.getElementById('manual-date').value;
            const startTimeStr = document.getElementById('manual-start-time').value;
            const endTimeStr = document.getElementById('manual-end-time').value;
            const breakTime = parseInt(document.getElementById('manual-break-time').value) || 0;
            const activity = this.manualActivitySelect ? this.manualActivitySelect.value : '';
            const note = this.manualNoteInput ? this.manualNoteInput.value : '';
            
            // Validace data
            if (!date) {
                notifications.error('Zadejte platné datum.');
                return;
            }
            
            // Validace času
            if (!isValidTime(startTimeStr) || !isValidTime(endTimeStr)) {
                notifications.error('Neplatný formát času.');
                return;
            }
            
            // Převod časů na Date objekty
            const startParts = startTimeStr.split(':');
            const endParts = endTimeStr.split(':');
            
            const startHour = parseInt(startParts[0]);
            const startMinute = parseInt(startParts[1]);
            const endHour = parseInt(endParts[0]);
            const endMinute = parseInt(endParts[1]);
            
            const startDate = new Date(`${date}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);
            const endDate = new Date(`${date}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
                notifications.error('Neplatné datum nebo čas.');
                return;
            }
            
            // Výpočet doby práce v minutách
            const durationInMinutes = Math.round((endDate - startDate) / (1000 * 60)) - breakTime;
            if (durationInMinutes <= 0) {
                notifications.error('Odpracovaný čas musí být kladný.');
                return;
            }
            
            // Přidat aktivitu jako kategorii úkolu, pokud je nová
            if (activity) {
                const taskCategories = await storageManager.get('settings', 'taskCategories');
                if (taskCategories && !taskCategories.categories.includes(activity)) {
                    taskCategories.categories.push(activity);
                    await storageManager.put('settings', taskCategories);
                    
                    // Vyvolat událost pro aktualizaci kategorií
                    document.dispatchEvent(new CustomEvent('categoriesUpdated'));
                }
            }
            
            // Výpočet výdělku a srážky
            const earnings = (durationInMinutes / 60) * getHourlyRate(person);
            const deduction = calculateDeduction(earnings, person);
            
            const editId = this.editLogIdInput.value;
            
            // Vytvoření záznamu
            const workLog = {
                id: editId || generateId(),
                person,
                date,
                start: startTimeStr,
                end: endTimeStr,
                break: breakTime,
                worked: durationInMinutes,
                earnings: earnings,
                deduction: deduction,
                activity,
                note
            };
            
            if (editId) {
                // Editace existujícího záznamu
                await storageManager.put('workLogs', workLog);
                
                // Resetovat formulář pro přidání nového záznamu
                this.saveLogButton.textContent = 'Přidat záznam';
                this.cancelEditButton.style.display = 'none';
                this.editLogIdInput.value = '';
                
                notifications.success('Záznam byl upraven');
                
                // Vyvolání událostí
                this.triggerEvent('onWorkLogEdited', workLog);
            } else {
                // Přidat nový záznam
                await storageManager.add('workLogs', workLog);
                
                notifications.success('Záznam byl přidán');
                
                // Vyvolání událostí
                this.triggerEvent('onWorkLogAdded', workLog);
            }
            
            // Aktualizace UI
            await this.renderWorkLogs();
            
            // Reset formuláře
            this.manualEntryForm.reset();
            document.getElementById('manual-date').valueAsDate = new Date();
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
        this.saveLogButton.textContent = 'Přidat záznam';
        this.cancelEditButton.style.display = 'none';
        this.editLogIdInput.value = '';
        this.manualEntryForm.reset();
        document.getElementById('manual-date').valueAsDate = new Date();
    }

    /**
     * Editace pracovního záznamu
     * @param {string} id ID záznamu
     */
    async editWorkLog(id) {
        try {
            loading.show();
            
            const log = await storageManager.get('workLogs', id);
            if (!log) return;
            
            // Přepnout na sekci Docházka
            navigation.showSection('dochazka');
            
            // Naplnit formulář daty
            document.getElementById('manual-person').value = log.person;
            document.getElementById('manual-date').value = log.date;
            document.getElementById('manual-start-time').value = log.start;
            document.getElementById('manual-end-time').value = log.end;
            document.getElementById('manual-break-time').value = log.break;
            
            // Nastavit poznámku
            if (this.manualNoteInput) {
                this.manualNoteInput.value = log.note || '';
            }
            
            // Nastavit aktivitu, pokud existuje
            if (this.manualActivitySelect && log.activity) {
                setTimeout(() => {
                    // Timeout pro zajištění, že select je již naplněn
                    for (let i = 0; i < this.manualActivitySelect.options.length; i++) {
                        if (this.manualActivitySelect.options[i].value === log.activity) {
                            this.manualActivitySelect.selectedIndex = i;
                            break;
                        }
                    }
                }, 10);
            }
            
            // Nastavit ID editovaného záznamu a změnit text tlačítka
            this.editLogIdInput.value = id;
            this.saveLogButton.textContent = 'Uložit změny';
            this.cancelEditButton.style.display = 'block';
            
            // Přeskrolovat na formulář
            this.manualEntryForm.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Chyba při editaci záznamu:', error);
            notifications.error('Chyba při načítání záznamu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Smazání pracovního záznamu
     * @param {string} id ID záznamu
     */
    async deleteWorkLog(id) {
        try {
            const confirmed = await dialogs.confirm('Opravdu chcete smazat tento záznam?');
            if (!confirmed) return;
            
            loading.show();
            
            await storageManager.delete('workLogs', id);
            
            notifications.success('Záznam byl smazán');
            
            // Aktualizace UI
            await this.renderWorkLogs();
            
            // Vyvolání událostí
            this.triggerEvent('onWorkLogDeleted', { id });
        } catch (error) {
            console.error('Chyba při mazání záznamu:', error);
            notifications.error('Chyba při mazání záznamu');
        } finally {
            loading.hide();
        }
    }

    /**
     * Aplikace filtrů
     */
    applyFilters() {
        this.filters = {
            person: this.filterPerson ? this.filterPerson.value : '',
            startDate: this.filterStartDate ? this.filterStartDate.value : '',
            endDate: this.filterEndDate ? this.filterEndDate.value : '',
            activity: this.filterActivity ? this.filterActivity.value : ''
        };
        
        this.renderWorkLogs();
        
        // Vyvolat událost o změně filtrů
        document.dispatchEvent(new CustomEvent('filtersChanged', { 
            detail: { filters: this.filters } 
        }));
    }

    /**
     * Reset filtrů
     */
    resetFilters() {
        if (this.filterPerson) this.filterPerson.value = '';
        if (this.filterStartDate) this.filterStartDate.value = '';
        if (this.filterEndDate) this.filterEndDate.value = '';
        if (this.filterActivity) this.filterActivity.value = '';
        
        this.filters = {
            person: '',
            startDate: '',
            endDate: '',
            activity: ''
        };
        
        this.renderWorkLogs();
        
        // Vyvolat událost o resetování filtrů
        document.dispatchEvent(new CustomEvent('filtersReset'));
    }

    /**
     * Vykreslení pracovních záznamů v accordion stylu
     */
    async renderWorkLogs() {
        if (!this.workLogsAccordion) return;
        
        try {
            loading.show();
            
            // Načtení všech pracovních záznamů
            const workLogs = await storageManager.getAll('workLogs');
            
            // Filtrování dat
            const filteredLogs = filterData(workLogs, this.filters);
            
            // Kontrola, zda existují záznamy
            if (filteredLogs.length === 0) {
                this.workLogsAccordion.innerHTML = '<div class="accordion-empty">Žádné záznamy odpovídající zvoleným filtrům</div>';
                return;
            }
            
            // Seskupení záznamů podle dne a osoby
            const groupedData = [];
            
            // Nejprve seskupíme záznamy podle data a osoby
            const groupedByDatePerson = {};
            filteredLogs.forEach(log => {
                const key = `${log.date}-${log.person}`;
                if (!groupedByDatePerson[key]) {
                    groupedByDatePerson[key] = {
                        date: log.date,
                        person: log.person,
                        logs: [],
                        totalWorked: 0,
                        totalEarnings: 0,
                        totalDeduction: 0
                    };
                }
                
                // Přidání záznamu do skupiny
                groupedByDatePerson[key].logs.push(log);
                
                // Aktualizace souhrnů
                groupedByDatePerson[key].totalWorked += log.worked;
                groupedByDatePerson[key].totalEarnings += log.earnings;
                
                const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
                groupedByDatePerson[key].totalDeduction += deduction;
            });
            
            // Převod na pole a seřazení podle data (nejnovější první)
            Object.values(groupedByDatePerson).forEach(group => {
                groupedData.push(group);
            });
            
            // Seřadit dny podle data (nejnovější první)
            groupedData.sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });
            
            // Vykreslení accordion pro každý den a osobu
            accordion.createAccordion(
                'work-logs-accordion',
                groupedData,
                this.renderAccordionHeader.bind(this),
                this.renderAccordionContent.bind(this)
            );
            
            // Přidání event listenerů pro tlačítka
            this.addActionButtonListeners();
        } catch (error) {
            console.error('Chyba při vykreslování pracovních záznamů:', error);
            notifications.error('Chyba při načítání pracovních záznamů');
        } finally {
            loading.hide();
        }
    }

    /**
     * Vykreslení hlavičky accordionu
     * @param {Object} dayGroup Skupina záznamů pro den
     * @returns {string} HTML kód hlavičky
     */
    renderAccordionHeader(dayGroup) {
        const personName = dayGroup.person === 'maru' ? 'Maru' : 'Marty';
        const formattedDate = formatDateCZ(dayGroup.date);
        
        // Formátování odpracovaného času
        const workedTime = minutesToHoursAndMinutes(dayGroup.totalWorked);
        
        return `
            <div class="accordion-header-content">
                <div class="accordion-person-tag ${dayGroup.person}">${personName}</div>
                <div>${formattedDate}</div>
            </div>
            <div class="accordion-header-right">
                <div class="accordion-day-summary">
                    <div><i class="fas fa-clock"></i> ${workedTime}</div>
                    <div><i class="fas fa-money-bill-wave"></i> ${dayGroup.totalEarnings.toFixed(2)} CZK</div>
                    <div><i class="fas fa-percentage"></i> ${dayGroup.totalDeduction.toFixed(2)} CZK</div>
                </div>
                <i class="fas fa-chevron-down accordion-toggle"></i>
            </div>
        `;
    }

    /**
     * Vykreslení obsahu accordionu
     * @param {Object} dayGroup Skupina záznamů pro den
     * @returns {string} HTML kód obsahu
     */
    renderAccordionContent(dayGroup) {
        // Seřadit záznamy dne podle času začátku
        const sortedLogs = [...dayGroup.logs].sort((a, b) => {
            return a.start.localeCompare(b.start);
        });
        
        // Vytvoření tabulky pro záznamy dne
        let tableHTML = `
            <table class="accordion-table">
                <thead>
                    <tr>
                        <th>Začátek</th>
                        <th>Konec</th>
                        <th>Pauza</th>
                        <th>Práce</th>
                        <th>Výdělek</th>
                        <th>Srážka</th>
                        <th>Úkol</th>
                        <th>Poznámka</th>
                        <th>Akce</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Přidání jednotlivých záznamů do tabulky
        sortedLogs.forEach(log => {
            // Formátování odpracovaného času pro záznam
            const logWorkedTime = minutesToHoursAndMinutes(log.worked);
            
            // Výpočet srážky pro záznam
            const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
            
            tableHTML += `
                <tr data-id="${log.id}">
                    <td data-label="Začátek"><div class="cell-content">${log.start}</div></td>
                    <td data-label="Konec"><div class="cell-content">${log.end}</div></td>
                    <td data-label="Pauza"><div class="cell-content">${log.break}</div></td>
                    <td data-label="Práce"><div class="cell-content">${logWorkedTime}</div></td>
                    <td data-label="Výdělek"><div class="cell-content">${log.earnings.toFixed(2)} CZK</div></td>
                    <td data-label="Srážka"><div class="cell-content">${deduction.toFixed(2)} CZK</div></td>
                    <td data-label="Úkol"><div class="cell-content">${log.activity || '-'}</div></td>
                    <td data-label="Poznámka"><div class="cell-content">${log.note || '-'}</div></td>
                    <td class="actions-cell" data-label="Akce">
                        <div class="cell-content action-buttons">
                            <button class="edit-btn" data-id="${log.id}" aria-label="Upravit záznam">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-btn" data-id="${log.id}" aria-label="Smazat záznam">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        return tableHTML;
    }

    /**
     * Přidání event listenerů pro tlačítka akcí
     */
    addActionButtonListeners() {
        // Event listenery pro tlačítka upravit
        const editButtons = this.workLogsAccordion.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Zabránit propagaci na accordion header
                this.editWorkLog(button.dataset.id);
            });
        });
        
        // Event listenery pro tlačítka smazat
        const deleteButtons = this.workLogsAccordion.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Zabránit propagaci na accordion header
                this.deleteWorkLog(button.dataset.id);
            });
        });
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
const workLogManager = new WorkLogManager();
export default workLogManager;