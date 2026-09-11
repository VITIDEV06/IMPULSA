import { ragDeleteWorkspace } from '@qvac/sdk';
import { iniciarEmbeddings, ingestarCarpeta } from './core/rag.js';
await iniciarEmbeddings();
try { await ragDeleteWorkspace({ workspace: 'material-impulso' }); console.log('[rag] workspace anterior borrado'); }
catch { console.log('[rag] no había workspace previo'); }
await ingestarCarpeta('corpus');
process.exit(0);
