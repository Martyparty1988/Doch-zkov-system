/**
 * charts.js
 * Modul pro správu grafů a vizualizací
 */

import storageManager from './storage.js';
import { 
    filterData, 
    getMonthNameCZ,
    isMobileDevice
} from './utils.js';
import { loading } from './ui.js';

/**
 * Třída pro správu grafů
 */
class ChartManager {
    constructor() {
        // DOM elementy
        this.chartArea = null;
        this.chartOptions = null;
        
        // Instance grafu
        this.chartInstance = null;
        this.currentChartType = 'person';
        
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
            this.updateChart();
        });
        
        document.addEventListener('filtersReset', () => {
            this.filters = {
                person: '',
                startDate: '',
                endDate: '',
                activity: ''
            };
            this.updateChart();
        });
    }

    /**
     * Inicializace správce grafů
     * @returns {Promise} Promise, který se vyřeší po inicializaci
     */
    async init() {
        // Získání DOM elementů
        this.chartArea = document.getElementById('chart-area');
        this.chartOptions = document.querySelectorAll('.chart-options button');
        
        // Přidání event listenerů pro přepínání typů grafů
        this.chartOptions.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Odstranit aktivní třídu ze všech tlačítek
                this.chartOptions.forEach(btn => btn.classList.remove('active'));
                
                // Přidat aktivní třídu na kliknuté tlačítko
                button.classList.add('active');
                
                // Nastavit typ grafu
                this.currentChartType = button.dataset.chartType;
                
                // Aktualizovat graf
                this.updateChart();
            });
        });
        
        // Poslouchání na změny sekcí
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.sectionId === 'prehledy') {
                this.updateChart();
            }
        });
        
        // Nastavit aktivní tlačítko grafu
        document.querySelector(`.chart-options button[data-chart-type="${this.currentChartType}"]`)?.classList.add('active');
        
        // Počáteční vykreslení grafu
        await this.updateChart();
        
        // Přidání listeneru pro změnu velikosti okna
        window.addEventListener('resize', () => {
            if (this.chartInstance) {
                this.chartInstance.resize();
            }
        });
    }

    /**
     * Aktualizace grafu
     */
    async updateChart() {
        if (!this.chartArea) return;
        
        try {
            loading.show();
            
            // Zrušit předchozí instanci grafu
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }
            
            // Načtení všech pracovních záznamů
            const workLogs = await storageManager.getAll('workLogs');
            
            // Filtrování dat
            const filteredLogs = filterData(workLogs, this.filters);
            
            let chartData;
            let chartOptions;
            
            // Podle typu grafu
            switch (this.currentChartType) {
                case 'person':
                    chartData = this.preparePersonChartData(filteredLogs);
                    chartOptions = {
                        plugins: {
                            title: {
                                display: true,
                                text: 'Výdělek podle osoby',
                                font: { size: 16 }
                            },
                            legend: {
                                position: isMobileDevice() ? 'bottom' : 'top'
                            }
                        }
                    };
                    break;
                case 'activity':
                    chartData = this.prepareActivityChartData(filteredLogs);
                    chartOptions = {
                        plugins: {
                            title: {
                                display: true,
                                text: 'Výdělek podle úkolu',
                                font: { size: 16 }
                            },
                            legend: {
                                display: false
                            }
                        }
                    };
                    break;
                case 'month':
                    chartData = this.prepareMonthChartData(filteredLogs);
                    chartOptions = {
                        plugins: {
                            title: {
                                display: true,
                                text: 'Výdělek podle měsíce',
                                font: { size: 16 }
                            },
                            legend: {
                                position: isMobileDevice() ? 'bottom' : 'top'
                            }
                        }
                    };
                    break;
            }
            
            // Vytvoření nového grafu
            this.chartInstance = new Chart(this.chartArea, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    ...chartOptions
                }
            });
        } catch (error) {
            console.error('Chyba při aktualizaci grafu:', error);
        } finally {
            loading.hide();
        }
    }

    /**
     * Příprava dat pro graf podle osoby
     * @param {Array} logs Pracovní záznamy
     * @returns {Object} Data pro graf
     */
    preparePersonChartData(logs) {
        const personEarnings = {};
        const personDeductions = {};
        
        logs.forEach(log => {
            if (!personEarnings[log.person]) {
                personEarnings[log.person] = 0;
                personDeductions[log.person] = 0;
            }
            
            personEarnings[log.person] += log.earnings;
            
            const deduction = log.deduction || 0;
            personDeductions[log.person] += deduction;
        });
        
        const persons = Object.keys(personEarnings);
        const earnings = persons.map(person => personEarnings[person]);
        const deductions = persons.map(person => personDeductions[person]);
        
        return {
            labels: persons.map(p => p === 'maru' ? 'Maru' : 'Marty'),
            datasets: [
                {
                    label: 'Výdělek (CZK)',
                    data: earnings,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Srážky (CZK)',
                    data: deductions,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
    }

    /**
     * Příprava dat pro graf podle úkolu
     * @param {Array} logs Pracovní záznamy
     * @returns {Object} Data pro graf
     */
    prepareActivityChartData(logs) {
        const activityEarnings = {};
        
        logs.forEach(log => {
            const activity = log.activity || 'Bez úkolu';
            
            if (!activityEarnings[activity]) {
                activityEarnings[activity] = 0;
            }
            
            activityEarnings[activity] += log.earnings;
        });
        
        // Seřadit podle výdělku (sestupně)
        const sortedActivities = Object.keys(activityEarnings).sort((a, b) => {
            return activityEarnings[b] - activityEarnings[a];
        });
        
        // Omezit počet zobrazených kategorií pro lepší čitelnost
        const maxCategories = isMobileDevice() ? 5 : 10;
        const activities = sortedActivities.slice(0, maxCategories);
        
        // Pokud je více kategorií než limit, přidat kategorii "Ostatní"
        if (sortedActivities.length > maxCategories) {
            let otherEarnings = 0;
            sortedActivities.slice(maxCategories).forEach(activity => {
                otherEarnings += activityEarnings[activity];
            });
            
            activities.push('Ostatní');
            activityEarnings['Ostatní'] = otherEarnings;
        }
        
        const earnings = activities.map(activity => activityEarnings[activity]);
        
        // Generování barev pro každou aktivitu
        const colors = this.generateColors(activities.length);
        
        return {
            labels: activities,
            datasets: [
                {
                    label: 'Výdělek (CZK)',
                    data: earnings,
                    backgroundColor: colors.map(color => color.background),
                    borderColor: colors.map(color => color.border),
                    borderWidth: 1
                }
            ]
        };
    }

    /**
     * Příprava dat pro graf podle měsíce
     * @param {Array} logs Pracovní záznamy
     * @returns {Object} Data pro graf
     */
    prepareMonthChartData(logs) {
        const monthEarnings = {};
        
        logs.forEach(log => {
            const date = new Date(log.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthEarnings[yearMonth]) {
                monthEarnings[yearMonth] = {
                    maru: 0,
                    marty: 0
                };
            }
            
            monthEarnings[yearMonth][log.person] += log.earnings;
        });
        
        // Seřadit měsíce od nejstaršího po nejnovější
        const sortedMonths = Object.keys(monthEarnings).sort();
        
        // Pro mobilní zařízení omezit počet měsíců
        const maxMonths = isMobileDevice() ? 6 : 12;
        const displayedMonths = sortedMonths.length > maxMonths ? 
            sortedMonths.slice(sortedMonths.length - maxMonths) : sortedMonths;
        
        const monthLabels = displayedMonths.map(ym => {
            const [year, month] = ym.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return getMonthNameCZ(date);
        });
        
        const maruEarnings = displayedMonths.map(ym => monthEarnings[ym].maru);
        const martyEarnings = displayedMonths.map(ym => monthEarnings[ym].marty);
        
        return {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Maru',
                    data: maruEarnings,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Marty',
                    data: martyEarnings,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
    }

    /**
     * Generování barev pro graf
     * @param {number} count Počet barev k vygenerování
     * @returns {Array} Pole objektů s barvami
     */
    generateColors(count) {
        const colors = [];
        const baseColors = [
            { r: 54, g: 162, b: 235 },   // Modrá
            { r: 255, g: 99, b: 132 },   // Růžová
            { r: 75, g: 192, b: 192 },   // Tyrkysová
            { r: 255, g: 205, b: 86 },   // Žlutá
            { r: 153, g: 102, b: 255 },  // Fialová
            { r: 255, g: 159, b: 64 },   // Oranžová
            { r: 201, g: 203, b: 207 },  // Šedá
            { r: 99, g: 255, b: 132 },   // Zelená
            { r: 255, g: 99, b: 255 },   // Purpurová
            { r: 99, g: 255, b: 255 }    // Azurová
        ];
        
        for (let i = 0; i < count; i++) {
            const baseColor = baseColors[i % baseColors.length];
            // Pro opakující se barvy přidáme variaci
            const variation = Math.floor(i / baseColors.length) * 30;
            const r = Math.min(255, Math.max(0, baseColor.r - variation));
            const g = Math.min(255, Math.max(0, baseColor.g - variation));
            const b = Math.min(255, Math.max(0, baseColor.b - variation));
            
            colors.push({
                background: `rgba(${r}, ${g}, ${b}, 0.5)`,
                border: `rgba(${r}, ${g}, ${b}, 1)`
            });
        }
        
        return colors;
    }
}

// Vytvoření a export instance pro globální použití
const chartManager = new ChartManager();
export default chartManager;