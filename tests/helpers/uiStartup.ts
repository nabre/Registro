/**
 * Ponte di prova per `tests/ui/*.py`: stesso renderer, dati sintetici, nessun
 * accesso ai registri reali. Lo costruisce `node esbuild.mjs --ui` in
 * `dist-tests/ui.js`.
 */
import '../../src/ui/main.js'
import {
  stato, aggiorna, lezioniInAgenda, MISURE_SFOGLIO, riconvalidaRicordati,
} from '../../src/ui/state.js'
import { PAGINE, gruppiDiPagine, vaiA } from '../../src/ui/pages.js'
import { scegliCorso } from '../../src/ui/context.js'
import { COMANDI_UI } from '../../src/ui/commands.js'
// Le miniature hanno bisogno di una tela vera: `tests/ui/pageBrowser.py` le
// chiama a mano per provare apertura e chiusura di un documento.
import { miniatura, dimentica } from '../../src/ui/components/thumbnails.js'
// Due pezzi di dominio che le prove leggono invece di ricopiarli: le regole dei
// nomi dei documenti e l'elenco delle tipologie delle pendenze.
import { collocazioneDi, percorsoDi } from '../../src/domain/locations.js'
import { FAMIGLIE_TODO } from '../../src/domain/todo.js'
import { registroVuoto, creaAnno, creaClasse, creaMateria, creaCorso, creaLezione, creaAllievo, creaConsegna } from '../../src/domain/factories.js'
const registro = registroVuoto()
const anno = creaAnno('2026-09-01', '2027-06-30')
registro.anni.push(anno)
registro.annoCorrenteId = anno.id
for (const nome of ['DIC4a', 'DIC4b']) {
  const classe = creaClasse(anno.id, nome)
  classe.docenteDiClasse = nome === 'DIC4a'
  classe.allievi.push(creaAllievo('Esempio', 'Anna'))
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, `${nome} · Matematica`)
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)
  registro.lezioni.push(creaLezione(corso.id, '2026-09-14', '08:20', 45))
  // Una pendenza per classe: la pagina delle pendenze ha linguette e conti.
  registro.consegne.push(creaConsegna(corso.id, `Esercizi di ${nome}`, '2026-09-14'))
}
Object.assign(window, {
  prova: {
    stato, aggiorna, MISURE_SFOGLIO, PAGINE, gruppiDiPagine, vaiA, scegliCorso,
    lezioniInAgenda, riconvalidaRicordati,
    COMANDI_UI, registroVuoto, collocazioneDi, percorsoDi, FAMIGLIE_TODO, miniatura, dimentica,
  },
})
aggiorna({ registro, caricato: true, data: '2026-09-14', semestreId: null,
  corsoId: registro.corsi[0].id, classeId: registro.classi[0].id,
  documenti: { corrente: null, elenco: [{ nome: '2025-2026', etichetta: null, percorso: 'C:/esempio/2025-2026.regi', cartella: 'C:/esempio', preferito: true, mancante: false, aperto: false }] },
})
