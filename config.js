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
let snackbarTimer = null;

const form = document.getElementById('configForm');
const companyNameInput = document.getElementById('companyNameInput');
const baseCurrencyConfig = document.getElementById('baseCurrencyConfig');
const ratesGrid = document.getElementById('ratesGrid');
const decimalPlaces = document.getElementById('decimalPlaces');
const decimalHelp = document.getElementById('decimalHelp');
const resetBtn = document.getElementById('resetBtn');
const snackbar = document.getElementById('snackbar');

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
    populateForm();
}

function populateForm() {
    companyNameInput.value = config.companyName;
    baseCurrencyConfig.value = config.baseCurrency;
    decimalPlaces.value = config.decimalPlaces;
    renderRates();
    updateDecimalHelp();
}

function updateDecimalHelp() {
    const base = baseCurrencyConfig.value;
    if (base === 'COP') {
        decimalHelp.textContent = 'El Peso Colombiano (COP) se muestra sin decimales. Los demás valores usarán la cantidad elegida aquí.';
    } else {
        decimalHelp.textContent = 'Cantidad de decimales que se mostrarán en los totales.';
    }
}

function renderRates() {
    const baseCurrency = baseCurrencyConfig.value;
    const baseRates = DEFAULT_RATES[baseCurrency] || DEFAULT_RATES.COP;

    ratesGrid.innerHTML = CURRENCIES
        .filter(c => c !== baseCurrency)
        .map(currency => {
            const rate = config.rates[currency] ?? baseRates[currency];
            return `
                <div class="md3-rate-field">
                    <div class="md3-rate-field__header">
                        <span class="md3-rate-field__code">${currency}</span>
                        <span class="md3-rate-field__title">${CURRENCY_NAMES[currency]}</span>
                    </div>
                    <div class="md3-rate-field__row">
                        <span class="md3-rate-field__row-code">1 ${baseCurrency} =</span>
                        <input class="md3-text-field__input" type="number"
                               id="rate${currency}"
                               data-currency="${currency}"
                               value="${rate}"
                               step="any"
                               min="0"
                               aria-label="Tasa de ${CURRENCY_NAMES[currency]}">
                    </div>
                </div>
            `;
        }).join('');

    ratesGrid.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('md3-text-field__input--error');
        });
    });
}

function getFormData() {
    const rates = { [baseCurrencyConfig.value]: 1 };
    let valid = true;

    ratesGrid.querySelectorAll('input').forEach(input => {
        const currency = input.dataset.currency;
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0) {
            input.classList.add('md3-text-field__input--error');
            valid = false;
        } else {
            rates[currency] = value;
        }
    });

    if (!valid) return null;

    return {
        companyName: companyNameInput.value.trim() || DEFAULT_CONFIG.companyName,
        baseCurrency: baseCurrencyConfig.value,
        rates,
        decimalPlaces: parseInt(decimalPlaces.value, 10)
    };
}

function saveConfig(data) {
    try {
        localStorage.setItem('calculadora_frontera_config', JSON.stringify(data));
        config = data;
        showSnackbar('Configuración guardada', 'success');
        return true;
    } catch (e) {
        console.error('Error saving config:', e);
        showSnackbar('Error al guardar', 'error');
        return false;
    }
}

function showSnackbar(text, type) {
    clearTimeout(snackbarTimer);
    snackbar.textContent = text;
    snackbar.className = `md3-snackbar md3-snackbar--show md3-snackbar--${type}`;
    snackbarTimer = setTimeout(() => {
        snackbar.className = 'md3-snackbar';
    }, 3000);
}

function resetToDefaults() {
    if (confirm('¿Restablecer todos los valores a la configuración por defecto?')) {
        config = { ...DEFAULT_CONFIG };
        populateForm();
        saveConfig(config);
    }
}

function handleSubmit(e) {
    e.preventDefault();
    const data = getFormData();
    if (data) {
        saveConfig(data);
    }
}

function handleBaseCurrencyChange() {
    renderRates();
    updateDecimalHelp();
}

function init() {
    loadConfig();

    form.addEventListener('submit', handleSubmit);
    baseCurrencyConfig.addEventListener('change', handleBaseCurrencyChange);
    resetBtn.addEventListener('click', resetToDefaults);

    companyNameInput.addEventListener('input', () => {
        companyNameInput.classList.remove('md3-text-field__input--error');
    });
}

document.addEventListener('DOMContentLoaded', init);