# Impulso — Acompañamiento local para programas de microcrédito

**Track 05 · Reto Caja de Ahorros · Decentralized AI Hackathon, Panamá 2026**

## El problema

Un banco entrega capital semilla a una persona para que inicie un negocio. Muchos no llegan a la meta: pierden el capital, el margen no da, las ventas caen, y al final lo que queda es un préstamo personal impagado y un emprendimiento cerrado. El banco se entera cuando ya hay mora, y la persona pierde la oportunidad de generar su propio empleo. En un país con desempleo alto, cada emprendimiento que sobrevive es empleo que no dependía de una empresa privada.

El acompañamiento no se hace porque no escala: no hay forma de que un agente revise a mano cientos de negocios ni de que un asesor esté disponible para cada emprendedor en una comarca sin señal.

## La solución

Una herramienta de dos caras que corre completa en local, con `@qvac/sdk`.

**Cara del emprendedor.** Registra ventas y gastos (a mano o fotografiando el recibo, que VisionPsy lee en el dispositivo). Ve su margen, su avance de pago contra el avance del plazo y el ritmo que necesita para cerrar la deuda. Consulta a un **mentor que funciona sin internet**, conoce sus números reales y responde con el material educativo del programa, citando de dónde salió. Y cuando algo va mal, abre un **ticket de asistencia** desde la misma aplicación.

**Cara del agente.** Cartera ordenada por riesgo con el motivo de cada alerta. Bandeja de tickets priorizada automáticamente, con los tres estados del caso (abierto, en atención, cerrado), cierre con resultado y reapertura. Al abrir un caso: los números del emprendedor, sus datos de contacto, y un botón que **genera el guion de la llamada** con sus cifras reales y el material que le aplica. Plan de tres sesiones —diagnóstico, material y plan, seguimiento— que se marca, se anota y se reprograma desde la misma pantalla.

El perfil de cada emprendedor reúne su semáforo, sus cifras, la evolución semanal de ventas y gastos, y una **línea de tiempo del caso**: desembolso, abonos, tickets, seguimientos del agente, sesiones y vencimiento del plazo.

Sin call center: el ticket llega a la bandeja, un agente lo toma, contacta por teléfono o WhatsApp y hace seguimiento. Un agente puede atender por prioridad en vez de revisar carteras completas a ciegas.

## Arquitectura: tres capas

1. **Reglas del programa (`core/riesgo.js`, `core/tickets.js`) — determinista.** El semáforo (al día / atención / crítico) y la prioridad del ticket se calculan por código: brecha entre avance de pago y avance de plazo, pérdida operativa, días sin vender, margen, tendencia de ventas, ritmo necesario, cercanía del vencimiento. Cada alerta explica su motivo con la cifra que la disparó. **El modelo no decide el riesgo.**
2. **Material del programa (`core/rag.js` + `corpus/`) — RAG.** Recupera los fragmentos del contenido educativo relevantes, con umbral de relevancia y filtro léxico.
3. **Modelo local (`core/mentor.js` + `core/motor.js`) — QVAC Qwen3-1.7B Instruct.** Redacta la orientación al emprendedor y el guion de asesoría, usando solo las cifras calculadas. No promete crédito, prórrogas ni condonaciones.

Además `core/vision.js` + `core/recibo.js`: VisionPsy-Nano transcribe el recibo y un clasificador determinista extrae comercio, fecha, total y categoría.

## Por qué local es una ventaja, no una restricción

- **El usuario no tiene internet.** El emprendedor está en Darién, Guna Yala o Veraguas, muchas veces sin datos en el celular. Un mentor que solo funciona con conexión no sirve para esta población, que es justamente la que el programa quiere alcanzar.
- **Datos que no salen.** Registros del negocio, ingresos y contacto se procesan en el dispositivo o en la infraestructura del banco. Verificable desconectando la red.
- **Costo cero por consulta.** Un mentor que responde mil veces al día cuesta lo mismo que uno que responde una. Ese es el único modelo económicamente viable para acompañar microcréditos de mil dólares.
- **Trazabilidad.** El semáforo y la prioridad se calculan por reglas escritas, no por la salida variable de un modelo: auditable y explicable al cliente.

## Ejecutar

```bash
npm install
node sembrar.js     # 12 emprendedores sintéticos con historial y tickets
node ingestar.js    # indexa el material del programa
node server.js      # http://localhost:3200
node precalentar.js # opcional: deja los modelos cargados y los guiones ya generados
```

`SIN_VISION=1` omite VisionPsy y la interfaz lo declara en lugar de quedarse cargando. La interfaz es responsive y se maneja desde el celular abriendo `http://IP-DEL-EQUIPO:3200`; no carga fuentes ni recursos remotos, así que se ve igual con el equipo desconectado de internet.

## Datos

Todos sintéticos. `sembrar.js` genera 12 emprendedores ficticios (nombres, cédulas y teléfonos inventados) con ~3,200 movimientos y 10 tickets, distribuidos en los tres estados del semáforo. El material de `corpus/` fue redactado para el hackathon y no es material oficial de ninguna entidad. **No se usan datos reales de clientes de ninguna entidad financiera.**

## Modelos

| Uso | Modelo | Cuantización | Constante del SDK |
|---|---|---|---|
| Mentor y guiones | QVAC Qwen3-1.7B Instruct (`unsloth/Qwen3-1.7B-GGUF`) | Q4_0 | `QWEN3_1_7B_INST_Q4` |
| Mentor y guiones (alternativa) | QVAC MedPsy-1.7B (`qvac/MedPsy-1.7B-GGUF`) | Q4_K_M imatrix | `HEALTHCARE_1_7B_MEDICAL_Q4_K_M` |
| Lectura de recibos | QVAC VisionPsy-Nano-460M | Q4_K_M + mmproj Q8_0 | `VISIONPSY_NANO_460M_MULTIMODAL_Q4_K_M` |
| Búsqueda en material | EmbeddingGemma-300M | Q8_0 | `EMBEDDINGGEMMA_300M_Q8_0` |

Hardware declarado: Intel Core i3-1215U, 24 GB RAM, gráficos integrados Intel UHD, sin GPU dedicada. Registro por inferencia en `logs/rendimiento.jsonl` (modelo, dispositivo, tokens, TTFT, throughput), visible en la pestaña Evidencia.

### Rendimiento medido en ese equipo

| | Qwen3-1.7B Instruct (por defecto) | MedPsy-1.7B |
|---|---|---|
| Carga del modelo | ~5 s | 4,4–14 s |
| Respuesta del mentor | 11–12 s | 55–75 s |
| Guion de asesoría | ~28 s | 100–125 s |
| Throughput | ~15 tok/s | ~14 tok/s |

La diferencia no está en la velocidad de generación —ambos rondan los 14 tokens por segundo— sino en el razonamiento en voz alta: MedPsy produce entre 400 y 800 tokens de razonamiento antes de la primera palabra útil. Qwen3 acepta `/no_think` y lo omite; MedPsy lo ignora. Por eso el mentor usa Qwen3: la orientación al emprendedor tiene que llegar en segundos, no en minutos.

Los dos modelos pertenecen al catálogo del SDK de QVAC y se descargan por su registro (`registry://`); de los 142 modelos del catálogo, 22 están publicados por el org `qvac` y el resto proviene de otros repositorios empaquetados por QVAC —el mismo caso de EmbeddingGemma, que alimenta el RAG. `MODELO=medpsy node server.js` usa el derivado clínico y `PENSAR=1` vuelve a activar el razonamiento en voz alta.

`precalentar.js` genera de antemano los guiones de los tickets prioritarios —quedan guardados en el ticket— y deja el modelo caliente, para no pagar la espera del primer arranque durante una demostración.

## Alcance de esta versión

Fuera de alcance y declarado en la interfaz: autenticación y roles reales (el cambio de cara es un selector), envío real por WhatsApp (se genera el guion y se copia; los botones de contacto abren el marcador o WhatsApp del propio dispositivo), sincronización con los sistemas del banco, aplicación móvil nativa (la interfaz es responsive y se usa desde el navegador del celular contra el equipo local).

## Base preexistente

`@qvac/sdk` 0.19 (Tether), `express` 5. Modelos QVAC descargados por el SDK. La estructura de núcleo (carga de modelos, RAG, capa determinista, registro de métricas, interfaz) se reutiliza de otros proyectos del mismo autor desarrollados dentro de este mismo hackathon. Sin servicios remotos: la aplicación no hace ninguna llamada de red en operación.
