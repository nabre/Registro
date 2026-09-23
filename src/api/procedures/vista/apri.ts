// Porta il registro su una pagina.
//
// Dichiarata `scrittura` benché non scriva niente, come quelle della
// proiezione e come `assistente.stacca`: il `genere` non dice se il file
// cambia, dice se chi chiama da fuori può farlo senza il permesso di scrivere.
// Una riga di comando che spostasse le pagine sullo schermo di chi insegna
// mentre sta facendo lezione è esattamente quel che la sola lettura non deve
// concedere.
//
// Al modello dell'assistente si concede lo stesso, ma per la porta dichiarata:
// `assistente: true`. È la sola procedura che ce l'ha, e la ragione è che non
// tocca l'archivio — `collezioni` vuoto lo dice accanto. Il confine che conta
// resta dov'era: quel che cambia il registro non lo decide un modello.

import { vista } from '../../../actions/view.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, oggetto, opzionale, scelta } from '../../schemas.js'
import { VISTE } from '../common/views.js'

export const procedura = definisci({
  nome: 'vista.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Porta il registro su una pagina, con la cosa da mostrarci dentro',
  azione: 'vista.apri',
  idempotente: true,
  collezioni: [],
  assistente: true,
  ingresso: oggetto({
    vista: scelta(VISTE, {
      aiuto:
        'La pagina da aprire: «lezione» è il registro dell’ora, «corsi» l’elenco dei corsi, ' +
        '«classi» le classi, «valutazioni» i momenti di valutazione, «calendario» l’agenda',
    }),
    // Un id solo e non uno per genere: quale sia lo dice la pagina che si
    // apre, ed è la stessa regola della palette e del widget dell'agenda —
    // `contestoDellElemento` in `ui/main.ts` lo risolve secondo
    // la destinazione. Due campi vorrebbero dire due modi di dire la stessa
    // cosa, e chi chiama da fuori a indovinare quale.
    elementoId: opzionale(identificatore({
      aiuto: 'La cosa da mostrare in quella pagina: l’ora, il corso, la classe, la persona',
    })),
    data: opzionale(iso({
      aiuto: 'Il giorno su cui aprirla: vale per il calendario e per le pagine che ne hanno uno',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(vista['vista.apri'], (i: typeof ingresso) => ({
      tipo: 'vista.apri' as const, ...i,
    }))(ambito, ingresso),
})
