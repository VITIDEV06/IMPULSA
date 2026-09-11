// Genera 12 emprendedores sintéticos con historial de movimientos y tickets.
// Datos ficticios: nombres, cédulas y teléfonos inventados. No corresponden a personas reales.
import { escribirBD, idCorto } from './core/datos.js';
import { metricas } from './core/negocio.js';
import { evaluarRiesgo } from './core/riesgo.js';
import { calcularPrioridad, CATEGORIAS, PLAN_SESIONES } from './core/tickets.js';

const DIA = 86400000;
const iso = d => new Date(d).toISOString().slice(0, 10);
const hoy = new Date();
const hace = n => iso(hoy - n * DIA);
const rnd = (a, b) => a + Math.random() * (b - a);
const ent = (a, b) => Math.round(rnd(a, b));

const PERFILES = [
  { nombre: 'Yaritza Mendoza',   cat: 'comida',     negocio: 'Venta de comida casera para llevar', prov: 'Panamá Oeste', monto: 1500, dias: 210, perfil: 'bueno' },
  { nombre: 'Ricardo Batista',   cat: 'servicios',  negocio: 'Taller de mecánica a domicilio',     prov: 'Panamá',       monto: 3000, dias: 180, perfil: 'bueno' },
  { nombre: 'Delia Quintero',    cat: 'comercio',   negocio: 'Venta de ropa por catálogo',         prov: 'Coclé',        monto: 1000, dias: 150, perfil: 'regular' },
  { nombre: 'Omar Sanjur',       cat: 'servicios',  negocio: 'Barbería de barrio',                 prov: 'Colón',        monto: 2000, dias: 120, perfil: 'regular' },
  { nombre: 'Nidia Caballero',   cat: 'comida',     negocio: 'Repostería por encargo',             prov: 'Herrera',      monto: 1200, dias: 240, perfil: 'critico_margen' },
  { nombre: 'Elpidio Guerra',    cat: 'agro',       negocio: 'Cultivo y venta de plátano',         prov: 'Chiriquí',     monto: 2500, dias: 200, perfil: 'critico_pausa' },
  { nombre: 'Marisol Ábrego',    cat: 'comercio',   negocio: 'Minisúper en la comunidad',          prov: 'Veraguas',     monto: 3500, dias: 300, perfil: 'critico_perdida' },
  { nombre: 'Kevin Tuñón',       cat: 'tecnologia', negocio: 'Reparación de celulares',            prov: 'Panamá',       monto: 1800, dias: 90,  perfil: 'bueno' },
  { nombre: 'Berta Pimentel',    cat: 'artesania',  negocio: 'Artesanías y molas',                 prov: 'Guna Yala',    monto: 1000, dias: 160, perfil: 'regular' },
  { nombre: 'Julio Vergara',     cat: 'transporte', negocio: 'Mototaxi y mensajería',              prov: 'Darién',       monto: 2200, dias: 130, perfil: 'regular' },
  { nombre: 'Anabel Ríos',       cat: 'belleza',    negocio: 'Servicios de uñas a domicilio',      prov: 'Panamá Oeste', monto: 1200, dias: 70,  perfil: 'bueno' },
  { nombre: 'Tomás Espinosa',    cat: 'construccion', negocio: 'Trabajos de albañilería',          prov: 'Los Santos',   monto: 2800, dias: 260, perfil: 'critico_atraso' }
];

const emprendedores = [], movimientos = [], tickets = [], sesiones = [];

PERFILES.forEach((p, idx) => {
  const id = 'emp_' + String(idx + 1).padStart(2, '0');
  const plazo = 12;
  const cuota = +(p.monto * 1.12 / plazo).toFixed(2);
  emprendedores.push({
    id, nombre: p.nombre,
    cedula: `${ent(1, 9)}-${ent(100, 999)}-${ent(100, 999)}`,
    telefono: `6${ent(1000000, 9999999)}`, whatsapp: `+507 6${ent(100, 999)}-${ent(1000, 9999)}`,
    redes: `@${p.nombre.split(' ')[0].toLowerCase()}${p.cat}`,
    provincia: p.prov, categoria: p.cat, negocio: p.negocio,
    descripcion: p.negocio, montoPrestamo: p.monto, plazoMeses: plazo, cuotaMensual: cuota,
    fechaDesembolso: hace(p.dias), conectividad: idx % 3 === 0 ? 'sin_datos' : 'intermitente',
    creado: new Date(hoy - p.dias * DIA).toISOString(), sintetico: true
  });

  // Perfil económico
  const cfg = {
    bueno:            { ventaDia: [35, 90],  margen: [0.35, 0.5],  pausa: 0,  abonoPct: 1.0,  decaimiento: 1 },
    regular:          { ventaDia: [20, 55],  margen: [0.10, 0.16], pausa: 0,  abonoPct: 0.85, decaimiento: 0.995 },
    critico_margen:   { ventaDia: [25, 60],  margen: [0.05, 0.12], pausa: 0,  abonoPct: 0.5,  decaimiento: 1 },
    critico_pausa:    { ventaDia: [20, 50],  margen: [0.25, 0.4],  pausa: 32, abonoPct: 0.55, decaimiento: 1 },
    critico_perdida:  { ventaDia: [15, 40],  margen: [-0.15, 0.02],pausa: 0,  abonoPct: 0.35, decaimiento: 0.97 },
    critico_atraso:   { ventaDia: [18, 45],  margen: [0.18, 0.3],  pausa: 0,  abonoPct: 0.28, decaimiento: 0.98 }
  }[p.perfil];

  let factor = 1;
  for (let d = p.dias; d >= 0; d--) {
    if (cfg.pausa && d < cfg.pausa) continue;              // pausa reciente: sin ventas
    factor *= cfg.decaimiento;
    if (Math.random() < 0.25) continue;                     // días sin actividad
    const venta = +(rnd(...cfg.ventaDia) * factor).toFixed(2);
    movimientos.push({ id: idCorto('mov_'), emprendedorId: id, tipo: 'venta', monto: venta, concepto: 'Ventas del día', categoria: 'ventas', fecha: hace(d), origen: 'manual', creado: new Date(hoy - d * DIA).toISOString() });
    const m = rnd(...cfg.margen);
    const gasto = +Math.max(0, venta * (1 - m)).toFixed(2);
    if (gasto > 0) movimientos.push({ id: idCorto('mov_'), emprendedorId: id, tipo: 'gasto', monto: gasto, concepto: 'Insumos y mercancía', categoria: 'mercancia', fecha: hace(d), origen: Math.random() < 0.2 ? 'foto' : 'manual', creado: new Date(hoy - d * DIA).toISOString() });
  }
  // Abonos mensuales
  const meses = Math.floor(p.dias / 30);
  for (let k = 1; k <= meses; k++) {
    if (Math.random() > cfg.abonoPct) continue;
    movimientos.push({ id: idCorto('mov_'), emprendedorId: id, tipo: 'abono', monto: cuota, concepto: `Cuota ${k}`, categoria: 'prestamo', fecha: hace(p.dias - k * 30), origen: 'manual', creado: new Date().toISOString() });
  }
});

escribirBD({ emprendedores, movimientos, tickets: [], sesiones: [], agentes: [{ id: 'ag_1', nombre: 'Agente de programa' }] });

// Tickets a partir del estado real ya calculado
const MENSAJES = {
  sin_ganancia: 'Llevo dos meses vendiendo y no veo ganancia. Trabajo todos los días pero el dinero no rinde y ya me toca la cuota.',
  perdi_capital: 'Se me dañó parte de la mercancía y perdí buena parte del capital. No sé cómo seguir.',
  no_puedo_pagar: 'Este mes no voy a poder pagar la cuota. Las ventas bajaron mucho y tuve un gasto de salud en la casa.',
  clientes: 'No me llegan clientes nuevos. Solo me compran los vecinos de siempre y no sé cómo promocionar por el celular.',
  precios: 'Creo que estoy vendiendo muy barato pero me da miedo subir el precio y perder a los clientes.',
  personal: 'Tuve un problema de salud y estuve un mes sin poder trabajar. Ya volví pero arranqué de cero.',
  ampliar: 'El negocio va bien y quiero comprar una máquina más grande. ¿Puedo pedir capital adicional?',
  proveedores: 'Mi proveedor subió los precios y ahora casi no me queda nada por cada venta.'
};
const ASIGNAR = [
  ['emp_07', 'perdi_capital'], ['emp_12', 'no_puedo_pagar'], ['emp_05', 'precios'],
  ['emp_06', 'personal'], ['emp_03', 'clientes'], ['emp_09', 'clientes'],
  ['emp_10', 'sin_ganancia'], ['emp_02', 'ampliar'], ['emp_04', 'proveedores'], ['emp_01', 'ampliar']
];

const bd = { emprendedores, movimientos, tickets, sesiones, agentes: [{ id: 'ag_1', nombre: 'Agente de programa' }] };
// Seguimiento que deja el agente al tomar el caso, por categoría del ticket.
const SEGUIMIENTOS = {
  perdi_capital: 'Llamada realizada. Se recuperó parte de la mercancía; se acuerda revisar inventario en la primera sesión.',
  no_puedo_pagar: 'Contactado por WhatsApp. Se explica que pedir ayuda temprano no afecta su historial; se agenda diagnóstico.',
  personal: 'Se conversó con la familia. El negocio queda pausado dos semanas; se retoma con plan de recuperación.',
  clientes: 'Se le envió el material de marketing digital y se acordó configurar WhatsApp Business antes de la próxima sesión.',
  sin_ganancia: 'Se revisaron precios y costos por teléfono. Falta ajustar el margen de los productos de mayor rotación.',
  ampliar: 'Se explicó el requisito de cerrar el crédito vigente antes de evaluar capital adicional.',
  otro: 'Primer contacto realizado. Se agenda el plan de tres sesiones.'
};

ASIGNAR.forEach(([empId, cat], i) => {
  const m = metricas(empId); const r = evaluarRiesgo(m);
  const { prioridad, motivos } = calcularPrioridad(cat, r, m);
  const creado = new Date(hoy - ent(0, 9) * DIA).toISOString();
  const t = {
    id: 'TK-' + String(i + 1).padStart(4, '0'), emprendedorId: empId, categoria: cat,
    asunto: (CATEGORIAS.find(c => c.id === cat) || {}).nombre || cat,
    mensaje: MENSAJES[cat], prioridad, motivosPrioridad: motivos,
    estado: i < 7 ? 'abierto' : i < 9 ? 'en_atencion' : 'cerrado',
    agente: i >= 7 ? 'Agente de programa' : null, guion: null,
    creado, actualizado: creado, tomado: null, cerrado: null, resultado: '',
    respuestas: [], sintetico: true
  };
  // Historial del caso: los tickets tomados y cerrados llevan sus marcas de tiempo y seguimientos.
  if (t.estado !== 'abierto') {
    t.tomado = new Date(new Date(creado).getTime() + 6 * 3600e3).toISOString();
    t.actualizado = t.tomado;
    t.respuestas.push({ autor: 'Agente de programa', fecha: t.tomado, texto: SEGUIMIENTOS[cat] || SEGUIMIENTOS.otro });
  }
  if (t.estado === 'cerrado') {
    t.resultado = 'Se realizaron las tres sesiones; el emprendedor retomó el plan.';
    t.cerrado = new Date(new Date(creado).getTime() + 16 * DIA).toISOString();
    t.actualizado = t.cerrado;
  }
  tickets.push(t);
  if (t.estado !== 'abierto') {
    PLAN_SESIONES.forEach(s => sesiones.push({
      id: idCorto('ses_'), ticketId: t.id, emprendedorId: empId, n: s.n, titulo: s.titulo, objetivo: s.objetivo,
      fecha: iso(new Date(new Date(creado).getTime() + (s.n - 1) * 7 * DIA)),
      estado: t.estado === 'cerrado' ? 'realizada' : s.n === 1 ? 'realizada' : 'pendiente',
      notas: s.n === 1 ? 'Se revisaron sus registros y se acordó anotar todas las ventas del día.' : ''
    }));
  }
});
escribirBD(bd);

// Resumen
console.log(`${emprendedores.length} emprendedores · ${movimientos.length} movimientos · ${tickets.length} tickets · ${sesiones.length} sesiones\n`);
for (const e of emprendedores) {
  const m = metricas(e.id); const r = evaluarRiesgo(m);
  console.log(`${r.etiqueta.padEnd(9)} ${e.nombre.padEnd(20)} ventas B/.${String(m.ventas).padStart(8)} margen ${String(m.margen).padStart(5)}% pago ${String(m.avancePago).padStart(5)}% tiempo ${String(m.avanceTiempo).padStart(5)}% ${r.alertas.map(a => a.id).join(',')}`);
}
process.exit(0);
