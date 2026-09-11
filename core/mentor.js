// Mentor local: responde al emprendedor con el material del programa + SUS números.
// Y genera el guion de asesoría para el agente. El modelo nunca inventa cifras: se le entregan calculadas.
import { generar } from './motor.js';
import { buscar } from './rag.js';

const UMBRAL = 0.5;
const palabras = t => new Set((t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-zñ]{5,}/g) || []));

/**
 * Lecturas ya interpretadas de las cifras. El modelo compacto se equivoca comparando
 * números; aquí se le entrega la conclusión hecha para que solo tenga que redactarla.
 */
function lecturas(m) {
  const l = [];
  l.push(m.utilidad < 0
    ? `El negocio pierde dinero: los gastos (B/.${m.gastos}) superan las ventas (B/.${m.ventas}) en B/.${Math.abs(m.utilidad).toFixed(2)}.`
    : `El negocio deja ganancia: las ventas (B/.${m.ventas}) superan los gastos (B/.${m.gastos}) en B/.${m.utilidad}.`);
  l.push(m.margen >= 25 ? `El margen de ${m.margen}% es bueno.`
    : m.margen >= 15 ? `El margen de ${m.margen}% es aceptable, pero mejorable.`
    : `El margen de ${m.margen}% es BAJO: está por debajo del 15% recomendado.`);
  l.push(m.utilidadSemanalActual >= m.utilidadSemanalNecesaria
    ? `El ritmo alcanza: genera B/.${m.utilidadSemanalActual} por semana y necesita B/.${m.utilidadSemanalNecesaria}.`
    : `El ritmo NO alcanza: genera B/.${m.utilidadSemanalActual} por semana y necesita B/.${m.utilidadSemanalNecesaria}.`);
  l.push(m.avancePago >= m.avanceTiempo
    ? `El pago va al día: ${m.avancePago}% abonado con ${m.avanceTiempo}% del plazo transcurrido.`
    : `El pago va atrasado frente al plazo: ${m.avancePago}% abonado con ${m.avanceTiempo}% del plazo transcurrido.`);
  if (m.tendencia !== null) l.push(m.tendencia >= 0
    ? `Las ventas subieron ${m.tendencia}% en las últimas 4 semanas.`
    : `Las ventas bajaron ${Math.abs(m.tendencia)}% en las últimas 4 semanas.`);
  if (m.diasSinVender >= 14) l.push(`Lleva ${m.diasSinVender} días sin registrar una venta.`);
  return l;
}

function resumenNumeros(m, r) {
  if (!m) return '';
  return `NÚMEROS REALES DE SU NEGOCIO (usa solo estas cifras, no inventes otras):
- Negocio: ${m.emprendedor.negocio || 'sin describir'} (${m.emprendedor.categoria})
- Préstamo: B/.${m.emprendedor.montoPrestamo} a ${m.emprendedor.plazoMeses} meses; cuota B/.${m.emprendedor.cuotaMensual}
- Ventas acumuladas B/.${m.ventas} · gastos B/.${m.gastos} · utilidad B/.${m.utilidad}
- Margen de ganancia sobre ventas: ${m.margen}% (es el margen del negocio, NO una tasa de interés)
- Abonado B/.${m.abonos} de B/.${m.totalAPagar} (${m.avancePago}% de la deuda); quedan ${m.diasRestantes} días (${m.avanceTiempo}% del plazo transcurrido)
- Utilidad semanal actual B/.${m.utilidadSemanalActual}; necesaria para cerrar a tiempo B/.${m.utilidadSemanalNecesaria}
- Días sin registrar ventas: ${m.diasSinVender}${m.tendencia !== null ? ` · tendencia de ventas ${m.tendencia}%` : ''}
- Estado del semáforo: ${r?.etiqueta || 'sin calcular'}${r?.alertas?.length ? '; alertas: ' + r.alertas.map(a => a.titulo).join('; ') : ''}

LECTURA YA HECHA DE ESAS CIFRAS (es correcta; no la contradigas ni rehagas las comparaciones):
${lecturas(m).map(x => '- ' + x).join('\n')}`;
}

const SIS_MENTOR = `Eres un mentor de negocios del programa de microcrédito de un banco panameño. Acompañas a personas que iniciaron un pequeño emprendimiento con un préstamo.
Hablas claro y directo, sin tecnicismos ni anglicismos, como quien explica en una sucursal de pueblo. Tuteas.
Responde exclusivamente en español usando alfabeto latino. No escribas caracteres chinos, japoneses, coreanos ni de otros alfabetos.
Usas SOLO las cifras que se te entregan; nunca inventas montos, tasas ni plazos.
La moneda es el balboa panameño y se escribe B/. (nunca Bs., R$ ni $). No menciones tasas de interés: no se te entrega ninguna.
No propongas reprogramar, refinanciar ni ampliar el préstamo; si hace falta, dile que abra un ticket para que un agente del banco lo evalúe.
Si tienes MATERIAL DEL PROGRAMA, básate en él y cita el fragmento con su número, por ejemplo [1].
Si el tema no está en el material, dilo y da orientación general prudente.
Nunca prometes más crédito, prórrogas ni condonaciones: eso lo decide un agente del banco.
Máximo 8 líneas. Si el caso es grave, cierra invitando a abrir un ticket de asistencia.`;

export async function preguntarMentor(pregunta, { metricas: m, riesgo: r, historial = [] }, onEvento = () => {}) {
  const rag = await buscar(pregunta, 4);
  const pq = palabras(pregunta);
  const fuentes = rag.fragmentos.filter(f => f.score >= UMBRAL && [...palabras(f.texto)].some(w => pq.has(w)));
  onEvento({ tipo: 'material', usadas: fuentes.length });

  const contexto = fuentes.map((f, i) => `[${i + 1}] (${f.fuente}) ${f.texto}`).join('\n\n');
  const previos = historial.slice(-4).map(t => ({ role: t.rol === 'usuario' ? 'user' : 'assistant', content: t.texto }));
  const contenido = `${contexto ? `MATERIAL DEL PROGRAMA:\n${contexto}\n\n` : ''}${resumenNumeros(m, r)}\n\nPREGUNTA DEL EMPRENDEDOR: ${pregunta}`;

  const res = await generar({ sistema: SIS_MENTOR, mensajes: [...previos, { role: 'user', content: contenido }], etiqueta: 'mentor', onEvento });
  return { ...res, fuentes, conMaterial: fuentes.length > 0 };
}

const SIS_GUION = `Eres asesor senior del programa de microcrédito de un banco panameño. Preparas a un agente para llamar a un emprendedor que pidió asistencia.
Escribes para el agente, no para el cliente. Tono profesional, humano y sin juicio: el objetivo es que la persona logre su meta, no cobrarle.
Responde exclusivamente en español usando alfabeto latino. No escribas caracteres chinos, japoneses, coreanos ni de otros alfabetos.
Usas SOLO las cifras entregadas. La moneda es el balboa panameño y se escribe B/. (nunca Bs., R$ ni $). No menciones tasas de interés: no se te entrega ninguna.
No prometes más crédito, prórrogas ni condonaciones: solo indicas si conviene que el banco las evalúe.
Si tienes MATERIAL DEL PROGRAMA, indica cuál entregar y cita el fragmento con [n].`;

export async function generarGuion({ metricas: m, riesgo: r, ticket, categoriaNombre }, onEvento = () => {}) {
  const consulta = `${categoriaNombre} ${ticket?.mensaje || ''} ${m?.emprendedor?.categoria || ''}`.slice(0, 300);
  const rag = await buscar(consulta, 4);
  const fuentes = rag.fragmentos.filter(f => f.score >= UMBRAL);
  onEvento({ tipo: 'material', usadas: fuentes.length });
  const contexto = fuentes.map((f, i) => `[${i + 1}] (${f.fuente}) ${f.texto}`).join('\n\n');

  const contenido = `${contexto ? `MATERIAL DEL PROGRAMA:\n${contexto}\n\n` : ''}${resumenNumeros(m, r)}

TICKET ${ticket?.id || ''} · categoría: ${categoriaNombre} · prioridad ${ticket?.prioridad === 3 ? 'alta' : ticket?.prioridad === 2 ? 'media' : 'baja'}
Lo que escribió el emprendedor: "${ticket?.mensaje || 'sin mensaje'}"

Prepara el guion de la primera llamada. Responde EXACTAMENTE con este formato:
SITUACIÓN: <dos frases con lo que muestran sus números>
APERTURA: <cómo iniciar la llamada, en primera persona, 2 frases>
PREGUNTAS: <3 preguntas concretas para entender qué pasó>
MATERIAL A ENTREGAR: <qué contenido del programa aplica; cita [n] si hay material>
ACCIONES: <2 o 3 acciones concretas para las próximas dos semanas, con cifras>
A EVALUAR POR EL BANCO: <si conviene arreglo de pago, capital adicional o nada; sin prometer>`;

  const res = await generar({ sistema: SIS_GUION, mensajes: [{ role: 'user', content: contenido }], etiqueta: 'guion-asesoria', onEvento });
  return { ...res, fuentes };
}
