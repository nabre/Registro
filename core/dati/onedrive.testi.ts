// I testi di `onedrive.ts`: il dialogo di dove scaricare un documento, e il
// rifiuto di un elemento che non è un documento del registro.

import { catalogo } from '../i18n/index.js'

const it = {
  nonRegi: (nome: string) => `«${nome}» non è un documento del registro (.regi).`,
  doveScaricare: (nome: string) =>
    `«${nome}» non è sincronizzato su questo computer: dove lo scarico?`,
  scarico: (nome: string) => `Regiklass: scarico «${nome}» da OneDrive…`,
  fuoriDaOneDrive: 'Questa cartella non è fra quelle che OneDrive sincronizza per l’account.',
  nonSincronizzato: (account: string) =>
    `OneDrive di ${account} non è sincronizzato su questo computer.`,
  nonCePiu: (nome: string) => `«${nome}» non c’è più nella cartella di OneDrive.`,
}

export const testi = catalogo(it, {
  de: {
    nonRegi: (nome) => `«${nome}» ist kein Dokument des Klassenbuchs (.regi).`,
    doveScaricare: (nome) =>
      `«${nome}» wird auf diesem Computer nicht synchronisiert: Wohin soll ich es herunterladen?`,
    scarico: (nome) => `Regiklass: «${nome}» wird von OneDrive heruntergeladen…`,
    fuoriDaOneDrive: 'Dieser Ordner gehört nicht zu denen, die OneDrive für das Konto synchronisiert.',
    nonSincronizzato: (account) =>
      `Das OneDrive von ${account} wird auf diesem Computer nicht synchronisiert.`,
    nonCePiu: (nome) => `«${nome}» ist nicht mehr im OneDrive-Ordner.`,
  },
  fr: {
    nonRegi: (nome) => `« ${nome} » n’est pas un document du registre (.regi).`,
    doveScaricare: (nome) =>
      `« ${nome} » n’est pas synchronisé sur cet ordinateur : où le télécharger ?`,
    scarico: (nome) => `Regiklass : téléchargement de « ${nome} » depuis OneDrive…`,
    fuoriDaOneDrive: 'Ce dossier ne fait pas partie de ceux que OneDrive synchronise pour le compte.',
    nonSincronizzato: (account) =>
      `Le OneDrive de ${account} n’est pas synchronisé sur cet ordinateur.`,
    nonCePiu: (nome) => `« ${nome} » n’est plus dans le dossier OneDrive.`,
  },
  en: {
    nonRegi: (nome) => `“${nome}” is not a register document (.regi).`,
    doveScaricare: (nome) =>
      `“${nome}” is not synced on this computer: where should I download it?`,
    scarico: (nome) => `Regiklass: downloading “${nome}” from OneDrive…`,
    fuoriDaOneDrive: 'This folder is not one of those OneDrive syncs for the account.',
    nonSincronizzato: (account) => `The OneDrive of ${account} is not synced on this computer.`,
    nonCePiu: (nome) => `“${nome}” is no longer in the OneDrive folder.`,
  },
})
