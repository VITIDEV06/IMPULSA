// Clasificación determinista de la transcripción de un recibo.
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const num = s => {
  let t = String(s).replace(/[^\d.,]/g, ''); if (!t) return null;
  const c = t.lastIndexOf(','), p = t.lastIndexOf('.');
  t = c > p ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  const v = parseFloat(t); return isNaN(v) ? null : +v.toFixed(2);
};

const CATS = [
  { id: 'mercancia', re: /mayorista|distribuidor|abarrote|deposito|almacen|importadora|suministro/ },
  { id: 'insumos', re: /supermercado|super\s?99|riba|xtra|machetazo|el rey|pricesmart|carne|verdura|panaderia/ },
  { id: 'transporte', re: /gasolina|combustible|delta|terpel|puma|texaco|uber|taxi|flete|pasaje/ },
  { id: 'servicios', re: /ensa|naturgy|idaan|cable|internet|telefon|\+movil|tigo|claro|electric|agua|luz/ },
  { id: 'equipo', re: /ferreteria|do it|novey|cochez|herramienta|equipo|repuesto/ },
  { id: 'alquiler', re: /alquiler|arrendamiento|local|renta/ },
  { id: 'publicidad', re: /publicidad|imprenta|volante|rotulo|banner|meta|facebook ads|impresion/ }
];

export function clasificarRecibo(texto) {
  const t = norm(texto);
  const lineas = String(texto).split(/\n+/).map(l => l.trim()).filter(Boolean);
  const out = { comercio: null, fecha: null, total: null, categoria: null, tipoSugerido: 'gasto' };

  // Total: buscar etiquetas en orden de confianza; si no, el monto mayor
  for (const et of ['total a pagar', 'total general', 'gran total', 'total', 'monto', 'importe']) {
    const m = texto.match(new RegExp(`${et}[^\\n\\d]{0,20}(B/?\\.?\\s*)?([\\d.,]{2,12})`, 'i'));
    if (m) { const v = num(m[2]); if (v) { out.total = v; break; } }
  }
  if (!out.total) {
    const montos = (texto.match(/(?:B\/\.?\s*|\$)\s*[\d.,]{2,12}/g) || []).map(num).filter(Boolean);
    if (montos.length) out.total = Math.max(...montos);
  }

  const f = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (f) { let a = +f[3]; if (a < 100) a += 2000; out.fecha = `${a}-${String(+f[2]).padStart(2, '0')}-${String(+f[1]).padStart(2, '0')}`; }

  const relleno = /^(factura|recibo|ruc|fecha|total|subtotal|itbms|cliente|gracias|nit|caja|cajero|no\.|n°)/i;
  const cand = lineas.slice(0, 6).find(l => l.length >= 4 && l.length <= 40 && !relleno.test(l) && !/^\d/.test(l));
  if (cand) out.comercio = cand.replace(/[*|]/g, '').trim();

  const c = CATS.find(x => x.re.test(t));
  out.categoria = c ? c.id : 'otros';
  if (/venta|cobro a cliente|pedido de cliente/.test(t)) out.tipoSugerido = 'venta';
  return out;
}
