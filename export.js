/**
 * export.js
 * Modul pro export dat
 */

import storageManager from './storage.js';
import { exportToCSV, formatDateCZ, getMonthNameCZ, getDeductionRate } from './utils.js';
import { notifications, loading } from './ui.js';

/**
 * Třída pro správu exportu dat
 */
class ExportManager {
    constructor() {
        // DOM elementy
        this.exportWorkLogsButton = null;
        this.exportFinanceButton = null;
        this.exportDeductionsButton = null;
        this.exportDebtsButton = null;
        this.exportBackupButton = null;
    }

    /**
     * Inicializace správce exportu
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.exportWorkLogsButton = document.getElementById('export-work-logs');
        this.exportFinanceButton = document.getElementById('export-finance');
        this.exportDeductionsButton = document.getElementById('export-deductions');
        this.exportDebtsButton = document.getElementById('export-debts');
        
        // Přidání event listenerů pro tlačítka exportu
        if (this.exportWorkLogsButton) {
            this.exportWorkLogsButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportWorkLogs();
            });
        }
        
        if (this.exportFinanceButton) {
            this.exportFinanceButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportFinance();
            });
        }
        
        if (this.exportDeductionsButton) {
            this.exportDeductionsButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportDeductions();
            });
        }
        
        if (this.exportDebtsButton) {
            this.exportDebtsButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportDebts();
            });
        }
        
        // Vytvoření a přidání tlačítka pro export zálohy
        this.createBackupButton();
    }

    /**
     * Vytvoření tlačítka pro export zálohy
     */
    createBackupButton() {
        const exportActionsDiv = document.querySelector('.export-actions');
        if (!exportActionsDiv) return;
        
        // Kontrola, zda tlačítko již existuje
        if (document.getElementById('export-backup')) return;
        
        // Vytvoření tlačítka pro export zálohy
        this.exportBackupButton = document.createElement('button');
        this.exportBackupButton.id = 'export-backup';
        this.exportBackupButton.innerHTML = 'Export kompletní zálohy (JSON)';
        
        // Přidání event listeneru
        this.exportBackupButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportBackup();
        });
        
        // Přidání tlačítka do kontejneru
        exportActionsDiv.appendChild(this.exportBackupButton);
        
        // Vytvoření tlačítka pro import zálohy
        const importBackupButton = document.createElement('button');
        importBackupButton.id = 'import-backup';
        importBackupButton.innerHTML = 'Import ze zálohy';
        
        // Přidání event listeneru
        importBackupButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.importBackup();
        });
        
        // Přidání tlačítka do kontejneru
        exportActionsDiv.appendChild(importBackupButton);
    }

    /**
     * Export pracovních záznamů do CSV
     */
    async exportWorkLogs() {
        try {
            loading.show();
            
            // Načtení všech pracovních záznamů
            const workLogs = await storageManager.getAll('workLogs');
            
            // Seřazení záznamů podle data (nejnovější první)
            const sortedLogs = [...workLogs].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });
            
            // Vytvoření hlavičky a dat pro CSV
            const header = ['Osoba', 'Datum', 'Začátek', 'Konec', 'Pauza', 'Odpracováno (min)', 'Výdělek (CZK)', 'Srážka (CZK)', 'Úkol', 'Poznámka'];
            const data = sortedLogs.map(log => {
                const deduction = log.deduction || (log.earnings * getDeductionRate(log.person));
                return [
                    log.person === 'maru' ? 'Maru' : 'Marty',
                    formatDateCZ(log.date),
                    log.start,
                    log.end,
                    log.break,
                    log.worked,
                    log.earnings.toFixed(2),
                    deduction.toFixed(2),
                    log.activity || '',
                    log.note || ''
                ];
            });
            
            // Export do CSV
            exportToCSV('pracovni_zaznamy.csv', [header, ...data]);
            
            notifications.success('Pracovní záznamy byly exportovány');
        } catch (error) {
            console.error('Chyba při exportu pracovních záznamů:', error);
            notifications.error('Chyba při exportu pracovních záznamů');
        } finally {
            loading.hide();
        }
    }

    /**
     * Export financí do CSV
     */
    async exportFinance() {
        try {
            loading.show();
            
            // Načtení všech finančních záznamů
            const finances = await storageManager.getAll('finances');
            
            // Seřazení záznamů podle data (nejnovější první)
            const sortedFinances = [...finances].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });
            
            // Vytvoření hlavičky a dat pro CSV
            const header = ['Typ', 'Popis', 'Částka', 'Měna', 'Datum', 'Kategorie', 'Osoba'];
            const data = sortedFinances.map(finance => [
                finance.type === 'income' ? 'Příjem' : 'Výdaj',
                finance.description,
                finance.amount.toFixed(2),
                finance.currency,
                formatDateCZ(finance.date),
                finance.category || '',
                finance.person || ''
            ]);
            
            // Export do CSV
            exportToCSV('finance.csv', [header, ...data]);
            
            notifications.success('Finance byly exportovány');
        } catch (error) {
            console.error('Chyba při exportu financí:', error);
            notifications.error('Chyba při exportu financí');
        } finally {
            loading.hide();
        }
    }

    /**
     * Export srážek do CSV
     */
    async exportDeductions() {
        try {
            loading.show();
            
            // Načtení všech pracovních záznamů
            const workLogs = await storageManager.getAll('workLogs');
            
            // Příprava dat pro export
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
                
                const deduction = log.deduction || (log.earnings * getDeductionRate(log.person));
                deductionsByPersonMonth[key].totalDeduction += deduction;
            });
            
            // Vytvoření hlavičky a dat pro CSV
            const header = ['Osoba', 'Měsíc', 'Celkem odpracováno (min)', 'Celkový výdělek (CZK)', 'Srážka (CZK)'];
            const data = Object.values(deductionsByPersonMonth)
                .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
                .map(summary => [
                    summary.person === 'maru' ? 'Maru' : 'Marty',
                    summary.monthName,
                    summary.totalWorked,
                    summary.totalEarnings.toFixed(2),
                    summary.totalDeduction.toFixed(2)
                ]);
            
            // Export do CSV
            exportToCSV('srazky.csv', [header, ...data]);
            
            notifications.success('Srážky byly exportovány');
        } catch (error) {
            console.error('Chyba při exportu srážek:', error);
            notifications.error('Chyba při exportu srážek');
        } finally {
            loading.hide();
        }
    }

    /**
     * Export dluhů do CSV
     */
    async exportDebts() {
        try {
            loading.show();
            
            // Načtení všech dluhů
            const debts = await storageManager.getAll('debts');
            
            // Vytvoření hlavičky a dat pro CSV
            const header = ['Osoba', 'Popis', 'Částka', 'Měna', 'Zaplaceno', 'Zbývá'];
            const data = debts.map(debt => [
                debt.person === 'maru' ? 'Maru' : 'Marty',
                debt.description,
                debt.amount.toFixed(2),
                debt.currency,
                (debt.paid || 0).toFixed(2),
                (debt.amount - (debt.paid || 0)).toFixed(2)
            ]);
            
            // Export do CSV
            exportToCSV('dluhy.csv', [header, ...data]);
            
            notifications.success('Dluhy byly exportovány');
        } catch (error) {
            console.error('Chyba při exportu dluhů:', error);
            notifications.error('Chyba při exportu dluhů');
        } finally {
            loading.hide();
        }
    }

    /**
     * Export kompletní zálohy
     */
    async exportBackup() {
        try {
            loading.show();
            
            // Vytvoření zálohy všech dat
            const backupData = await storageManager.backup();
            
            // Převod na JSON řetězec
            const jsonData = JSON.stringify(backupData, null, 2);
            
            // Aktuální datum pro název souboru
            const now = new Date();
            const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // Vytvoření blob a stažení souboru
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `zaloha_${dateString}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Revokace URL pro uvolnění paměti
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
            
            notifications.success('Záloha byla vytvořena');
        } catch (error) {
            console.error('Chyba při vytváření zálohy:', error);
            notifications.error('Chyba při vytváření zálohy');
        } finally {
            loading.hide();
        }
    }

    /**
     * Import ze zálohy
     */
    async importBackup() {
        try {
            // Vytvoření neviditelného input elementu pro výběr souboru
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Simulace kliknutí pro otevření dialog pro výběr souboru
            fileInput.click();
            
            // Poslouchání na změnu souboru
            fileInput.addEventListener('change', async (e) => {
                if (!fileInput.files || fileInput.files.length === 0) {
                    document.body.removeChild(fileInput);
                    return;
                }
                
                loading.show();
                
                try {
                    const file = fileInput.files[0];
                    
                    // Čtení souboru
                    const reader = new FileReader();
                    
                    reader.onload = async (event) => {
                        try {
                            const jsonData = JSON.parse(event.target.result);
                            
                            // Kontrola formátu zálohy
                            if (!jsonData || !jsonData.data) {
                                notifications.error('Neplatný formát zálohy');
                                return;
                            }
                            
                            // Obnovení dat ze zálohy
                            await storageManager.restore(jsonData);
                            
                            notifications.success('Data byla úspěšně obnovena ze zálohy');
                            
                            // Vyvolat událost pro aktualizaci UI
                            document.dispatchEvent(new CustomEvent('dataRestored'));
                            
                            // Reload stránky pro aplikaci obnovených dat
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        } catch (error) {
                            console.error('Chyba při zpracování zálohy:', error);
                            notifications.error('Chyba při zpracování zálohy');
                        } finally {
                            loading.hide();
                        }
                    };
                    
                    reader.onerror = () => {
                        notifications.error('Chyba při čtení souboru');
                        loading.hide();
                    };
                    
                    reader.readAsText(file);
                } finally {
                    document.body.removeChild(fileInput);
                }
            });
        } catch (error) {
            console.error('Chyba při importu zálohy:', error);
            notifications.error('Chyba při importu zálohy');
            loading.hide();
        }
    }
}

// Vytvoření a export instance pro globální použití
const exportManager = new ExportManager();
export default exportManager;