# Regiclass — il documento tecnico

Registro di classe per docenti: calendario delle lezioni, classi e persone in
formazione, piani lezione, valutazioni. Applicazione desktop Electron +
TypeScript; un anno scolastico è un documento solo, `2026-2027.regi` (ZIP con
JSON e file dentro).

**Come si usa non sta qui:** la guida d'uso è nell'applicazione (`F1`, o la
pagina «Guida»), contenuto in `src/ui/views/help/`; `tests/ui/help.test.mjs`
controlla che ogni pagina abbia la sua sezione. Qui: com'è fatto, dove stanno i
dati, come si costruisce e si rilascia, che cosa esce dal computer.

## Come è fatto

| Cosa | Dove |
| --- | --- |
| Modello, calendario, medie, validazione | `src/domain/` |
| Impaginazione dei rapporti | `templates/`, `src/domain/reports.ts`, `src/data/reportsPdf.ts` |
| Modelli: catalogo, controllo, carta intestata | `src/domain/templateCatalog.ts`, `src/domain/templateCheck.ts`, `src/actions/templates.ts`, `src/data/templates.ts` |
| Dove finisce un documento, e con che nome | `src/domain/locations.ts` |
| Che cosa entra in un rapporto | `src/domain/reportData.ts` |
| Lettura e scrittura dei file | `src/data/` |
| Avvio, comandi e pannelli | `src/startup.ts`, `src/panels/` |
| Messaggi nella finestra del registro | `src/environment/dialogs.ts`, `shell/pages/dialog/` |
| La giornata di scuola: UD, pause, griglia | `src/domain/breaks.ts`, `src/ui/views/settings/schoolDay.ts` |
| Documenti vecchi portati avanti | `src/domain/upgrades.ts`, `src/data/archive.ts` |
| Comandi e impostazioni dichiarati | `src/manifest.ts` |
| Termini, articoli, accordi | `src/domain/lexicon.ts` (ADR-01) |
| Lingue e cataloghi | `src/i18n/` (ADR-38) |
| L'ambiente: finestre, dialoghi, file, impostazioni (`apparato`) | `src/environment/` (ADR-02) |
| Il guscio Electron: avvio, menu, protocollo, pagine native | `shell/` |
| Contratto fra host e pannello | `src/protocol.ts` |
| Azioni | `src/actions.ts`, `src/actions/` |
| Procedure, condotto, riga di comando | `src/api/`, `src/cli/registro.mjs` |
| Interfaccia del pannello (senza framework, ADR-06) | `src/ui/` |
| Guida d'uso | `src/ui/views/help.ts`, `src/ui/views/help/` |
| Mappa: geometria, geocodifica, tasselli | `src/domain/map.ts`, `src/data/geocoding.ts`, `shell/protocol/tiles.ts` |
| Modelli del linguaggio | `src/data/gguf.ts`, `src/data/huggingFace.ts`, `src/data/llm.ts`, `src/data/llamaCpp.ts`, `src/data/mtmd.ts`, `src/ui/views/languageModels.ts` |
| Dettatura | `src/data/dictation.ts`, `src/data/voicebox.ts`, `src/domain/loopback.ts`, `src/ui/assistant/voice.ts` |
| Programma scaricato da sé (`llama-mtmd-cli`) | `src/data/kit.ts`, `src/data/visionKit.ts` |
| Vassoio | `src/domain/tray.ts`, `src/tray.ts`, `src/environment/tray.ts` |
| Aggiornamenti | `src/environment/updates.ts`, `src/environment/updateInstaller.ts`, `os/windows/aggiornamento.ps1` |
| Marchio e icone | `resources/`, `icons/`, `tools/icons.cjs` |
| Pagine | `src/ui/pages.ts` |
| Barra laterale, `Ctrl+1`…`Ctrl+9` | `src/ui/sidebar.ts`, `src/ui/shortcuts.ts` |
| Dashboard | `src/ui/views/today.ts` |
| Ricerca `Ctrl+K` | `src/ui/components/palette.ts`, `src/ui/titleBar.ts` |
| Indietro/avanti (`Alt+←`/`Alt+→`) | `src/ui/history.ts` |
| Comandi e dove compaiono | `src/ui/commands.ts` |

Il dominio non conosce né Electron né il DOM: `npm test` gira senza finestre.
Le tabelle complete stanno negli altri documenti: [INDICE](INDICE.md).

## Dove stanno i dati

**Il documento dell'anno** sta dove lo mette il docente:

```
<la cartella del docente>/
  2026-2027.regi                 ZIP
    manifesto.json               che cos'è, di che versione
    registro.json                anno, semestri, pause, materie, impostazioni del documento
    classi.json  corsi.json  lezioni.json  piani-lezione.json  valutazioni.json
    fascicoli.json  consegne.json  check.json  smistamenti.json  coordinate.json
    .storico/                    copie delle collezioni
    archivio/                    quel che si carica: per materia, classe, documento
    esportazioni/                quel che si stampa: si rifà
    quarantena/                  PDF di classe con pagine non ancora assegnate
    composizioni/  intestazione/  calendari/  …
  .2026-2027.regi.serratura      chi lo sta usando
  2026-2027/
    bozze/                       messaggi .eml da rileggere
    versioni-precedenti/         il documento prima di portarlo al formato di oggi
```

- Dentro il documento stanno anche PDF, foto e loghi. Un file che deve esistere
  sul disco (lettore di sistema, pdfjs) si **materializza** in
  `userData/materializzati/`, cache cancellata alla chiusura
  (`src/data/store.ts`).
- Fuori restano solo `bozze/` (porta verso il programma di posta) e
  `versioni-precedenti/` (deve aprirla anche il registro di prima).
- Le cartelle della disposizione vecchia accanto al documento (`archivio/`,
  `esportazioni/`, `quarantena/`, `allegati/`, `in-arrivo/`) entrano da sole
  alla prima apertura (`inglobaCartelle` in `src/data/years.ts`).
- `.regi` e non `.reg` (script del registro di Windows). JSON indentati,
  correggibili a mano: chi li rilegge normalizza.
- Formato e collezioni: [MODELLO-DATI](MODELLO-DATI.md) § 8. Scrittura
  incrementale, storico, serratura, osservatore: [ARCHITETTURA](ARCHITETTURA.md)
  § 7. Documenti vecchi: ADR-37 e la skill `.claude/skills/formato/SKILL.md`.
- Un anno nuovo non salvato sta in `anni-nuovi/` fra i dati dell'applicazione
  (`src/data/paths.ts`).

**I dati dell'applicazione** (`userData`): `%APPDATA%\Regiclass` per
l'installato, `Regiclass - dati` accanto all'eseguibile per il portabile
(`shell/system/portable.ts`).

| File o cartella | Che cosa |
| --- | --- |
| `impostazioni.json` | impostazioni del programma, fra cui `cartellaLavoro` e `registroDocenti.ultimoDocumento` |
| `documenti.json` | recenti (dodici) e preferiti |
| `finestre.json` | posto e misura delle finestre, riletti solo se cadono in uno schermo attaccato |
| `segreti.json` | accesso alla posta, cifrato con `safeStorage`; senza portachiavi non si scrive |
| `interfaccia/` | stato del pannello che non è una preferenza |
| `materializzati/` | cache dei file del documento aperti da fuori |
| `tasselli/` | cache della mappa |
| `anni-nuovi/` | anni non ancora salvati con nome |
| cartella dei modelli | `.gguf` e programma delle scansioni |

Le impostazioni del documento (materie, scala, giornata di scuola, calendario,
carte intestate) viaggiano nel `.regi` (ADR-21). Elenco delle chiavi:
[CATALOGO](CATALOGO.md) § 5.

**Campioni.** `tests/samples/2026-2027.regi` (dati inventati; si rinomina in
`.zip` per guardarci dentro) lo riapre `tests/data/sample.test.mjs`.
`tests/samples/formato/` ha un documento per versione del formato, riaperti da
`tests/data/formatUpgrade.test.mjs`. `npm run sample` rigenera il campione e
fissa quello della versione di oggi se manca; i vecchi non si riscrivono.
**Un `.regi` vero non si allega mai** a una issue né al repository.

## I rapporti in PDF

- Impaginazione in `templates/`, un file per rapporto, righe
  `direttiva: contenuto`; formato descritto in `templates/LEGGIMI.md`.
- `npm run templates` → `src/data/defaultTemplates.ts`, l'unica copia letta.
- Strati comuni: `_base.tpl` (testata e piede), `_stile.tpl` (misure),
  `_testi.tpl` / `_testi-<lingua>.tpl` (parole e nomi delle colonne),
  `_blocchi.tpl` (pezzi ripetuti, `usa:`). Il compilatore risolve `se:` e
  `ripeti:` e consegna blocchi piatti.
- Larghezze delle colonne misurate sul contenuto: `src/domain/reports.ts`,
  `tests/domain/reports.test.mjs`.
- I modelli sono del programma; del documento solo le carte intestate (ADR-34).

## Sviluppo

Node.js 24.

```bash
npm run dev          # esbuild in ascolto, applicazione avviata, ricarica
npm run build        # una compilazione in dist/
npm start            # compila e lancia
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm test             # le prove, con node --test
npm run ui-tests     # prove dell'interfaccia su Chromium (Python + Playwright)
npm run package      # installer e portabile in pacchetti/
npm run clean        # butta bundle e cache
```

- `npm run dev` (`tools/dev.mjs`): una vista, un foglio o una pagina nativa
  cambiati ricaricano le pagine; main process o preload cambiati riavviano
  l'applicazione e riaprono l'anno. Regola: il campo `ricarica` in
  `esbuild.mjs`. Un bundle che non compila lascia quello di prima.
- `dist/` = bundle dell'applicazione. `dist-tests/` = gli stessi sorgenti in
  ESM per Node, con `electron` sostituito da `tests/helpers/fake-electron.mjs`
  (li prepara `pretest`).
- `tests/ui/*.py` usano dati sintetici e stanno fuori da `npm test`.

Controlli fatti in casa:

```bash
npm run layers       # confini fra strati, cicli
npm run census       # export che nessuno chiama
npm run collections  # scritture che toccano raccolte non dichiarate
npm run forms        # campi di un modulo non raccolti al salvataggio
npm run buttons      # comandi disegnati senza dire che cosa fanno
npm run procedures   # procedure fuori posto o non registrate
npm run docs         # documenti che nominano file o script inesistenti
npm run i18n         # testi fuori catalogo
```

Li fa girare `.github/workflows/verifica.yml` a ogni push, con `tsc`, ESLint,
`npm test` e, a parte, le prove dell'interfaccia; `npm run ci` fa gli stessi
passi in locale. Come leggerne l'uscita: `.claude/skills/verifica/SKILL.md`.

File generati, non scritti a mano: `resources/tools.json` (`npm run tools`),
`src/data/defaultTemplates.ts` (`npm run templates`),
`src/data/schoolCalendarTicino.ts` (`npm run calendario`),
`tests/samples/2026-2027.regi` (`npm run sample`), le icone di `icons/`
(`npm run icons`, dai disegni in `resources/`).

## Pacchetto e aggiornamenti

- `npm run package`: aggiorna il calendario scolastico (`npm run calendario`:
  Python con `pdftotext` o `pdfplumber`, e la rete; senza, resta quello che
  c'è), compila e lancia electron-builder (`electron-builder.json`): installer
  per utente senza diritti di amministratore, e portabile.
- La versione sta solo in `package.json`. Quando cambia su `main`,
  `.github/workflows/rilascio.yml` verifica, impacchetta, firma, crea il tag
  `vX.Y.Z` e pubblica la release (bozza finché i file e `latest.yml` non sono
  caricati).
- Aggiornamenti con `electron-updater` (`src/environment/updates.ts`): mezzo
  minuto dopo l'avvio e poi ogni sei ore; di serie scarica e installa alla
  chiusura. Lo stato è già detto a parole (`racconta`) per tutte le superfici.
  L'installazione la conduce `os/windows/aggiornamento.ps1`
  (`src/environment/updateInstaller.ts`). Si aggiorna da sé solo l'installato
  su Windows; portabile e altri sistemi mandano alla pagina delle release.

## La firma del codice

Gli eseguibili per Windows li firma [SignPath](https://signpath.io) con il
certificato di [SignPath Foundation](https://signpath.org), gratuito per
l'open source, solo per quel che esce da una GitHub Action di questo
repository. La dichiarazione richiesta sta nel README, § «Code signing policy».

Il lavoro `pacchetti` di `.github/workflows/rilascio.yml`:

1. electron-builder costruisce `pacchetti/win-unpacked/` con il bersaglio
   `nsis` (non `--dir`: solo così scrive `app-update.yml`, senza il quale
   l'installato non si aggiorna). L'installatore non firmato si butta.
2. SignPath firma l'eseguibile (configurazione `eseguibile`).
3. `electron-builder --prepackaged` costruisce installatore e portabile intorno
   all'eseguibile firmato, con `latest.yml` e `.blockmap`.
4. SignPath firma installatore e portabile (configurazione `installatori`);
   `node tools/signing.mjs firmati` rifà la `.blockmap` e aggiorna impronta e
   misura in `latest.yml`, o gli aggiornamenti verrebbero scartati.

Prima di ogni firma `tools/peMetadata.ps1` controlla nome del prodotto e
versione negli eseguibili; dopo l'ultima, `Get-AuthenticodeSignature` e
caricamento con `gh`, con note generate da GitHub. Ogni firma aspetta
l'approvazione su SignPath fino a un'ora; se cade, un `workflow_dispatch` la
rifà.

- Configurazioni degli artefatti: `.signpath/artifact-configuration/`
  (`eseguibile.xml`, `installatori.xml`), da tenere uguali a quelle su SignPath.
  La versione arriva da `node tools/signing.mjs versioni`: `X.Y.Z` per
  installatore e portabile (NSIS), `X.Y.Z.0` per l'eseguibile (resedit).
- Nel pacchetto entra solo il commit: il calendario del DECS si rilegge solo
  per avvisare se il repository è indietro. Si rilascia solo da `main`.
- Senza firma: quel che non è nostro (DLL di Electron, binari di llama.cpp,
  `elevate.exe`) e il disinstallatore di NSIS.

**Condizioni della Foundation** ([signpath.org/terms](https://signpath.org/terms)):

| Condizione | Dove si soddisfa |
| --- | --- |
| Licenza OSI per tutti i componenti | MIT (`LICENSE`); le dipendenze impacchettate sono MIT, ISC, BlueOak-1.0.0, Apache-2.0, 0BSD, Python-2.0 |
| Niente componenti proprietari | binari CUDA di `node-llama-cpp` esclusi con `files` in `electron-builder.json` |
| Rilasciato, mantenuto, documentato | release di GitHub e README |
| Firmare solo i propri binari | eseguibile, installatore, portabile; niente DLL né `.node` |
| Costruzione verificabile | runner di GitHub, solo da `main`, solo il commit |
| Privacy | README › «Code signing policy» › «Privacy»; uscite: § «Che cosa esce dal computer» |
| Modifiche al sistema annunciate | prima pagina dell'installatore (`os/windows/installer.nsh`) |
| Disinstallazione | disinstallatore NSIS + `src/cli/disinstalla.mjs`; nel portabile «Disinstalla…» |
| MFA su GitHub e SignPath | a mano |
| Ruoli | README; revisione in `CONTRIBUTING.md` § «Revisione e firma» |
| «Code signing policy» visibile | titolo e testa del README |
| Nome e versione imposti | `.signpath/artifact-configuration/`, `tools/peMetadata.ps1` |
| Firma approvata a mano | politica `release-signing` su SignPath |

**Finché SignPath non ammette il progetto** mancano il segreto
`SIGNPATH_API_TOKEN` e la variabile `SIGNPATH_ORGANIZATION_ID`: i passi di
firma si saltano. All'ammissione:

1. domanda su [signpath.org/apply](https://signpath.org/apply);
2. su SignPath: sistema di build *GitHub.com*, app GitHub sul repository,
   configurazioni `eseguibile` e `installatori` con il contenuto dei due `.xml`,
   politica `release-signing` con approvazione a mano, 2FA;
3. su GitHub (*Settings › Secrets and variables › Actions*): segreto e
   variabile. Se progetto o politica hanno altri nomi di `regiclass` e
   `release-signing`, si cambiano `SIGNPATH_PROGETTO` e `SIGNPATH_POLITICA` in
   testa al lavoro `pacchetti`;
4. alla prima release firmata, togliere l'avviso SmartScreen dal README (il
   certificato non è EV: la reputazione arriva con gli scarichi).

## Il condotto, e il registro da terminale

- `registroDocenti.api.condotto` acceso: JSON-RPC su pipe nominata (Windows) o
  socket Unix, mai su una porta di rete. `registroDocenti.api.lettura` accesa
  di serie, `registroDocenti.api.scrittura` spenta; una scrittura senza
  permesso torna `non-permesso`.
- `regi`: l'installato scrive a ogni avvio un ponte in una cartella nel PATH
  dell'utente (`shell/system/commandLine.ts`) che lancia `src/cli/registro.mjs`
  con l'eseguibile del registro e `ELECTRON_RUN_AS_NODE`. Il portabile no. Dal
  repository: `npm run regi -- elenco`.
- Contratto: [API](API.md) § 7 (condotto) e § 8 (riga di comando).

## L'assistente e i modelli

- Due usi, tutti in locale: l'**assistente** (risponde leggendo i dati con le
  procedure di lettura) e la **lettura delle scansioni** dello smistamento.
- Un modello è un `.gguf` nella cartella dei modelli (o in
  `registroDocenti.modelli.cartella`), caricato con `node-llama-cpp` (ADR-25).
- Le scansioni vogliono un modello che guarda, il suo proiettore (`mmproj`) e
  `llama-mtmd-cli`, scaricato da sé con versione fissata e impronta verificata
  (`src/data/visionKit.ts`), o indicato a mano spegnendo
  `registroDocenti.modelli.scaricoAutomatico`.
- Dettatura: [voicebox](https://github.com/jamiepine/voicebox) a parte, su
  `registroDocenti.dettatura.indirizzo`, solo locale (ADR-35).
- L'assistente per intero: [API](API.md) § 9.

## Che cosa esce dal computer

Nessun server, account o telemetria. Le uscite verso la rete sono queste e
nessun'altra (per chi usa: la guida in-app, «Che cosa esce dal computer»).

| Uscita | Verso | Che cosa parte | Quando |
| --- | --- | --- | --- |
| Geocodifica | `nominatim.openstreetmap.org` | indirizzi (via, NAP, località), una richiesta al secondo, `User-Agent` dichiarato | solo con «Trova gli indirizzi» (`src/data/geocoding.ts`) |
| Carte della mappa | `tile.openstreetmap.org` | coordinate dei tasselli (la zona, non i nomi) | guardando la mappa o il riquadro «Dove sta» di un allievo; cache in `tasselli/` (`shell/protocol/tiles.ts`) |
| Posta | `login.microsoftonline.com`, `smtp.office365.com` | accesso alla casella e messaggi con allegati | collegando la casella, e spedendo con «Spedisci senza bozza» (spento di serie) (`src/data/oauth.ts`, `src/data/exchange.ts`) |
| Calendario della scuola | l'indirizzo ICS scritto dal docente | una GET, senza dati | aggiungendo, aggiornando o confrontando un calendario (`src/data/calendar.ts`) |
| Aggiornamenti | release di GitHub | «qual è l'ultima versione», poi lo scarico | all'avvio e ogni sei ore, se acceso |
| Modelli | `huggingface.co` | parole cercate, depositi e file da scaricare | cercando o scaricando (`src/data/huggingFace.ts`) |
| Programma delle scansioni | release di llama.cpp su GitHub | la richiesta del file | la prima volta che serve, se lo scarico automatico è acceso |

Restano sulla macchina conversazione, scansioni lette e voce (a voicebox, su
questo computer). Il **condotto** non esce dal computer, ma lascia leggere i
dati a ogni programma dello stesso utente; di serie è spento.
