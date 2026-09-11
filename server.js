import express from 'express';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { iniciar, estaListo, MODELO } from './core/motor.js';
import { iniciarEmbeddings, EMBED } from './core/rag.js';
import { leerRecibo, iniciarVision, visionLista, VISION } from './core/vision.js';
import { listarEmprendedores, obtenerEmprendedor, crearEmprendedor, registrarMovimiento, movimientosDe, metricas, evolucionCartera } from './core/negocio.js';
import { evaluarRiesgo } from './core/riesgo.js';
import { CATEGORIAS, calcularPrioridad, crearTicket, listarTickets, obtenerTicket, tomarTicket, responderTicket, cerrarTicket, reabrirTicket, conteoTickets, guardarGuion, agendarSesiones, listarSesiones, actualizarSesion, PLAN_SESIONES } from './core/tickets.js';
import { lineaDeTiempo } from './core/linea.js';
import { preguntarMentor, generarGuion } from './core/mentor.js';

const app = express();
app.use(express.json({ limit: '15mb' }));
// Sin caché: la interfaz se sirve desde el mismo equipo y una copia vieja en el navegador
// es la peor sorpresa posible en una demostración.
app.use(express.static('public', { etag: false, lastModified: false, setHeaders: r => r.setHeader('Cache-Control', 'no-store') }));

const material = () => existsSync('corpus') ? readdirSync('corpus').filter(f => /\.(txt|md)$/.test(f)) : [];
function abrirSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  return o => res.write(`data: ${JSON.stringify(o)}\n\n`);
}
const conRiesgo = id => { const m = metricas(id); return m ? { metricas: m, riesgo: evaluarRiesgo(m) } : null; };

// ---------- Estado ----------
app.get('/api/estado', (req, res) => res.json({
  listo: estaListo(), modelo: MODELO, embeddings: EMBED, vision: VISION, visionLista: visionLista(),
  visionActiva: process.env.SIN_VISION !== '1',
  material: material(), categorias: CATEGORIAS, planSesiones: PLAN_SESIONES
}));

// Biblioteca local: solo expone archivos que ya pertenecen al corpus indexable.
app.get('/api/material/:archivo', (req, res) => {
  const archivo = req.params.archivo;
  if (!material().includes(archivo)) return res.status(404).json({ error: 'Material no encontrado' });
  res.type('text/plain').send(readFileSync(`corpus/${archivo}`, 'utf8'));
});

// ---------- Emprendedores ----------
app.get('/api/emprendedores', (req, res) => {
  res.json(listarEmprendedores().map(e => {
    const r = conRiesgo(e.id);
    return { ...e, riesgo: r?.riesgo, resumen: r ? { ventas: r.metricas.ventas, margen: r.metricas.margen, avancePago: r.metricas.avancePago, avanceTiempo: r.metricas.avanceTiempo, diasRestantes: r.metricas.diasRestantes, saldoDeuda: r.metricas.saldoDeuda } : null };
  }));
});
app.post('/api/emprendedores', (req, res) => res.json(crearEmprendedor(req.body)));
app.get('/api/emprendedores/:id', (req, res) => {
  const e = obtenerEmprendedor(req.params.id); if (!e) return res.status(404).json({ error: 'No existe' });
  const r = conRiesgo(e.id);
  res.json({ ...r, tickets: listarTickets({ emprendedorId: e.id }), sesiones: listarSesiones({ emprendedorId: e.id }) });
});
app.get('/api/emprendedores/:id/linea', (req, res) => {
  const l = lineaDeTiempo(req.params.id);
  return l ? res.json(l) : res.status(404).json({ error: 'No existe' });
});
app.get('/api/emprendedores/:id/movimientos', (req, res) => res.json(movimientosDe(req.params.id).slice(-60).reverse()));
app.post('/api/emprendedores/:id/movimientos', (req, res) => res.json(registrarMovimiento({ ...req.body, emprendedorId: req.params.id })));

// ---------- Panel del agente ----------
app.get('/api/panel', (req, res) => {
  const emprendedores = listarEmprendedores().map(e => { const r = conRiesgo(e.id); return { ...e, riesgo: r?.riesgo, m: r?.metricas }; });
  const porNivel = n => emprendedores.filter(e => e.riesgo?.nivel === n).length;
  const tk = listarTickets();
  res.json({
    total: emprendedores.length, alDia: porNivel(1), atencion: porNivel(2), criticos: porNivel(3),
    carteraColocada: +emprendedores.reduce((a, e) => a + e.montoPrestamo, 0).toFixed(2),
    saldoPendiente: +emprendedores.reduce((a, e) => a + (e.m?.saldoDeuda || 0), 0).toFixed(2),
    ticketsAbiertos: tk.filter(t => t.estado === 'abierto').length,
    ticketsEnAtencion: tk.filter(t => t.estado === 'en_atencion').length,
    ticketsAltos: tk.filter(t => t.estado !== 'cerrado' && t.prioridad === 3).length,
    porCategoria: Object.entries(emprendedores.reduce((a, e) => { a[e.categoria] = (a[e.categoria] || 0) + 1; return a; }, {})).map(([k, v]) => ({ categoria: k, n: v })),
    material: material().length
  });
});

// ---------- Dashboard administrativo ----------
app.get('/api/dashboard', (req, res) => {
  const emps = listarEmprendedores().map(e => { const r = conRiesgo(e.id); return { ...e, riesgo: r?.riesgo, m: r?.metricas }; });
  const porNivel = n => emps.filter(e => e.riesgo?.nivel === n);
  const tk = listarTickets();
  const abiertos = tk.filter(t => t.estado !== 'cerrado');
  const enSeguimiento = new Set(tk.filter(t => t.estado === 'en_atencion' || t.estado === 'cerrado').map(t => t.emprendedorId));
  const requierenAtencion = emps.filter(e => e.riesgo?.nivel >= 2).sort((a, b) => (b.riesgo.puntaje - a.riesgo.puntaje) || (a.m.diasRestantes - b.m.diasRestantes));

  const catCount = emps.reduce((a, e) => { a[e.categoria] = (a[e.categoria] || 0) + 1; return a; }, {});
  const distribucion = Object.entries(catCount).map(([categoria, n]) => ({ categoria, n, pct: +((n / emps.length) * 100).toFixed(0) })).sort((a, b) => b.n - a.n);

  const conRiesgoAlto = requierenAtencion.length;
  res.json({
    kpis: {
      activos: emps.length,
      saludables: porNivel(1).length,
      enRiesgo: porNivel(2).length,
      criticos: porNivel(3).length,
      carteraColocada: +emps.reduce((a, e) => a + e.montoPrestamo, 0).toFixed(2),
      saldoPendiente: +emps.reduce((a, e) => a + (e.m?.saldoDeuda || 0), 0).toFixed(2),
      recuperado: +emps.reduce((a, e) => a + (e.m?.abonos || 0), 0).toFixed(2)
    },
    indiceAcompanamiento: conRiesgoAlto ? +((([...enSeguimiento].filter(id => requierenAtencion.some(e => e.id === id)).length) / conRiesgoAlto) * 100).toFixed(0) : 100,
    conSeguimiento: enSeguimiento.size,
    evolucion: evolucionCartera(7),
    distribucion,
    requierenAtencion: requierenAtencion.slice(0, 6).map(e => ({
      id: e.id, nombre: e.nombre, negocio: e.negocio, categoria: e.categoria, provincia: e.provincia,
      nivel: e.riesgo.nivel, etiqueta: e.riesgo.etiqueta, motivo: e.riesgo.alertas[0]?.titulo || '',
      diasRestantes: e.m.diasRestantes, margen: e.m.margen, avancePago: e.m.avancePago, avanceTiempo: e.m.avanceTiempo
    })),
    alertas: requierenAtencion.slice(0, 5).flatMap(e => e.riesgo.alertas.slice(0, 1).map(a => ({
      emprendedorId: e.id, nombre: e.nombre, nivel: a.nivel, titulo: a.titulo, detalle: a.detalle, diasRestantes: e.m.diasRestantes
    }))),
    tickets: { abiertos: tk.filter(t => t.estado === 'abierto').length, enAtencion: tk.filter(t => t.estado === 'en_atencion').length, altos: abiertos.filter(t => t.prioridad === 3).length, total: tk.length },
    ultimosTickets: tk.slice(0, 6).map(t => {
      const e = obtenerEmprendedor(t.emprendedorId);
      return { id: t.id, asunto: t.asunto, prioridad: t.prioridad, estado: t.estado, nombre: e?.nombre || '', creado: t.creado };
    }),
    material: material().length
  });
});

// ---------- Tickets ----------
app.get('/api/tickets', (req, res) => {
  res.json(listarTickets(req.query).map(t => {
    const e = obtenerEmprendedor(t.emprendedorId); const r = conRiesgo(t.emprendedorId);
    return { ...t, emprendedor: e ? { id: e.id, nombre: e.nombre, negocio: e.negocio, categoria: e.categoria, provincia: e.provincia, whatsapp: e.whatsapp, telefono: e.telefono, redes: e.redes } : null, riesgo: r?.riesgo?.etiqueta, diasRestantes: r?.metricas?.diasRestantes };
  }));
});
app.get('/api/tickets/conteo', (req, res) => res.json(conteoTickets()));
app.get('/api/tickets/:id', (req, res) => {
  const t = obtenerTicket(req.params.id); if (!t) return res.status(404).json({ error: 'No existe' });
  const e = obtenerEmprendedor(t.emprendedorId); const r = conRiesgo(t.emprendedorId);
  res.json({ ...t, emprendedor: e, metricas: r?.metricas, riesgo: r?.riesgo, sesiones: listarSesiones({ ticketId: t.id }) });
});
app.post('/api/tickets', (req, res) => {
  const { emprendedorId, categoria, mensaje } = req.body;
  const r = conRiesgo(emprendedorId);
  const { prioridad, motivos } = calcularPrioridad(categoria, r?.riesgo, r?.metricas);
  const asunto = (CATEGORIAS.find(c => c.id === categoria) || {}).nombre || categoria;
  res.json(crearTicket({ emprendedorId, categoria, asunto, mensaje, prioridad, motivosPrioridad: motivos }));
});
app.post('/api/tickets/:id/tomar', (req, res) => res.json(tomarTicket(req.params.id, req.body.agente)));
app.post('/api/tickets/:id/responder', (req, res) => res.json(responderTicket(req.params.id, req.body)));
app.post('/api/tickets/:id/cerrar', (req, res) => res.json(cerrarTicket(req.params.id, req.body.resultado)));
app.post('/api/tickets/:id/reabrir', (req, res) => res.json(reabrirTicket(req.params.id, req.body.motivo)));
app.post('/api/tickets/:id/sesiones', (req, res) => {
  const t = obtenerTicket(req.params.id); if (!t) return res.status(404).json({ error: 'No existe' });
  res.json(agendarSesiones(t.id, t.emprendedorId, req.body.fechaInicio));
});
app.get('/api/sesiones', (req, res) => {
  res.json(listarSesiones(req.query).map(s => {
    const e = obtenerEmprendedor(s.emprendedorId); const t = obtenerTicket(s.ticketId); const r = conRiesgo(s.emprendedorId);
    return { ...s,
      emprendedor: e ? { id: e.id, nombre: e.nombre, negocio: e.negocio, provincia: e.provincia, telefono: e.telefono, whatsapp: e.whatsapp } : null,
      ticket: t ? { id: t.id, asunto: t.asunto, estado: t.estado, prioridad: t.prioridad } : null,
      riesgo: r?.riesgo?.etiqueta || null };
  }));
});
app.patch('/api/sesiones/:id', (req, res) => res.json(actualizarSesion(req.params.id, req.body)));

// Guion de asesoría (SSE)
app.post('/api/tickets/:id/guion', async (req, res) => {
  const t = obtenerTicket(req.params.id);
  if (!t) return res.status(404).json({ error: 'No existe' });
  const enviar = abrirSSE(res);
  try {
    const r = conRiesgo(t.emprendedorId);
    const cat = (CATEGORIAS.find(c => c.id === t.categoria) || {}).nombre || t.categoria;
    const g = await generarGuion({ metricas: r?.metricas, riesgo: r?.riesgo, ticket: t, categoriaNombre: cat }, enviar);
    guardarGuion(t.id, { texto: g.respuesta, fuentes: g.fuentes.map(f => ({ fuente: f.fuente, score: f.score })), generado: new Date().toISOString() });
    enviar({ tipo: 'fin', resultado: g });
  } catch (e) { console.error(e); enviar({ tipo: 'error', mensaje: e.message }); }
  res.end();
});

// ---------- Mentor (SSE) ----------
app.post('/api/mentor/stream', async (req, res) => {
  const { emprendedorId, pregunta, historial } = req.body;
  if (!pregunta?.trim()) return res.status(400).json({ error: 'Falta la pregunta' });
  const enviar = abrirSSE(res);
  try {
    const r = conRiesgo(emprendedorId) || {};
    enviar({ tipo: 'fin', resultado: await preguntarMentor(pregunta, { ...r, historial: historial || [] }, enviar) });
  } catch (e) { console.error(e); enviar({ tipo: 'error', mensaje: e.message }); }
  res.end();
});

// ---------- Recibo por foto (SSE) ----------
app.post('/api/recibo/leer', async (req, res) => {
  const { imagenBase64 } = req.body;
  if (!imagenBase64) return res.status(400).json({ error: 'Falta la imagen' });
  const enviar = abrirSSE(res);
  try {
    const bytes = new Uint8Array(Buffer.from(imagenBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    enviar({ tipo: 'fin', resultado: await leerRecibo(bytes, enviar) });
  } catch (e) { console.error(e); enviar({ tipo: 'error', mensaje: e.message }); }
  res.end();
});

// ---------- Evidencia ----------
app.get('/api/evidencia', (req, res) => {
  let evaluacion = null;
  if (existsSync('eval/resultados.json')) { try { evaluacion = JSON.parse(readFileSync('eval/resultados.json', 'utf8')); } catch {} }
  let rendimiento = null;
  if (existsSync('logs/rendimiento.jsonl')) {
    const filas = readFileSync('logs/rendimiento.jsonl', 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const c = filas.filter(f => f.ttftMs != null);
    const prom = k => c.length ? +(c.reduce((a, f) => a + (f[k] || 0), 0) / c.length).toFixed(1) : null;
    const ult = k => [...c].reverse().find(f => f[k] && f[k] !== 'desconocido')?.[k] ?? null;
    rendimiento = { inferencias: filas.length, dispositivo: ult('dispositivo'), cargaModeloMs: ult('cargaModeloMs'),
      ttftPromedioMs: prom('ttftMs'), tokensPorSegundoPromedio: prom('tokensPorSegundo'), totalMsPromedio: prom('totalMs'),
      porOperacion: Object.entries(filas.reduce((a, f) => { const k = f.operacion || 'otra'; (a[k] ||= []).push(f); return a; }, {}))
        .map(([op, fs]) => ({ operacion: op, n: fs.length, tokPorSeg: +(fs.reduce((a, f) => a + (f.tokensPorSegundo || 0), 0) / fs.length).toFixed(1), msProm: Math.round(fs.reduce((a, f) => a + (f.totalMs || 0), 0) / fs.length) })) };
  }
  res.json({ evaluacion, rendimiento });
});

const PORT = 3200;
app.listen(PORT, async () => {
  console.log(`http://localhost:${PORT} — cargando modelos...`);
  await iniciarEmbeddings();
  await iniciar();
  console.log('Impulso listo (mentor y guiones).');
  if (process.env.SIN_VISION !== '1') iniciarVision().then(() => console.log('VisionPsy listo (recibos por foto).')).catch(e => console.error('[vision] no cargó:', e.message));
});
