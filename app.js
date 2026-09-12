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
    rates: DEFAULT_RATES.COP,
    decimalPlaces: 2
};

let config = { ...DEFAULT_CONFIG };
let history = [];

const amountInput = document.getElementById('amountInput');
const baseCurrencySelect = document.getElementById('baseCurrencySelect');
const calculateBtn = document.getElementById('calculateBtn');
const resultsGrid = document.getElementById('resultsGrid');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const companyNameEl = document.getElementById('companyName');

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

function loadHistory() {
    try {
        const saved = localStorage.getItem('calculadora_frontera_history');
        if (saved) {
            history = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading history:', e);
    }
    renderHistory();
}

function saveHistory() {
    localStorage.setItem('calculadora_frontera_history', JSON.stringify(history.slice(0, 20)));
}

function applyConfig() {
    companyNameEl.textContent = config.companyName;
    document.title = `${config.companyName} - Calculadora`;
    
    baseCurrencySelect.value = config.baseCurrency;
    amountInput.step = config.decimalPlaces > 0 ? `0.${'0'.repeat(config.decimalPlaces - 1)}1` : '1';
}

function formatNumber(num) {
    const decimals = config.decimalPlaces;
    const formatted = Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return formatted;
}

function convertAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const fromRates = DEFAULT_RATES[fromCurrency];
    if (!fromRates || !fromRates[toCurrency]) return 0;
    
    return amount * fromRates[toCurrency];
}

function calculateAll(amount, baseCurrency) {
    const results = {};
    CURRENCIES.forEach(currency => {
        results[currency] = convertAmount(amount, baseCurrency, currency);
    });
    return results;
}

function updateResults(results) {
    CURRENCIES.forEach(currency => {
        const el = document.getElementById(`result${currency}`);
        if (el) {
            el.textContent = formatNumber(results[currency]);
        }
        
        const card = resultsGrid.querySelector(`[data-currency="${currency}"]`);
        if (card) {
            card.classList.toggle('highlight', currency === baseCurrencySelect.value);
        }
    });
}

function addToHistory(amount, baseCurrency, results) {
    const entry = {
        timestamp: Date.now(),
        amount,
        baseCurrency,
        results: { ...results }
    };
    history.unshift(entry);
    saveHistory();
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-history">Sin cálculos recientes</li>';
        clearHistoryBtn.style.display = 'none';
        return;
    }
    
    clearHistoryBtn.style.display = 'block';
    
    historyList.innerHTML = history.map(entry => {
        const baseAmount = entry.results[entry.baseCurrency];
        const date = new Date(entry.timestamp).toLocaleString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
        return `
            <li class="history-item">
                <div class="history-info">
                    <span class="history-main">${formatNumber(baseAmount)} ${CURRENCY_SYMBOLS[entry.baseCurrency]}${entry.baseCurrency}</span>
                    <span class="history-details">${date} • ${CURRENCY_NAMES[entry.baseCurrency]}</span>
                </div>
                <span class="history-amount">${formatNumber(entry.results.VES)} ${CURRENCY_SYMBOLS.VES}VES</span>
            </li>
        `;
    }).join('');
}

function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
}

function handleCalculate() {
    const amount = parseFloat(amountInput.value);
    const baseCurrency = baseCurrencySelect.value;
    
    if (isNaN(amount) || amount < 0) {
        amountInput.focus();
        amountInput.style.borderColor = 'var(--danger)';
        setTimeout(() => amountInput.style.borderColor = '', 1500);
        return;
    }
    
    const results = calculateAll(amount, baseCurrency);
    updateResults(results);
    addToHistory(amount, baseCurrency, results);
    
    amountInput.value = '';
    amountInput.focus();
}

function handleInputChange() {
    amountInput.style.borderColor = '';
}

function init() {
    loadConfig();
    loadHistory();
    
    calculateBtn.addEventListener('click', handleCalculate);
    amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCalculate();
    });
    amountInput.addEventListener('input', handleInputChange);
    baseCurrencySelect.addEventListener('change', () => {
        amountInput.focus();
    });
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    amountInput.focus();
}

document.addEventListener('DOMContentLoaded', init);