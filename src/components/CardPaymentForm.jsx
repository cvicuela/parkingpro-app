import { useState, useCallback } from 'react';
import { CreditCard, RefreshCw, X, AlertCircle } from 'lucide-react';

/* ── Luhn algorithm ── */
function luhnCheck(num) {
  const digits = num.replace(/\D/g, '');
  if (!digits) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/* ── Detect card brand from first digits ── */
function detectBrand(num) {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'visa';
  if (/^5[1-5]/.test(d) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return null;
}

/* ── Brand icons (inline SVG-based text badges) ── */
function BrandIcon({ brand }) {
  if (!brand) return <CreditCard size={22} className="text-gray-400" />;
  if (brand === 'visa') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-blue-700 text-white font-extrabold text-xs rounded tracking-widest select-none">
        VISA
      </span>
    );
  }
  if (brand === 'mastercard') {
    return (
      <span className="inline-flex items-center gap-0.5 select-none">
        <span className="w-5 h-5 bg-red-500 rounded-full opacity-90 inline-block" />
        <span className="w-5 h-5 bg-amber-400 rounded-full opacity-90 -ml-2.5 inline-block" />
      </span>
    );
  }
  if (brand === 'amex') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-blue-500 text-white font-bold text-xs rounded tracking-wide select-none">
        AMEX
      </span>
    );
  }
  return <CreditCard size={22} className="text-gray-400" />;
}

/* ── Format card number with spaces every 4 digits ── */
function formatCardNumber(raw, brand) {
  const digits = raw.replace(/\D/g, '');
  // Amex: 4-6-5 grouping; others: 4-4-4-4
  if (brand === 'amex') {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(' ');
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/* ── Format expiry as MM/YY ── */
function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2, 4);
}

const fmtMoney = (n) => {
  const parts = Number(n || 0).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `RD$ ${parts.join('.')}`;
};

export default function CardPaymentForm({ amount, onSubmit, onCancel, isLoading, error }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const brand = detectBrand(cardNumber);
  const maxCardDigits = brand === 'amex' ? 15 : 16;

  const handleCardNumberChange = useCallback((e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, maxCardDigits);
    setCardNumber(raw);
    setFieldErrors(prev => ({ ...prev, cardNumber: undefined }));
  }, [maxCardDigits]);

  const handleExpiryChange = useCallback((e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setExpiry(raw);
    setFieldErrors(prev => ({ ...prev, expiry: undefined }));
  }, []);

  const handleCvvChange = useCallback((e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3);
    setCvv(raw);
    setFieldErrors(prev => ({ ...prev, cvv: undefined }));
  }, [brand]);

  const handleHolderChange = useCallback((e) => {
    setHolderName(e.target.value.toUpperCase());
    setFieldErrors(prev => ({ ...prev, holderName: undefined }));
  }, []);

  const validate = () => {
    const errors = {};
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < maxCardDigits) {
      errors.cardNumber = `Número de tarjeta incompleto (${digits.length}/${maxCardDigits} dígitos)`;
    } else if (!luhnCheck(digits)) {
      errors.cardNumber = 'Número de tarjeta inválido';
    }

    const expiryDigits = expiry.replace(/\D/g, '');
    if (expiryDigits.length < 4) {
      errors.expiry = 'Fecha de expiración incompleta';
    } else {
      const month = parseInt(expiryDigits.slice(0, 2), 10);
      if (month < 1 || month > 12) errors.expiry = 'Mes inválido';
    }

    const minCvv = brand === 'amex' ? 4 : 3;
    if (cvv.length < minCvv) {
      errors.cvv = `CVV debe tener ${minCvv} dígitos`;
    }

    if (!holderName.trim() || holderName.trim().length < 3) {
      errors.holderName = 'Ingrese el nombre del titular';
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const expiryDigits = expiry.replace(/\D/g, '');
    onSubmit({
      cardNumber: cardNumber.replace(/\D/g, ''),
      cardExpMonth: expiryDigits.slice(0, 2),
      cardExpYear: expiryDigits.slice(2, 4),
      cardCvv: cvv,
      cardHolderName: holderName.trim(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Amount display */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
        <p className="text-sm text-indigo-600 font-medium mb-1">Total a pagar</p>
        <p className="text-3xl font-bold text-indigo-700">{fmtMoney(amount)}</p>
      </div>

      {/* Global error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg p-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Card number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Tarjeta
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={formatCardNumber(cardNumber, brand)}
              onChange={handleCardNumberChange}
              placeholder="4242 4242 4242 4242"
              className={`w-full pl-4 pr-14 py-3 border rounded-lg font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
                fieldErrors.cardNumber ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
              }`}
              disabled={isLoading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <BrandIcon brand={brand} />
            </div>
          </div>
          {fieldErrors.cardNumber && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.cardNumber}</p>
          )}
        </div>

        {/* Expiry + CVV row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiración
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={formatExpiry(expiry)}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              className={`w-full px-4 py-3 border rounded-lg font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
                fieldErrors.expiry ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
              }`}
              disabled={isLoading}
            />
            {fieldErrors.expiry && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.expiry}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVV {brand === 'amex' ? '(4 dígitos)' : '(3 dígitos)'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cvv}
              onChange={handleCvvChange}
              placeholder={brand === 'amex' ? '••••' : '•••'}
              className={`w-full px-4 py-3 border rounded-lg font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
                fieldErrors.cvv ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
              }`}
              disabled={isLoading}
            />
            {fieldErrors.cvv && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.cvv}</p>
            )}
          </div>
        </div>

        {/* Cardholder name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Titular
          </label>
          <input
            type="text"
            autoComplete="cc-name"
            value={holderName}
            onChange={handleHolderChange}
            placeholder="NOMBRE APELLIDO"
            className={`w-full px-4 py-3 border rounded-lg text-base font-medium tracking-wide focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${
              fieldErrors.holderName ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
            disabled={isLoading}
          />
          {fieldErrors.holderName && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.holderName}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
          >
            <X size={16} /> Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg py-3 hover:bg-indigo-700 disabled:opacity-50 font-bold text-base transition-colors"
          >
            {isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <CreditCard size={18} /> Pagar {fmtMoney(amount)}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
