// Le due enumerazioni che il registro nomina e che non appartengono a nessun
// altro file.
//
// Erano di più: c'erano anche `TreeItem`, `ThemeIcon`, `StatusBarItem` e le
// loro compagne, forme vuote che esistevano perché l'albero laterale e la barra
// di stato dell'editor venissero costruiti senza scoppiare. L'albero e la barra
// non ci sono più — la barra laterale del pannello fa la stessa navigazione, e
// la fa dove si guarda — e con loro se ne sono andate le forme che li reggevano.
//
// Queste due invece servono davvero, ed è l'unica ragione per cui sono rimaste.

/**
 * Dove si apre un pannello. Sul desktop ogni pannello è una finestra e la
 * colonna non comanda niente, ma `pannello.ts` e `pannelloProiezione.ts` la
 * nominano — `ViewColumn.One`, `ViewColumn.Beside` — e i numeri devono essere
 * quelli, perché è quel che le prove confrontano.
 */
export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

/**
 * Dove finisce il racconto di un lavoro lungo. Lo guarda `withProgress` in
 * `dialoghi.ts`: `Notification` è l'unico caso che il registro usa davvero.
 */
export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}
