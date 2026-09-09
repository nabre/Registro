# Fase 7 — L'albero e la barra di stato

**Rende possibile:** la navigazione laterale e le azioni di contesto tornano, e
per la prima volta sono le stesse nel `.vsix` e nell'app.

> Leggere `00-premessa.md` prima di cominciare.

---

## Quando fare questa fase

**Dopo che qualcuno ha usato l'app per almeno una settimana**, non prima.

L'app è utilizzabile senza: la navigazione vive già nel pannello — calendario,
classi, corsi, piani, valutazioni — e l'albero è un secondo modo di arrivare alle
stesse cose. È possibile che l'uso reale mostri che non serviva, o che serviva
diverso da com'è nel `.vsix`.

Questo è lavoro di rifinitura, e ha senso solo su un'app che qualcuno sta già
usando. Fare prima le fasi 1-6 e rilasciare.

## Prerequisiti

- Le fasi da 1 a 6 sono chiuse, e l'app è stata usata davvero.
- Leggere `src/vista/alberoRegistro.ts` per intero (427 righe) e
  `src/vista/barraStato.ts` (poche righe).
- Leggere `src/protocollo.ts` — questa è la prima fase che lo tocca, e va toccato
  con la stessa cura con cui è stato scritto.

## Perimetro

Questa è l'unica fase che modifica file esistenti in modo sostanziale, ed è
prevista.

**Si crea:** `src/dominio/albero.ts`, una vista nel webview, un messaggio nel
protocollo.
**Si modifica:** `src/vista/alberoRegistro.ts` (si svuota della logica),
`src/protocollo.ts` (si aggiunge), `src/webview/**` (si aggiunge la barra
laterale).

---

## 1. Il taglio giusto

`vista/alberoRegistro.ts` è già diviso bene, e questo è quel che rende la fase
fattibile: la costruzione dei nodi — `radici`, `figliDi` — è **logica pura sul
registro**, e solo `getTreeItem` (righe 230-425) parla di VS Code.

Il piano è di spostare la parte pura, non di riscriverla:

1. Estrarre `radici`, `figliDi` e il tipo `Nodo` in **`src/dominio/albero.ts`**.
   Lì dentro non entra niente che sappia di VS Code o di Electron, e lì dentro
   arriva la copertura dei test — che oggi l'albero non ha, perché sta in `vista/`.
2. Scrivere `test/albero.test.mjs`: la forma dell'albero su un registro finto,
   l'ordinamento, i nodi vuoti. Farlo **prima** di toccare la vista.
3. `vista/alberoRegistro.ts` resta, ma diventa sottile: importa da
   `dominio/albero.ts` e si limita a `getTreeItem`, cioè a tradurre un `Nodo` in
   una `TreeItem` di VS Code. Il `.vsix` continua a funzionare come prima.
4. Aggiungere al protocollo un messaggio `albero` con i nodi serializzati, spinto
   insieme allo stato.
5. Disegnare la barra laterale nel webview, con i componenti che ci sono già in
   `src/webview/componenti/`.

Il risultato è che **il `.vsix` e l'app disegnano lo stesso albero a partire dagli
stessi nodi**, ed è meglio di adesso, dove l'albero esiste in un posto solo e non
è provato.

## 2. Le azioni di contesto

Con l'albero tornano raggiungibili i comandi che alla fase 4 erano stati lasciati
fuori dal menu: `lezioneApri`, `lezioneDuplica`, `lezioneElimina`,
`pianoPerLezione`, `valutazioneDelCorso`, `orarioGenera`, `corsoEsportaPresenze`.

Nel `.vsix` sono un menu contestuale sul nodo, dichiarato in
`contributes.menus.view/item/context` con le condizioni `when`. Nel webview
diventano un menu su clic destro, e le condizioni `when` — che sono espressioni
su `viewItem` — si traducono nel genere del nodo, che il webview ha già in mano.

`src/webview/componenti/menu.ts` esiste già: usarlo, non scriverne un altro.

## 3. La barra di stato

`vista/barraStato.ts` mostra una riga di sintesi con un tooltip in Markdown.
Diventa una striscia in fondo al pannello.

Stesso taglio: la logica che compone il testo va nel dominio (o resta dov'è se è
già pura), la resa va nel webview.

## 4. Che cosa si può togliere dallo shim

Finita questa fase, `src/ambiente/inerti.ts` non serve più al target desktop —
`TreeItem`, `ThemeIcon` e `StatusBarItem` restano usati solo dal ramo `.vsix`, che
ha l'API vera. Lasciarlo comunque: il file compila per entrambi i target e toglierlo
non guadagna niente.

---

## Criterio di accettazione

- [ ] `test/albero.test.mjs` copre la forma dell'albero, e passa
- [ ] nel `.vsix` l'albero è **identico a prima** (è una rifattorizzazione, non un
      cambiamento: verificarlo voce per voce)
- [ ] nell'app la barra laterale mostra lo stesso albero
- [ ] le sette azioni di contesto funzionano nell'app
- [ ] la barra di stato mostra le stesse informazioni nei due mondi
- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` verdi
- [ ] le quattro prove manuali di `00-premessa.md` §6 passano

