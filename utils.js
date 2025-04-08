/**
 * utils.js
 * Pomocné funkce a utility pro aplikaci
 */

/**
 * Formátuje čas v sekundách na formát HH:MM:SS
 * @param {number} totalSeconds Celkový počet sekund
 * @returns {string} Formátovaný čas
 */
export function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formátuje datum ve formátu ISO na český formát
 * @param {string} dateStr Datum ve formátu YYYY-MM-DD
 * @returns {string} Formátované datum (DD.MM.YYYY)
 */
export function formatDateCZ(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

/**
 * Vrátí český název měsíce s rokem
 * @param {Date} date Datum
 * @returns {string} Název měsíce a rok (např. "Leden 2025")
 */
export function getMonthNameCZ(date) {
    const months = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Vypočítá počet minut mezi dvěma časovými razítky
 * @param {number} startTimestamp Počáteční časové razítko
 * @param {number} endTimestamp Koncové časové razítko
 * @returns {number} Počet minut
 */
export function calculateMinutesBetween(startTimestamp, endTimestamp) {
    return Math.round((endTimestamp - startTimestamp) / (1000 * 60));
}

/**
 * Kontroluje validitu času
 * @param {string} timeStr Čas ve formátu HH:MM
 * @returns {boolean} True, pokud je čas validní
 */
export function isValidTime(timeStr) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(timeStr);
}

/**
 * Generuje unikátní ID
 * @returns {string} Unikátní ID
 */
export function generateId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/**
 * Bezpečné parsování číselné hodnoty
 * @param {string|number} value Hodnota k parsování
 * @param {number} defaultValue Výchozí hodnota při chybě
 * @returns {number} Parsovaná hodnota nebo výchozí hodnota
 */
export function parseNumber(value, defaultValue = 0) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Formátuje částku s pevným počtem desetinných míst
 * @param {number} amount Částka
 * @param {number} decimalPlaces Počet desetinných míst
 * @returns {string} Formátovaná částka
 */
export function formatAmount(amount, decimalPlaces = 2) {
    return amount.toFixed(decimalPlaces);
}

/**
 * Převádí minuty na formát hodin a minut (HH:MM)
 * @param {number} minutes Počet minut
 * @returns {string} Formátovaný čas
 */
export function minutesToHoursAndMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Filtruje data podle zadaných kritérií
 * @param {Array} data Data k filtrování
 * @param {Object} filters Filtry
 * @returns {Array} Filtrovaná data
 */
export function filterData(data, filters) {
    return data.filter(item => {
        // Filtrovat podle osoby
        if (filters.person && item.person !== filters.person) {
            return false;
        }
        
        // Filtrovat podle data
        if (filters.startDate) {
            const itemDate = new Date(item.date);
            const startDate = new Date(filters.startDate);
            if (itemDate < startDate) {
                return false;
            }
        }
        
        if (filters.endDate) {
            const itemDate = new Date(item.date);
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59); // Konec dne
            if (itemDate > endDate) {
                return false;
            }
        }
        
        // Filtrovat podle aktivity
        if (filters.activity && item.activity !== filters.activity) {
            return false;
        }
        
        return true;
    });
}

/**
 * Seskupuje data podle klíče
 * @param {Array} data Data k seskupení
 * @param {Function} keyFn Funkce, která vrací klíč pro seskupení
 * @returns {Object} Seskupená data
 */
export function groupBy(data, keyFn) {
    return data.reduce((result, item) => {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {});
}

/**
 * Exportuje data do souboru CSV
 * @param {string} filename Název souboru
 * @param {Array} rows Řádky dat (první řádek je hlavička)
 */
export function exportToCSV(filename, rows) {
    // Pro Apple Numbers - BOM (Byte Order Mark) na začátku
    const bom = "\uFEFF";
    
    const processRow = function (row) {
        const finalVal = [];
        for (let j = 0; j < row.length; j++) {
            let innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString('cs-CZ');
            };
            let result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            finalVal.push(result);
        }
        return finalVal.join(',');
    };
    
    let csvFile = bom; // Přidat BOM na začátek pro lepší kompatibilitu
    for (let i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]) + '\n';
    }
    
    const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    
    // Na iOS musíme použít jinou metodu pro stažení
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        const url = window.URL.createObjectURL(blob);
        window.location.href = url;
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 100);
    } else {
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

/**
 * Formátuje datum pro zobrazení v grafu
 * @param {string} dateStr Datum ve formátu YYYY-MM-DD
 * @returns {string} Zkrácený formát data
 */
export function formatDateForChart(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month}.`;
}

/**
 * Vrací konec dne pro zadané datum
 * @param {Date} date Datum
 * @returns {Date} Datum na konci dne
 */
export function getEndOfDay(date) {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
}

/**
 * Vrací začátek dne pro zadané datum
 * @param {Date} date Datum
 * @returns {Date} Datum na začátku dne
 */
export function getStartOfDay(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
}

/**
 * Vrací český název dne v týdnu
 * @param {Date} date Datum
 * @returns {string} Název dne
 */
export function getDayNameCZ(date) {
    const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    return days[date.getDay()];
}

/**
 * Formátuje datum a čas
 * @param {Date} date Datum
 * @returns {string} Formátované datum a čas
 */
export function formatDateTime(date) {
    return `${formatDateCZ(date.toISOString().slice(0, 10))} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Zkontroluje, zda jsou dvě data ve stejný den
 * @param {Date} date1 První datum
 * @param {Date} date2 Druhé datum
 * @returns {boolean} True, pokud jsou data ve stejný den
 */
export function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Zkontroluje, zda jsou dvě data ve stejném měsíci
 * @param {Date} date1 První datum
 * @param {Date} date2 Druhé datum
 * @returns {boolean} True, pokud jsou data ve stejném měsíci
 */
export function isSameMonth(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
}

/**
 * Vrací seznam měsíců mezi dvěma daty
 * @param {Date} startDate Počáteční datum
 * @param {Date} endDate Koncové datum
 * @returns {Array} Seznam měsíců ve formátu YYYY-MM
 */
export function getMonthsBetween(startDate, endDate) {
    const months = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        months.push(`${year}-${month.toString().padStart(2, '0')}`);
        
        // Přejít na další měsíc
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
}

/**
 * Vrací první den měsíce
 * @param {number} year Rok
 * @param {number} month Měsíc (1-12)
 * @returns {Date} První den měsíce
 */
export function getFirstDayOfMonth(year, month) {
    return new Date(year, month - 1, 1);
}

/**
 * Vrací poslední den měsíce
 * @param {number} year Rok
 * @param {number} month Měsíc (1-12)
 * @returns {Date} Poslední den měsíce
 */
export function getLastDayOfMonth(year, month) {
    return new Date(year, month, 0);
}

/**
 * Funkce pro vytvoření kopie objektu
 * @param {Object} obj Objekt k duplikování
 * @returns {Object} Kopie objektu
 */
export function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Vrací hodinový tarif podle osoby
 * @param {string} person Osoba
 * @returns {number} Hodinový tarif
 */
export function getHourlyRate(person) {
    const hourlyRates = {
        maru: 275,
        marty: 400
    };
    return hourlyRates[person] || 0;
}

/**
 * Vrací tarif srážky podle osoby
 * @param {string} person Osoba
 * @returns {number} Tarif srážky (0-1)
 */
export function getDeductionRate(person) {
    const deductionRates = {
        maru: 1/3, // 33.33%
        marty: 0.5  // 50%
    };
    return deductionRates[person] || 0;
}

/**
 * Vypočítá výdělek z odpracovaných minut
 * @param {number} minutes Počet minut
 * @param {string} person Osoba
 * @returns {number} Výdělek
 */
export function calculateEarnings(minutes, person) {
    return (minutes / 60) * getHourlyRate(person);
}

/**
 * Vypočítá srážku z výdělku
 * @param {number} earnings Výdělek
 * @param {string} person Osoba
 * @returns {number} Částka srážky
 */
export function calculateDeduction(earnings, person) {
    return earnings * getDeductionRate(person);
}

/**
 * Detekuje, zda je zařízení mobilní
 * @returns {boolean} True, pokud je zařízení mobilní
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Zkracuje text, pokud je delší než zadaná délka
 * @param {string} text Text ke zkrácení
 * @param {number} maxLength Maximální délka
 * @returns {string} Zkrácený text
 */
export function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Získá aktuální datum ve formátu YYYY-MM-DD
 * @returns {string} Aktuální datum
 */
export function getCurrentDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Ověří, zda má prohlížeč podporu pro IndexedDB
 * @returns {boolean} True, pokud je IndexedDB podporována
 */
export function isIndexedDBSupported() {
    return !!window.indexedDB;
}

/**
 * Ověří, zda má prohlížeč dostatek místa pro ukládání
 * @param {number} requiredMB Požadovaná velikost v MB
 * @returns {Promise<boolean>} Promise, který se vyřeší s true, pokud je dostatek místa
 */
export async function hasEnoughStorage(requiredMB) {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const availableSpace = estimate.quota - estimate.usage;
            return availableSpace > (requiredMB * 1024 * 1024);
        }
        return true; // Nelze zjistit, předpokládáme, že je dostatek místa
    } catch (error) {
        console.warn('Nelze zjistit dostupné místo:', error);
        return true;
    }
}