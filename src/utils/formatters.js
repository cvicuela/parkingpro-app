/**
 * Formatear monto de dinero con separadores de miles (comas)
 * @param {number|string} value - Monto a formatear
 * @param {boolean} withPrefix - Si incluir el prefijo 'RD$' (default: true)
 * @returns {string} Monto formateado, ej: "RD$ 1,234.56"
 */
export const fmtMoney = (value, withPrefix = true) => {
  const num = Number(value || 0);
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = parts.join('.');
  return withPrefix ? `RD$ ${formatted}` : formatted;
};

/**
 * Formatear número con separadores de miles (sin decimales)
 * @param {number|string} value - Número a formatear
 * @returns {string} Número formateado, ej: "1,234"
 */
export const fmtNumber = (value) => {
  return Number(value || 0).toLocaleString('en-US');
};

/**
 * Formatear porcentaje
 * @param {number} value - Valor del porcentaje
 * @returns {string} Porcentaje formateado, ej: "85.5%"
 */
export const fmtPct = (value) => {
  return `${Number(value || 0).toFixed(1)}%`;
};
