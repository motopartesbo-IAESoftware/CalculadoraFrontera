const CURRENCIES = ['COP', 'USD', 'USDT', 'VES'];
const CURRENCY_NAMES = {
    COP: 'Peso Colombiano',
    USD: 'Dólar Estadounidense',
    USDT: 'USDT (Tether)',
    VES: 'Bolívar Venezolano'
};
const CURRENCY_SYMBOLS = {
    COP: '$',
    USD: '$',
    USDT: '₮',
    VES: 'Bs.'
};

const DEFAULT_RATES = {
    COP: { COP: 1, USD: 1/3100, USDT: 1/2850, VES: 1/3 },
    USD: { COP: 3100, USD: 1, USDT: 3100/2850, VES: 3100/3 },
    USDT: { COP: 2850, USD: 2850/3100, USDT: 1, VES: 2850/3 },
    VES: { COP: 3, USD: 3/3100, USDT: 3/2850, VES: 1 }
};

const DEFAULT_CONFIG = {
    companyName: 'Mi Negocio',
    baseCurrency: 'COP',
    rates: { ...DEFAULT_RATES.COP },
    decimalPlaces: 2
};

let config = { ...DEFAULT_CONFIG };
let tape = [];
let currentInput = '';
let pendingAction = null; // 'add' | 'subtract'
let lastTotal = 0;
let showingTotals = false;

const displayAmount = document.getElementById('displayAmount');
const displaySymbol = document.getElementById('displaySymbol');
const displayCurrency = document.getElementById('displayCurrency');
const pendingOpEl = document.getElementById('pendingOp');
const sellerSymbol = document.getElementById('sellerSymbol');
const sellerAmount = document.getElementById('sellerAmount');
const sellerCurrency = document.getElementById('sellerCurrency');
const sellerPending = document.getElementById('sellerPending');
const subDisplay = document.getElementById('subDisplay');
const tapeList = document.getElementById('tapeList');
const emptyTape = document.getElementById('emptyTape');
const totalsSection = document.getElementById('totalsSection');
const totalsGrid = document.getElementById('totalsGrid');
const scrim = document.getElementById('scrim');
const companyNameEl = document.getElementById('companyName');
const footerText = document.getElementById('footerText');
const clearTapeBtn = document.getElementById('clearTapeBtn');
const hideTotalsBtn = document.getElementById('hideTotalsBtn');

function loadConfig() {
    try {
        const saved = localStorage.getItem('calculadora_frontera_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            config = { ...DEFAULT_CONFIG, ...parsed, rates: { ...DEFAULT_RATES[parsed.baseCurrency], ...parsed.rates } };
        }
    } catch (e) {
        console.error('Error loading config:', e);
    }
    applyConfig();
}

function loadTape() {
    try {
        const saved = localStorage.getItem('calculadora_frontera_tape');
        if (saved) {
            tape = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading tape:', e);
    }
    renderTape();
    updateDisplay();
}

function saveTape() {
    localStorage.setItem('calculadora_frontera_tape', JSON.stringify(tape));
}

function applyConfig() {
    companyNameEl.textContent = config.companyName;
    document.title = `${config.companyName} - Calculadora`;
    footerText.textContent = `Moneda base: ${CURRENCY_NAMES[config.baseCurrency]} • Datos guardados localmente`;
    
    const symbol = CURRENCY_SYMBOLS[config.baseCurrency];
    displaySymbol.textContent = symbol;
    sellerSymbol.textContent = symbol;
    displayCurrency.textContent = config.baseCurrency;
    sellerCurrency.textContent = config.baseCurrency;
    
    updateDisplay();
    renderTotals();
}

function getDecimalsForDisplay() {
    // COP sin decimales, resto usa config.decimalPlaces
    return config.baseCurrency === 'COP' ? 0 : config.decimalPlaces;
}

function formatNumber(num) {
    const decimals = getDecimalsForDisplay();
    return Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function parseInput(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^\d.,-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function convertAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    const base = config.baseCurrency;

    if (fromCurrency === base) {
        const rate = config.rates[toCurrency];
        return rate ? amount * rate : 0;
    }
    if (toCurrency === base) {
        const rate = config.rates[fromCurrency];
        return rate ? amount / rate : 0;
    }
    const fromRate = config.rates[fromCurrency];
    const toRate = config.rates[toCurrency];
    if (!fromRate || !toRate) return 0;
    const baseAmount = amount / fromRate;
    return baseAmount * toRate;
}

function calculateAll(amount, baseCurrency) {
    const results = {};
    CURRENCIES.forEach(currency => {
        results[currency] = convertAmount(amount, baseCurrency, currency);
    });
    return results;
}

function getCurrentTotal() {
    return tape.reduce((sum, item) => sum + item.signedAmount, 0);
}

function updateDisplay() {
    const total = getCurrentTotal();
    lastTotal = total;
    
    let displayValue, sellerValue;
    let showPendingOp = false;
    let pendingOpSymbol = '';
    
    if (currentInput) {
        // Usuario está escribiendo un número - mostrar LO QUE ESTÁ ESCRIBIENDO
        displayValue = parseInput(currentInput);
        sellerValue = displayValue;
        if (pendingAction) {
            showPendingOp = true;
            pendingOpSymbol = pendingAction === 'add' ? '+' : '−';
        }
    } else {
        // No hay input actual, mostrar total acumulado
        displayValue = total;
        sellerValue = total;
    }
    
    // Display cliente (volteado) - SIEMPRE muestra lo que se está digitando o el total
    displayAmount.textContent = formatNumber(displayValue);
    if (showPendingOp) {
        pendingOpEl.textContent = pendingOpSymbol;
        pendingOpEl.style.display = 'inline-block';
    } else {
        pendingOpEl.style.display = 'none';
    }
    
    // Display vendedor (normal)
    sellerAmount.textContent = formatNumber(sellerValue);
    if (showPendingOp) {
        sellerPending.textContent = pendingOpSymbol;
        sellerPending.style.display = 'inline-block';
    } else {
        sellerPending.style.display = 'none';
    }
    
    // Sub-display: mostrar total acumulado + operación pendiente si hay input
    if (currentInput) {
        if (total !== 0 || pendingAction) {
            const opText = pendingAction ? (pendingAction === 'add' ? '+' : '−') : '';
            subDisplay.textContent = `Total: ${formatNumber(total)} ${CURRENCY_SYMBOLS[config.baseCurrency]}${config.baseCurrency} ${opText}${formatNumber(parseInput(currentInput))}`;
        } else {
            subDisplay.textContent = '';
        }
    } else {
        subDisplay.textContent = '';
    }
}

function renderTape() {
    if (tape.length === 0) {
        tapeList.innerHTML = '';
        emptyTape.style.display = 'flex';
        clearTapeBtn.style.display = 'none';
        return;
    }
    
    emptyTape.style.display = 'none';
    clearTapeBtn.style.display = 'flex';
    
    tapeList.innerHTML = tape.map((item, index) => {
        const sign = item.action === 'add' ? '+' : '−';
        const time = new Date(item.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        return `
            <li class="md3-tape-item md3-tape-item--${item.action}" data-index="${index}">
                <div class="md3-tape-item__info">
                    <span class="md3-tape-item__operation">${sign} ${formatNumber(item.amount)} ${CURRENCY_SYMBOLS[config.baseCurrency]}${config.baseCurrency}</span>
                    <span class="md3-tape-item__time">${time}</span>
                </div>
                <span class="md3-tape-item__amount">${sign}${formatNumber(item.signedAmount)}</span>
            </li>
        `;
    }).join('');
}

function renderTotals() {
    const results = calculateAll(lastTotal, config.baseCurrency);
    
    totalsGrid.innerHTML = CURRENCIES.map(currency => `
        <div class="md3-total-card ${currency === config.baseCurrency ? 'md3-total-card--highlight' : ''}" data-currency="${currency}">
            <span class="md3-total-card__label">${CURRENCY_NAMES[currency]}</span>
            <span class="md3-total-card__code">${currency}</span>
            <span class="md3-total-card__amount">${CURRENCY_SYMBOLS[currency]}${formatNumber(results[currency])}</span>
        </div>
    `).join('');
}

function addToTape(amount, action) {
    if (amount === 0) return;
    
    const entry = {
        timestamp: Date.now(),
        amount,
        action,
        signedAmount: action === 'add' ? amount : -amount
    };
    
    tape.push(entry);
    saveTape();
    renderTape();
    updateDisplay();
    renderTotals();
    tapeList.scrollTop = tapeList.scrollHeight;
}

function clearTape() {
    if (tape.length === 0 && !currentInput) return;
    if (!confirm('¿Borrar todas las operaciones?')) return;
    
    tape = [];
    currentInput = '';
    pendingAction = null;
    lastTotal = 0;
    saveTape();
    renderTape();
    updateDisplay();
    renderTotals();
    hideTotals();
}

function handleNumberKey(key) {
    if (key === '.' && currentInput.includes('.')) return;
    if (key === '0' && currentInput === '0') return;
    
    if (currentInput === '0' && key !== '.') {
        currentInput = key;
    } else {
        currentInput += key;
    }
    updateDisplay();
}

function handleActionKey(action) {
    const amount = parseInput(currentInput);
    
    if (action === 'clear') {
        clearTape();
        return;
    }
    
    if (action === 'undo') {
        if (currentInput) {
            currentInput = currentInput.slice(0, -1);
            if (!currentInput) currentInput = '';
            updateDisplay();
        } else if (tape.length > 0) {
            tape.pop();
            saveTape();
            renderTape();
            updateDisplay();
            renderTotals();
        }
        return;
    }
    
    if (action === 'total') {
        // IGUAL: si hay número digitado, AGREGARLO a la cinta con la operación pendiente (o suma por defecto)
        if (currentInput) {
            const actionToUse = pendingAction || 'add';
            addToTape(amount, actionToUse);
            currentInput = '';
            pendingAction = null;
        }
        showTotals();
        return;
    }
    
    // BOTÓN + O - : Registrar INMEDIATAMENTE lo que hay en pantalla
    if (currentInput) {
        addToTape(amount, action);
        currentInput = '';
        pendingAction = null;
        updateDisplay();
    } else if (pendingAction) {
        // Cambiar operación pendiente sin número nuevo
        pendingAction = action;
        updateDisplay();
    } else {
        // No hay número, guardar operación para el próximo número
        pendingAction = action;
        updateDisplay();
    }
}

function showTotals() {
    showingTotals = true;
    totalsSection.hidden = false;
    scrim.hidden = false;
    renderTotals();
}

function hideTotals() {
    showingTotals = false;
    totalsSection.hidden = true;
    scrim.hidden = true;
}

// Event handlers optimizados para respuesta táctil rápida
function handleKeyPress(keyValue, action) {
    if (keyValue !== undefined) {
        handleNumberKey(keyValue);
    } else if (action) {
        handleActionKey(action);
    }
    if (navigator.vibrate) navigator.vibrate(5);
}

function handleKeypadClick(e) {
    const key = e.target.closest('.md3-keypad-key');
    if (!key) return;
    e.preventDefault();
    triggerRipple(key);
    const keyValue = key.dataset.key;
    const action = key.dataset.action;
    handleKeyPress(keyValue, action);
}

function triggerRipple(btn) {
    btn.classList.remove('md3-button--active');
    void btn.offsetWidth;
    btn.classList.add('md3-button--active');
    setTimeout(() => btn.classList.remove('md3-button--active'), 300);
}

function handleKeypadTouchStart(e) {
    const key = e.target.closest('.md3-keypad-key');
    if (!key) return;
    e.preventDefault();
    key.classList.add('md3-button--active');
}

function handleKeypadTouchEnd(e) {
    const key = e.target.closest('.md3-keypad-key');
    if (!key) return;
    e.preventDefault();
    const keyValue = key.dataset.key;
    const action = key.dataset.action;
    handleKeyPress(keyValue, action);
    setTimeout(() => key.classList.remove('md3-button--active'), 300);
}

function handleKeypadTouchCancel(e) {
    const key = e.target.closest('.md3-keypad-key');
    if (key) key.classList.remove('md3-button--active');
}

function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    const key = e.key;
    
    if (key >= '0' && key <= '9') {
        handleNumberKey(key);
    } else if (key === '.') {
        handleNumberKey('.');
    } else if (key === '+') {
        e.preventDefault();
        handleActionKey('add');
    } else if (key === '-' || key === '_') {
        e.preventDefault();
        handleActionKey('subtract');
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleActionKey('total');
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        handleActionKey('clear');
    } else if (key === 'Backspace') {
        handleActionKey('undo');
    }
}

function init() {
    loadConfig();
    loadTape();
    
    document.addEventListener('keydown', handleKeyboard);
    
    const keypadGrid = document.querySelector('.md3-keypad-grid');
    // Click normal (mouse / accessibility)
    keypadGrid.addEventListener('click', handleKeypadClick);
    // Touch events para respuesta inmediata
    keypadGrid.addEventListener('touchstart', handleKeypadTouchStart, { passive: false });
    keypadGrid.addEventListener('touchend', handleKeypadTouchEnd, { passive: false });
    keypadGrid.addEventListener('touchcancel', handleKeypadTouchCancel, { passive: true });
    
    clearTapeBtn.addEventListener('click', clearTape);
    hideTotalsBtn.addEventListener('click', hideTotals);
    scrim.addEventListener('click', hideTotals);
    
    // Prevenir zoom en doble tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });
}

document.addEventListener('DOMContentLoaded', init);