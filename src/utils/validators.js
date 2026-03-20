export const isValidPlate = (plate) => {
  if (!plate) return false;
  const p = plate.toUpperCase().trim();
  return /^[A-Z][0-9]{6}$/.test(p) || /^[A-Z]{2}[0-9]{5}$/.test(p) || /^[A-Z]{1,3}-?[0-9]{3,6}$/.test(p) || /^SIN-[A-Z0-9]+$/.test(p);
};
export const isValidRNC = (rnc) => { if (!rnc) return false; const c = rnc.replace(/[-\s]/g, ''); return /^[0-9]{9}$/.test(c) || /^[0-9]{11}$/.test(c); };
export const isValidPhone = (phone) => { if (!phone) return false; const c = phone.replace(/[-\s()]/g, ''); return /^\+?1?8[024]9[0-9]{7}$/.test(c) || /^\+?[1-9][0-9]{7,14}$/.test(c); };
export const isValidEmail = (email) => { if (!email) return false; return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim()); };
export const sanitizePlate = (plate) => plate.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
export const formatRNC = (rnc) => { const c = rnc.replace(/\D/g, ''); if (c.length === 11) return `${c.slice(0,3)}-${c.slice(3,10)}-${c.slice(10)}`; return rnc; };
export const formatPhone = (phone) => { const c = phone.replace(/\D/g, ''); if (c.length === 10 && c.startsWith('8')) return `(${c.slice(0,3)}) ${c.slice(3,6)}-${c.slice(6)}`; return phone; };
export const isValidAmount = (amount) => { const n = parseFloat(amount); return !isNaN(n) && n > 0 && n < 1000000; };
export const validationMessages = {
  plate: 'Formato de placa inválido (ej: A123456)',
  rnc: 'RNC inválido (9 u 11 dígitos)',
  phone: 'Teléfono inválido (ej: 809-555-1234)',
  email: 'Email inválido',
  amount: 'Monto inválido',
  required: (f) => `${f} es requerido`,
};
