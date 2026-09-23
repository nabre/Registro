# Ogni file che partecipa, e quando si tocca

Da aprire quando non sai dove mettere le mani. L'ordine è quello di una
chiamata: da chi la fa fino al disco.

## Indice

- [Il contratto](#il-contratto)
- [Le procedure](#le-procedure)
- [I trasporti: chi entra nel nucleo](#i-trasporti-chi-entra-nel-nucleo)
- [Il protocollo e i gestori](#il-protocollo-e-i-gestori)
- [Gli artefatti generati](#gli-artefatti-generati)
- [Gli strumenti](#gli-strumenti)
- [Le docs](#le-docs)
- [Quel che non si tocca mai](#quel-che-non-si-tocca-mai)

## Il contratto

| File | Che cosa dichiara | Quando si tocca |
| --- | --- | --- |
| `src/api/contract.ts` | `Procedura`, `Ambito`, `Origine`, `Genere`, `Codice`, `ErroreApi`, `errore.*`, `EsitoScrittura`, `Risultato`, `VoceGiornale`, `VERSIONE_API` | quasi mai: cambia la busta, non l'elenco |
| `src/api/schemas.ts` | i costruttori di schema, `convalida`, `schemaJson`, `formaInBreve` | quando manca una forma che nessun costruttore sa dire |
| `src/api/core.ts` | `chiama()`, l'elenco, `registra`, `osserva`, `SCRITTURA`, `daGestore`, `daEsitoAzione`, `aEsitoAzione`, `descrivi` | quasi mai |
| `src/api/tools.ts` | `catalogo()`, `catalogoJson()`, `nomeFunzione`, `daNomeFunzione`, le istruzioni per il modello | quando cambia la forma del catalogo, non quando cambia una procedura |

**`VERSIONE_API` sale solo se cambia la busta.** Aggiungere una procedura è
retrocompatibile per costruzione, e alzarla ogni volta insegnerebbe a non
guardarla.

## Le procedure

| File | Che cosa | Quando |
| --- | --- | --- |
| `src/api/procedures/<segmenti>.ts` | una procedura, `export const procedura` | sempre |
| `src/api/procedures/<cartella>/indice.ts` | `procedure<Cartella>`: i file suoi e le cartelle sotto | sempre |
| `src/api/procedures/<area>/comuni.ts` | guardie, elenchi di valori, pezzi di schema che più procedure dell'area si dividono | quando una cosa serve a due |
| `src/api/procedures/common/<origine>.ts` | le guardie che **aree diverse** si dividono: `registro.ts` ha `esigiAnno`, `esigiMateria`, `esigiCorso`, `esigiClasse` | quando una guardia serve a due aree |
| `src/api/index.ts` | `TUTTE` e `registraTutte()`: una riga per area | area nuova o sparita |

Un aiuto che serve a **una** procedura sta nel file di quella procedura. Metterlo
in `comuni.ts` costringe ad aprire due file per leggerne una.

Un aiuto che serve a **due aree** va in `procedure/comuni/`, non nell'area di una
delle due: altrimenti l'area A importa da B senza averci a che fare.

## I trasporti: chi entra nel nucleo

Nessuno di questi si tocca per aggiungere una procedura. Si toccano quando
cambia *il modo* di entrare.

| File | Chi fa entrare | La riga che conta |
| --- | --- | --- |
| `src/api/bridge.ts` | il centralino delle `Azione` | una procedura con `azione:` prende il posto di quel gestore in `GESTORI` |
| `src/api/transports/conduit.ts` | la riga di comando, via JSON-RPC su named pipe | `permessoMancante(genere, permessi)`: è lì che si decide se uno script può scrivere |
| `src/api/transports/assistant.ts` | il modello locale | `usaAttrezzo` ricontrolla `p.genere !== 'lettura'` prima di chiamare |
| `src/panels/panel.ts` | il webview | `rispondiDomanda()` rifiuta chi non è di sola lettura |

I metodi riservati del condotto — `$versione`, `$elenco`, `$schema`, `$attrezzi`
— sono il modo in cui chi sta fuori scopre l'API senza averne una copia.

## Il protocollo e i gestori

Solo per le procedure che prendono in carico un'azione.

| File | Che cosa | Attenzione |
| --- | --- | --- |
| `src/protocol.ts` | l'unione `Azione`, e accanto `Domanda`/`Riscontro` | due prove **leggono questo sorgente** e contano le varianti |
| `src/actions/<area>.ts` | il gestore vero, dentro `modifica(op, collezioni)` | il lavoro sta qui e ci resta |
| `src/actions.ts` | `GESTORI`, con `...gestoriDelleProcedure()` sparso per ultimo | le chiavi prese in carico vincono su quelle di prima |
| `src/actions/context.ts` | `EsitoAzione`, `Gestore`, `contestoDi` | |

Aggiungere un'azione vuol dire toccare **cinque** posti: il protocollo, il
gestore, la mappa, e i due conti nelle prove. Toglierne una, gli stessi cinque.

## Gli artefatti generati

Non si scrivono a mano. Mai.

| File | Lo genera | Lo controlla |
| --- | --- | --- |
| `resources/tools.json` | `npm run tools` | `tests/api/tools.test.mjs`, byte per byte |

Sta nel versionamento apposta: è il posto in cui una procedura aggiunta, tolta o
cambiata di forma compare come una differenza leggibile, e in cui si vede che un
ingresso ha perso un campo.

## Gli strumenti

| Comando | Che cosa verifica |
| --- | --- |
| `npm run procedures` | l'albero: percorso = nome, ogni file nel suo indice, ogni cartella fino a `src/api/index.ts`, il catalogo non in ritardo |
| `npm run tools` | rigenera il catalogo |
| `npm run collections` | che ogni gestore dichiari le raccolte che tocca davvero |
| `npm run layers` | che nessuno importi a rovescio: `src/api/` è lo strato «contract», `src/api/transports/` è «desktop» |
| `npm run census` | export che nessuno usa |

`npm run procedures` legge il testo e non compila: risponde anche quando `tsc` non
passa, che è il momento in cui serve di più.

## Le docs

| File | Che cosa va aggiornato |
| --- | --- |
| `docs/API.md` | la tabella delle aree, la tabella dei file, gli esempi, e i pochi conti che restano scritti |
| `docs/INDICE.md` | gli stessi conti, nella riga di API.md |
| `docs/CATALOGO.md` | solo se la procedura è un comportamento nuovo per chi usa il registro |
| `README.md`, `docs/GUIDA.md` | solo se cambia qualcosa che si vede |

I conti nelle docs non li controlla nessuna prova: si aggiornano a mano, e si
dimenticano. Se ne trovi uno vecchio, aggiustalo mentre sei lì.

## Quel che non si tocca mai

- **`src/cli/registro.mjs`** non ha una copia dell'elenco: chiede tutto al
  condotto. Una procedura aggiunta stamattina si chiama da lì stasera senza che
  quel file cambi. Si tocca solo per aggiungere un *comando*, non una procedura.
- **`tests/helpers/api.ts`** si tocca solo per esportare qualcosa di nuovo verso le
  prove, non per una procedura: le prove la raggiungono con `chiama()`.
- **`src/ui/`** non conosce le procedure: manda `Azione` e `Domanda`.
