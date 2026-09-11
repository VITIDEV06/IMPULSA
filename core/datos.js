// Almacenamiento local en JSON. Nada sale del equipo.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const RUTA = 'data/impulso.json';
const VACIO = { emprendedores: [], movimientos: [], tickets: [], sesiones: [], agentes: [] };

export function leerBD() {
  if (!existsSync(RUTA)) return structuredClone(VACIO);
  try { return { ...structuredClone(VACIO), ...JSON.parse(readFileSync(RUTA, 'utf8')) }; }
  catch { return structuredClone(VACIO); }
}
export function escribirBD(bd) {
  mkdirSync('data', { recursive: true });
  writeFileSync(RUTA, JSON.stringify(bd, null, 2));
  return bd;
}
export function idCorto(pre = '') { return pre + Math.random().toString(36).slice(2, 8); }
