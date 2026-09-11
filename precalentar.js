// Precalentado para la demostración: genera de antemano los guiones de los tickets
// prioritarios y deja el modelo caliente.
//
// Trabaja contra el servidor que ya está corriendo, no contra los modelos directamente:
// el índice RAG lo abre un solo proceso a la vez, así que un segundo motor en paralelo
// falla con «File descriptor could not be locked». Requisito: `node server.js` arriba.
const BASE = process.env.BASE || 'http://localhost:3200';
const CUANTOS = +(process.argv[2] || 3);
const seg = ms => (ms / 1000).toFixed(1) + ' s';

/** Consume una respuesta SSE del servidor y devuelve el evento `fin`. */
async function sse(ruta, cuerpo = {}) {
  const r = await fetch(BASE + ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const lector = r.body.getReader(), dec = new TextDecoder();
  let buf = '', ultimo = null;
  for (;;) {
    const { value, done } = await lector.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const partes = buf.split('\n\n'); buf = partes.pop();
    for (const p of partes) {
      if (!p.startsWith('data: ')) continue;
      const ev = JSON.parse(p.slice(6));
      if (ev.tipo === 'error') throw new Error(ev.mensaje);
      if (ev.tipo === 'fin') ultimo = ev.resultado;
    }
  }
  return ultimo;
}

const t0 = Date.now();

let estado;
try {
  estado = await fetch(BASE + '/api/estado').then(r => r.json());
} catch {
  console.error(`\nNo hay servidor en ${BASE}. Arranca primero:  node server.js\n`);
  process.exit(1);
}

// El modelo se carga después de que el servidor empieza a escuchar: hay que esperarlo.
process.stdout.write('Esperando a que el modelo termine de cargar');
while (!estado.listo) {
  process.stdout.write('.');
  await new Promise(r => setTimeout(r, 2000));
  estado = await fetch(BASE + '/api/estado').then(r => r.json());
}
console.log(`\n\nModelo: ${estado.modelo.nombre} (${estado.modelo.cuantizacion}) · ${estado.material.length} módulos de material\n`);

const tickets = await fetch(BASE + '/api/tickets').then(r => r.json());
const pendientes = tickets.filter(t => t.estado !== 'cerrado' && !t.guion).slice(0, CUANTOS);

if (!pendientes.length) {
  console.log('Todos los tickets prioritarios ya tienen guion guardado.');
} else {
  for (const t of pendientes) {
    const t1 = Date.now();
    try {
      const g = await sse(`/api/tickets/${t.id}/guion`);
      console.log(`${t.id}  guion listo en ${seg(Date.now() - t1)}  ·  ${g.fuentes.length} fragmento(s) de material`);
    } catch (e) {
      console.log(`${t.id}  falló: ${e.message}`);
    }
  }
}

// Una consulta al mentor deja el camino caliente: la primera pregunta en vivo ya no paga el arranque.
if (tickets[0]) {
  const t2 = Date.now();
  try {
    await sse('/api/mentor/stream', { emprendedorId: tickets[0].emprendedorId, pregunta: '¿Cómo voy con mi negocio?' });
    console.log(`mentor    respuesta de prueba en ${seg(Date.now() - t2)}`);
  } catch (e) {
    console.log(`mentor    falló: ${e.message}`);
  }
}

console.log(`\nListo en ${seg(Date.now() - t0)}. Deja el servidor corriendo y no lo reinicies antes de presentar.\n`);
