// I mattoni dei controlli: elementi costruiti uno a uno nel `documento` che
// chi disegna passa, con il testo in `textContent` (mai `innerHTML`: sono
// frasi del manifesto e valori scritti a mano). Come `core/i18n/flags.ts`.

/** Un elemento con la sua classe e dentro nodi o testo. */
export function elemento<K extends keyof HTMLElementTagNameMap> (
  documento: Document,
  tag: K,
  classe: string | null,
  ...dentro: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const nato = documento.createElement(tag)
  if (classe) nato.className = classe
  for (const pezzo of dentro) {
    if (typeof pezzo === 'string') nato.append(documento.createTextNode(pezzo))
    else nato.append(pezzo)
  }
  return nato
}

/** Mette o toglie un attributo: `null` e `false` lo tolgono. */
export function attributo (
  bersaglio: Element,
  nome: string,
  valore: string | boolean | null,
): void {
  if (valore === null || valore === false) bersaglio.removeAttribute(nome)
  else bersaglio.setAttribute(nome, valore === true ? '' : valore)
}

/** Un id che regge qualunque chiave: `registroDocenti.aspetto.tema` ha i punti. */
export function idDi (...parti: string[]): string {
  // testo-fisso: un identificatore, non testo
  return ['controllo', ...parti].join('-').replace(/[^\w-]/g, '-')
}
