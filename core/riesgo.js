// Semáforo de riesgo determinista. El modelo NO decide el nivel: se calcula aquí y se explica el porqué.

export const REGLAS = [
  { id: 'atraso_pago', nivel: 3, titulo: 'Atraso frente al calendario de pago',
    prueba: m => m.avanceTiempo - m.avancePago >= 25,
    detalle: m => `Ha transcurrido ${m.avanceTiempo}% del plazo y solo se ha abonado ${m.avancePago}% de la deuda (brecha de ${(m.avanceTiempo - m.avancePago).toFixed(1)} puntos).` },
  { id: 'perdida', nivel: 3, titulo: 'El negocio opera en pérdida',
    prueba: m => m.ventas > 0 && m.utilidad < 0,
    detalle: m => `Gastos de B/.${m.gastos} superan ventas de B/.${m.ventas}; pérdida acumulada de B/.${Math.abs(m.utilidad).toFixed(2)}.` },
  { id: 'sin_ventas', nivel: 3, titulo: 'Sin ventas registradas recientemente',
    prueba: m => m.diasSinVender >= 21,
    detalle: m => `${m.diasSinVender} días sin registrar una venta.` },
  { id: 'ritmo_insuficiente', nivel: 2, titulo: 'El ritmo actual no alcanza para cerrar la deuda',
    prueba: m => m.saldoDeuda > 0 && m.utilidadSemanalActual < m.utilidadSemanalNecesaria * 0.6,
    detalle: m => `Genera B/.${m.utilidadSemanalActual} por semana y necesita B/.${m.utilidadSemanalNecesaria} para cerrar en el plazo.` },
  { id: 'margen_bajo', nivel: 2, titulo: 'Margen de ganancia bajo',
    prueba: m => m.ventas > 0 && m.margen < 15,
    detalle: m => `Margen de ${m.margen}% sobre ventas; por debajo del 15% recomendado para este tipo de negocio.` },
  { id: 'tendencia_baja', nivel: 2, titulo: 'Ventas en descenso',
    prueba: m => m.tendencia !== null && m.tendencia <= -25,
    detalle: m => `Las ventas de las últimas 4 semanas bajaron ${Math.abs(m.tendencia)}% frente a las 4 anteriores.` },
  { id: 'sin_registro', nivel: 2, titulo: 'Poco registro de movimientos',
    prueba: m => m.transcurridos > 30 && m.movimientos < 8,
    detalle: m => `Solo ${m.movimientos} movimientos registrados en ${m.transcurridos} días: sin datos no se puede acompañar.` },
  { id: 'recta_final', nivel: 2, titulo: 'Recta final del plazo con saldo alto',
    prueba: m => m.diasRestantes <= 90 && m.diasRestantes > 0 && m.avancePago < 60,
    detalle: m => `Quedan ${m.diasRestantes} días y falta por pagar B/.${m.saldoDeuda} (${(100 - m.avancePago).toFixed(1)}% de la deuda).` },
  { id: 'vencido', nivel: 3, titulo: 'Plazo vencido con saldo pendiente',
    prueba: m => m.diasRestantes <= 0 && m.saldoDeuda > 0,
    detalle: m => `El plazo venció hace ${Math.abs(m.diasRestantes)} días con B/.${m.saldoDeuda} pendientes.` }
];

const NOMBRE = { 1: 'al_dia', 2: 'atencion', 3: 'critico' };

/** Devuelve { nivel, etiqueta, puntaje, alertas[], fortalezas[] }. */
export function evaluarRiesgo(m) {
  const alertas = REGLAS.filter(r => { try { return r.prueba(m); } catch { return false; } })
    .map(r => ({ id: r.id, nivel: r.nivel, titulo: r.titulo, detalle: r.detalle(m) }));
  const nivel = alertas.some(a => a.nivel === 3) ? 3 : alertas.length ? 2 : 1;

  const fortalezas = [];
  if (m.margen >= 25) fortalezas.push(`Margen saludable de ${m.margen}%.`);
  if (m.tendencia !== null && m.tendencia >= 15) fortalezas.push(`Ventas al alza: ${m.tendencia}% en las últimas 4 semanas.`);
  if (m.avancePago >= m.avanceTiempo) fortalezas.push(`Pago al día: ${m.avancePago}% abonado con ${m.avanceTiempo}% del plazo transcurrido.`);
  if (m.utilidadSemanalActual >= m.utilidadSemanalNecesaria && m.saldoDeuda > 0) fortalezas.push('El ritmo actual alcanza para cerrar la deuda en el plazo.');

  return {
    nivel, etiqueta: NOMBRE[nivel], puntaje: alertas.reduce((a, x) => a + x.nivel, 0),
    alertas, fortalezas
  };
}
