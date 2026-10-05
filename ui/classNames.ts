// Le classi di un elemento da pezzi che possono mancare:
// `classi('a', cond && 'b')`.

/** I nomi veri, separati da uno spazio; `undefined` se non ce n'è nessuno, così l'attributo non compare. */
export function classi (...nomi: Array<string | false | null | undefined | 0>): string | undefined {
  const pulite = nomi.filter((nome): nome is string => typeof nome === 'string' && nome.length > 0)
  return pulite.length > 0 ? pulite.join(' ') : undefined
}
