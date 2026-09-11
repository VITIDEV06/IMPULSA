import { loadModel, HEALTHCARE_1_7B_MEDICAL_Q4_K_M, QWEN3_1_7B_INST_Q4, completion } from '@qvac/sdk';
import { appendFileSync, mkdirSync } from 'node:fs';

// Dos modelos del catálogo QVAC del mismo tamaño, elegidos midiendo en el equipo objetivo.
// Por defecto el instruct general; `MODELO=medpsy node server.js` usa el derivado clínico.
const CATALOGO = {
  medpsy: {
    fuente: HEALTHCARE_1_7B_MEDICAL_Q4_K_M,
    nombre: 'QVAC MedPsy-1.7B',
    repo: 'qvac/MedPsy-1.7B-GGUF',
    archivo: 'medpsy-1.7b-q4_k_m-imat.gguf',
    cuantizacion: 'Q4_K_M (imatrix)',
    constanteSdk: 'HEALTHCARE_1_7B_MEDICAL_Q4_K_M'
  },
  qwen: {
    fuente: QWEN3_1_7B_INST_Q4,
    nombre: 'QVAC Qwen3-1.7B Instruct',
    repo: 'unsloth/Qwen3-1.7B-GGUF',
    archivo: 'Qwen3-1.7B-Q4_0.gguf',
    cuantizacion: 'Q4_0',
    constanteSdk: 'QWEN3_1_7B_INST_Q4',
    sinRazonar: '/no_think'
  }
};
const ELEGIDO = CATALOGO[process.env.MODELO] || CATALOGO.qwen;
const { fuente: FUENTE, ...MODELO } = ELEGIDO;

let modelId = null;
let cargaMs = null;

// Algunos modelos compactos pueden intercalar caracteres de otro alfabeto al
// generar en streaming. Nunca deben llegar al emprendedor ni contaminar un guion.
function limpiarRespuesta(texto) {
  return String(texto || '')
    .replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    // La moneda del programa es el balboa: nunca «Bs.», «R$» ni «$» sueltos.
    .replace(/\b(?:Bs|BS|R\$)\.?\s?(?=\d)/g, 'B/.')
    .replace(/(?<![A-Za-z\/])\$\s?(?=\d)/g, 'B/.')
    // También el balboa escrito detrás de la cifra: «341.27 B/» → «B/.341.27».
    .replace(/(\d[\d.,]*)\s?B\/\.?(?![\d.])/g, 'B/.$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

export function estaListo() {
  return modelId !== null;
}

export async function iniciar() {
  if (modelId) return;
  const t0 = Date.now();
  modelId = await loadModel({
    modelSrc: FUENTE,
    modelConfig: { ctx_size: 4096 }
  });
  cargaMs = Date.now() - t0;
  console.log(`[${MODELO.nombre}] listo en ${cargaMs} ms`);
}


/**
 * Generación genérica: system + mensajes → respuesta con métricas.
 * `onEvento` recibe { tipo:'pensando', tokens } y { tipo:'texto', delta }.
 *
 * En Qwen3 el razonamiento en voz alta consume la mayor parte del tiempo (unos 400
 * tokens antes de la primera palabra útil) y aquí no aporta: las cifras y su lectura
 * ya vienen calculadas. `/no_think` lo desactiva; `PENSAR=1` lo vuelve a activar.
 */
export async function generar({ sistema, mensajes, etiqueta = 'generar', onEvento = () => {} }) {
  if (!modelId) await iniciar();
  const cuerpo = MODELO.sinRazonar && process.env.PENSAR !== '1'
    ? mensajes.map((m, i) => i === mensajes.length - 1 && m.role === 'user' ? { ...m, content: m.content + '\n' + MODELO.sinRazonar } : m)
    : mensajes;
  const history = [{ role: 'system', content: sistema }, ...cuerpo];

  const t1 = Date.now();
  let texto = '';
  let tokensPensados = 0;

  const run = completion({ modelId, history, stream: true, captureThinking: true });
  for await (const ev of run.events) {
    if (ev.type === 'thinkingDelta') {
      tokensPensados++;
      if (tokensPensados % 10 === 0) onEvento({ tipo: 'pensando', tokens: tokensPensados });
    } else if (ev.type === 'contentDelta') {
      texto += ev.text;
      onEvento({ tipo: 'texto', delta: ev.text });
    }
  }
  const totalMs = Date.now() - t1;

  const final = await run.final;
  const stats = (await run.stats) || {};

  const pensamiento = final?.thinking?.trim()
    || (texto.match(/<think>([\s\S]*?)<\/think>/) || [])[1]?.trim()
    || null;
  const respuesta = limpiarRespuesta(texto.replace(/<think>[\s\S]*?<\/think>/, ''));

  const metricas = {
    fecha: new Date().toISOString(),
    operacion: etiqueta,
    modelo: MODELO,
    dispositivo: stats.backendDevice ?? 'desconocido',
    cargaModeloMs: cargaMs,
    promptTokens: stats.promptTokens ?? null,
    tokensGenerados: stats.generatedTokens ?? null,
    tokensRespuesta: stats.emittedTokens ?? null,
    tokensRazonamiento: tokensPensados,
    ttftMs: stats.timeToFirstToken != null ? Math.round(stats.timeToFirstToken) : null,
    tokensPorSegundo: stats.tokensPerSecond != null ? +stats.tokensPerSecond.toFixed(2) : null,
    totalMs
  };

  mkdirSync('logs', { recursive: true });
  const ultimoPrompt = mensajes[mensajes.length - 1]?.content ?? '';
  appendFileSync('logs/rendimiento.jsonl', JSON.stringify({ ...metricas, prompt: ultimoPrompt, respuesta, pensamiento }) + '\n');

  return { respuesta, pensamiento, metricas };
}


export { MODELO };
