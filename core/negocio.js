// Métricas del negocio del emprendedor. Todo aritmética determinista.
import { leerBD, escribirBD, idCorto } from './datos.js';

const DIA = 86400000;
export const hoy = () => new Date();
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / DIA);
const iso = d => new Date(d).toISOString().slice(0, 10);

export function listarEmprendedores() { return leerBD().emprendedores; }
export function obtenerEmprendedor(id) { return leerBD().emprendedores.find(e => e.id === id) || null; }

export function crearEmprendedor(datos) {
  const bd = leerBD();
  const e = {
    id: idCorto('emp_'),
    nombre: datos.nombre || 'Sin nombre',
    cedula: datos.cedula || '', telefono: datos.telefono || '', whatsapp: datos.whatsapp || '',
    redes: datos.redes || '', provincia: datos.provincia || '', categoria: datos.categoria || 'otros',
    negocio: datos.negocio || '', descripcion: datos.descripcion || '',
    montoPrestamo: +datos.montoPrestamo || 0,
    plazoMeses: +datos.plazoMeses || 12,
    cuotaMensual: +datos.cuotaMensual || 0,
    fechaDesembolso: datos.fechaDesembolso || iso(hoy()),
    conectividad: datos.conectividad || 'intermitente',
    creado: new Date().toISOString()
  };
  if (!e.cuotaMensual && e.montoPrestamo) e.cuotaMensual = +(e.montoPrestamo * 1.12 / e.plazoMeses).toFixed(2);
  bd.emprendedores.push(e); escribirBD(bd);
  return e;
}

export function registrarMovimiento(m) {
  const bd = leerBD();
  const mov = {
    id: idCorto('mov_'), emprendedorId: m.emprendedorId,
    tipo: m.tipo === 'gasto' ? 'gasto' : m.tipo === 'abono' ? 'abono' : 'venta',
    monto: +(+m.monto || 0).toFixed(2),
    concepto: m.concepto || '', categoria: m.categoria || '',
    fecha: m.fecha || iso(hoy()), origen: m.origen || 'manual',
    creado: new Date().toISOString()
  };
  bd.movimientos.push(mov); escribirBD(bd);
  return mov;
}

export function movimientosDe(id) {
  return leerBD().movimientos.filter(m => m.emprendedorId === id).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Métricas completas de un emprendedor: totales, semanas, deuda, ritmo. */
export function metricas(id) {
  const e = obtenerEmprendedor(id); if (!e) return null;
  const movs = movimientosDe(id);
  const suma = t => +movs.filter(m => m.tipo === t).reduce((a, m) => a + m.monto, 0).toFixed(2);
  const ventas = suma('venta'), gastos = suma('gasto'), abonos = suma('abono');
  const utilidad = +(ventas - gastos).toFixed(2);
  const margen = ventas ? +((utilidad / ventas) * 100).toFixed(1) : 0;

  const totalAPagar = +(e.cuotaMensual * e.plazoMeses).toFixed(2);
  const saldoDeuda = +Math.max(0, totalAPagar - abonos).toFixed(2);
  const avancePago = totalAPagar ? +((abonos / totalAPagar) * 100).toFixed(1) : 0;

  const transcurridos = Math.max(0, dias(e.fechaDesembolso, hoy()));
  const totalDias = e.plazoMeses * 30;
  const diasRestantes = totalDias - transcurridos;
  const avanceTiempo = +((transcurridos / totalDias) * 100).toFixed(1);

  // Semanas (últimas 12) con ventas, gastos y utilidad
  const semanas = [];
  for (let i = 11; i >= 0; i--) {
    const fin = new Date(hoy() - i * 7 * DIA), ini = new Date(fin - 6 * DIA);
    const enRango = movs.filter(m => m.fecha >= iso(ini) && m.fecha <= iso(fin));
    const v = +enRango.filter(m => m.tipo === 'venta').reduce((a, m) => a + m.monto, 0).toFixed(2);
    const g = +enRango.filter(m => m.tipo === 'gasto').reduce((a, m) => a + m.monto, 0).toFixed(2);
    semanas.push({ etiqueta: iso(ini).slice(5), desde: iso(ini), hasta: iso(fin), ventas: v, gastos: g, utilidad: +(v - g).toFixed(2) });
  }
  const ult4 = semanas.slice(-4), prev4 = semanas.slice(-8, -4);
  const prom = a => a.length ? +(a.reduce((x, s) => x + s.ventas, 0) / a.length).toFixed(2) : 0;
  const ventasUlt4 = prom(ult4), ventasPrev4 = prom(prev4);
  const tendencia = ventasPrev4 ? +(((ventasUlt4 - ventasPrev4) / ventasPrev4) * 100).toFixed(1) : null;

  const ultimaVenta = [...movs].reverse().find(m => m.tipo === 'venta');
  const diasSinVender = ultimaVenta ? dias(ultimaVenta.fecha, hoy()) : transcurridos;

  // Ritmo necesario para cerrar la deuda a tiempo
  const semanasRestantes = Math.max(1, Math.ceil(diasRestantes / 7));
  const utilidadSemanalNecesaria = +(saldoDeuda / semanasRestantes).toFixed(2);
  const utilidadSemanalActual = ult4.length ? +(ult4.reduce((a, s) => a + s.utilidad, 0) / ult4.length).toFixed(2) : 0;

  return {
    emprendedor: e, ventas, gastos, utilidad, margen, abonos, totalAPagar, saldoDeuda, avancePago,
    transcurridos, totalDias, diasRestantes, avanceTiempo, semanas, ventasUlt4, ventasPrev4, tendencia,
    diasSinVender, utilidadSemanalNecesaria, utilidadSemanalActual, movimientos: movs.length
  };
}

/** Estado de un emprendedor a una fecha de corte, con las mismas reglas simplificadas. Para series históricas. */
export function estadoAlCorte(e, movs, corte) {
  const desemb = new Date(e.fechaDesembolso);
  if (corte < desemb) return null;
  const hasta = iso(corte);
  const m = movs.filter(x => x.fecha <= hasta);
  const s = t => +m.filter(x => x.tipo === t).reduce((a, x) => a + x.monto, 0).toFixed(2);
  const ventas = s('venta'), gastos = s('gasto'), abonos = s('abono');
  const utilidad = ventas - gastos;
  const margen = ventas ? (utilidad / ventas) * 100 : 0;
  const totalAPagar = e.cuotaMensual * e.plazoMeses;
  const avancePago = totalAPagar ? (abonos / totalAPagar) * 100 : 0;
  const avanceTiempo = Math.min(100, (dias(e.fechaDesembolso, corte) / (e.plazoMeses * 30)) * 100);
  const ultima = [...m].reverse().find(x => x.tipo === 'venta');
  const sinVender = ultima ? dias(ultima.fecha, corte) : dias(e.fechaDesembolso, corte);
  if ((ventas > 0 && utilidad < 0) || sinVender >= 21 || avanceTiempo - avancePago >= 25) return 'critico';
  if (margen < 15 || avanceTiempo - avancePago >= 12) return 'atencion';
  return 'al_dia';
}

/** Serie de los últimos n meses: cuántos emprendedores en cada estado y saldo de cartera. */
export function evolucionCartera(n = 7) {
  const bd = leerBD();
  const porEmp = {};
  for (const m of bd.movimientos) (porEmp[m.emprendedorId] ||= []).push(m);
  const serie = [];
  const base = hoy();
  for (let i = n - 1; i >= 0; i--) {
    const corte = new Date(base.getFullYear(), base.getMonth() - i + 1, 0);
    const punto = { mes: corte.toLocaleDateString('es-PA', { month: 'short' }), al_dia: 0, atencion: 0, critico: 0, activos: 0 };
    for (const e of bd.emprendedores) {
      const st = estadoAlCorte(e, porEmp[e.id] || [], corte);
      if (!st) continue;
      punto[st]++; punto.activos++;
    }
    serie.push(punto);
  }
  return serie;
}
