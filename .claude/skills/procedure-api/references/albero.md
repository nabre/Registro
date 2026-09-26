# Ogni file che partecipa, e quando si tocca

Da aprire quando non sai dove mettere le mani. L'ordine è quello di una
chiamata: da chi la fa fino al disco.

## Indice

- [I cinque strati](#i-cinque-strati)
- [Il contratto](#il-contratto)
- [Le procedure](#le-procedure)
- [I trasporti: chi entra nel nucleo](#i-trasporti-chi-entra-nel-nucleo)
- [Il protocollo e i gestori](#il-protocollo-e-i-gestori)
- [Gli artefatti generati](#gli-artefatti-generati)
- [Gli strumenti](#gli-strumenti)
- [Le docs](#le-docs)
- [Quel che non si tocca mai](#quel-che-non-si-tocca-mai)

## I cinque strati

L'albero dei sorgenti riflette i cinque strati architetturali del progetto (decisione D8 in `docs/CANTIERE.md`, `docs/ARCHITETTURA.md`):

| Strato | File e cartelle | Ruolo rispetto all'API |
| --- | --- | --- |
| `contract/` | `contract/contract.ts`, `contract/schemas.ts`, `contract/core.ts`, `contract/tools.ts`, `contract/protocollo.ts`, `contract/centralino.ts`, `contract/bridge.ts`, `contract/procedure/` | Il contratto davanti al nucleo: tipi, schemi, catalogo, protocollo, centralino e procedure |
| `core/` | `core/azioni/`, `core/dati/`, `core/dominio/` | Il nucleo applicativo: gestori delle azioni (`core/azioni/`), persistenza e archivio (`core/dati/`), regole di dominio pure (`core/dominio/`) |
| `desktop/` | `desktop/transports/`, `desktop/pannelli/`, `desktop/apparato/`, `desktop/shell/` | L'applicazione Electron: trasporti condotto/assistente (`desktop/transports/`), gestione pannelli (`desktop/pannelli/`), apparato di sistema (`desktop/apparato/`), shell nativa (`desktop/shell/`) |
| `ui/` | `ui/pannello/` | L'interfaccia utente webview: non conosce le procedure, invia solo `Azione` e `Domanda` |
| `cli/` | `cli/registro.mjs` | La riga di comando autonoma: cliente esterno del condotto su named pipe, non tocca il nucleo |

## Il contratto

| File | Che cosa dichiara | Quando si tocca |
| --- | --- | --- |
| `contract/contract.ts` | `Procedura`, `Ambito`, `Origine`, `Genere`, `Codice`, `ErroreApi`, `errore.*`, `EsitoScrittura`, `Risultato`, `VoceGiornale`, `VERSIONE_API` | quasi mai: cambia la busta, non l'elenco |
| `contract/schemas.ts` | i costruttori di schema, `convalida`, `schemaJson`, `formaInBreve` | quando manca una forma che nessun costruttore sa dire |
| `contract/core.ts` | `chiama()`, l'elenco, `registra`, `osserva`, `SCRITTURA`, `scrittura`, `inoltra`, `daGestore`, `aEsitoAzione`, `descrivi` | quasi mai |
| `contract/tools.ts` | `catalogo()`, `catalogoJson()`, `nomeFunzione`, `daNomeFunzione`, le istruzioni per il modello (cfr. `tools/assistantTools.mjs`) | quando cambia la forma del catalogo, non quando cambia una procedura |
| `contract/protocollo.ts` | l'unione `Azione`, e accanto `Domanda`/`Riscontro` | quando si aggiunge o ritira un'azione (cfr. [Il protocollo e i gestori](#il-protocollo-e-i-gestori)) |
| `contract/centralino.ts` | `GESTORI`, con `...gestoriDelleProcedure()` sparso per ultimo | quando si registra un gestore di azione |
| `contract/bridge.ts` | il centralino delle `Azione`, smistamento verso le procedure | quando una procedura prende in carico un'azione (cfr. [I trasporti: chi entra nel nucleo](#i-trasporti-chi-entra-nel-nucleo)) |
| `contract/procedure/` | l'albero di tutti i file di procedura | a ogni procedura nuova, modificata o rimossa (cfr. [Le procedure](#le-procedure)) |

**`VERSIONE_API` sale solo se cambia la busta.** Aggiungere una procedura è
retrocompatibile per costruzione, e alzarla ogni volta insegnerebbe a non
guardarla.

## Le procedure

| File | Che cosa | Quando |
| --- | --- | --- |
| `contract/procedure/<segmenti>.ts` | una procedura, `export const procedura` | sempre |
| `contract/procedure/<cartella>/index.ts` | `procedure<Cartella>`: i file suoi e le cartelle sotto | sempre |
| `contract/procedure/<area>/common.ts` | guardie, elenchi di valori, pezzi di schema che più procedure dell'area si dividono | quando una cosa serve a due |
| `contract/procedure/common/<origine>.ts` | le guardie che **aree diverse** si dividono: `register.ts` ha `esigiAnno`, `esigiMateria`, `esigiCorso`, `esigiClasse` | quando una guardia serve a due aree |
| `contract/registro.ts` | `TUTTE` e `registraTutte()`: una riga per area | area nuova o sparita |

Un aiuto che serve a **una** procedura sta nel file di quella procedura. Metterlo
in `common.ts` costringe ad aprire due file per leggerne una.

Un aiuto che serve a **due aree** va in `contract/procedure/common/`, non nell'area di una
delle due: altrimenti l'area A importa da B senza averci a che fare.

## I trasporti: chi entra nel nucleo

Nessuno di questi si tocca per aggiungere una procedura. Si toccano quando
cambia *il modo* di entrare.

| File | Chi fa entrare / Ruolo in desktop | La riga che conta |
| --- | --- | --- |
| `contract/bridge.ts` | il centralino delle `Azione` | una procedura con `azione:` prende il posto di quel gestore in `GESTORI` |
| `desktop/transports/conduit.ts` | la riga di comando, via JSON-RPC su named pipe | `permessoMancante(genere, permessi)`: è lì che si decide se uno script può scrivere |
| `desktop/transports/assistant.ts` | il modello locale | `usaAttrezzo` ricontrolla `p.genere !== 'lettura'` prima di chiamare |
| `desktop/pannelli/panel.ts` | il webview | `rispondiDomanda()` rifiuta chi non è di sola lettura |
| `desktop/apparato/` | isolamento dell'host verso Electron (`platform.ts`, finestre, dialoghi) | fornisce i servizi di sistema; non tocca direttamente l'API |
| `desktop/shell/` | ciclo di vita Electron (`main.ts`, menu nativo, finestre, protocollo `registro://`) | quando cambia l'integrazione di sistema o i comandi di menu |

I metodi riservati del condotto — `$versione`, `$elenco`, `$schema`, `$attrezzi`
— sono il modo in cui chi sta fuori scopre l'API senza averne una copia.

## Il protocollo e i gestori

Solo per le procedure che prendono in carico un'azione, e i moduli di `core/` che svolgono il lavoro.

| File | Che cosa | Attenzione |
| --- | --- | --- |
| `contract/protocollo.ts` | l'unione `Azione`, e accanto `Domanda`/`Riscontro` | due prove **leggono questo sorgente** e contano le varianti |
| `core/azioni/<area>.ts` | il gestore vero, dentro `modifica(op, collezioni)` | il lavoro sta qui e ci resta |
| `contract/centralino.ts` | `GESTORI`, con `...gestoriDelleProcedure()` sparso per ultimo | le chiavi prese in carico vincono su quelle di prima |
| `core/azioni/context.ts` | `EsitoAzione`, `Gestore`, `contestoDi` | |
| `core/dati/` | archivio in memoria, persistenza `.regi`, ZIP, PDF, posta, modelli | i gestori leggono e scrivono qui lo stato persistente |
| `core/dominio/` | logica pura di dominio, modelli dati, date, calcoli, validazione | puro: non tocca né l'API né l'apparato, definisce le strutture dati |

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
| `npm run procedures` | l'albero: percorso = nome, ogni file nel suo indice, ogni cartella fino a `contract/registro.ts`, il catalogo non in ritardo |
| `npm run tools` | rigenera il catalogo (esegue `tools/assistantTools.mjs`) |
| `npm run collections` | che ogni gestore dichiari le raccolte che tocca davvero |
| `npm run layers` | che nessuno importi a rovescio: `contract/` è lo strato «contract», `desktop/transports/` (e `desktop/apparato/`) è «desktop» |
| `npm run census` | export che nessuno usa |

`npm run procedures` legge il testo e non compila: risponde anche quando `tsc` non
passa, che è il momento in cui serve di più.

## Le docs

| File | Che cosa va aggiornato |
| --- | --- |
| `docs/API.md` | la tabella delle aree, la tabella dei file, gli esempi, e i pochi conti che restano scritti |
| `docs/INDICE.md` | gli stessi conti, nella riga di API.md |
| `docs/CATALOGO.md` | solo se la procedura è un comportamento nuovo per chi usa il registro |
| `README.md`, `docs/GUIDA.md` | solo se cambia com'è fatto: file, dati, build, condotto. Quel che si vede lo racconta la guida in-app, `ui/pannello/views/help/` |

Una parte dei conti la controlla `tests/counts.test.mjs`: le procedure nel
README, azioni, procedure, scritture e letture in INDICE, le aree e le letture
in API.md. Gli altri si aggiornano a mano, e si dimenticano: se ne trovi uno
vecchio, aggiustalo mentre sei lì.

## Quel che non si tocca mai

- **`cli/registro.mjs`** (strato `cli/`): non ha una copia dell'elenco: chiede tutto al
  condotto. Una procedura aggiunta stamattina si chiama da lì stasera senza che
  quel file cambi. Si tocca solo per aggiungere un *comando*, non una procedura.
- **`tests/helpers/api.ts`** si tocca solo per esportare qualcosa di nuovo verso le
  prove, non per una procedura: le prove la raggiungono con `chiama()`.
- **`ui/pannello/`** (strato `ui/`): non conosce le procedure: manda `Azione` e `Domanda`.
