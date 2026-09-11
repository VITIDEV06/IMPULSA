const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bal = n => 'B/.' + (+n || 0).toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fech = iso => new Date(iso).toLocaleString('es-PA', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const dia = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });
const SEM = { al_dia: ['AL DÍA', 'El negocio avanza y el pago va acorde al plazo.'], atencion: ['ATENCIÓN', 'Hay señales que conviene corregir a tiempo.'], critico: ['CRÍTICO', 'Riesgo real de no cumplir la meta. Requiere acompañamiento.'] };
const PRIO = { 3: ['alta', 'emergencia'], 2: ['media', 'hoy'], 1: ['baja', 'espera'] };
let CATS = [], EMP = null, EMPS = [], filtroCartera = 'todos', filtroTk = 'abierto', tkSel = null, CARA = 'ag';
let EMP_SEL = null, filtroAcomp = 'todos', LINEA = [], lineaCompleta = false;
const ini = n => String(n || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const hace = iso => { const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `Hace ${m}m`; if (m < 1440) return `Hace ${Math.floor(m / 60)}h`; return `Hace ${Math.floor(m / 1440)}d`; };
const COLOR = { al_dia: 'var(--ok)', atencion: 'var(--warn)', critico: 'var(--danger)' };
const PALETA = ['#0B5ED7', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#64748B', '#0EA5E9'];
const ESTADO_TK = { abierto: ['Abierto', 'warn'], en_atencion: ['En atención', 'marca'], cerrado: ['Cerrado', 'ok'] };
const fechaLarga = iso => new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });
const soloDigitos = t => String(t || '').replace(/\D/g, '');

/* ---------- Iconografía y bloques reutilizables ---------- */
const IC = {
  check: '<path d="m20 6-11 11-5-5"/>',
  banco: '<path d="M3 21h18M5 10h14M5 10 12 4l7 6M7 10v11M11 10v11M15 10v11M19 10v11"/>',
  bolsa: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-9.1 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.1A8.5 8.5 0 1 1 21 11.5z"/>',
  usuario: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  bandera: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  telefono: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  bandeja: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  libro: '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2zM13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5z"/>',
  pulso: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
};
const svgIc = p => `<svg viewBox="0 0 24 24">${p}</svg>`;
const ICONO_HITO = { desembolso: 'banco', venta: 'bolsa', abono: 'money', ticket: 'chat', toma: 'usuario', seguimiento: 'chat', cierre: 'check', sesion: 'cal', alerta: 'alerta', plazo: 'bandera' };

/** Estado vacío con icono, explicación y, si aplica, la acción que lo resuelve. */
const vacio = (icono, titulo, texto, accion = '') =>
  `<div class="vacio"><span class="ic-vacio">${svgIc(IC[icono] || IC.bandeja)}</span><strong>${esc(titulo)}</strong><p>${esc(texto)}</p>${accion}</div>`;
const cargandoBloque = (n = 3, alto = false) =>
  `<div class="cargando-bloque">${Array.from({ length: n }, () => `<div class="esqueleto${alto ? ' alto' : ''}"></div>`).join('')}</div>`;
const cargandoRejilla = (n = 4) =>
  `<div class="cargando-rejilla">${Array.from({ length: n }, () => '<div class="esqueleto"></div>').join('')}</div>`;
const enlacesContacto = e => `<a class="btn chico" href="tel:${esc(soloDigitos(e.telefono))}">${svgIc(IC.telefono)}Llamar</a>` +
  (e.whatsapp ? `<a class="btn chico" href="https://wa.me/${esc(soloDigitos(e.whatsapp))}" target="_blank" rel="noopener">${svgIc(IC.chat)}WhatsApp</a>` : '');

/* ---------- Gráficos SVG fluidos: viewBox fijo, ancho 100%, nunca desbordan ---------- */
function areaChart(el, serie, series) {
  const W = 640, H = 240, mL = 34, mR = 12, mT = 14, mB = 26;
  const n = serie.length; if (!n) { el.innerHTML = '<p class="nota">Sin datos.</p>'; return; }
  const max = Math.max(4, ...serie.flatMap(p => series.map(k => p[k.clave])));
  const paso = (W - mL - mR) / Math.max(1, n - 1);
  const x = i => mL + i * paso;
  const y = v => mT + (H - mT - mB) * (1 - v / max);
  const suave = pts => pts.map((p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const a = pts[i - 1], cx = (a[0] + p[0]) / 2;
    return `C${cx},${a[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(' ');
  const lineas = [0, .25, .5, .75, 1].map(f => { const v = max * f;
    return `<line class="rejilla" x1="${mL}" x2="${W - mR}" y1="${y(v)}" y2="${y(v)}"/><text class="eje" x="${mL - 7}" y="${y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`; }).join('');
  const capas = series.map((sr, k) => {
    const pts = serie.map((p, i) => [x(i), y(p[sr.clave])]);
    const d = suave(pts);
    return `<path d="${d} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="${sr.color}" opacity=".10"/>
      <path d="${d}" fill="none" stroke="${sr.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--surface)" stroke="${sr.color}" stroke-width="2"><title>${serie[i].mes}: ${serie[i][sr.clave]} ${sr.nombre}</title></circle>`).join('')}`;
  }).join('');
  const etiquetas = serie.map((p, i) => `<text class="eje" x="${x(i)}" y="${H - 8}" text-anchor="middle">${p.mes}</text>`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${lineas}${capas}${etiquetas}</svg>`;
}

function barChart(el, datos, opciones = {}) {
  const W = 640, H = 210, mL = 40, mR = 10, mT = 10, mB = 24;
  const n = datos.length; if (!n) { el.innerHTML = '<p class="nota">Sin datos.</p>'; return; }
  const max = Math.max(1, ...datos.flatMap(d => [d.a, d.b]));
  const ancho = (W - mL - mR) / n;
  const bw = Math.min(16, ancho * 0.34);
  const y = v => mT + (H - mT - mB) * (1 - v / max);
  const rejilla = [0, .5, 1].map(f => { const v = max * f;
    return `<line class="rejilla" x1="${mL}" x2="${W - mR}" y1="${y(v)}" y2="${y(v)}"/><text class="eje" x="${mL - 7}" y="${y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`; }).join('');
  const barras = datos.map((d, i) => {
    const cx = mL + ancho * i + ancho / 2;
    return `<rect x="${cx - bw - 1.5}" y="${y(d.a)}" width="${bw}" height="${Math.max(1, y(0) - y(d.a))}" rx="2.5" fill="${opciones.colorA || 'var(--ok)'}"><title>${d.et}: ${d.a}</title></rect>
      <rect x="${cx + 1.5}" y="${y(d.b)}" width="${bw}" height="${Math.max(1, y(0) - y(d.b))}" rx="2.5" fill="${opciones.colorB || 'var(--danger)'}" opacity=".85"><title>${d.et}: ${d.b}</title></rect>`;
  }).join('');
  const et = datos.map((d, i) => n > 8 && i % 2 ? '' : `<text class="eje" x="${mL + ancho * i + ancho / 2}" y="${H - 7}" text-anchor="middle">${d.et}</text>`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${rejilla}${barras}${et}</svg>`;
}

function donutChart(el, datos, centro) {
  const S = 160, R = 62, gr = 20, C = S / 2;
  const total = datos.reduce((a, d) => a + d.n, 0) || 1;
  let ang = -Math.PI / 2;
  const arcos = datos.map((d, i) => {
    const frac = d.n / total, fin = ang + frac * Math.PI * 2;
    const x1 = C + R * Math.cos(ang), y1 = C + R * Math.sin(ang);
    const x2 = C + R * Math.cos(fin), y2 = C + R * Math.sin(fin);
    const grande = frac > .5 ? 1 : 0;
    ang = fin;
    if (frac >= .999) return `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${d.color}" stroke-width="${gr}"/>`;
    return `<path d="M${x1},${y1} A${R},${R} 0 ${grande} 1 ${x2},${y2}" fill="none" stroke="${d.color}" stroke-width="${gr}" stroke-linecap="butt"><title>${d.et}: ${d.n}</title></path>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${S} ${S}" preserveAspectRatio="xMidYMid meet" role="img">${arcos}
    <g class="anillo-txt"><text class="n" x="${C}" y="${C + 2}">${centro?.n ?? total}</text><text class="l" x="${C}" y="${C + 16}">${centro?.l ?? 'total'}</text></g></svg>`;
}

function anilloProgreso(el, pct, centro) {
  const S = 160, R = 62, gr = 16, C = S / 2, L = 2 * Math.PI * R;
  el.innerHTML = `<svg viewBox="0 0 ${S} ${S}" preserveAspectRatio="xMidYMid meet" role="img">
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="${gr}"/>
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--brand-600)" stroke-width="${gr}" stroke-linecap="round"
      stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - Math.min(1, pct / 100))}" transform="rotate(-90 ${C} ${C})"/>
    <g class="anillo-txt"><text class="n" x="${C}" y="${C + 2}">${pct}%</text><text class="l" x="${C}" y="${C + 16}">${centro || ''}</text></g></svg>`;
}

/* ---------- Navegación y caras ---------- */
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;
  $('#btnTema').textContent = t === 'claro' ? 'Modo oscuro' : 'Modo claro';
  $('#icTema').innerHTML = t === 'claro'
    ? '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  try { localStorage.setItem('impulsa-tema', t); } catch {}
  if ($('#vista-dashboard').classList.contains('activa')) cargarDashboard();
}
const alternarTema = () => aplicarTema(document.documentElement.dataset.tema === 'claro' ? 'oscuro' : 'claro');
$('#btnTema').onclick = alternarTema; $('#btnTema2').onclick = alternarTema;
$('#btnNav').onclick = () => document.body.classList.toggle('nav-abierta');
document.querySelectorAll('.item').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-abierta')));
$('#btnAlertas').onclick = () => { location.hash = 'dashboard'; setTimeout(() => $('#listaAlertas')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120); };
function cara(c) {
  CARA = c;
  const emp = c === 'emp';
  $('#caraEmp').classList.toggle('activa', emp); $('#caraAg').classList.toggle('activa', !emp);
  $('#navEmp').hidden = !emp; $('#navAg').hidden = emp;
  $('#subMarca').textContent = emp ? 'Portal del emprendedor' : 'Detecta · Orienta · Acompaña';
  const e = EMPS.find(x => x.id === EMP);
  $('#nomUsuario').textContent = emp ? (e?.nombre || 'Emprendedor') : 'Agente de programa';
  $('#rolUsuario').textContent = emp ? (e?.negocio || 'Programa de microcrédito') : 'Programa IMPULSA';
  $('#avUsuario').textContent = emp ? ini(e?.nombre) : 'AG';
  $('#buscar').placeholder = emp ? 'Buscar en el material y en mis movimientos…' : 'Buscar emprendedores, tickets, negocios…';
  location.hash = emp ? 'panel' : 'dashboard';
}
$('#caraEmp').onclick = () => cara('emp'); $('#caraAg').onclick = () => cara('ag');

// El perfil del emprendedor es una vista propia, pero en el menú sigue perteneciendo a «Emprendedores».
const VISTA_PADRE = { emprendedor: 'cartera' };
function mostrar(v) {
  if (!$('#vista-' + v)) v = CARA === 'emp' ? 'panel' : 'dashboard';
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.id === 'vista-' + v));
  const marcado = VISTA_PADRE[v] || v;
  document.querySelectorAll('nav a.item').forEach(a => a.classList.toggle('activo', a.dataset.vista === marcado));
  document.querySelector('.zona').scrollTop = 0;
  if (v === 'dashboard') cargarDashboard();
  if (v === 'panel') cargarPanel();
  if (v === 'ayuda') cargarMisTickets();
  if (v === 'cartera') cargarCartera();
  if (v === 'emprendedor') cargarPerfil(EMP_SEL);
  if (v === 'tickets') cargarTickets();
  if (v === 'acompanamiento') cargarAcompanamiento();
  if (v === 'material') cargarMaterial();
  if (v === 'evidencia') cargarEvidencia();
}
addEventListener('hashchange', () => mostrar(location.hash.slice(1) || 'panel'));

async function leerSSE(url, body, onEv) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const lec = r.body.getReader(), dec = new TextDecoder(); let buf = '';
  while (true) {
    const { value, done } = await lec.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const p = buf.split('\n\n'); buf = p.pop();
    for (const x of p) if (x.startsWith('data: ')) onEv(JSON.parse(x.slice(6)));
  }
}

/* ---------- Estado ---------- */
async function estado() {
  try {
    const e = await fetch('/api/estado').then(r => r.json());
    CATS = e.categorias;
    if (!$('#tkCat').options.length) $('#tkCat').innerHTML = CATS.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    $('#puntoModelo').className = 'punto ' + (e.listo ? 'ok' : 'cargando');
    $('#txtModelo').textContent = e.listo ? 'Mentor listo' : 'Cargando modelo…';
    $('#puntoVision').className = 'punto ' + (e.visionLista ? 'ok' : e.visionActiva ? 'cargando' : '');
    $('#txtVision').textContent = e.visionLista ? 'Lectura de recibos lista' : e.visionActiva ? 'VisionPsy cargando…' : 'Lectura de recibos desactivada';
    // Con SIN_VISION=1 la lectura por foto no se carga a propósito: se avisa y no se ofrece.
    $('#zonaFoto').classList.toggle('inactiva', e.visionActiva === false);
    if (e.visionActiva === false && !$('#lecturaRecibo').dataset.aviso) {
      $('#lecturaRecibo').dataset.aviso = '1'; $('#lecturaRecibo').hidden = false;
      $('#lecturaRecibo').textContent = 'La lectura de recibos está desactivada en esta sesión (SIN_VISION=1). Registra el movimiento a mano.';
    }
    $('#puntoMat').className = 'punto ' + (e.material.length ? 'ok' : '');
    $('#txtMat').textContent = `${e.material.length} módulos de material`;
    $('#modelosInfo').innerHTML = `<dl class="campos">
      <dt>Mentor y guiones</dt><dd>${esc(e.modelo.nombre)} — ${esc(e.modelo.cuantizacion)}<br><small>${esc(e.modelo.repo)}</small></dd>
      <dt>Lectura de recibos</dt><dd>${esc(e.vision.nombre)} — ${esc(e.vision.cuantizacion)}<br><small>${esc(e.vision.repo)}</small></dd>
      <dt>Búsqueda en material</dt><dd>${esc(e.embeddings.nombre)} — ${esc(e.embeddings.cuantizacion)}</dd></dl>`;
    if (!e.listo || (e.visionActiva && !e.visionLista)) setTimeout(estado, 3000);
  } catch { setTimeout(estado, 3000); }
}
function red() { $('#txtRed').textContent = navigator.onLine ? 'Sin conexión requerida' : 'Sin internet — funcionando'; }
addEventListener('online', red); addEventListener('offline', red);

/* ---------- Emprendedor ---------- */
async function cargarEmps() {
  EMPS = await fetch('/api/emprendedores').then(r => r.json());
  if (!EMP && EMPS.length) EMP = EMPS[0].id;
  $('#selEmp').innerHTML = EMPS.map(e => `<option value="${e.id}" ${e.id === EMP ? 'selected' : ''}>${esc(e.nombre)} — ${esc(e.negocio)}</option>`).join('');
}
$('#selEmp').onchange = e => { EMP = e.target.value; cargarPanel(); };

async function cargarPanel() {
  if (!EMPS.length) await cargarEmps();
  if (!$('#cifrasNegocio').children.length) { $('#cifrasNegocio').innerHTML = cargandoRejilla(5); $('#semaforo').innerHTML = cargandoBloque(1, true); }
  const d = await fetch('/api/emprendedores/' + EMP).then(r => r.json());
  const m = d.metricas, r = d.riesgo, e = m.emprendedor;
  $('#tituloNegocio').textContent = e.negocio;
  $('#subNegocio').textContent = `${e.nombre} · ${e.provincia} · préstamo ${bal(e.montoPrestamo)} a ${e.plazoMeses} meses`;
  const [t, ex] = SEM[r.etiqueta];
  $('#semaforo').innerHTML = `<div class="semaforo ${r.etiqueta}"><div><span class="luz">${t}</span><div>${ex}</div>
    ${r.alertas.length ? `<ul>${r.alertas.map(a => `<li><b>${esc(a.titulo)}.</b> ${esc(a.detalle)}</li>`).join('')}</ul>` : ''}
    ${r.fortalezas.length ? `<ul>${r.fortalezas.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</div></div>`;
  const kpe = (v, rot, pie, cls) => `<div class="kpi"><div class="fila-ic"><span class="ic ${cls}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span><span class="rot">${rot}</span></div><div class="val" style="font-size:26px;line-height:30px">${v}</div>${pie ? `<div class="pie">${pie}</div>` : ''}</div>`;
  $('#cifrasNegocio').innerHTML = kpe(bal(m.ventas), 'Ventas acumuladas', '', 'b')
    + kpe(bal(m.utilidad), 'Utilidad', m.utilidad < 0 ? 'El negocio está en pérdida' : '', m.utilidad < 0 ? 'd' : 'o')
    + kpe(m.margen + '%', 'Margen', m.margen < 15 ? 'Por debajo del 15% recomendado' : 'Dentro de lo recomendado', m.margen < 15 ? 'w' : 'o')
    + kpe(bal(m.saldoDeuda), 'Falta por pagar', `de ${bal(m.totalAPagar)}`, 'b')
    + kpe(m.diasRestantes, 'Días restantes', `${m.avanceTiempo}% del plazo`, m.diasRestantes < 90 ? 'w' : 'b');
  barChart($('#grafica'), m.semanas.map(x => ({ et: dia(x.desde).split(' ')[0], a: x.ventas, b: x.gastos })));
  $('#meta').innerHTML = metaHTML(m, e);
  const movs = await fetch(`/api/emprendedores/${EMP}/movimientos`).then(r => r.json());
  $('#ultimosMov').innerHTML = movs.length ? `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th class="num">Monto</th></tr></thead><tbody>
    ${movs.slice(0, 12).map(x => `<tr><td>${dia(x.fecha)}</td><td><span class="badge ${x.tipo === 'venta' ? 'ok' : x.tipo === 'gasto' ? 'danger' : 'marca'}">${x.tipo}</span></td><td>${esc(x.concepto)}${x.origen === 'foto' ? ' <small>(por foto)</small>' : ''}</td><td class="num">${bal(x.monto)}</td></tr>`).join('')}</tbody></table>`
    : vacio('libro', 'Todavía no has registrado nada', 'Anota tu primera venta o gasto para que el mentor y tu semáforo trabajen con datos reales.',
        '<a class="btn chico primario" href="#registrar">Registrar movimiento</a>');
}

/* ---------- Registrar ---------- */
let tipoMov = 'venta';
document.querySelectorAll('.tipos .tipo').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tipos .tipo').forEach(x => x.classList.remove('activa'));
  b.classList.add('activa'); tipoMov = b.dataset.tipo;
});
$('#formMov').addEventListener('submit', async ev => {
  ev.preventDefault();
  const body = { tipo: tipoMov, monto: +$('#mvMonto').value, fecha: $('#mvFecha').value || undefined, concepto: $('#mvConcepto').value, origen: $('#formMov').dataset.origen || 'manual' };
  await fetch(`/api/emprendedores/${EMP}/movimientos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  $('#avisoMov').innerHTML = `<p class="nota">Registrado: ${esc(tipoMov)} de ${bal(body.monto)}. <a href="#panel">Ver mi negocio</a></p>`;
  $('#formMov').reset(); $('#formMov').dataset.origen = 'manual';
});

$('#zonaFoto').onclick = () => { if (!$('#zonaFoto').classList.contains('inactiva')) $('#archivoFoto').click(); };
$('#archivoFoto').onchange = async ev => {
  const f = ev.target.files[0]; if (!f) return;
  const url = await reducir(f, 768);
  $('#previa').src = url; $('#previa').hidden = false;
  const l = $('#lecturaRecibo'); l.hidden = false; l.textContent = 'Leyendo el recibo en este equipo…';
  let txt = '';
  try {
    await leerSSE('/api/recibo/leer', { imagenBase64: url }, e => {
      if (e.tipo === 'cargando') l.textContent = 'Cargando VisionPsy…';
      else if (e.tipo === 'texto') { txt += e.delta; l.textContent = txt.slice(-300); }
      else if (e.tipo === 'fin') {
        const { datos, textoCrudo, metricas } = e.resultado;
        if (datos.total) $('#mvMonto').value = datos.total;
        if (datos.fecha) $('#mvFecha').value = datos.fecha;
        $('#mvConcepto').value = [datos.comercio, datos.categoria].filter(Boolean).join(' · ');
        document.querySelectorAll('.tipos .tipo').forEach(x => x.classList.toggle('activa', x.dataset.tipo === datos.tipoSugerido));
        tipoMov = datos.tipoSugerido; $('#formMov').dataset.origen = 'foto';
        l.innerHTML = `Leído en ${(metricas.totalMs / 1000).toFixed(1)} s (${metricas.tokensPorSegundo ?? '?'} tok/s). Revisa el formulario y confirma.<details><summary>Texto transcrito</summary><pre>${esc(textoCrudo)}</pre></details>`;
      } else if (e.tipo === 'error') l.textContent = 'Error: ' + e.mensaje;
    });
  } catch (err) { l.textContent = 'Error: ' + err.message; }
};
function reducir(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), fr = new FileReader();
    fr.onload = () => img.src = fr.result; fr.onerror = rej; img.onerror = rej;
    img.onload = () => { const e = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = img.width * e; c.height = img.height * e; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .85)); };
    fr.readAsDataURL(file);
  });
}

/* ---------- Mentor ---------- */
const histMentor = [];
document.querySelectorAll('#vista-mentor .sugerencias button').forEach(b => b.onclick = () => { $('#pregunta').value = b.dataset.q; $('#formMentor').requestSubmit(); });
$('#formMentor').addEventListener('submit', async ev => {
  ev.preventDefault();
  const q = $('#pregunta').value.trim(); if (!q) return;
  $('#pregunta').value = '';
  const h = $('#hilo'); if (h.querySelector('.vacio')) h.innerHTML = '';
  const tu = document.createElement('div'); tu.className = 'turno usuario'; tu.textContent = q; h.appendChild(tu);
  const ta = document.createElement('div'); ta.className = 'turno asistente pensando'; ta.textContent = 'Revisando tus números y el material…'; h.appendChild(ta);
  const btn = $('#btnPreguntar'); btn.disabled = true; let txt = '';
  const t0 = Date.now();
  let aviso = 'Revisando tus números y el material…';
  const cron = setInterval(() => {
    if (ta.classList.contains('pensando')) ta.textContent = `${aviso} · ${Math.round((Date.now() - t0) / 1000)} s en este equipo, sin internet`;
  }, 1000);
  try {
    await leerSSE('/api/mentor/stream', { emprendedorId: EMP, pregunta: q, historial: histMentor }, e => {
      if (e.tipo === 'material') aviso = e.usadas ? `Usando ${e.usadas} fragmento(s) del material…` : 'Sin material específico; usando tus números…';
      else if (e.tipo === 'pensando') aviso = `Pensando (${e.tokens} tokens)…`;
      else if (e.tipo === 'texto') { ta.classList.remove('pensando'); txt += e.delta; ta.textContent = txt; }
      else if (e.tipo === 'fin') {
        const r = e.resultado; ta.classList.remove('pensando'); ta.textContent = r.respuesta;
        const pie = document.createElement('span'); pie.className = 'respaldo ' + (r.conMaterial ? 'guias' : 'general');
        pie.innerHTML = (r.conMaterial ? 'Basado en el material del programa' : 'Orientación general con tus números') +
          (r.fuentes.length ? '<br>' + r.fuentes.map((f, i) => `<span class="fuente-chip">[${i + 1}] ${esc(f.fuente)}</span>`).join('') : '') +
          `<br><small>${(r.metricas.totalMs / 1000).toFixed(1)} s · ${r.metricas.tokensPorSegundo ?? '?'} tok/s · sin internet</small>`;
        ta.appendChild(pie);
        histMentor.push({ rol: 'usuario', texto: q }, { rol: 'asistente', texto: r.respuesta });
      } else if (e.tipo === 'error') { ta.classList.remove('pensando'); ta.textContent = 'Error: ' + e.mensaje; }
    });
  } catch (err) { ta.classList.remove('pensando'); ta.textContent = 'Sin respuesta: ' + err.message; }
  finally { clearInterval(cron); btn.disabled = false; ta.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
});

/* ---------- Pedir ayuda ---------- */
$('#formTicket').addEventListener('submit', async ev => {
  ev.preventDefault();
  const t = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emprendedorId: EMP, categoria: $('#tkCat').value, mensaje: $('#tkMsg').value }) }).then(r => r.json());
  $('#avisoTicket').innerHTML = `Solicitud <b>${esc(t.id)}</b> enviada con prioridad <b>${esc(PRIO[t.prioridad][0])}</b>. Un agente del programa la tomará.<br><small>${t.motivosPrioridad.map(esc).join(' ')}</small>`;
  $('#tkMsg').value = ''; cargarMisTickets();
});
async function cargarMisTickets() {
  const t = await fetch('/api/tickets?emprendedorId=' + EMP).then(r => r.json());
  $('#misTickets').innerHTML = t.length ? t.map(x => `<div class="tk p${x.prioridad}"><div class="cab"><span>${esc(x.id)} · ${esc(x.estado.replace('_', ' '))}</span><span class="badge ${x.prioridad === 3 ? 'danger' : x.prioridad === 2 ? 'warn' : 'ok'}"><i></i>${PRIO[x.prioridad][0]}</span></div><b>${esc(x.asunto)}</b><p>${esc(x.mensaje.slice(0, 120))}</p>${x.respuestas?.length ? `<p style="margin-top:6px"><b>Respuesta del agente:</b> ${esc(x.respuestas[x.respuestas.length - 1].texto)}</p>` : ''}</div>`).join('') : vacio('chat', 'No has pedido ayuda todavía', 'Cuando envíes una solicitud verás aquí su estado y la respuesta del agente del programa.');
}


/* ---------- Dashboard administrativo ---------- */
let MATLIST = [];
async function cargarDashboard() {
  if (!$('#kpis').children.length) $('#kpis').innerHTML = cargandoRejilla(5);
  const d = await fetch('/api/dashboard').then(r => r.json());
  const h = new Date().getHours();
  $('#saludo').textContent = `${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}, equipo IMPULSA`;
  $('#fechaHoy').textContent = new Date().toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' });
  const k = d.kpis;
  const ev = d.evolucion, ant = ev[ev.length - 2], act = ev[ev.length - 1];
  const delta = (a, b) => { if (a == null || !b) return { c: 'flat', t: 'sin variación' };
    const v = a - b; return { c: v > 0 ? 'up' : v < 0 ? 'down' : 'flat', t: `${v > 0 ? '+' : ''}${v} vs. mes anterior` }; };
  const dSal = delta(act?.al_dia, ant?.al_dia), dCri = delta(act?.critico, ant?.critico);
  const pct = (n) => k.activos ? Math.round((n / k.activos) * 100) : 0;
  const ico = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    check: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
  };
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="fila-ic"><span class="ic b"><svg viewBox="0 0 24 24">${ico.users}</svg></span><span class="rot">Emprendedores activos</span></div>
      <div class="val">${k.activos}</div><div class="pie">Cartera colocada ${bal(k.carteraColocada)}</div></div>
    <div class="kpi"><div class="fila-ic"><span class="ic o"><svg viewBox="0 0 24 24">${ico.check}</svg></span><span class="rot">Negocios saludables</span></div>
      <div class="val">${k.saludables}</div><div class="pie"><span class="delta ${dSal.c}">${dSal.t}</span> · ${pct(k.saludables)}% del total</div></div>
    <div class="kpi"><div class="fila-ic"><span class="ic w"><svg viewBox="0 0 24 24">${ico.warn}</svg></span><span class="rot">En riesgo</span></div>
      <div class="val">${k.enRiesgo}</div><div class="pie">${pct(k.enRiesgo)}% del total</div></div>
    <div class="kpi"><div class="fila-ic"><span class="ic d"><svg viewBox="0 0 24 24">${ico.alert}</svg></span><span class="rot">Atención prioritaria</span></div>
      <div class="val">${k.criticos}</div><div class="pie"><span class="delta ${dCri.c === 'up' ? 'down' : dCri.c === 'down' ? 'up' : 'flat'}">${dCri.t}</span></div></div>
    <div class="kpi"><div class="fila-ic"><span class="ic b"><svg viewBox="0 0 24 24">${ico.money}</svg></span><span class="rot">Saldo por recuperar</span></div>
      <div class="val">${bal(k.saldoPendiente)}</div><div class="pie">Recuperado ${bal(k.recuperado)}</div></div>`;

  areaChart($('#gEvolucion'), ev, [
    { clave: 'al_dia', nombre: 'saludables', color: 'var(--ok)' },
    { clave: 'atencion', nombre: 'en riesgo', color: 'var(--warn)' },
    { clave: 'critico', nombre: 'críticos', color: 'var(--danger)' }
  ]);

  anilloProgreso($('#gAnillo'), d.indiceAcompanamiento, 'con seguimiento');
  $('#pieAnillo').innerHTML = `<p class="nota" style="text-align:center;margin-top:8px">${d.conSeguimiento} de ${k.enRiesgo + k.criticos} emprendedores en riesgo tienen un caso abierto o atendido.</p>
    <div class="acc-rapida" style="margin-top:12px;cursor:default"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
      <span><b>${d.tickets.abiertos + d.tickets.enAtencion} tickets activos</b><br><small class="nota">${d.tickets.altos} de prioridad alta</small></span></div>`;

  $('#tablaAtencion').innerHTML = d.requierenAtencion.length ? `<table><thead><tr><th>Emprendedor</th><th>Negocio</th><th>Motivo principal</th><th>Riesgo</th><th class="num">Días</th><th></th></tr></thead><tbody>
    ${d.requierenAtencion.map(e => `<tr class="fila-click" data-id="${e.id}">
      <td><div class="persona"><span class="av">${ini(e.nombre)}</span><span><b>${esc(e.nombre)}</b><small>${esc(e.provincia)}</small></span></div></td>
      <td>${esc(e.negocio)}<br><small class="nota">${esc(e.categoria)}</small></td>
      <td><small>${esc(e.motivo)}</small></td>
      <td><span class="badge ${e.nivel === 3 ? 'danger' : 'warn'}"><i></i>${e.nivel === 3 ? 'Crítico' : 'En riesgo'}</span></td>
      <td class="num">${e.diasRestantes}</td>
      <td><button class="btn chico" data-ver="${e.id}">Ver caso</button></td></tr>`).join('')}</tbody></table>`
    : vacio('check', 'Nadie requiere atención hoy', 'Los doce negocios de la cartera están dentro de los parámetros del programa.');
  document.querySelectorAll('#tablaAtencion [data-ver]').forEach(b => b.onclick = ev2 => { ev2.stopPropagation(); abrirEmprendedor(b.dataset.ver); });
  document.querySelectorAll('#tablaAtencion tr.fila-click').forEach(tr => tr.onclick = () => abrirEmprendedor(tr.dataset.id));

  const dist = d.distribucion.map((x, i) => ({ ...x, et: x.categoria, color: PALETA[i % PALETA.length] }));
  donutChart($('#gDona'), dist, { n: k.activos, l: 'negocios' });
  $('#listaDona').innerHTML = dist.map(x => `<div class="f"><i style="background:${x.color}"></i><span>${esc(x.categoria)}</span><b>${x.pct}%</b></div>`).join('');

  $('#ultimosTickets').innerHTML = d.ultimosTickets.length ? d.ultimosTickets.map(t => `
    <div class="alerta"><span class="ic ${t.prioridad === 3 ? 'd' : 'w'}" style="width:8px;height:8px;border-radius:50%;background:${t.prioridad === 3 ? 'var(--danger)' : t.prioridad === 2 ? 'var(--warn)' : 'var(--ok)'};margin-top:6px"></span>
      <span style="min-width:0;flex:1"><b>${esc(t.asunto)}</b><p>${esc(t.id)} · ${esc(t.nombre)}</p></span>
      <span class="t">${hace(t.creado)}</span></div>`).join('') : '<p class="nota">Sin tickets en la bandeja.</p>';

  $('#listaAlertas').innerHTML = d.alertas.length ? d.alertas.map(a => `
    <div class="alerta"><span class="ic ${a.nivel === 3 ? 'd' : 'w'}"><svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></span>
      <span style="min-width:0;flex:1"><b>${esc(a.nombre)}</b><p>${esc(a.titulo)} · ${a.diasRestantes} días restantes</p></span></div>`).join('')
    : '<p class="nota">Sin alertas activas.</p>';

  $('#accionesRapidas').innerHTML = [
    ['tickets', 'Atender tickets prioritarios', '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>'],
    ['cartera', 'Revisar emprendedores', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'],
    ['acompanamiento', 'Ver sesiones agendadas', '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'],
    ['material', 'Consultar material educativo', '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2zM13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5z"/>']
  ].map(([h, t, p]) => `<a class="acc-rapida" href="#${h}"><span class="ic"><svg viewBox="0 0 24 24">${p}</svg></span>${t}<span class="fl">›</span></a>`).join('');

  $('#contAlertas').textContent = d.alertas.length; $('#contAlertas').hidden = !d.alertas.length;
  $('#contTk').textContent = d.tickets.abiertos; $('#contTk').hidden = !d.tickets.abiertos;
}

/* ---------- Acompañamiento: planes de tres sesiones ---------- */
const VACIO_ACOMP = {
  todos: ['Sin planes de acompañamiento', 'Toma un ticket en la bandeja y agenda el plan de tres sesiones.'],
  pendiente: ['Ningún plan con sesiones pendientes', 'Todos los planes agendados están completos.'],
  atrasada: ['Ningún plan atrasado', 'Todas las sesiones pendientes están dentro de su fecha.'],
  completado: ['Ningún plan completado todavía', 'Un plan se completa cuando sus tres sesiones quedan marcadas como realizadas.']
};

async function cargarAcompanamiento() {
  const cont = $('#listaAcomp');
  if (!cont.children.length) { $('#cifrasAcomp').innerHTML = cargandoRejilla(4); cont.innerHTML = cargandoBloque(2, true); }
  const ses = await fetch('/api/sesiones').then(r => r.json());
  const hoy = new Date().toISOString().slice(0, 10);

  // Un plan = las sesiones de un ticket. Se agrupan para poder pintarlas como stepper.
  const planes = Object.values(ses.reduce((a, s) => {
    (a[s.ticketId] ||= { ticketId: s.ticketId, emprendedor: s.emprendedor, ticket: s.ticket, riesgo: s.riesgo, sesiones: [] }).sesiones.push(s);
    return a;
  }, {})).map(p => {
    const pendientes = p.sesiones.filter(s => s.estado !== 'realizada');
    const atrasadas = pendientes.filter(s => s.fecha < hoy);
    const proxima = pendientes.slice().sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null;
    return { ...p, pendientes: pendientes.length, atrasadas: atrasadas.length, proxima };
  }).sort((a, b) => ((b.ticket?.prioridad || 0) - (a.ticket?.prioridad || 0)) || a.ticketId.localeCompare(b.ticketId));

  const kp = (v, l, pie, cls) => `<div class="kpi"><div class="fila-ic"><span class="ic ${cls}">${svgIc(IC.cal)}</span><span class="rot">${l}</span></div><div class="val">${v}</div><div class="pie">${pie}</div></div>`;
  const realizadas = ses.filter(s => s.estado === 'realizada').length;
  const atrasadasTotal = ses.filter(s => s.estado !== 'realizada' && s.fecha < hoy).length;
  $('#cifrasAcomp').innerHTML = kp(planes.length, 'Planes agendados', `${planes.filter(p => !p.pendientes).length} completados`, 'b')
    + kp(realizadas, 'Sesiones realizadas', `de ${ses.length} programadas`, 'o')
    + kp(ses.length - realizadas, 'Sesiones pendientes', 'Del plan de tres pasos', 'w')
    + kp(atrasadasTotal, 'Sesiones atrasadas', atrasadasTotal ? 'Requieren reprogramarse' : 'Todo al día', atrasadasTotal ? 'd' : 'o');

  $('#filtrosAcomp').innerHTML = [
    ['todos', 'Todos', planes.length],
    ['pendiente', 'Con pendientes', planes.filter(p => p.pendientes).length],
    ['atrasada', 'Atrasados', planes.filter(p => p.atrasadas).length],
    ['completado', 'Completados', planes.filter(p => !p.pendientes).length]
  ].map(([f, n, c]) => `<button class="${filtroAcomp === f ? 'activa' : ''}" data-f="${f}">${n}<span class="n">${c}</span></button>`).join('');
  document.querySelectorAll('#filtrosAcomp button').forEach(b => b.onclick = () => { filtroAcomp = b.dataset.f; cargarAcompanamiento(); });

  const vis = planes.filter(p => filtroAcomp === 'todos'
    || (filtroAcomp === 'pendiente' && p.pendientes)
    || (filtroAcomp === 'atrasada' && p.atrasadas)
    || (filtroAcomp === 'completado' && !p.pendientes));

  cont.innerHTML = vis.length ? vis.map(p => `<div class="tarjeta mt">
      <div class="cab-tarjeta">
        <div class="persona"><span class="av">${ini(p.emprendedor?.nombre)}</span>
          <span><b>${esc(p.emprendedor?.nombre || '')}</b><small>${esc(p.emprendedor?.negocio || '')} · ${esc(p.emprendedor?.provincia || '')}</small></span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${p.atrasadas ? `<span class="badge danger"><i></i>${p.atrasadas} atrasada${p.atrasadas > 1 ? 's' : ''}</span>` : ''}
          ${p.riesgo ? `<span class="badge ${p.riesgo === 'critico' ? 'danger' : p.riesgo === 'atencion' ? 'warn' : 'ok'}"><i></i>${SEM[p.riesgo][0]}</span>` : ''}
          <button class="btn chico" data-ir-ticket="${esc(p.ticketId)}">${esc(p.ticketId)}</button></div>
      </div>
      <div class="contacto">${p.emprendedor ? `<span>Tel. ${esc(p.emprendedor.telefono)}</span><span>WhatsApp ${esc(p.emprendedor.whatsapp)}</span>` : ''}<span>${esc(p.ticket?.asunto || '')}</span></div>
      <div class="acciones">${p.emprendedor ? enlacesContacto(p.emprendedor) : ''}<button class="btn chico" data-ir-perfil="${esc(p.emprendedor?.id || '')}">Ver perfil</button></div>
      <div style="margin-top:16px">${stepperHTML(p.sesiones)}</div>
    </div>`).join('')
    : vacio('cal', VACIO_ACOMP[filtroAcomp][0], VACIO_ACOMP[filtroAcomp][1],
        '<a class="btn chico primario" href="#tickets">Ir a la bandeja de tickets</a>');

  conectarStepper(cont, cargarAcompanamiento);
  cont.querySelectorAll('[data-ir-ticket]').forEach(b => b.onclick = () => { tkSel = b.dataset.irTicket; location.hash = 'tickets'; });
  cont.querySelectorAll('[data-ir-perfil]').forEach(b => b.onclick = () => b.dataset.irPerfil && abrirEmprendedor(b.dataset.irPerfil));
}

/* ---------- Material educativo ---------- */
async function cargarMaterial() {
  if (!$('#listaMaterial').children.length) $('#listaMaterial').innerHTML = cargandoRejilla(3);
  const e = await fetch('/api/estado').then(r => r.json());
  MATLIST = e.material;
  const ficha = m => {
    const key = m.replace(/^\d+-/, '');
    const meta = key.startsWith('finanzas') ? ['Finanzas', 'Aprende a separar, registrar y mejorar el margen del negocio.']
      : key.startsWith('marketing') ? ['Marketing digital', 'Acciones sencillas para encontrar clientes y promocionarte.']
      : ['Administración', 'Información del programa, pagos y acompañamiento.'];
    return { archivo: m, titulo: key.replace(/\.txt$/, '').replace(/-/g, ' '), categoria: meta[0], descripcion: meta[1] };
  };
  const recursos = e.material.map(ficha);
  $('#listaMaterial').innerHTML = `<div class="rejilla-3">${recursos.map(r => `<article class="tarjeta recurso">
    <div class="cab-tarjeta"><span class="badge marca">${esc(r.categoria)}</span><span class="nota">Lectura breve</span></div>
    <h3>${esc(r.titulo)}</h3><p class="nota">${esc(r.descripcion)}</p>
    <button class="btn chico" data-material="${esc(r.archivo)}">Abrir material</button><div class="contenido-material" id="material-${esc(r.archivo)}" hidden></div>
  </article>`).join('')}</div>
  <p class="nota mt">El mentor y los guiones usan estos recursos locales ya indexados.</p>`;
  document.querySelectorAll('[data-material]').forEach(b => b.onclick = async () => {
    const panel = $('#material-' + b.dataset.material);
    if (!panel.hidden) { panel.hidden = true; b.textContent = 'Abrir material'; return; }
    b.disabled = true; b.textContent = 'Abriendo…';
    try { panel.textContent = await fetch('/api/material/' + encodeURIComponent(b.dataset.material)).then(r => r.ok ? r.text() : Promise.reject()); panel.hidden = false; b.textContent = 'Cerrar material'; }
    catch { panel.textContent = 'No se pudo abrir el material.'; panel.hidden = false; b.textContent = 'Cerrar material'; }
    finally { b.disabled = false; }
  });
}

/* ---------- Búsqueda de la cabecera ---------- */
let tBusq;
$('#buscar').addEventListener('input', () => {
  clearTimeout(tBusq);
  tBusq = setTimeout(async () => {
    const q = $('#buscar').value.trim().toLowerCase();
    if (q.length < 2) { $('#resBuscar').innerHTML = ''; return; }
    if (!EMPS.length) await cargarEmps();
    const tks = await fetch('/api/tickets').then(r => r.json());
    const res = [
      ...EMPS.filter(e => (e.nombre + e.negocio + e.categoria + e.provincia).toLowerCase().includes(q)).slice(0, 5)
        .map(e => ({ t: e.nombre, s: `${e.negocio} · ${e.provincia}`, ir: () => abrirEmprendedor(e.id) })),
      ...tks.filter(t => (t.id + t.asunto + (t.emprendedor?.nombre || '')).toLowerCase().includes(q)).slice(0, 4)
        .map(t => ({ t: `${t.id} — ${t.asunto}`, s: t.emprendedor?.nombre || '', ir: () => { tkSel = t.id; location.hash = 'tickets'; } }))
    ];
    $('#resBuscar').innerHTML = res.length ? `<div class="resultados-busqueda">${res.map((r, i) => `<a href="#" data-i="${i}"><b>${esc(r.t)}</b><small>${esc(r.s)}</small></a>`).join('')}</div>` : '';
    document.querySelectorAll('#resBuscar a').forEach(a => a.onclick = ev => { ev.preventDefault(); res[+a.dataset.i].ir(); $('#buscar').value = ''; $('#resBuscar').innerHTML = ''; });
  }, 200);
});
document.addEventListener('click', e => { if (!e.target.closest('.buscador')) $('#resBuscar').innerHTML = ''; });

/* ---------- Agente: cartera ---------- */
async function cargarCartera() {
  if (!$('#tablaCartera').children.length) { $('#cifrasPanel').innerHTML = cargandoRejilla(5); $('#tablaCartera').innerHTML = cargandoBloque(6); }
  const [p, l] = await Promise.all([fetch('/api/panel').then(r => r.json()), fetch('/api/emprendedores').then(r => r.json())]);
  EMPS = l;
  const kp = (v, rot, pie, cls) => `<div class="kpi"><div class="fila-ic"><span class="ic ${cls}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span><span class="rot">${rot}</span></div><div class="val">${v}</div><div class="pie">${pie}</div></div>`;
  $('#cifrasPanel').innerHTML = kp(p.total, 'Emprendedores', `Cartera ${bal(p.carteraColocada)}`, 'b')
    + kp(p.alDia, 'Al día', 'Sin alertas activas', 'o')
    + kp(p.atencion, 'En riesgo', 'Con señales por corregir', 'w')
    + kp(p.criticos, 'Críticos', 'Requieren contacto', 'd')
    + kp(bal(p.saldoPendiente), 'Saldo por recuperar', `${p.ticketsAbiertos} tickets abiertos`, 'b');

  const cats = [...new Set(l.map(e => e.categoria))];
  $('#filtros').innerHTML = [['todos', 'Todos'], ['critico', 'Críticos'], ['atencion', 'En riesgo'], ['al_dia', 'Al día']]
    .map(([f, n]) => `<button class="${filtroCartera === f ? 'activa' : ''}" data-f="${f}">${n}</button>`).join('')
    + cats.map(c => `<button class="${filtroCartera === c ? 'activa' : ''}" data-f="${c}">${esc(c)}</button>`).join('');
  document.querySelectorAll('#filtros button').forEach(b => b.onclick = () => { filtroCartera = b.dataset.f; cargarCartera(); });

  const vis = l.filter(e => filtroCartera === 'todos' || e.riesgo?.etiqueta === filtroCartera || e.categoria === filtroCartera)
    .sort((a, b) => (b.riesgo?.puntaje || 0) - (a.riesgo?.puntaje || 0));
  $('#tablaCartera').innerHTML = vis.length ? `<table><thead><tr><th>Emprendedor</th><th>Negocio</th><th>Estado</th><th class="num">Margen</th><th class="num">Pago / plazo</th><th class="num">Días</th><th>Motivo principal</th></tr></thead><tbody>
    ${vis.map(e => `<tr class="fila-click" data-id="${e.id}">
      <td><div class="persona"><span class="av">${ini(e.nombre)}</span><span><b>${esc(e.nombre)}</b><small>${esc(e.provincia)}</small></span></div></td>
      <td>${esc(e.negocio)}<br><small class="nota">${esc(e.categoria)}</small></td>
      <td><span class="badge ${e.riesgo?.nivel === 1 ? 'ok' : e.riesgo?.nivel === 2 ? 'warn' : 'danger'}"><i></i>${(SEM[e.riesgo?.etiqueta] || ['—'])[0]}</span></td>
      <td class="num">${e.resumen?.margen ?? '—'}%</td>
      <td class="num">${e.resumen?.avancePago ?? '—'}% / ${e.resumen?.avanceTiempo ?? '—'}%</td>
      <td class="num">${e.resumen?.diasRestantes ?? '—'}</td>
      <td><small>${esc(e.riesgo?.alertas?.[0]?.titulo || 'Sin alertas')}</small></td></tr>`).join('')}</tbody></table>`
    : vacio('busca', 'Sin emprendedores en este filtro', 'Ningún negocio de la cartera cumple el criterio seleccionado.',
        '<button class="btn chico" id="btnTodosCartera">Ver todos</button>');
  const bta = $('#btnTodosCartera'); if (bta) bta.onclick = () => { filtroCartera = 'todos'; cargarCartera(); };
  document.querySelectorAll('#tablaCartera tr.fila-click').forEach(tr => tr.onclick = () => abrirEmprendedor(tr.dataset.id));
}

/* ---------- Agente: perfil y línea de tiempo del emprendedor ---------- */
function abrirEmprendedor(id) {
  EMP_SEL = id; lineaCompleta = false;
  if (location.hash === '#emprendedor') cargarPerfil(id); else location.hash = 'emprendedor';
}

/** Meta del préstamo: avance de pago contra avance del plazo, y el ritmo que hace falta. */
const metaHTML = (m, e) => `
  <p><b>${m.avancePago}%</b> de la deuda pagada <small>(${bal(m.abonos)} de ${bal(m.totalAPagar)})</small></p><div class="barra"><i style="width:${Math.min(100, m.avancePago)}%"></i></div>
  <p style="margin-top:14px"><b>${m.avanceTiempo}%</b> del plazo transcurrido <small>(${m.transcurridos} de ${m.totalDias} días)</small></p><div class="barra tiempo"><i style="width:${Math.min(100, m.avanceTiempo)}%"></i></div>
  <dl class="campos" style="margin-top:16px">
    <dt>Ritmo actual</dt><dd>${bal(m.utilidadSemanalActual)} de utilidad por semana</dd>
    <dt>Ritmo necesario</dt><dd>${bal(m.utilidadSemanalNecesaria)} por semana para cerrar a tiempo</dd>
    <dt>Cuota mensual</dt><dd>${bal(e.cuotaMensual)}</dd>
  </dl>`;

/** Pinta la línea de tiempo con los eventos ya cargados en LINEA. */
function pintarLinea() {
  const cont = $('#lineaEmp'); if (!cont) return;
  if (!LINEA.length) {
    cont.innerHTML = vacio('reloj', 'Sin historial todavía', 'Aquí aparecen el desembolso, los abonos, los tickets y las sesiones de acompañamiento.');
    return;
  }
  const LIM = 8;
  const vis = lineaCompleta ? LINEA : LINEA.slice(0, LIM);
  cont.innerHTML = `<div class="linea">${vis.map(h => `<div class="hito ${h.tono}${h.futuro ? ' futuro' : ''}">
      <span class="punto-hito">${svgIc(IC[ICONO_HITO[h.tipo]] || IC.reloj)}</span>
      <span class="cuando">${fechaLarga(h.fecha)}${h.futuro ? ' · pendiente' : ''}</span>
      <b>${esc(h.titulo)}</b><p>${esc(h.detalle)}</p></div>`).join('')}</div>
    ${LINEA.length > LIM ? `<button class="btn chico linea-mas" id="btnMasLinea">${lineaCompleta ? 'Ver solo lo reciente' : `Ver ${LINEA.length - LIM} eventos anteriores`}</button>` : ''}`;
  const b = $('#btnMasLinea'); if (b) b.onclick = () => { lineaCompleta = !lineaCompleta; pintarLinea(); };
}

async function cargarPerfil(id) {
  if (!id) { location.hash = 'cartera'; return; }
  const cont = $('#perfilEmp');
  cont.innerHTML = cargandoRejilla(4) + '<div class="mt">' + cargandoBloque(3, true) + '</div>';
  let d, movs, linea;
  try {
    [d, movs, linea] = await Promise.all([
      fetch('/api/emprendedores/' + id).then(r => r.json()),
      fetch(`/api/emprendedores/${id}/movimientos`).then(r => r.json()),
      fetch(`/api/emprendedores/${id}/linea`).then(r => r.json())
    ]);
  } catch {
    cont.innerHTML = vacio('alerta', 'No se pudo cargar el perfil', 'Revisa que el servidor local siga activo y vuelve a intentar.');
    return;
  }
  LINEA = linea;
  const m = d.metricas, r = d.riesgo, e = m.emprendedor;
  // Presentación determinista del estado: el score resume el semáforo, no lo sustituye.
  const health = Math.max(0, 100 - Math.min(90, r.puntaje * 12 + (r.nivel === 3 ? 18 : r.nivel === 2 ? 8 : 0)));
  const estadoHealth = r.nivel === 3 ? 'Requiere intervención' : r.nivel === 2 ? 'Requiere seguimiento' : 'Negocio estable';
  const kp = (v, l, pie = '') => `<div class="kpi"><div class="rot">${l}</div><div class="val" style="font-size:24px;line-height:30px">${v}</div>${pie ? `<div class="pie">${pie}</div>` : ''}</div>`;
  const abiertos = d.tickets.filter(t => t.estado !== 'cerrado');

  cont.innerHTML = `
    <div class="tarjeta">
      <div class="perfil-cab">
        <span class="av-grande">${ini(e.nombre)}</span>
        <div class="datos">
          <h2>${esc(e.nombre)}</h2>
          <p class="sub" style="margin:3px 0 0">${esc(e.negocio)} · ${esc(e.categoria)} · ${esc(e.provincia)}</p>
          <div class="contacto">
            <span>Cédula ${esc(e.cedula)}</span><span>Tel. ${esc(e.telefono)}</span><span>WhatsApp ${esc(e.whatsapp)}</span>
            ${e.redes ? `<span>${esc(e.redes)}</span>` : ''}
            <span>${esc(e.conectividad === 'sin_datos' ? 'Sin datos en el celular' : 'Conectividad intermitente')}</span>
          </div>
        </div>
        <div class="perfil-acciones">${enlacesContacto(e)}${abiertos.length ? `<button class="btn chico primario" data-ir-ticket="${esc(abiertos[0].id)}">Atender ${esc(abiertos[0].id)}</button>` : ''}</div>
      </div>
    </div>

    <div class="semaforo ${r.etiqueta} mt"><div><span class="luz">${SEM[r.etiqueta][0]}</span>
      <div>${SEM[r.etiqueta][1]}</div>
      ${r.alertas.length ? `<ul>${r.alertas.map(a => `<li><b>${esc(a.titulo)}.</b> ${esc(a.detalle)}</li>`).join('')}</ul>` : ''}
      ${r.fortalezas.length ? `<ul>${r.fortalezas.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</div></div>

    <div class="kpis">${kp(`${health} / 100`, 'Health Score', estadoHealth)}${kp(bal(m.ventas), 'Ventas acumuladas')}${kp(bal(m.utilidad), 'Utilidad', `margen ${m.margen}%`)}${kp(bal(m.saldoDeuda), 'Saldo pendiente', `de ${bal(m.totalAPagar)}`)}${kp(m.diasRestantes, 'Días de plazo', `${m.avanceTiempo}% transcurrido`)}</div>

    <div class="rejilla-2">
      <div class="tarjeta"><div class="cab-tarjeta"><h3>Ventas y gastos por semana</h3>
        <div class="leyenda"><span><i style="background:var(--ok)"></i>Ventas</span><span><i style="background:var(--danger)"></i>Gastos</span></div></div>
        <div class="lienzo" id="gPerfil"></div></div>
      <div class="tarjeta"><div class="cab-tarjeta"><h3>Meta del préstamo</h3></div>${metaHTML(m, e)}</div>
    </div>

    <div class="rejilla-2 mt">
      <div class="tarjeta">
        <div class="cab-tarjeta"><h3>Línea de tiempo del caso</h3><span class="badge neutro">${LINEA.length} eventos</span></div>
        <div id="lineaEmp"></div>
      </div>
      <div>
        <div class="tarjeta">
          <div class="cab-tarjeta"><h3>Tickets</h3><a class="enlace" href="#tickets">Ir a la bandeja</a></div>
          ${d.tickets.length ? d.tickets.map(t => `<div class="tk p${t.prioridad} est-${esc(t.estado)}" data-ir-ticket="${esc(t.id)}">
              <div class="cab"><span>${esc(t.id)} · ${hace(t.creado)}</span><span class="badge ${t.prioridad === 3 ? 'danger' : t.prioridad === 2 ? 'warn' : 'ok'}"><i></i>${PRIO[t.prioridad][0]}</span></div>
              <b>${esc(t.asunto)}</b>
              <div class="pie-tk"><span class="badge ${ESTADO_TK[t.estado][1]}">${ESTADO_TK[t.estado][0]}</span><small class="nota">${esc(t.agente || 'sin asignar')}</small></div>
            </div>`).join('')
            : vacio('chat', 'Sin tickets', 'Este emprendedor no ha pedido asistencia.')}
        </div>
        <div class="tarjeta mt">
          <div class="cab-tarjeta"><h3>Plan de acompañamiento</h3></div>
          ${d.sesiones.length ? stepperHTML(d.sesiones)
            : vacio('cal', 'Sin plan agendado', 'El plan de tres sesiones se agenda desde el ticket, en la bandeja de asistencia.',
                '<a class="btn chico" href="#tickets">Ir a la bandeja</a>')}
        </div>
      </div>
    </div>

    <div class="tarjeta mt"><div class="cab-tarjeta"><h3>Últimos movimientos</h3><span class="nota">${m.movimientos} registrados en total</span></div>
      <div class="tabla-envoltura">${movs.length ? `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th class="num">Monto</th></tr></thead><tbody>
        ${movs.slice(0, 15).map(x => `<tr><td>${dia(x.fecha)}</td><td><span class="badge ${x.tipo === 'venta' ? 'ok' : x.tipo === 'gasto' ? 'danger' : 'marca'}">${x.tipo}</span></td><td>${esc(x.concepto)}${x.origen === 'foto' ? ' <small>(por foto)</small>' : ''}</td><td class="num">${bal(x.monto)}</td></tr>`).join('')}</tbody></table>`
        : vacio('libro', 'Sin movimientos', 'El emprendedor todavía no ha registrado ventas ni gastos.')}</div></div>`;

  barChart($('#gPerfil'), m.semanas.map(x => ({ et: dia(x.desde).split(' ')[0], a: x.ventas, b: x.gastos })));
  pintarLinea();
  conectarStepper(cont, () => cargarPerfil(id));
  cont.querySelectorAll('[data-ir-ticket]').forEach(b => b.onclick = () => { tkSel = b.dataset.irTicket; location.hash = 'tickets'; });
}

/** Stepper del plan de tres sesiones. Con `editable` se puede marcar, anotar y reprogramar. */
function stepperHTML(sesiones, editable = true) {
  const orden = [...sesiones].sort((a, b) => a.n - b.n);
  const hechas = orden.filter(s => s.estado === 'realizada').length;
  const idxActual = orden.findIndex(s => s.estado !== 'realizada');
  const hoy = new Date().toISOString().slice(0, 10);
  return `<div class="avance-plan"><b>${hechas} de ${orden.length} sesiones realizadas</b>
      <div class="barra"><i style="width:${Math.round((hechas / orden.length) * 100)}%"></i></div>
      <span>${idxActual < 0 ? 'Plan completado' : 'Sigue: ' + esc(orden[idxActual].titulo)}</span></div>
    <div class="stepper">${orden.map((s, i) => {
      const hecho = s.estado === 'realizada';
      const actual = !hecho && i === idxActual;
      const atrasada = !hecho && s.fecha < hoy;
      return `<div class="paso ${hecho ? 'hecho' : actual ? 'actual' : ''}">
        <div class="bola">${hecho ? svgIc(IC.check) : s.n}</div>
        <b>${esc(s.titulo)}</b><span class="objetivo">${esc(s.objetivo)}</span>
        <span class="cuando-paso">${dia(s.fecha)} · <b class="${atrasada ? 'delta down' : ''}">${hecho ? 'realizada' : atrasada ? 'atrasada' : 'pendiente'}</b></span>
        ${s.notas ? `<span class="nota-guardada"><b>Nota:</b> ${esc(s.notas)}</span>` : ''}
        ${editable ? `<div class="acciones-paso">
            <button class="btn chico${actual ? ' primario' : ''}" data-ses="${s.id}" data-estado="${hecho ? 'pendiente' : 'realizada'}">${hecho ? 'Deshacer' : 'Marcar realizada'}</button>
            <button class="btn chico" data-abrir-nota="${s.id}">${s.notas ? 'Editar' : 'Anotar'}</button>
          </div>
          <div class="notas-paso" id="nota-${s.id}" hidden>
            <label for="txt-${s.id}">Nota de la sesión</label><textarea id="txt-${s.id}">${esc(s.notas)}</textarea>
            <label for="fec-${s.id}">Reprogramar</label><input type="date" id="fec-${s.id}" value="${esc(s.fecha)}">
            <button class="btn chico primario" data-guardar-ses="${s.id}" style="margin-top:8px">Guardar</button>
          </div>` : ''}
      </div>`;
    }).join('')}</div>`;
}

/** Conecta los botones del stepper dentro de `raiz`; `alTerminar` vuelve a pintar la vista. */
function conectarStepper(raiz, alTerminar) {
  const patch = (id, cuerpo) => fetch('/api/sesiones/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const zona = document.querySelector('.zona');
  const repintar = async () => { const y = zona.scrollTop; await alTerminar(); zona.scrollTop = y; };
  raiz.querySelectorAll('[data-ses]').forEach(b => b.onclick = async () => {
    b.disabled = true; await patch(b.dataset.ses, { estado: b.dataset.estado }); repintar();
  });
  raiz.querySelectorAll('[data-abrir-nota]').forEach(b => b.onclick = () => {
    const p = raiz.querySelector('#nota-' + b.dataset.abrirNota);
    p.hidden = !p.hidden; if (!p.hidden) p.querySelector('textarea').focus();
  });
  raiz.querySelectorAll('[data-guardar-ses]').forEach(b => b.onclick = async () => {
    const id = b.dataset.guardarSes; b.disabled = true;
    await patch(id, { notas: raiz.querySelector('#txt-' + id).value, fecha: raiz.querySelector('#fec-' + id).value });
    repintar();
  });
}

/* ---------- Agente: bandeja de tickets ---------- */
const VACIO_TK = {
  abierto: ['Ningún ticket sin tomar', 'Todos los casos que abrieron los emprendedores ya tienen un agente asignado.'],
  en_atencion: ['Ningún caso en atención', 'Toma un ticket abierto para empezar el acompañamiento.'],
  cerrado: ['Ningún caso cerrado todavía', 'Cuando cierres un caso con su resultado aparecerá aquí, con todo su historial.'],
  '': ['La bandeja está vacía', 'Aún no hay solicitudes de asistencia. El emprendedor las abre desde su portal.']
};

async function cargarTickets() {
  const lista = $('#listaTickets');
  if (!lista.children.length) lista.innerHTML = cargandoBloque(4, true);
  const [t, conteo] = await Promise.all([
    fetch('/api/tickets').then(r => r.json()),
    fetch('/api/tickets/conteo').then(r => r.json())
  ]);
  $('#filtrosTk').innerHTML = [['abierto', 'Abiertos'], ['en_atencion', 'En atención'], ['cerrado', 'Cerrados'], ['', 'Todos']]
    .map(([f, n]) => `<button class="${filtroTk === f ? 'activa' : ''}" data-f="${f}">${n}<span class="n">${conteo[f || 'todos']}</span></button>`).join('');
  document.querySelectorAll('#filtrosTk button').forEach(b => b.onclick = () => { filtroTk = b.dataset.f; cargarTickets(); });

  const vis = t.filter(x => !filtroTk || x.estado === filtroTk);
  lista.className = 'lista-bandeja';
  lista.innerHTML = vis.length ? vis.map(x => `<div class="tk p${x.prioridad} est-${esc(x.estado)} ${tkSel === x.id ? 'sel' : ''}" data-id="${x.id}">
    <div class="cab"><span>${esc(x.id)} · ${esc(x.emprendedor?.provincia || '')}</span><span class="badge ${x.prioridad === 3 ? 'danger' : x.prioridad === 2 ? 'warn' : 'ok'}"><i></i>${PRIO[x.prioridad][0]}</span></div>
    <b>${esc(x.emprendedor?.nombre || '')} — ${esc(x.asunto)}</b>
    <p>${esc((x.mensaje || '').slice(0, 100))}…</p>
    <p style="margin-top:5px"><small>${esc(x.emprendedor?.negocio || '')} · semáforo ${esc(x.riesgo || '—')} · ${x.diasRestantes ?? '—'} días de plazo</small></p>
    <div class="pie-tk"><span class="badge ${ESTADO_TK[x.estado][1]}">${ESTADO_TK[x.estado][0]}${x.agente ? ' · ' + esc(x.agente) : ''}</span><small class="nota">${hace(x.creado)}</small></div></div>`).join('')
    : vacio('bandeja', VACIO_TK[filtroTk][0], VACIO_TK[filtroTk][1],
        filtroTk ? `<button class="btn chico" id="btnVerTodos">Ver todos los tickets</button>` : '');
  const bt = $('#btnVerTodos'); if (bt) bt.onclick = () => { filtroTk = ''; cargarTickets(); };
  document.querySelectorAll('.tk[data-id]').forEach(d => d.onclick = () => { tkSel = d.dataset.id; cargarTickets(); });

  // La selección sobrevive a los cambios de filtro: el detalle siempre acompaña a la lista.
  if (tkSel && t.some(x => x.id === tkSel)) verTicket(tkSel);
  else if (!tkSel) $('#detalleTicket').innerHTML = vacio('busca', 'Sin ticket seleccionado',
    'Elige un ticket para ver el caso completo, generar el guion de la llamada y agendar el acompañamiento.');
}

/** Historial del caso como hitos: apertura, toma, seguimientos y cierre. */
function historialTicket(t) {
  const ev = [{ fecha: t.creado, tono: 'atencion', tipo: 'ticket', titulo: 'El emprendedor abrió el caso', detalle: t.asunto }];
  const tomado = t.tomado || (t.estado !== 'abierto' ? t.actualizado : null);
  if (tomado) ev.push({ fecha: tomado, tono: 'marca', tipo: 'toma', titulo: 'Caso tomado', detalle: t.agente || 'Agente de programa' });
  for (const r of t.respuestas || []) ev.push({ fecha: r.fecha, tono: 'marca', tipo: 'seguimiento', titulo: 'Seguimiento de ' + r.autor, detalle: r.texto });
  if (t.estado === 'cerrado') ev.push({ fecha: t.cerrado || t.actualizado, tono: 'ok', tipo: 'cierre', titulo: 'Caso cerrado', detalle: t.resultado || 'Caso atendido' });
  ev.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return `<div class="linea">${ev.map(h => `<div class="hito ${h.tono}">
      <span class="punto-hito">${svgIc(IC[ICONO_HITO[h.tipo]] || IC.reloj)}</span>
      <span class="cuando">${fech(h.fecha)}</span><b>${esc(h.titulo)}</b><p>${esc(h.detalle)}</p></div>`).join('')}</div>`;
}

async function verTicket(id) {
  const caja = $('#detalleTicket');
  const t = await fetch('/api/tickets/' + id).then(r => r.json());
  if (t.error) { caja.innerHTML = vacio('alerta', 'Ticket no encontrado', 'Puede haber sido eliminado al regenerar los datos.'); return; }
  const m = t.metricas, r = t.riesgo, e = t.emprendedor;
  const [rotEstado, colorEstado] = ESTADO_TK[t.estado];
  caja.innerHTML = `
    <div class="encabezado-vista"><div><h3 style="margin:0">${esc(t.id)} · ${esc(t.asunto)}</h3>
      <p class="sub" style="margin:4px 0 0">${esc(e.nombre)} — ${esc(e.negocio)} · ${esc(e.provincia)}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="badge ${colorEstado}">${rotEstado}</span>
        <span class="badge ${t.prioridad === 3 ? 'danger' : t.prioridad === 2 ? 'warn' : 'ok'}"><i></i>prioridad ${PRIO[t.prioridad][0]}</span></div></div>
    <p class="nota" style="margin-top:-12px">Abierto ${hace(t.creado).toLowerCase()} · ${t.agente ? 'atendido por ' + esc(t.agente) : 'sin agente asignado'}${t.estado === 'cerrado' ? ' · cerrado ' + fech(t.cerrado || t.actualizado) : ''}</p>
    <div class="contacto"><span>Tel. ${esc(e.telefono)}</span><span>WhatsApp ${esc(e.whatsapp)}</span>${e.redes ? `<span>${esc(e.redes)}</span>` : ''}</div>
    <div class="acciones">${enlacesContacto(e)}<button class="btn chico" id="btnVerPerfil">Ver perfil completo</button></div>
    ${t.estado === 'cerrado' && t.resultado ? `<div class="motivo obs" style="margin-top:14px;border-left-color:var(--ok);background:var(--ok-soft)"><strong>Resultado del caso</strong>${esc(t.resultado)}</div>` : ''}
    <div class="motivo obs" style="margin-top:14px"><strong>Por qué esta prioridad</strong>${t.motivosPrioridad.map(esc).join('<br>')}</div>
    <div class="tarjeta mt"><div class="cab-tarjeta"><h3>Lo que escribió el emprendedor</h3></div><p style="margin:0">${esc(t.mensaje)}</p></div>
    <div class="semaforo ${r.etiqueta}" style="margin-top:14px"><div><span class="luz">${SEM[r.etiqueta][0]}</span>
      ${r.alertas.length ? `<ul>${r.alertas.map(a => `<li><b>${esc(a.titulo)}.</b> ${esc(a.detalle)}</li>`).join('')}</ul>` : `<div>${SEM[r.etiqueta][1]}</div>`}</div></div>
    <div class="kpis">${[[bal(m.ventas), 'Ventas'], [m.margen + '%', 'Margen'], [m.avancePago + '% / ' + m.avanceTiempo + '%', 'Pago / plazo'], [bal(m.saldoDeuda), 'Saldo']]
      .map(([v, l]) => `<div class="kpi"><div class="rot">${l}</div><div class="val" style="font-size:22px;line-height:28px">${v}</div></div>`).join('')}</div>
    <div class="acciones">
      ${t.estado === 'abierto' ? `<button class="btn primario" id="btnTomar">Tomar el caso</button>` : ''}
      <button class="btn ${t.estado === 'abierto' ? '' : 'primario'}" id="btnGuion">${t.guion ? 'Regenerar guion' : 'Generar guion de asesoría'}</button>
      ${t.sesiones.length ? '' : `<button class="btn" id="btnSesiones">Agendar 3 sesiones</button>`}
      ${t.estado === 'cerrado' ? `<button class="btn" id="btnReabrir">Reabrir caso</button>` : `<button class="btn" id="btnCerrar">Cerrar caso</button>`}
    </div>
    <form class="tarjeta mt" id="formCierre" hidden>
      <label for="txtResultado">¿Cómo terminó el caso?</label>
      <textarea id="txtResultado" required placeholder="Ej: se acordó plan de pago de B/.60 quincenales y se entregó el material de finanzas."></textarea>
      <div class="acciones"><button class="btn primario" type="submit">Confirmar cierre</button><button class="btn" type="button" id="btnCancelarCierre">Cancelar</button></div>
    </form>
    <div id="zonaGuion">${t.guion ? tarjetaGuion(t.guion.texto, t.guion.fuentes, t.guion.generado) : ''}</div>
    <div class="tarjeta mt"><div class="cab-tarjeta"><h3>Plan de acompañamiento</h3></div>
      ${t.sesiones.length ? stepperHTML(t.sesiones)
        : vacio('cal', 'Sin sesiones agendadas', 'Agenda el plan de tres pasos: diagnóstico, material y plan, seguimiento.')}</div>
    <div class="tarjeta mt"><div class="cab-tarjeta"><h3>Historial del caso</h3></div>
      ${historialTicket(t)}
      ${t.estado !== 'cerrado' ? `<form class="respuesta-form" id="formRespuesta"><label for="textoRespuesta">Registrar seguimiento</label><textarea id="textoRespuesta" required placeholder="Resume el contacto, acuerdos y próxima acción…"></textarea><button class="btn primario" type="submit">Guardar seguimiento</button></form>` : ''}
    </div>`;

  const post = (ruta, cuerpo = {}) => fetch(`/api/tickets/${id}/${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const bt = $('#btnTomar'); if (bt) bt.onclick = async () => { bt.disabled = true; await post('tomar', { agente: 'Agente de programa' }); cargarTickets(); };
  const fr = $('#formRespuesta'); if (fr) fr.onsubmit = async ev => { ev.preventDefault(); const texto = $('#textoRespuesta').value.trim(); if (!texto) return; await post('responder', { autor: 'Agente de programa', texto }); verTicket(id); };
  const bs = $('#btnSesiones'); if (bs) bs.onclick = async () => { bs.disabled = true; await post('sesiones', {}); verTicket(id); };
  const br = $('#btnReabrir'); if (br) br.onclick = async () => { br.disabled = true; await post('reabrir', { motivo: 'el caso volvió a requerir atención' }); cargarTickets(); };
  const bp = $('#btnVerPerfil'); if (bp) bp.onclick = () => abrirEmprendedor(e.id);
  const bc = $('#btnCerrar'), fc = $('#formCierre');
  if (bc) bc.onclick = () => { fc.hidden = false; $('#txtResultado').focus(); };
  if (fc) {
    $('#btnCancelarCierre').onclick = () => { fc.hidden = true; };
    fc.onsubmit = async ev => { ev.preventDefault(); await post('cerrar', { resultado: $('#txtResultado').value.trim() }); cargarTickets(); };
  }
  conectarStepper(caja, () => verTicket(id));
  const bg = $('#btnGuion'); if (bg) bg.onclick = async () => {
    bg.disabled = true; bg.textContent = 'Generando…';
    const z = $('#zonaGuion'); z.innerHTML = `<div class="tarjeta mt"><p class="nota" id="estGuion">Revisando sus números y el material del programa…</p><div class="guion" id="txtGuion"></div></div>`;
    let txt = '', avisoG = 'Revisando sus números y el material del programa…', enTexto = false;
    const t0 = Date.now();
    const cron = setInterval(() => {
      if (!enTexto && $('#estGuion')) $('#estGuion').textContent = `${avisoG} · ${Math.round((Date.now() - t0) / 1000)} s en este equipo, sin internet`;
    }, 1000);
    try {
      await leerSSE(`/api/tickets/${id}/guion`, {}, e => {
        if (e.tipo === 'material') avisoG = e.usadas ? `Usando ${e.usadas} fragmento(s) del material…` : 'Sin material específico…';
        else if (e.tipo === 'pensando') avisoG = `Preparando el guion (${e.tokens} tokens)…`;
        else if (e.tipo === 'texto') { enTexto = true; txt += e.delta; $('#txtGuion').textContent = txt; }
        else if (e.tipo === 'fin') z.innerHTML = tarjetaGuion(e.resultado.respuesta, e.resultado.fuentes, new Date().toISOString(), e.resultado.metricas);
        else if (e.tipo === 'error') { enTexto = true; $('#estGuion').textContent = 'Error: ' + e.mensaje; }
      });
    } finally { clearInterval(cron); bg.disabled = false; bg.textContent = t.guion ? 'Regenerar guion' : 'Generar guion de asesoría'; }
  };
}

function tarjetaGuion(texto, fuentes = [], generado, met) {
  return `<div class="tarjeta mt"><div class="encabezado-vista"><h3 style="margin:0">Guion de la llamada</h3>
      <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('gTxt').textContent)">Copiar</button></div>
    <div class="guion" id="gTxt">${esc(texto)}</div>
    ${fuentes.length ? `<p class="nota">Material citado: ${[...new Set(fuentes.map(f => f.fuente))].map(esc).join(', ')}</p>` : ''}
    <p class="medidas">Generado localmente${generado ? ' · ' + fech(generado) : ''}${met ? ` · ${(met.totalMs / 1000).toFixed(1)} s · ${met.tokensPorSegundo ?? '?'} tok/s` : ''}</p></div>`;
}

/* ---------- Evidencia ---------- */
async function cargarEvidencia() {
  if (!$('#evidencia').children.length) $('#evidencia').innerHTML = cargandoRejilla(4);
  const { rendimiento } = await fetch('/api/evidencia').then(r => r.json());
  if (!rendimiento) {
    $('#evidencia').innerHTML = vacio('pulso', 'Sin mediciones todavía',
      'Cada inferencia local queda registrada con dispositivo, tokens, TTFT y throughput. Usa el mentor o genera un guion para producir la primera.',
      '<a class="btn chico primario" href="#tickets">Generar un guion</a>');
    return;
  }
  const kv = (v, l) => `<div class="kpi"><div class="rot">${l}</div><div class="val" style="font-size:24px;line-height:30px">${v}</div></div>`;
  $('#evidencia').innerHTML = `<div class="kpis">${kv(rendimiento.inferencias, 'Inferencias locales')}${kv((rendimiento.ttftPromedioMs ?? '?') + ' ms', 'Primer token, promedio')}${kv(rendimiento.tokensPorSegundoPromedio ?? '?', 'Tokens por segundo')}${kv(esc(rendimiento.dispositivo || '?'), 'Dispositivo de inferencia')}</div>
    ${rendimiento.porOperacion?.length ? `<h3 class="mt">Por operación</h3><div class="tabla-envoltura"><table><thead><tr><th>Operación</th><th class="num">Veces</th><th class="num">tok/s</th><th class="num">Tiempo medio</th></tr></thead><tbody>
      ${rendimiento.porOperacion.map(o => `<tr><td>${esc(o.operacion)}</td><td class="num">${o.n}</td><td class="num">${o.tokPorSeg}</td><td class="num">${(o.msProm / 1000).toFixed(1)} s</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="nota mt">Registro por inferencia en <code>logs/rendimiento.jsonl</code>: modelo, cuantización, dispositivo, tokens, TTFT y throughput.</p>`;
}

/* ---------- Arranque ---------- */
(async () => {
  let t = 'claro'; try { t = localStorage.getItem('impulsa-tema') || 'claro'; } catch {}
  aplicarTema(t);
  await cargarEmps(); estado(); red();
  cara('ag');
  mostrar(location.hash.slice(1) || 'dashboard');
})();
