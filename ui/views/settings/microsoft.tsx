// Utente › Account: gli account Microsoft, uno per riga, e per ognuno le due
// capacità che il registro sa usare — la Posta e OneDrive — con com'è adesso e
// il gesto che serve. Collegare, provare, scollegare e azzerare la casella
// stanno qui e solo qui: la sezione Posta dice com'è e rimanda.
//
// I permessi restano separati, un gettone per capacità: collegare la posta non
// apre OneDrive, e viceversa. Il gettone resta nel portachiavi dell'host: qui
// arrivano solo indirizzi. Un account che il client di OneDrive sincronizza sul
// computer compare da sé e si sfoglia senza accesso; la casella della posta
// compare anche prima di essere collegata, perché è il primo account che si
// vorrà usare.

import { useState, type ReactElement, type ReactNode } from 'react'

import { Avviso, Pastiglia, Pulsante, Scheda } from '#ui/components/base.js'
import { conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import type { Messaggio } from '#contract/protocol.js'
import type { AccountMicrosoft } from '#core/dominio/onedrive.js'
import { azione } from '#ui/bridge.js'
import { stato } from '#ui/state.js'
import { testi as testiPosta } from './mail.testi.js'
import { testi } from './microsoft.testi.js'

/**
 * Dove si scrive l'esito di un gesto della posta: sotto la riga dell'account
 * che è la casella, o in fondo alla scheda quando nessuno lo è ancora (`''`).
 */
type Dove = string

/** Scrive l'esito di un gesto sotto il suo posto, e lo lascia lì da rileggere mentre si corregge. */
type MostraEsito = (dove: Dove, detto: Messaggio | undefined) => void

/** Com'è andata, detto sotto le azioni. */
function esito (detto: Messaggio | undefined): ReactElement {
  if (!detto) return <Avviso tono="attenzione">{testiPosta().nessunaRisposta}</Avviso>
  const tono = detto.livello === 'errore'
    ? 'negativo'
    : detto.livello === 'avviso'
      ? 'attenzione'
      : 'informativo'
  return <Avviso tono={tono}>{detto.testo}</Avviso>
}

/** Un gesto della posta: manda l'azione e scrive l'esito sotto la riga. */
function gestoPosta (
  mostra: MostraEsito,
  dove: Dove,
  testo: string,
  titolo: string,
  tipo: 'posta.collega' | 'posta.prova' | 'posta.invioProva' | 'posta.scollega',
  variante: 'primario' | 'sottile' | 'fantasma',
  simbolo: 'collegamento' | 'posta' | 'chiudi',
): ReactElement {
  return (
    <Pulsante
      key={tipo}
      testo={testo}
      simbolo={simbolo}
      variante={variante}
      titolo={titolo}
      al={async () => {
        const risposta = await azione({ tipo })
        mostra(dove, risposta.messaggio)
      }}
    />
  )
}

/**
 * «Azzera»: toglie il gettone e, con lui, la casella scritta, il mittente,
 * l'invio diretto e gli indirizzi e i tenant ricordati. Con conferma, perché il
 * collegamento va rifatto da capo; l'autorizzazione nel profilo Microsoft si
 * revoca di là.
 */
async function azzeraPosta (): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.azzerare,
    testo: t.azzerareTesto,
    testoConferma: t.azzera,
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({ tipo: 'posta.azzera' })
  if (risposta.ok) notifica(t.postaAzzerata, 'info')
}

/** Una capacità di un account: il nome, com'è, e i gesti che le si addicono. */
function capacita (nome: string, come: ReactNode, spiegazione: ReactNode, gesti: ReactNode): ReactElement {
  return (
    <div className="account-microsoft__capacita">
      <span className="account-microsoft__capacita-nome">{nome}</span>
      {come}
      <div className="account-microsoft__azioni">{gesti}</div>
      {spiegazione}
    </div>
  )
}

/** La capacità Posta: la casella del registro, o un account che non lo è. */
function capacitaPosta (account: AccountMicrosoft, qualcunaPosta: boolean, mostra: MostraEsito): ReactElement {
  const t = testi()
  const p = testiPosta()
  const collegata = stato.posta.exchange
  if (!account.posta) {
    // Una casella sola: un altro account diventa la casella solo se non ce n'è una.
    return capacita(
      t.posta,
      <Pastiglia testo={t.nonLaCasella} tono="quiete" simbolo="posta" />,
      null,
      qualcunaPosta ? null : gestoPosta(mostra, '', p.collega, p.collegaAiuto, 'posta.collega', 'sottile', 'collegamento'),
    )
  }
  const dove = account.indirizzo
  return capacita(
    t.posta,
    collegata
      ? <Pastiglia testo={p.collegata} tono="positivo" simbolo="collegamento" />
      : <Pastiglia testo={p.daCollegare} tono="quiete" simbolo="collegamento" />,
    collegata ? null : <small className="campo__aiuto">{p.premiCollega}</small>,
    <>
      {gestoPosta(
        mostra,
        dove,
        collegata ? p.ricollega : p.collega,
        p.collegaAiuto,
        'posta.collega',
        collegata ? 'sottile' : 'primario',
        'collegamento',
      )}
      {gestoPosta(mostra, dove, p.prova, p.provaAiuto, 'posta.prova', 'sottile', 'posta')}
      {/* La prova d'invio accanto a quella d'accesso: sono due permessi diversi. */}
      {collegata ? gestoPosta(mostra, dove, p.mandaProva, p.mandaProvaAiuto, 'posta.invioProva', 'sottile', 'posta') : null}
      {collegata ? gestoPosta(mostra, dove, p.scollega, p.scollegaAiuto, 'posta.scollega', 'fantasma', 'chiudi') : null}
      <Pulsante
        testo={t.azzera}
        simbolo="cestino"
        variante="fantasma"
        titolo={t.azzeraAiuto}
        al={() => azzeraPosta()}
      />
    </>,
  )
}

/** La capacità OneDrive: sincronizzato sul computer, collegato, o da collegare. */
function capacitaOneDrive (account: AccountMicrosoft): ReactElement {
  const t = testi()
  const come = account.sulComputer
    ? <Pastiglia testo={t.sulComputer} tono="positivo" simbolo="cartella" />
    : account.onedrive
      ? <Pastiglia testo={t.onedriveCollegato} tono="positivo" simbolo="collegamento" />
      : <Pastiglia testo={t.onedriveDaCollegare} tono="quiete" simbolo="collegamento" />
  return capacita(t.onedrive, come, null, (
    <>
      {account.onedrive
        ? (
            <Pulsante
              testo={t.scollega}
              simbolo="chiudi"
              variante="fantasma"
              titolo={t.scollegaAiuto}
              al={async () => {
                const sicuro = await conferma({
                  titolo: t.scollegare(account.indirizzo),
                  testo: t.scollegareTesto,
                  testoConferma: t.scollega,
                })
                if (!sicuro) return
                await azione({ tipo: 'microsoft.togli', indirizzo: account.indirizzo })
              }}
            />
          )
        : null}
      {/* Sincronizzato sul computer non serve collegarlo: si sfoglia già. */}
      {!account.onedrive && !account.sulComputer
        ? (
            <Pulsante
              testo={t.collega}
              simbolo="collegamento"
              variante="sottile"
              titolo={t.collegaAiuto}
              al={() => azione({ tipo: 'microsoft.aggiungi', indirizzo: account.indirizzo })}
            />
          )
        : null}
    </>
  ))
}

/** La scheda degli account: l'elenco, e i gesti per aggiungerne uno o collegare la posta. */
export function schedaAccountMicrosoft (): ReactElement {
  return <SchedaAccountMicrosoft />
}

function SchedaAccountMicrosoft (): ReactElement {
  const t = testi()
  const p = testiPosta()
  const account = stato.microsoft.account
  const qualcunaPosta = account.some((voce) => voce.posta)
  // Gli esiti delle prove della posta, per posto: restano finché la pagina è aperta.
  const [esiti, impostaEsiti] = useState<ReadonlyMap<Dove, Messaggio | undefined>>(() => new Map())
  const mostra: MostraEsito = (dove, detto) => {
    impostaEsiti((prima) => new Map(prima).set(dove, detto))
  }
  const esitoDi = (dove: Dove): ReactNode => (esiti.has(dove) ? esito(esiti.get(dove)) : null)

  return (
    <Scheda
      titolo={t.titolo}
      aiuto={t.aiuto}
      azioni={(
        <>
          {/* Senza nessuna casella, collegarla è il primo gesto: sta qui in cima. */}
          {qualcunaPosta
            ? null
            : gestoPosta(mostra, '', p.collega, p.collegaAiuto, 'posta.collega', 'primario', 'collegamento')}
          <Pulsante
            testo={t.aggiungi}
            simbolo="piu"
            variante={account.length === 0 && qualcunaPosta ? 'primario' : 'sottile'}
            titolo={t.aggiungiAiuto}
            al={() => azione({ tipo: 'microsoft.aggiungi' })}
          />
        </>
      )}
    >
      <div className="posta-corpo">
        {account.length === 0
          ? <Avviso tono="informativo">{t.nessuno}</Avviso>
          : (
              <ul className="elenco-account-microsoft">
                {account.map((voce) => (
                  <li key={voce.indirizzo} className="account-microsoft">
                    <div className="account-microsoft__chi">
                      <strong>{voce.nome || voce.indirizzo}</strong>
                      {voce.nome ? <small>{voce.indirizzo}</small> : null}
                    </div>
                    {capacitaPosta(voce, qualcunaPosta, mostra)}
                    {capacitaOneDrive(voce)}
                    {/* L'esito delle prove della posta resta sotto la sua riga, da rileggere mentre si corregge. */}
                    {voce.posta ? <div className="posta-esito">{esitoDi(voce.indirizzo)}</div> : null}
                  </li>
                ))}
              </ul>
            )}
        {/* Gli esiti di «Collega la casella» quando nessun account lo è ancora. */}
        {qualcunaPosta ? null : <div className="posta-esito">{esitoDi('')}</div>}
        <small className="campo__aiuto">{t.nota}</small>
        {/* Aprire è un gesto di file: sta nel menu «File» e in Ctrl+K, qui solo il rimando. */}
        <small className="campo__aiuto">{t.apriDaFile}</small>
      </div>
    </Scheda>
  )
}
