// L'avvio guidato: anno, classe, materia e orario in un giro solo.
//
// Sta in un file suo e non in `forms/course.ts` per una ragione di forma, non
// di contenuto: `forms/class.ts` e `forms/lesson.ts` lo chiamano come
// ripiego quando un anno non c'e' — `richiedeAnno(moduloAvvio)` — e prenderlo
// da `course.ts` chiudeva il cerchio `classe -> corso -> classe`, l'ultimo dei
// quattro cicli di import di `moduli/`. Non e' una finestra di modifica come le
// altre: e' una procedura che ne apre diverse in fila, e il posto di fianco
// alle altre non l'ha mai avuto davvero.

import { minutiInUd, oggi } from '../../domain/dates.js'
import { creaAnnoCorrente, creaClasse, creaMateria, creaRicorrenza } from '../../domain/factories.js'
import { nomeNormalizzato } from '../../domain/validation.js'
import { campo, riga, sezioneModulo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { invia } from '../bridge.js'
import { aggiorna, annoCorrente, stato } from '../state.js'
import { applicaOrario, testo } from './common.js'
import { editorRicorrenze } from './timetable.js'

/**
 * Da registro vuoto a prima lezione sul calendario, in una finestra sola.
 *
 * Il registro ha una catena obbligata — anno, classe, materia, corso, orario,
 * lezioni — e finora la si doveva percorrere a mano fra tre viste diverse,
 * indovinando l'ordine. Qui la catena è scritta una volta: si compilano quattro
 * campi e i sei pezzi nascono nell'ordine giusto, agganciati fra loro.
 *
 * Non nasconde il modello: al termine ci sono gli stessi oggetti che si
 * sarebbero fatti a mano, e ognuno resta modificabile dal suo modulo. È solo il
 * giro fatto una volta al posto del docente.
 */
export function moduloAvvio (): void {
  const anno = annoCorrente()
  const proposto = creaAnnoCorrente()
  const impostazioni = stato.registro.impostazioni
  let orario = [
    creaRicorrenza(1, impostazioni.oraInizioGiornata, minutiInUd(impostazioni.durataSlotPredefinita)),
  ]

  // Persistono fuori da `alSalva`: un secondo tentativo dopo un errore deve
  // riprendere da quel che è già nato — anno, classe, materia, corso — non
  // ricrearlo daccapo. Senza, un passo che fallisce dopo che l'anno è stato
  // creato faceva nascere un secondo anno a ogni nuovo tentativo.
  let annoIdCreato: string | null = anno?.id ?? null
  let classeCreata: { id: string } | null = null
  let materiaIdCreato: string | null = null
  let corsoIdCreato: string | null = null

  apriModale({
    titolo: anno ? 'Aggiungi una classe con la sua materia' : 'Avvio del registro',
    sottotitolo: anno
      ? `Anno in uso: ${anno.etichetta}`
      : 'anno scolastico, classe, materia e ore: il registro parte da qui',
    larghezza: 'media',
    testoSalva: 'Crea tutto',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        anno
          ? null
          : sezioneModulo(
              'Anno scolastico',
              riga(
                campo({
                  nome: 'etichetta',
                  etichetta: 'Anno',
                  valore: proposto.etichetta,
                  larghezza: 'terzo',
                }),
                campo({
                  nome: 'inizio',
                  etichetta: 'Primo giorno',
                  tipo: 'date',
                  valore: proposto.inizio,
                  richiesto: true,
                  larghezza: 'terzo',
                }),
                campo({
                  nome: 'fine',
                  etichetta: 'Ultimo giorno',
                  tipo: 'date',
                  valore: proposto.fine,
                  richiesto: true,
                  larghezza: 'terzo',
                }),
              ),
              h(
                'p',
                { class: 'testo-quieto' },
                'I due semestri nascono con l’anno, tagliati a fine gennaio. Si spostano dalle Impostazioni.',
              ),
            ),
        sezioneModulo(
          'Che cosa insegni, e a chi',
          riga(
            campo({
              nome: 'classe',
              etichetta: 'Classe',
              valore: '',
              segnaposto: 'I MEC A',
              richiesto: true,
              larghezza: 'meta',
            }),
            campo({
              nome: 'materia',
              etichetta: 'Materia',
              valore: '',
              segnaposto: 'Matematica',
              richiesto: true,
              aiuto: 'Se la materia c’è già, si riusa quella invece di farne una copia.',
              larghezza: 'meta',
            }),
          ),
        ),
        sezioneModulo(
          'Quando si fa lezione',
          editorRicorrenze(orario, (nuove) => {
            orario = nuove
          }),
          campo({
            nome: 'genera',
            tipo: 'checkbox',
            etichetta: 'Metti subito le lezioni sul calendario, fino a fine anno',
            valore: true,
            aiuto: 'Si può rifare quando l’orario cambia: le ore che ci sono già non si toccano.',
          }),
        ),
      ),
    alSalva: async (valori, contesto) => {
      const nomeClasse = testo(valori.classe)
      const nomeMateria = testo(valori.materia)
      if (!nomeClasse || !nomeMateria) {
        contesto.mostraErrori(['Servono il nome della classe e quello della materia.'])
        return
      }

      // Una fila di azioni, non una transazione: se una non passa, quel che è
      // già nato resta valido e l'errore dice a che punto ci si è fermati.
      // Rifare il giro non duplica niente — la materia si riusa e il corso di
      // una coppia già aperta si ritrova invece di sdoppiarsi.
      const passo = async (comando: Parameters<typeof invia>[0]): Promise<string | null> => {
        const risposta = await invia(comando)
        if (!risposta.ok) throw new Error((risposta.errori ?? ['Non riuscito.']).join(' '))
        return risposta.creato?.id ?? null
      }

      contesto.occupato(true)
      try {
        const inizio = anno?.inizio ?? testo(valori.inizio)
        const fine = anno?.fine ?? testo(valori.fine)

        if (!annoIdCreato) {
          annoIdCreato = await passo({
            tipo: 'anno.crea',
            inizio,
            fine,
            etichetta: testo(valori.etichetta),
          })
          if (!annoIdCreato) throw new Error('Anno non creato.')
        }

        if (!classeCreata) {
          const classe = creaClasse(
            annoIdCreato,
            nomeClasse,
            stato.registro.classi.map((c) => c.colore),
          )
          await passo({ tipo: 'classe.salva', classe })
          classeCreata = { id: classe.id }
        }

        if (!materiaIdCreato) {
          // Una materia scritta due volte fa due corsi che si dividono le
          // stesse ore: se il nome c'è già, si riusa quella.
          const gia = stato.registro.materie.find(
            (m) => nomeNormalizzato(m.nome) === nomeNormalizzato(nomeMateria),
          )
          materiaIdCreato = gia?.id ?? null
          if (!materiaIdCreato) {
            const materia = creaMateria(nomeMateria)
            await passo({ tipo: 'materia.salva', materia })
            materiaIdCreato = materia.id
          }
        }

        if (!corsoIdCreato) {
          corsoIdCreato = await passo({
            tipo: 'corso.crea',
            classeId: classeCreata.id,
            materiaId: materiaIdCreato,
          })
          if (!corsoIdCreato) throw new Error('Corso non creato.')
        }

        const esitoOrario = await applicaOrario(
          corsoIdCreato,
          orario,
          Boolean(valori.genera),
          oggi() > inizio ? oggi() : inizio,
          fine,
        )

        contesto.occupato(false)
        contesto.chiudi()
        notifica(
          !esitoOrario.ok
            ? `${nomeClasse} e ${nomeMateria} sono pronte, ma l’orario non si è salvato: riprova dal corso.`
            : valori.genera
              ? `${nomeClasse} è pronta: ${nomeMateria} è sul calendario.`
              : `${nomeClasse} è pronta, con l’orario di ${nomeMateria}. Le ore si mettono ` +
                'sul calendario dal corso, con «Lezioni sul calendario».',
          esitoOrario.ok ? 'successo' : 'avviso',
        )
        // La classe appena fatta è quella su cui si sta lavorando. Il
        // calendario si apre senza filtro: le prime ore che si vogliono vedere
        // sono proprio quelle appena nate, e restringerlo a un corso solo
        // nasconderebbe il resto della settimana a chi ne aveva già altri.
        aggiorna({
          vista: 'calendario',
          classeId: classeCreata.id,
          filtroClasseId: classeCreata.id,
          filtroCorsoAgendaId: null,
        })
      } catch (errore) {
        contesto.occupato(false)
        contesto.mostraErrori([errore instanceof Error ? errore.message : String(errore)])
      }
    },
  })
}
