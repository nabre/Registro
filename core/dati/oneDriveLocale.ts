// Gli account che il client di OneDrive sincronizza su questo computer, letti
// dal registro di Windows. Non chiede niente a Microsoft: è la strada che resta
// quando la scuola riserva all'amministratore il consenso per Graph. Su macOS le
// cartelle di `~/Library/CloudStorage` non dicono di quale account sono, e questa
// strada non c'è.

import { execFile } from 'node:child_process'

import * as apparato from 'apparato'

import { oneDriveSulComputer, type OneDriveLocale } from '../dominio/onedrive.js'
import { stessoIndirizzo } from '../dominio/mailbox.js'

let noti: OneDriveLocale[] = []
/** Per le prove: un elenco fisso al posto del registro di Windows. */
let fissati: OneDriveLocale[] | null = null

function leggiRegistro (): Promise<string> {
  return new Promise<string>((risolvi) => {
    try {
      // Percorso intero: un `reg.exe` nella cartella del documento partirebbe al
      // posto di quello vero (`outlook.ts`).
      execFile(
        apparato.diSistema('reg.exe') ?? 'reg.exe',
        ['query', 'HKCU\\Software\\Microsoft\\OneDrive\\Accounts', '/s'],
        { windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
        (errore: Error | null, detto: string) => risolvi(errore ? '' : detto),
      )
    } catch {
      risolvi('')
    }
  })
}

/**
 * Rilegge gli account sincronizzati; vero se l'elenco è cambiato. Un account
 * aggiunto al client di OneDrive a registro aperto compare alla lettura dopo.
 */
export async function aggiornaOneDriveLocali (): Promise<boolean> {
  const letti = fissati ?? (process.platform === 'win32' ? oneDriveSulComputer(await leggiRegistro()) : [])
  const cambiati = JSON.stringify(letti) !== JSON.stringify(noti)
  noti = letti
  return cambiati
}

/** Gli account sincronizzati, per quel che si sa senza rileggere. */
export function oneDriveLocaliNoti (): readonly OneDriveLocale[] {
  return noti
}

/** Le cartelle sincronizzate di un account; vuoto se non lo è su questo computer. */
export function cartelleLocaliDi (account: string): string[] {
  return noti.find((voce) => stessoIndirizzo(voce.indirizzo, account))?.cartelle ?? []
}

/** Per le prove: fissa gli account sincronizzati (`null` torna al registro). */
export function fissaOneDriveLocali (elenco: OneDriveLocale[] | null): void {
  fissati = elenco
  noti = elenco ?? []
}
