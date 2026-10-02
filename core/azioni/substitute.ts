// La supplenza vista dall'altra parte: manco, e chi tiene le mie ore riceve
// un pacchetto. Lo zip va accanto al documento, fuori dal `.regi`: è da
// mandare via, non da conservare. Che cosa ci va e con che nomi lo decide
// `core/dominio/substitute.ts`; qui si compongono i PDF, si leggono i file e si scrive.

import * as apparato from 'apparato'

import { contenutoDi } from '#core/dati/store.js'
import { cartellaDocumento, èProvvisorio } from '#core/dati/paths.js'
import { scriviZip, type VoceZip } from '#core/dati/zip.js'
import { componiPdf } from '#core/dati/reportsPdf.js'
import { firmaPosta } from '#core/dati/templates.js'
import { apriBozzaSingola, confermaInvio, nomeBozza, puoSpedire } from '#core/dati/mail.js'
import { sembraIndirizzo } from '#core/dominio/mailbox.js'
import { datiFotoClasse, datiPiano } from '#core/dominio/reportData/index.js'
import type { DatiRapporto } from '#core/dominio/reports.js'
import type { Intestazione } from '#core/dominio/models.js'
import { oggi, periodoNelNome } from '#core/dominio/dates.js'
import {
  cartellaDellOra,
  classiDellaSupplenza,
  leggimi,
  lezioniDellaSupplenza,
  messaggioSupplenza,
  nomeDelloZip,
  nomeFoglioAllievi,
  nomeFoglioPiano,
  nomeLeggimi,
  risorseDellOra,
  type DestinatarioSupplenza,
} from '#core/dominio/substitute.js'
import { testi as paroleSupplenza } from '#core/dominio/substitute.testi.js'
import { immaginiDelDocumento, impaginazioneDi } from './reports.js'
import { conMessaggio, documentoCambiato, motivoSicuro, rifiuta, type Parte } from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './substitute.testi.js'

/** Un rapporto in PDF, in memoria: nello zip, non fra le esportazioni del documento. */
async function pdfDi (
  modello: string,
  dati: DatiRapporto,
  intestazione: Intestazione,
): Promise<Uint8Array> {
  const pronto = impaginazioneDi(modello, dati, intestazione)
  if (!pronto) throw new Error(testi().senzaModello(modello))
  return await componiPdf(pronto.impaginazione, pronto.dati, immaginiDelDocumento(pronto.carta))
}

export const supplenza = {
  'supplenza.prepara': async (contesto, azione) => {
    const t = testi()
    const registro = contesto.registro
    const lezioni = lezioniDellaSupplenza(registro, azione.lezioniIds)
    if (lezioni.length === 0) return rifiuta(comuni().nonTrovato.lezione)

    const email = azione.email?.trim() ?? ''
    if (email && !sembraIndirizzo(email)) return rifiuta(t.indirizzoStorto(email))
    if (azione.segretariato && !email) return rifiuta(t.segretariatoSenzaIndirizzo)

    // Accanto al documento: un anno ancora provvisorio non ha un «accanto» da trovare.
    const cartella = cartellaDocumento()
    if (!cartella) return rifiuta(comuni().nessunAnno)
    if (èProvvisorio()) return rifiuta(t.provvisorio)

    const intestazione = registro.impostazioni.intestazione
    const destinatario: DestinatarioSupplenza = {
      supplente: azione.supplente?.trim() ?? '',
      segretariato: azione.segretariato === true,
    }
    const voci: VoceZip[] = []
    // I file spariti, per id: il foglio da leggere non li deve promettere.
    const assenti = new Map<string, string>()

    try {
      for (const classe of classiDellaSupplenza(registro, lezioni)) {
        voci.push({
          nome: nomeFoglioAllievi(classe),
          dati: await pdfDi('foto-classe', datiFotoClasse(registro, classe), intestazione),
        })
      }

      for (const lezione of lezioni) {
        const piano = registro.piani.find((p) => p.id === lezione.pianoId) ?? null
        if (!piano) continue
        const cartellaOra = cartellaDellOra(registro, lezione)
        voci.push({
          nome: `${cartellaOra}/${nomeFoglioPiano()}`,
          dati: await pdfDi('piano-lezione', datiPiano(registro, piano), intestazione),
        })
        for (const voce of risorseDellOra(piano)) {
          if (!voce.nome || !voce.risorsa.file) continue
          const dati = await contenutoDi(voce.risorsa.file)
          // Un file sparito non ferma il pacchetto: lo si dice alla fine.
          if (!dati) {
            assenti.set(voce.risorsa.id, voce.risorsa.titolo)
            continue
          }
          voci.push({ nome: `${cartellaOra}/${paroleSupplenza().cartellaRisorse}/${voce.nome}`, dati })
        }
      }
    } catch (errore) {
      return rifiuta(t.composizioneFallita(motivoSicuro(errore)))
    }
    // In testa: è il primo che si apre.
    voci.unshift({
      nome: nomeLeggimi(),
      dati: new TextEncoder().encode(
        leggimi(registro, lezioni, intestazione.docente, destinatario, new Set(assenti.keys())),
      ),
    })

    // Comporre i PDF è l'attesa lunga: nel frattempo può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const nome = nomeDelloZip(lezioni)
    const file = apparato.Uri.joinPath(cartella, nome)
    const zip = scriviZip(voci)
    try {
      await apparato.file.writeFile(file, zip)
    } catch (errore) {
      return rifiuta(t.nonScritto(motivoSicuro(errore)))
    }
    const avviso = assenti.size > 0 ? t.risorseMancanti([...new Set(assenti.values())]) : ''

    if (!email) {
      await apparato.comandi.esegui('apparato.mostraNellaCartella', file)
      return conMessaggio(
        [t.pronto(file.fsPath), avviso].filter(Boolean).join(' '),
        avviso ? 'avviso' : 'info',
        { invariato: true },
      )
    }

    // Con l'invio diretto si conferma prima di spedire, come le comunicazioni.
    if (
      (await puoSpedire()) &&
      !(azione.conferma ? true : await confermaInvio(t.domanda(email), t.dettaglio(file.fsPath)))
    ) {
      return conMessaggio(t.soloZip(file.fsPath), 'info', { invariato: true })
    }
    if (!contesto.ancoraQui()) return documentoCambiato()

    const { oggetto, corpo } =
      messaggioSupplenza(registro, lezioni, intestazione.docente, destinatario)
    const classe = classiDellaSupplenza(registro, lezioni)[0]?.nome ?? ''
    const bozza = await apriBozzaSingola(
      {
        oggetto,
        corpo,
        a: [email],
        ccn: [],
        firma: firmaPosta(intestazione),
        allegati: [{ nome, tipo: 'application/zip', contenuto: zip.toString('base64') }],
      },
      classe,
      nomeBozza(classe, null, paroleSupplenza().supplenza, periodoNelNome(oggi())),
    )
    if (!bozza.ok) return rifiuta(t.zipMaNienteMail(file.fsPath, bozza.errore ?? ''))
    if (!bozza.spedita) {
      return conMessaggio(t.bozzaAperta(email, file.fsPath), 'info', { invariato: true })
    }
    const finale = [bozza.avviso ? t.speditaNonATutti(bozza.avviso) : t.spedita(email), avviso]
    return conMessaggio(
      finale.filter(Boolean).join(' '),
      bozza.avviso || avviso ? 'avviso' : 'info',
      { invariato: true },
    )
  },
} satisfies Parte
