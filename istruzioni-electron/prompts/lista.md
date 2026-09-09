FASE 1

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e `istruzioni-electron/01-fondamenta.md`.
> Leggi poi `src/dati/percorsi.ts`, `src/dati/archivio.ts` ed `esbuild.mjs` per
> prendere le misure dello stile.
>
> Esegui **solo la fase 1**. Non anticipare le fasi successive: le parti dello
> shim che appartengono alle fasi seguenti devono lanciare un errore esplicito,
> non essere implementate.
>
> Non modificare nessun file esistente all'infuori di `package.json` e
> `esbuild.mjs`. Se ti sembra necessario, fermati e chiedi.
>
> Al termine mostrami: i file creati, l'esito di `npm run controllo-tipi`,
> `npm test`, `npm run build:desktop` e `npm run pacchetto`, e l'elenco delle
> decisioni che hai dovuto prendere e che il documento non copriva.


FASE 2

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e `istruzioni-electron/02-finestre.md`.
> Leggi per intero `src/pannello.ts` e `src/estensione.ts`, e `src/webview/ponte.ts`
> righe 1-40.
>
> Esegui **solo la fase 2**. I dialoghi, i comandi e gli osservatori sono della
> fase 3: devono continuare a lanciare l'errore esplicito.
>
> Il vincolo che conta più di ogni altro: `src/pannello.ts` e
> `src/pannelloProiezione.ts` devono funzionare **senza una sola modifica**. Se ti
> sembra che serva modificarli, fermati e chiedi: significa che manca qualcosa in
> `src/ambiente/finestre.ts`.
>
> Al termine mostrami i file creati, `git diff --stat`, e dimmi se hai dovuto
> tradire in qualche punto la forma di `WebviewPanel`.


FASE 3

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e
> `istruzioni-electron/03-dialoghi-comandi-osservatori.md`. Leggi
> `src/estensione.ts` righe 120-330, `src/dati/smistatore.ts` righe 218-300 e
> `src/dati/archivio.ts` righe 725-760.
>
> Esegui **solo la fase 3**. Il menu e le impostazioni sono della fase 4: per
> provare i comandi va bene invocarli temporaneamente dalla console, senza
> costruire il menu.
>
> Presta attenzione particolare alla difesa contro l'eco delle proprie scritture
> descritta al §3: provala esplicitamente prima di dichiarare finita la fase.
>
> Non modificare file esistenti, salvo l'eccezione condizionata su
> `src/dati/archivio.ts`. Se la usi, dimmelo e spiegami perché.


FASE 4


## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e
> `istruzioni-electron/04-menu-e-impostazioni.md`. Leggi in `package.json` le
> sezioni `contributes.commands`, `contributes.keybindings`,
> `contributes.menus.commandPalette` e `contributes.configuration.properties`.
>
> Esegui **solo la fase 4**. La posta è della fase 5: i comandi della posta devono
> comparire nel menu, ma se non funzionano ancora va bene.
>
> Il menu e la finestra delle impostazioni si generano **leggendo `package.json` a
> build time**, non ricopiando gli elenchi. Se per qualche voce non riesci, dimmi
> quale e perché invece di ricopiarla.
>
> Al termine mostrami l'elenco dei comandi che sono finiti nel menu e quello dei
> comandi che hai lasciato fuori, con la ragione.


FASE 5

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e `istruzioni-electron/05-posta.md`.
> Leggi per intero `src/dati/oauth.ts`, e `src/dati/posta.ts` righe 650-720.
>
> Esegui **solo la fase 5**.
>
> Comincia **provando** il flusso device-code senza modificare `oauth.ts`: secondo
> l'analisi dovrebbe funzionare già. Modifica soltanto se non funziona, e in quel
> caso dimmi che cosa non funzionava prima di toccare.
>
> L'unica modifica prevista a un file esistente è la stringa dell'URI di
> reindirizzamento alla riga ~379 di `oauth.ts`. Verifica sulla documentazione
> Microsoft corrente che cosa vada scritto, e scrivilo nello stesso tono del resto
> di quelle istruzioni.
>
> Se il collegamento fallisce per una ragione che sembra venire dal tenant e non
> dal codice, fermati e dimmelo invece di aggirarla.


FASE 6

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e
> `istruzioni-electron/06-impacchettare.md`.
>
> Esegui **solo la fase 6**: produci `electron-builder.json`, le icone, e i due
> bersagli Windows.
>
> Appena hai il primo pacchetto, prova per prima cosa lo smistamento di un PDF
> nella versione installata: è la prova che il worker di pdfjs è uscito
> correttamente dall'asar, ed è il guasto più probabile di questa fase.
>
> Sulla versione portabile, dimmi dove finiscono impostazioni e portachiavi e
> quali sono le alternative, ma **non decidere da solo**: chiedimelo.
>
> Sulla firma del codice non fare niente: riportami soltanto che cosa comporta non
> firmare.


FASE 7

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e
> `istruzioni-electron/07-albero-e-barra.md`. Leggi per intero
> `src/vista/alberoRegistro.ts` e `src/protocollo.ts`.
>
> Esegui **solo la fase 7**.
>
> Comincia dal punto 1.2: scrivi `test/albero.test.mjs` sulla logica dei nodi
> **prima** di spostarla. È una rifattorizzazione, e senza rete non si fa.
>
> Il vincolo che conta: nel `.vsix` l'albero deve restare identico a com'è oggi.
> Se una scelta lo cambia anche di poco, fermati e dimmelo.
>
> Al termine mostrami il diff di `src/vista/alberoRegistro.ts` e spiegami che cosa
> è finito nel dominio e che cosa è rimasto nella vista.


FASE 8

## Prompt da incollare

> Leggi `istruzioni-electron/00-premessa.md` e
> `istruzioni-electron/08-accesso-microsoft.md`. Leggi per intero
> `src/dati/oauth.ts`.
>
> Prima di scrivere codice: verifica sulla documentazione Microsoft corrente le
> regole per un client pubblico nativo con PKCE e redirect su localhost, e dimmi
> se qualcosa è cambiato rispetto a quel che il documento dà per buono.
>
> Poi esegui la fase 8. Il modo nuovo si **affianca** ai tre esistenti, non ne
> sostituisce nessuno, e chi era già collegato non deve perdere niente.
>
> Non toccare `exchange.ts` né `posta.ts`: se ti sembra necessario, fermati e
> chiedi.
