// I testi del telaio (`shell.ts`): la barra degli avvisi sui riferimenti che
// non tornano, il filo di lavoro e l'apertura.

import { catalogo } from '../i18n/index.js'

const it = {
  nonTornano: (quanti: number) =>
    `${quanti} riferiment${quanti === 1 ? 'o' : 'i'} non torna${quanti === 1 ? '' : 'no'}: `,
  ripara: 'Ripara',
  ripararTitolo: 'Riparare il registro?',
  riparato: 'Registro riparato.',
  restano: (quanti: number) =>
    `Fatto quel che si poteva fare da sé; ${quanti} ` +
    `riferiment${quanti === 1 ? 'o' : 'i'} da sistemare a mano: li elenca «Dettagli».`,
  staLavorando: 'Il registro sta lavorando',
  apertura: 'Apertura del registro…',
}

export const testi = catalogo(it, {
  de: {
    nonTornano: (quanti) =>
      `${quanti} ${quanti === 1 ? 'Verweis stimmt' : 'Verweise stimmen'} nicht: `,
    ripara: 'Reparieren',
    ripararTitolo: 'Klassenbuch reparieren?',
    riparato: 'Klassenbuch repariert.',
    restano: (quanti) =>
      'Erledigt, was von selbst ging; ' +
      `${quanti} ${quanti === 1 ? 'Verweis ist' : 'Verweise sind'} von Hand zu beheben: ` +
      '«Details» listet sie auf.',
    staLavorando: 'Das Klassenbuch arbeitet',
    apertura: 'Klassenbuch wird geöffnet…',
  },
  fr: {
    nonTornano: (quanti) =>
      quanti === 1
        ? `${quanti} référence ne correspond pas : `
        : `${quanti} références ne correspondent pas : `,
    ripara: 'Réparer',
    ripararTitolo: 'Réparer le registre ?',
    riparato: 'Registre réparé.',
    restano: (quanti) =>
      'Fait ce qui pouvait se faire tout seul ; ' +
      `${quanti} ${quanti === 1 ? 'référence' : 'références'} à régler à la main : ` +
      '« Détails » les liste.',
    staLavorando: 'Le registre travaille',
    apertura: 'Ouverture du registre…',
  },
  en: {
    nonTornano: (quanti) =>
      `${quanti} ${quanti === 1 ? 'reference does' : 'references do'} not match: `,
    ripara: 'Repair',
    ripararTitolo: 'Repair the register?',
    riparato: 'Register repaired.',
    restano: (quanti) =>
      'Done what could be done automatically; ' +
      `${quanti} ${quanti === 1 ? 'reference' : 'references'} to fix by hand: ` +
      '“Details” lists them.',
    staLavorando: 'The register is working',
    apertura: 'Opening the register…',
  },
})
