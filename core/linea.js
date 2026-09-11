// Línea de tiempo del emprendedor. Se arma con hechos registrados, no con interpretaciones
// del modelo: desembolso, abonos, tickets, seguimientos y sesiones de acompañamiento.
import { obtenerEmprendedor, movimientosDe } from './negocio.js';
import { listarTickets, listarSesiones } from './tickets.js';

const DIA = 86400000;
const aISO = f => (f.length === 10 ? f + 'T12:00:00.000Z' : f);

/**
 * Devuelve los eventos del caso ordenados del más reciente al más antiguo.
 * `tono` alimenta el color del hito; `futuro` marca lo que todavía no ocurre.
 */
export function lineaDeTiempo(id) {
  const e = obtenerEmprendedor(id);
  if (!e) return null;
  const movs = movimientosDe(id);
  const tickets = listarTickets({ emprendedorId: id });
  const sesiones = listarSesiones({ emprendedorId: id });
  const ahora = Date.now();
  const ev = [];
  const push = (fecha, tipo, titulo, detalle, tono = 'neutro') =>
    fecha && ev.push({ fecha: aISO(fecha), tipo, titulo, detalle, tono, futuro: new Date(aISO(fecha)).getTime() > ahora });

  push(e.fechaDesembolso, 'desembolso', 'Desembolso del capital semilla',
    `B/.${e.montoPrestamo} a ${e.plazoMeses} meses · cuota B/.${e.cuotaMensual}`, 'marca');

  const primeraVenta = movs.find(m => m.tipo === 'venta');
  if (primeraVenta) push(primeraVenta.fecha, 'venta', 'Primera venta registrada',
    `B/.${primeraVenta.monto}${primeraVenta.concepto ? ' · ' + primeraVenta.concepto : ''}`, 'ok');

  for (const m of movs.filter(m => m.tipo === 'abono'))
    push(m.fecha, 'abono', 'Abono a la cuota', `B/.${m.monto}${m.origen === 'foto' ? ' · registrado por foto' : ''}`, 'ok');

  for (const t of tickets) {
    push(t.creado, 'ticket', `Abrió el ticket ${t.id}`, t.asunto,
      t.prioridad === 3 ? 'critico' : t.prioridad === 2 ? 'atencion' : 'neutro');
    const tomado = t.tomado || (t.estado !== 'abierto' ? t.actualizado : null);
    if (tomado) push(tomado, 'toma', `${t.id} tomado por un agente`, t.agente || 'Agente de programa', 'marca');
    for (const r of t.respuestas || [])
      push(r.fecha, 'seguimiento', `Seguimiento en ${t.id}`, `${r.autor}: ${r.texto}`, 'marca');
    if (t.estado === 'cerrado') push(t.cerrado || t.actualizado, 'cierre', `${t.id} cerrado`, t.resultado || 'Caso atendido', 'ok');
  }

  for (const s of sesiones) {
    const realizada = s.estado === 'realizada';
    push(s.fecha, 'sesion', `Sesión ${s.n} · ${s.titulo}`,
      (realizada ? 'Realizada' : 'Agendada') + (s.notas ? ` — ${s.notas}` : ` — ${s.objetivo}`),
      realizada ? 'ok' : 'atencion');
  }

  const ultimaVenta = [...movs].reverse().find(m => m.tipo === 'venta');
  const sinVender = ultimaVenta ? Math.round((ahora - new Date(aISO(ultimaVenta.fecha))) / DIA) : null;
  if (sinVender !== null && sinVender >= 14)
    push(ultimaVenta.fecha, 'alerta', 'Última venta registrada', `Han pasado ${sinVender} días sin registrar una venta.`, 'critico');

  const vence = new Date(new Date(e.fechaDesembolso).getTime() + e.plazoMeses * 30 * DIA);
  push(vence.toISOString(), 'plazo', 'Vence el plazo del préstamo',
    `${e.plazoMeses} meses desde el desembolso`, vence.getTime() < ahora ? 'critico' : 'neutro');

  return ev.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
