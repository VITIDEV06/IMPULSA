// Tickets de asistencia. El emprendedor abre, el sistema clasifica prioridad por código, el agente toma y resuelve.
import { leerBD, escribirBD, idCorto } from './datos.js';

export const CATEGORIAS = [
  { id: 'sin_ganancia', nombre: 'No estoy viendo ganancias', prioridadBase: 2 },
  { id: 'perdi_capital', nombre: 'Perdí parte o todo el capital', prioridadBase: 3 },
  { id: 'no_puedo_pagar', nombre: 'No voy a poder pagar la cuota', prioridadBase: 3 },
  { id: 'clientes', nombre: 'No consigo clientes / no sé promocionar', prioridadBase: 2 },
  { id: 'precios', nombre: 'Dudas de precios, costos o margen', prioridadBase: 1 },
  { id: 'proveedores', nombre: 'Problemas con proveedores o inventario', prioridadBase: 1 },
  { id: 'permisos', nombre: 'Permisos, registro o formalización', prioridadBase: 1 },
  { id: 'ampliar', nombre: 'Quiero ampliar el negocio o pedir más capital', prioridadBase: 1 },
  { id: 'personal', nombre: 'Problema personal o de salud que afecta el negocio', prioridadBase: 3 },
  { id: 'otro', nombre: 'Otro tema', prioridadBase: 1 }
];

const PRIORIDAD = { 1: 'baja', 2: 'media', 3: 'alta' };

/** Prioridad = base de la categoría, elevada por el riesgo del emprendedor y por la cercanía del vencimiento. */
export function calcularPrioridad(categoriaId, riesgo, metricas) {
  const base = (CATEGORIAS.find(c => c.id === categoriaId) || { prioridadBase: 1 }).prioridadBase;
  let p = base;
  const motivos = [`Categoría «${(CATEGORIAS.find(c => c.id === categoriaId) || {}).nombre || categoriaId}»: prioridad base ${PRIORIDAD[base]}.`];
  if (riesgo?.nivel === 3 && p < 3) { p = 3; motivos.push('El emprendedor está en estado crítico por el semáforo de riesgo.'); }
  else if (riesgo?.nivel === 2 && p < 2) { p = 2; motivos.push('El emprendedor está en estado de atención.'); }
  if (metricas && metricas.diasRestantes <= 90 && metricas.avancePago < 60 && p < 3) { p = 3; motivos.push(`Quedan ${metricas.diasRestantes} días de plazo con ${(100 - metricas.avancePago).toFixed(0)}% de deuda pendiente.`); }
  return { prioridad: p, etiqueta: PRIORIDAD[p], motivos };
}

export function listarTickets(filtro = {}) {
  let t = leerBD().tickets;
  if (filtro.estado) t = t.filter(x => x.estado === filtro.estado);
  if (filtro.emprendedorId) t = t.filter(x => x.emprendedorId === filtro.emprendedorId);
  return t.sort((a, b) => (b.prioridad - a.prioridad) || a.creado.localeCompare(b.creado));
}
export function obtenerTicket(id) { return leerBD().tickets.find(t => t.id === id) || null; }

export function crearTicket({ emprendedorId, categoria, asunto, mensaje, prioridad, motivosPrioridad }) {
  const bd = leerBD();
  const t = {
    id: 'TK-' + String(bd.tickets.length + 1).padStart(4, '0'),
    emprendedorId, categoria, asunto: asunto || '', mensaje: mensaje || '',
    prioridad: prioridad || 1, motivosPrioridad: motivosPrioridad || [],
    estado: 'abierto', agente: null, guion: null,
    creado: new Date().toISOString(), actualizado: new Date().toISOString(),
    tomado: null, cerrado: null, resultado: '',
    respuestas: []
  };
  bd.tickets.push(t); escribirBD(bd);
  return t;
}

export function tomarTicket(id, agente) {
  const bd = leerBD(); const t = bd.tickets.find(x => x.id === id); if (!t) return null;
  t.estado = 'en_atencion'; t.agente = agente || 'Agente';
  t.tomado = new Date().toISOString(); t.actualizado = t.tomado;
  escribirBD(bd); return t;
}

export function responderTicket(id, { autor, texto }) {
  const bd = leerBD(); const t = bd.tickets.find(x => x.id === id); if (!t) return null;
  t.respuestas.push({ autor: autor || 'Agente', texto, fecha: new Date().toISOString() });
  t.actualizado = new Date().toISOString();
  escribirBD(bd); return t;
}

export function cerrarTicket(id, resultado) {
  const bd = leerBD(); const t = bd.tickets.find(x => x.id === id); if (!t) return null;
  t.estado = 'cerrado'; t.resultado = resultado || 'Caso atendido';
  t.cerrado = new Date().toISOString(); t.actualizado = t.cerrado;
  escribirBD(bd); return t;
}

export function reabrirTicket(id, motivo) {
  const bd = leerBD(); const t = bd.tickets.find(x => x.id === id); if (!t) return null;
  t.estado = t.agente ? 'en_atencion' : 'abierto';
  t.cerrado = null; t.resultado = '';
  t.actualizado = new Date().toISOString();
  t.respuestas.push({ autor: 'Sistema', texto: 'Caso reabierto' + (motivo ? ': ' + motivo : '.'), fecha: t.actualizado });
  escribirBD(bd); return t;
}

/** Conteo por estado para la bandeja. Incluye el total y los de prioridad alta sin cerrar. */
export function conteoTickets() {
  const t = leerBD().tickets;
  return {
    abierto: t.filter(x => x.estado === 'abierto').length,
    en_atencion: t.filter(x => x.estado === 'en_atencion').length,
    cerrado: t.filter(x => x.estado === 'cerrado').length,
    todos: t.length,
    altos: t.filter(x => x.estado !== 'cerrado' && x.prioridad === 3).length
  };
}

export function guardarGuion(id, guion) {
  const bd = leerBD(); const t = bd.tickets.find(x => x.id === id); if (!t) return null;
  t.guion = guion; t.actualizado = new Date().toISOString();
  escribirBD(bd); return t;
}

/** Plan estándar de tres sesiones de acompañamiento. */
export const PLAN_SESIONES = [
  { n: 1, titulo: 'Diagnóstico', objetivo: 'Entender qué pasó con el negocio y revisar sus números reales.' },
  { n: 2, titulo: 'Material y plan', objetivo: 'Entregar el material del programa que aplica a su caso y acordar acciones concretas.' },
  { n: 3, titulo: 'Seguimiento', objetivo: 'Verificar avances, ajustar el plan y decidir si requiere arreglo de pago o capital adicional.' }
];

export function agendarSesiones(ticketId, emprendedorId, fechaInicio) {
  const bd = leerBD();
  const base = fechaInicio ? new Date(fechaInicio) : new Date();
  const nuevas = PLAN_SESIONES.map(s => ({
    id: idCorto('ses_'), ticketId, emprendedorId, n: s.n, titulo: s.titulo, objetivo: s.objetivo,
    fecha: new Date(base.getTime() + (s.n - 1) * 7 * 86400000).toISOString().slice(0, 10),
    estado: 'pendiente', notas: ''
  }));
  bd.sesiones.push(...nuevas); escribirBD(bd);
  return nuevas;
}

export function listarSesiones(filtro = {}) {
  let s = leerBD().sesiones;
  if (filtro.ticketId) s = s.filter(x => x.ticketId === filtro.ticketId);
  if (filtro.emprendedorId) s = s.filter(x => x.emprendedorId === filtro.emprendedorId);
  return s.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function actualizarSesion(id, cambios) {
  const bd = leerBD(); const s = bd.sesiones.find(x => x.id === id); if (!s) return null;
  if ('estado' in cambios) s.estado = cambios.estado;
  if ('notas' in cambios) s.notas = cambios.notas;
  if ('fecha' in cambios) s.fecha = cambios.fecha;
  escribirBD(bd); return s;
}
