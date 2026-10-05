// I tipi con cui nascono le finestre del registro. La principale tiene quello
// di sempre, così posto (`placement.ts`) e memoria (`uiState.ts`) restano i
// suoi; ogni figlia ha il suo numero nel tipo, e con quello il suo posto e la
// sua memoria. Solo stringhe: lo leggono `windows.ts`, i pannelli e le prove.

/** Il tipo della finestra principale del registro. */
export const TIPO_REGISTRO = 'registroDocenti.pannello'

/** La principale è la 1; le figlie partono da 2. */
export const NUMERO_PRINCIPALE = 1

const FIGLIA = /^registroDocenti\.pannello\.([2-9]\d*)$/

/** Il tipo della finestra del registro con quel numero. */
export function tipoDelRegistro (numero: number): string {
  return numero === NUMERO_PRINCIPALE ? TIPO_REGISTRO : `${TIPO_REGISTRO}.${numero}`
}

/** Il numero della finestra del registro di quel tipo, o `null` se non è del registro. */
export function numeroDelRegistro (tipo: string): number | null {
  if (tipo === TIPO_REGISTRO) return NUMERO_PRINCIPALE
  const figlia = FIGLIA.exec(tipo)
  return figlia ? Number(figlia[1]) : null
}

/** Se il tipo è di una finestra del registro, principale o figlia. */
export function èDelRegistro (tipo: string): boolean {
  return numeroDelRegistro(tipo) !== null
}
