/**
 * deductions.js
 * Modul pro správu srážek a přehledů
 */

import storageManager from './storage.js';
import { 
    getMonthNameCZ, 
    filterData, 
    minutesToHoursAndMinutes, 
    getDeductionRate
} from './utils.js';
import { loading } from './ui.js';

/**
 * Třída pro správu přehledů a srážek
 */
class DeductionManager {
    constructor() {
        // DOM elementy
        this.deductionsSummaryTableBody = null;
        
        // Filtry z WorkLogManager
        this.filters = {
            person: '',
            startDate: '',
            endDate: '',
            activity: ''
        };
        
        // Poslouchání na změny filtrů
        document.addEventListener('filtersChanged', (e) => {
            this.filters = e.detail.filters;
            this.renderDeductionsSummary();
        });
        
        document.addEventListener('filtersReset', () => {
            this.filters = {
                person: '',
                startDate: '',
                endDate: '',
                activity: ''
            };
            this.renderDeductionsSummary();
        });
    }

    /**
     * Inicializace správce srážek
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.deductionsSummaryTableBody = document.getElementById('deductions-summary-table');
        
        // Poslouchání na změny sekcí
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.sectionId === 'srazky') {
                this.renderDeductionsSummary();
            }
        });
        
        // Poslouchání na změny pracovních záznamů
        document.addEventListener('workLogsUpdated', () => {
            this.renderDeductionsSummary();
        });
        
        // Počáteční vykreslení přehledu srážek
        await this.renderDeductionsSummary();
    }

    /**
     * Výpočet srážek pro zadané záznamy
     * @param {Array} workLogs Pracovní záznamy
     * @returns {Object} Souhrn srážek po osobách a měsících
     */
    calculateDeductions(workLogs) {
        // Seskupit data podle osoby a měsíce
        const deductionsByPersonMonth = {};
        
        workLogs.forEach(log => {
            const date = new Date(log.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const key = `${log.person}-${yearMonth}`;
            
            if (!deductionsByPersonMonth[key]) {
                deductionsByPersonMonth[key] = {
                    person: log.person,
                    yearMonth: yearMonth,
                    monthName: getMonthNameCZ(date),
                    totalWorked: 0,
                    totalEarnings: 0,
                    totalDeduction: 0
                };
            }
            
            deductionsByPersonMonth[key].totalWorked += log.worked;
            deductionsByPersonMonth[key].totalEarnings += log.earnings;
            
            // Použít uloženou hodnotu srážky, nebo ji vypočítat
            const deduction = log.deduction || (log.earnings * getDeductionRate(log.person));
            deductionsByPersonMonth[key].totalDeduction += deduction;
        });
        
        return deductionsByPersonMonth;
    }

    /**
     * Vykreslení přehledu srážek
     */
    async renderDeductionsSummary() {
        if (!this.deductionsSummaryTableBody) return;
        
        try {
            loading.show();
            
            // Vyčistit tabulku
            this.deductionsSummaryTableBody.innerHTML = '';
            
            // Načtení všech pracovních záznamů
            const workLogs = await storageManager.getAll('workLogs');
            
            // Filtrování dat podle aktuálních filtrů
            const filteredLogs = filterData(workLogs, this.filters);
            
            // Výpočet srážek pro filtrované záznamy
            const deductionsByPersonMonth = this.calculateDeductions(filteredLogs);
            
            // Zobrazit přehled srážek podle měsíců
            Object.values(deductionsByPersonMonth)
                .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)) // Nejnovější první
                .forEach(summary => {
                    const row = this.deductionsSummaryTableBody.insertRow();
                    
                    const personCell = row.insertCell();
                    personCell.textContent = summary.person === 'maru' ? 'Maru' : 'Marty';
                    
                    const monthCell = row.insertCell();
                    monthCell.textContent = summary.monthName;
                    
                    const workedCell = row.insertCell();
                    workedCell.textContent = minutesToHoursAndMinutes(summary.totalWorked);
                    
                    const earningsCell = row.insertCell();
                    earningsCell.textContent = `${summary.totalEarnings.toFixed(2)} CZK`;
                    
                    const deductionCell = row.insertCell();
                    deductionCell.textContent = `${summary.totalDeduction.toFixed(2)} CZK`;
                });
            
            // Zobrazit zprávu, pokud nejsou žádné záznamy
            if (Object.keys(deductionsByPersonMonth).length === 0) {
                const row = this.deductionsSummaryTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 5;
                cell.textContent = 'Žádné záznamy odpovídající zvoleným filtrům';
                cell.style.textAlign = 'center';
                cell.style.padding = '2rem';
                cell.style.color = '#888';
            }
        } catch (error) {
            console.error('Chyba při vykreslování přehledu srážek:', error);
        } finally {
            loading.hide();
        }
    }

    /**
     * Získání celkového přehledu srážek
     * @returns {Promise<Object>} Souhrn srážek po osobách a měsících
     */
    async getDeductionsSummary() {
        try {
            // Načtení všech pracovních záznamů
            const workLogs = await storageManager.getAll('workLogs');
            
            // Výpočet srážek pro všechny záznamy
            return this.calculateDeductions(workLogs);
        } catch (error) {
            console.error('Chyba při získávání přehledu srážek:', error);
            return {};
        }
    }

    /**
     * Získání celkových srážek pro osobu
     * @param {string} person Osoba ('maru' nebo 'marty')
     * @returns {Promise<number>} Celková částka srážek
     */
    async getTotalDeductionsForPerson(person) {
        try {
            // Načtení všech pracovních záznamů pro osobu
            const workLogs = await storageManager.getAll('workLogs');
            const personLogs = workLogs.filter(log => log.person === person);
            
            // Výpočet celkových srážek
            let totalDeduction = 0;
            personLogs.forEach(log => {
                const deduction = log.deduction || (log.earnings * getDeductionRate(person));
                totalDeduction += deduction;
            });
            
            return totalDeduction;
        } catch (error) {
            console.error(`Chyba při získávání celkových srážek pro osobu ${person}:`, error);
            return 0;
        }
    }

    /**
     * Získání měsíčních srážek pro osobu
     * @param {string} person Osoba ('maru' nebo 'marty')
     * @param {string} yearMonth Rok a měsíc ve formátu 'YYYY-MM'
     * @returns {Promise<number>} Měsíční srážka
     */
    async getMonthlyDeductionsForPerson(person, yearMonth) {
        try {
            // Načtení všech pracovních záznamů pro osobu a měsíc
            const workLogs = await storageManager.getAll('workLogs');
            const personMonthLogs = workLogs.filter(log => {
                const logDate = new Date(log.date);
                const logYearMonth = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                return log.person === person && logYearMonth === yearMonth;
            });
            
            // Výpočet celkových srážek za měsíc
            let monthlyDeduction = 0;
            personMonthLogs.forEach(log => {
                const deduction = log.deduction || (log.earnings * getDeductionRate(person));
                monthlyDeduction += deduction;
            });
            
            return monthlyDeduction;
        } catch (error) {
            console.error(`Chyba při získávání měsíčních srážek pro osobu ${person} a měsíc ${yearMonth}:`, error);
            return 0;
        }
    }
}

// Vytvoření a export instance pro globální použití
const deductionManager = new DeductionManager();
export default deductionManager;