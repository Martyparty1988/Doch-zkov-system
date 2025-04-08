/**
 * ui.js
 * Modul pro správu uživatelského rozhraní
 */

/**
 * Třída pro správu notifikací
 */
class NotificationManager {
    constructor() {
        this.container = null;
        this.timeout = 5000; // Výchozí doba zobrazení notifikace
        this.init();
    }

    /**
     * Inicializace kontejneru pro notifikace
     */
    init() {
        // Vytvoříme kontejner pro notifikace, pokud neexistuje
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);

            // Přidáme styly, pokud neexistují
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    .notification-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        max-width: 300px;
                        z-index: 9999;
                    }
                    .notification {
                        margin-bottom: 10px;
                        padding: 15px;
                        border-radius: 8px;
                        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                        transform: translateX(120%);
                        transition: transform 0.3s ease-out;
                        animation: slideIn 0.3s forwards, fadeOut 0.5s forwards;
                        animation-delay: 0s, var(--delay);
                    }
                    .notification-success {
                        background-color: #28a745;
                        color: white;
                    }
                    .notification-error {
                        background-color: #dc3545;
                        color: white;
                    }
                    .notification-warning {
                        background-color: #ffc107;
                        color: #343a40;
                    }
                    .notification-info {
                        background-color: #17a2b8;
                        color: white;
                    }
                    @keyframes slideIn {
                        to { transform: translateX(0); }
                    }
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { 
                            opacity: 0; 
                            transform: translateX(120%);
                        }
                    }
                    
                    @media (prefers-color-scheme: dark) {
                        .notification-success {
                            background-color: #2ecc71;
                        }
                        .notification-error {
                            background-color: #e74c3c;
                        }
                        .notification-warning {
                            background-color: #f39c12;
                        }
                        .notification-info {
                            background-color: #3498db;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    /**
     * Zobrazení notifikace
     * @param {string} message Text notifikace
     * @param {string} type Typ notifikace ('success', 'error', 'warning', 'info')
     * @param {number} timeout Doba zobrazení v ms (pokud není specifikována, použije se výchozí)
     */
    show(message, type = 'info', timeout = this.timeout) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.setProperty('--delay', `${timeout / 1000}s`);
        
        this.container.appendChild(notification);
        
        // Po animaci odstraníme notifikaci
        notification.addEventListener('animationend', (e) => {
            if (e.animationName === 'fadeOut') {
                notification.remove();
            }
        });
    }

    /**
     * Zobrazení úspěšné notifikace
     * @param {string} message Text notifikace
     * @param {number} timeout Doba zobrazení v ms
     */
    success(message, timeout) {
        this.show(message, 'success', timeout);
    }

    /**
     * Zobrazení chybové notifikace
     * @param {string} message Text notifikace
     * @param {number} timeout Doba zobrazení v ms
     */
    error(message, timeout) {
        this.show(message, 'error', timeout);
    }

    /**
     * Zobrazení varovné notifikace
     * @param {string} message Text notifikace
     * @param {number} timeout Doba zobrazení v ms
     */
    warning(message, timeout) {
        this.show(message, 'warning', timeout);
    }

    /**
     * Zobrazení informační notifikace
     * @param {string} message Text notifikace
     * @param {number} timeout Doba zobrazení v ms
     */
    info(message, timeout) {
        this.show(message, 'info', timeout);
    }
}

/**
 * Třída pro správu dialogů
 */
class DialogManager {
    constructor() {
        this.container = null;
        this.init();
    }

    /**
     * Inicializace kontejneru pro dialogy
     */
    init() {
        // Vytvoříme kontejner pro dialogy, pokud neexistuje
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'dialog-container';
            document.body.appendChild(this.container);

            // Přidáme styly, pokud neexistují
            if (!document.getElementById('dialog-styles')) {
                const style = document.createElement('style');
                style.id = 'dialog-styles';
                style.textContent = `
                    .dialog-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10000;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.3s, visibility 0.3s;
                    }
                    .dialog-container.active {
                        opacity: 1;
                        visibility: visible;
                    }
                    .dialog {
                        background-color: white;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                        width: 90%;
                        max-width: 500px;
                        max-height: 90vh;
                        overflow-y: auto;
                        transform: translateY(-20px);
                        transition: transform 0.3s;
                    }
                    .dialog-container.active .dialog {
                        transform: translateY(0);
                    }
                    .dialog-header {
                        padding: 15px 20px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .dialog-title {
                        margin: 0;
                        font-size: 1.2rem;
                        font-weight: 600;
                    }
                    .dialog-close {
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                        color: #999;
                    }
                    .dialog-close:hover {
                        color: #333;
                    }
                    .dialog-body {
                        padding: 20px;
                    }
                    .dialog-footer {
                        padding: 15px 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                    }
                    .dialog-btn {
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                    }
                    .dialog-btn-primary {
                        background-color: #4a6da7;
                        color: white;
                    }
                    .dialog-btn-primary:hover {
                        background-color: #3a5a8f;
                    }
                    .dialog-btn-secondary {
                        background-color: #6c757d;
                        color: white;
                    }
                    .dialog-btn-secondary:hover {
                        background-color: #5a6268;
                    }
                    
                    @media (prefers-color-scheme: dark) {
                        .dialog {
                            background-color: #1e1e1e;
                            color: #e0e0e0;
                        }
                        .dialog-header {
                            border-bottom-color: #333;
                        }
                        .dialog-footer {
                            border-top-color: #333;
                        }
                        .dialog-close {
                            color: #aaa;
                        }
                        .dialog-close:hover {
                            color: #fff;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    /**
     * Zobrazení dialogu
     * @param {Object} options Možnosti dialogu
     * @returns {Promise} Promise, který se vyřeší s výsledkem dialogu
     */
    show(options) {
        return new Promise((resolve) => {
            const defaults = {
                title: 'Dialog',
                content: '',
                okText: 'OK',
                cancelText: 'Zrušit',
                showCancel: true,
                showClose: true,
                onClose: null
            };
            
            const settings = { ...defaults, ...options };
            
            // Vyčistíme předchozí dialogy
            this.container.innerHTML = '';
            
            // Vytvoříme dialog
            const dialog = document.createElement('div');
            dialog.className = 'dialog';
            
            // Hlavička dialogu
            const header = document.createElement('div');
            header.className = 'dialog-header';
            
            const title = document.createElement('h3');
            title.className = 'dialog-title';
            title.textContent = settings.title;
            header.appendChild(title);
            
            if (settings.showClose) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'dialog-close';
                closeBtn.innerHTML = '&times;';
                closeBtn.addEventListener('click', () => {
                    this.hide();
                    if (settings.onClose) settings.onClose();
                    resolve(false);
                });
                header.appendChild(closeBtn);
            }
            
            dialog.appendChild(header);
            
            // Tělo dialogu
            const body = document.createElement('div');
            body.className = 'dialog-body';
            
            if (typeof settings.content === 'string') {
                body.innerHTML = settings.content;
            } else if (settings.content instanceof HTMLElement) {
                body.appendChild(settings.content);
            }
            
            dialog.appendChild(body);
            
            // Patička dialogu
            const footer = document.createElement('div');
            footer.className = 'dialog-footer';
            
            if (settings.showCancel) {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'dialog-btn dialog-btn-secondary';
                cancelBtn.textContent = settings.cancelText;
                cancelBtn.addEventListener('click', () => {
                    this.hide();
                    resolve(false);
                });
                footer.appendChild(cancelBtn);
            }
            
            const okBtn = document.createElement('button');
            okBtn.className = 'dialog-btn dialog-btn-primary';
            okBtn.textContent = settings.okText;
            okBtn.addEventListener('click', () => {
                this.hide();
                resolve(true);
            });
            footer.appendChild(okBtn);
            
            dialog.appendChild(footer);
            
            // Přidáme dialog do kontejneru
            this.container.appendChild(dialog);
            
            // Zobrazíme dialog
            setTimeout(() => {
                this.container.classList.add('active');
                // Nastavíme focus na tlačítko OK
                okBtn.focus();
            }, 10);
            
            // Zavření dialogu při kliknutí mimo něj
            this.container.addEventListener('click', (event) => {
                if (event.target === this.container) {
                    this.hide();
                    resolve(false);
                }
            });
        });
    }

    /**
     * Skrytí dialogu
     */
    hide() {
        this.container.classList.remove('active');
    }

    /**
     * Zobrazení potvrzovacího dialogu
     * @param {string} message Text zprávy
     * @param {string} title Titulek dialogu (volitelné)
     * @returns {Promise<boolean>} Promise, který se vyřeší s výsledkem dialogu
     */
    async confirm(message, title = 'Potvrzení') {
        return this.show({
            title,
            content: message,
            okText: 'Potvrdit',
            cancelText: 'Zrušit',
            showCancel: true
        });
    }

    /**
     * Zobrazení informačního dialogu
     * @param {string} message Text zprávy
     * @param {string} title Titulek dialogu (volitelné)
     * @returns {Promise<boolean>} Promise, který se vyřeší po zavření dialogu
     */
    async alert(message, title = 'Informace') {
        return this.show({
            title,
            content: message,
            okText: 'OK',
            showCancel: false
        });
    }

    /**
     * Zobrazení dialogu s vlastním formulářem
     * @param {HTMLElement} formElement Formulářový element
     * @param {string} title Titulek dialogu
     * @returns {Promise<boolean>} Promise, který se vyřeší s výsledkem dialogu
     */
    async showForm(formElement, title) {
        return this.show({
            title,
            content: formElement,
            okText: 'Uložit',
            cancelText: 'Zrušit',
            showCancel: true
        });
    }
}

/**
 * Třída pro správu loading indikátoru
 */
class LoadingIndicator {
    constructor() {
        this.container = null;
        this.init();
    }

    /**
     * Inicializace loading indikátoru
     */
    init() {
        // Vytvoříme kontejner pro loading indikátor, pokud neexistuje
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'loading-container';
            
            // Vytvoření loading indikátoru
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            this.container.appendChild(spinner);
            
            document.body.appendChild(this.container);

            // Přidáme styly, pokud neexistují
            if (!document.getElementById('loading-styles')) {
                const style = document.createElement('style');
                style.id = 'loading-styles';
                style.textContent = `
                    .loading-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10001;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.3s, visibility 0.3s;
                    }
                    .loading-container.active {
                        opacity: 1;
                        visibility: visible;
                    }
                    .loading-spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top-color: white;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    /**
     * Zobrazení loading indikátoru
     */
    show() {
        this.container.classList.add('active');
    }

    /**
     * Skrytí loading indikátoru
     */
    hide() {
        this.container.classList.remove('active');
    }

    /**
     * Zobrazení loading indikátoru po dobu provádění asynchronní operace
     * @param {Promise} promise Promise, který se má vykonat
     * @returns {Promise} Původní promise
     */
    async during(promise) {
        try {
            this.show();
            return await promise;
        } finally {
            this.hide();
        }
    }
}

/**
 * Třída pro správu accordion komponentů
 */
class AccordionManager {
    /**
     * Vytvoření nového accordionu
     * @param {string} containerId ID kontejneru pro accordion
     * @param {Array} items Položky accordionu
     * @param {Function} renderHeaderFn Funkce pro vykreslení hlavičky
     * @param {Function} renderContentFn Funkce pro vykreslení obsahu
     */
    createAccordion(containerId, items, renderHeaderFn, renderContentFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<div class="accordion-empty">Žádné záznamy k zobrazení</div>';
            return;
        }
        
        items.forEach((item, index) => {
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            
            // Hlavička
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerHTML = renderHeaderFn(item, index);
            
            // Obsah
            const content = document.createElement('div');
            content.className = 'accordion-content';
            
            const contentInner = document.createElement('div');
            contentInner.className = 'accordion-content-inner';
            contentInner.innerHTML = renderContentFn(item, index);
            
            content.appendChild(contentInner);
            
            // Přidání event listeneru
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                
                if (header.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = null;
                }
            });
            
            // Sestavení accordion položky
            accordionItem.appendChild(header);
            accordionItem.appendChild(content);
            
            container.appendChild(accordionItem);
        });
    }
}

/**
 * Třída pro správu tabulek
 */
class TableManager {
    /**
     * Vykreslení tabulky
     * @param {string} containerId ID kontejneru pro tabulku
     * @param {Array} headers Názvy sloupců
     * @param {Array} data Data pro tabulku
     * @param {Function} renderRowFn Funkce pro vykreslení řádku
     */
    renderTable(containerId, headers, data, renderRowFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Vytvořit tabulku
        const table = document.createElement('table');
        
        // Hlavička tabulky
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Tělo tabulky
        const tbody = document.createElement('tbody');
        
        if (data.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = headers.length;
            emptyCell.textContent = 'Žádné záznamy';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '2rem';
            emptyCell.style.color = '#888';
            
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        } else {
            data.forEach((item, index) => {
                const row = renderRowFn(item, index);
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);
        
        // Vyčistit kontejner a přidat tabulku
        container.innerHTML = '';
        container.appendChild(table);
    }
}

/**
 * Správce navigace
 */
class NavigationManager {
    constructor() {
        this.sections = document.querySelectorAll('main > section');
        this.navLinks = document.querySelectorAll('nav ul li a');
        this.init();
    }

    /**
     * Inicializace navigace
     */
    init() {
        // Přidání event listenerů
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                if (sectionId) {
                    this.showSection(sectionId);
                }
            });
        });
        
        // Zobrazení sekce podle URL hash
        this.handleInitialSection();
    }

    /**
     * Zobrazení sekce podle URL hash nebo výchozí sekce
     */
    handleInitialSection() {
        if (window.location.hash) {
            const sectionId = window.location.hash.substring(1);
            if (document.getElementById(sectionId)) {
                this.showSection(sectionId);
                return;
            }
        }
        this.showSection('dochazka');
    }

    /**
     * Zobrazení sekce
     * @param {string} sectionId ID sekce k zobrazení
     * @param {Function} callback Volitelný callback po zobrazení sekce
     */
    showSection(sectionId, callback) {
        this.sections.forEach(section => {
            section.classList.remove('active');
        });
        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) {
            sectionToShow.classList.add('active');
        }
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Aktualizovat URL hash bez přenačtení stránky
        history.pushState(null, null, `#${sectionId}`);
        
        // Volat callback, pokud existuje
        if (callback && typeof callback === 'function') {
            callback(sectionId);
        }
        
        // Vyvolat událost pro změnu sekce
        const event = new CustomEvent('sectionChanged', { detail: { sectionId } });
        document.dispatchEvent(event);
    }
}

/**
 * Třída pro správu formulářů
 */
class FormManager {
    /**
     * Inicializace formuláře
     * @param {string} formId ID formuláře
     * @param {Function} submitCallback Callback při odeslání formuláře
     * @param {Function} resetCallback Volitelný callback při resetování formuláře
     */
    initForm(formId, submitCallback, resetCallback) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Validace formuláře
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Vytvoření objektu s daty formuláře
            const formData = new FormData(form);
            const data = {};
            
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
            // Volání callback funkce
            submitCallback(data, form);
        });
        
        // Přidání resetu, pokud je definován callback
        if (resetCallback && typeof resetCallback === 'function') {
            form.addEventListener('reset', (e) => {
                resetCallback(form);
            });
        }
    }

    /**
     * Naplnění formuláře daty
     * @param {string} formId ID formuláře
     * @param {Object} data Data pro naplnění
     */
    fillForm(formId, data) {
        const form = document.getElementById(formId);
        if (!form || !data) return;
        
        // Projít všechny vstupy a naplnit je daty
        Array.from(form.elements).forEach(element => {
            const name = element.name;
            if (!name || !data.hasOwnProperty(name)) return;
            
            if (element.type === 'checkbox') {
                element.checked = Boolean(data[name]);
            } else if (element.type === 'radio') {
                element.checked = element.value === String(data[name]);
            } else if (element.tagName === 'SELECT') {
                const value = String(data[name]);
                for (let i = 0; i < element.options.length; i++) {
                    if (element.options[i].value === value) {
                        element.selectedIndex = i;
                        break;
                    }
                }
            } else {
                element.value = data[name];
            }
        });
    }

    /**
     * Reset formuláře
     * @param {string} formId ID formuláře
     */
    resetForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.reset();
    }

    /**
     * Nastavení editačního módu formuláře
     * @param {string} formId ID formuláře
     * @param {string} saveButtonId ID tlačítka pro uložení
     * @param {string} cancelButtonId ID tlačítka pro zrušení
     * @param {boolean} editMode True pro editační mód, false pro přidávací mód
     */
    setEditMode(formId, saveButtonId, cancelButtonId, editMode) {
        const form = document.getElementById(formId);
        const saveButton = document.getElementById(saveButtonId);
        const cancelButton = document.getElementById(cancelButtonId);
        
        if (!form || !saveButton || !cancelButton) return;
        
        if (editMode) {
            saveButton.textContent = 'Uložit změny';
            cancelButton.style.display = 'block';
        } else {
            saveButton.textContent = 'Přidat';
            cancelButton.style.display = 'none';
        }
    }
}

// Vytvoření a export instancí pro globální použití
export const notifications = new NotificationManager();
export const dialogs = new DialogManager();
export const loading = new LoadingIndicator();
export const accordion = new AccordionManager();
export const tables = new TableManager();
export const navigation = new NavigationManager();
export const forms = new FormManager();