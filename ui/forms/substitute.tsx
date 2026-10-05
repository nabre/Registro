// La supplenza in cui manco io: chi tiene le ore, a chi va il pacchetto, quali
// ore della giornata. Lo zip e la mail li fa l'host (`supplenza.prepara`), che
// dice anche com'è andata.

import { confrontaLezioni, fineLezione, inizioLezione } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import type { Lezione } from '#core/dominio/models.js'
import { Campo, Riga } from '#ui/components/base.js'
import { apriModale } from '#ui/components/modal.js'
import { nomeCorso, stato } from '#ui/state.js'
import { parole } from '#core/dominio/words.testi.js'

import { inviaDalModulo, testo } from './common.js'
import { testi } from './substitute.testi.js'

/** Il segretariato scritto nelle impostazioni del programma, o vuoto. */
function segretariatoDiSerie (): string {
  const voce = stato.programma.find((v) => v.chiave === 'registroDocenti.supplenza.segretariato')
  return typeof voce?.valore === 'string' ? voce.valore : ''
}

/** Le ore di quel giorno che si possono lasciare a un altro: le annullate no. */
function oreDelGiorno (lezione: Lezione): Lezione[] {
  return stato.registro.lezioni
    .filter((l) => l.data === lezione.data && l.stato !== 'annullata')
    .sort(confrontaLezioni)
}

/** Il nome di un'ora nella lista: orario e corso. */
function etichettaOra (lezione: Lezione): string {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  const orario = inizio && fine ? `${inizio}–${fine} · ` : ''
  return `${orario}${nomeCorso(lezione.corsoId)}`
}

/** Il campo dell'indirizzo nel modulo, per riempirlo quando si sceglie il segretariato. */
function campoEmail (evento: Event): HTMLInputElement | null {
  const modulo = (evento.target as HTMLElement).closest('form')
  const trovato = modulo?.elements.namedItem('email')
  return trovato instanceof HTMLInputElement ? trovato : null
}

/**
 * Prepara la supplenza a partire da un'ora: quell'ora è già scelta, le altre
 * dello stesso giorno si aggiungono con una spunta.
 */
export function moduloSupplenza (lezione: Lezione): void {
  const t = testi()
  const ore = oreDelGiorno(lezione)

  apriModale({
    titolo: t.titolo,
    sottotitolo: formattaData(lezione.data, 'lungo'),
    aiuto: t.aiuto,
    // Tre campi e le ore del giorno: una finestra larga li lascerebbe a metà vuoti.
    larghezza: 'stretta',
    testoSalva: t.prepara,
    corpo: () => (
      <div className="modulo">
        <Campo
          nome="destinatario"
          etichetta={t.aChi}
          tipo="select"
          valore="supplente"
          opzioni={[
            { valore: 'supplente', testo: t.alSupplente },
            { valore: 'segretariato', testo: t.alSegretariato },
            { valore: 'nessuno', testo: t.soloZip },
          ]}
          al={(valore, evento) => {
            const email = campoEmail(evento)
            // Il segretariato si sa già: lo si scrive al posto di chi compila.
            if (email && valore === 'segretariato' && !email.value.trim()) email.value = segretariatoDiSerie()
          }}
        />
        <Riga>
          <Campo
            nome="supplente"
            etichetta={t.supplente}
            segnaposto={t.segnapostoSupplente}
            larghezza="meta"
          />
          <Campo
            nome="email"
            etichetta={parole().email}
            tipo="email"
            segnaposto={t.segnapostoEmail}
            aiuto={t.aiutoEmail}
            larghezza="meta"
          />
        </Riga>
        <div className="campo campo--piena">
          <span className="campo__etichetta">{t.ore}</span>
          {ore.map((ora) => (
            <Campo
              key={ora.id}
              nome={`ora-${ora.id}`} // testo-fisso: nome del campo, non si legge
              etichetta={etichettaOra(ora)}
              tipo="checkbox"
              valore={ora.id === lezione.id}
            />
          ))}
        </div>
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const lezioniIds = ore.filter((ora) => valori[`ora-${ora.id}`] === true).map((ora) => ora.id)
      if (lezioniIds.length === 0) {
        contesto.mostraErrori([t.nessunaOra])
        return
      }
      const destinatario = testo(valori.destinatario)
      const email = testo(valori.email)
      if (destinatario !== 'nessuno' && !email) {
        contesto.mostraErrori([t.serveEmail])
        return
      }
      const fatto = await inviaDalModulo(contesto, {
        tipo: 'supplenza.prepara',
        lezioniIds,
        supplente: testo(valori.supplente),
        ...(destinatario === 'nessuno' ? {} : { email }),
        segretariato: destinatario === 'segretariato',
      }, t.nonRiuscita)
      if (!fatto) return
      // Dove sta lo zip, e se la mail è partita, lo dice l'host.
      contesto.chiudi()
    },
  })
}
