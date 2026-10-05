// Il valore che una casella ha mandato all'host e non ha ancora visto tornare.
// Un secondo clic rapido deve partire da lì, non dal disegno: finché l'host non
// rispinge il registro il disegno dice ancora lo stato di prima, e il secondo
// clic manderebbe lo stesso valore del primo.
//
// La mappa si legge nel gestore del clic, non nel disegno, e non fa
// ridisegnare. Le viste la tengono a livello di modulo (`statoInVolo()`), che
// sopravvive anche lasciando la pagina con un clic in volo.

/** Le caselle in volo di una vista, per chiave stabile fra due ridisegni. */
export interface StatoInVolo<T> {
  /**
   * Il valore da cui parte un clic: quello in volo, o se non c'è `disegnato`
   * (che può essere `undefined`, per chi vuole sapere se c'è qualcosa in volo).
   */
  da: <D>(chiave: string, disegnato: D) => T | D
  /**
   * Segna `valore` in volo e lo manda con `invio`. Tornato l'esito, la voce si
   * toglie solo se nel frattempo non è partito un clic dopo (confrontare il
   * valore non basta con spunta-togli-spunta). Respinto, si torna subito al
   * disegno; riuscito, si aspetta il fotogramma del ridisegno: l'host spinge il
   * registro prima della risposta, ma la pagina lo disegna al fotogramma dopo.
   */
  manda: <R extends { ok: boolean }>(
    chiave: string, valore: T, invio: () => Promise<R>,
  ) => Promise<R>
}

export function statoInVolo<T> (): StatoInVolo<T> {
  const valori = new Map<string, T>()
  const numeri = new Map<string, number>()

  const togli = (chiave: string, mio: number): void => {
    if (numeri.get(chiave) !== mio) return
    valori.delete(chiave)
    numeri.delete(chiave)
  }

  return {
    da: (chiave, disegnato) => (valori.has(chiave) ? valori.get(chiave) as T : disegnato),
    async manda (chiave, valore, invio) {
      const mio = (numeri.get(chiave) ?? 0) + 1
      numeri.set(chiave, mio)
      valori.set(chiave, valore)
      let riuscita = false
      try {
        const esito = await invio()
        riuscita = esito.ok
        return esito
      } finally {
        if (riuscita && typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => togli(chiave, mio))
        } else {
          togli(chiave, mio)
        }
      }
    },
  }
}
