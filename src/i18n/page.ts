// La lingua di una pagina, adottata mentre il modulo si carica dal
// `registroLingua` messo dal preload (`shell/preload.ts`). Va importato per
// primo (`import '../i18n/page.js'` in `src/ui/main.ts`), così il resto della
// pagina si carica già nella lingua giusta. Nelle prove resta l'italiano.

import { èLingua } from './languages.js'
import { impostaLingua, lingua } from './state.js'

const ricevuta = (globalThis as { registroLingua?: unknown }).registroLingua
if (èLingua(ricevuta)) impostaLingua(ricevuta)

// `lang` guida correttore ortografico, sillabazione CSS e lettori di schermo.
if (typeof document !== 'undefined') document.documentElement.lang = lingua()
