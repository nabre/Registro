// I testi della pagina della mappa (`map.ts`): la testata, l'elenco degli
// indirizzi e il cartellino di un segnaposto.

import { catalogo } from '../../i18n/index.js'
import { PIF, del, quanti } from '../../domain/lexicon.js'
import { plurale } from '../../domain/text.js'

const it = {
  titolo: 'Mappa',
  vuotoAnno: 'La mappa disegna gli indirizzi delle classi di un anno scolastico.',
  aiuto: (sede: string) =>
    `Le distanze sono in linea d’aria dalla sede di ${sede}. ` +
    'Un segnaposto è un indirizzo, non una persona: dove stanno in più lo dice il cartellino. ' +
    'Le righe tratteggiate uniscono la casa al posto di lavoro: il mouse sopra ne accende una ' +
    'sola, e un clic la tiene accesa smorzando il resto della carta.',

  // Il cartellino
  sedeRiferimento: 'Il punto rispetto a cui si leggono le distanze',
  dallaSede: (distanza: string) => `${distanza} dalla sede, in linea d’aria`,

  // L'elenco
  nessunLavoro: 'Nessun posto di lavoro scritto in anagrafica.',
  nessunDomicilio: 'Nessun domicilio scritto in anagrafica.',
  nessunIndirizzo: 'Nessun indirizzo scritto in anagrafica.',
  portaQui: 'Porta la mappa su questo indirizzo',
  senzaCoordinate: 'Senza coordinate non c’è un punto su cui andare',
  inTirocinio: (persone: number) => `${persone} in tirocinio`,
  persone: (persone: number) => `${persone} persone`,
  soloPaese: 'solo il paese',
  trova: 'Trova',
  ciLavora: 'ci lavora',
  ciAbita: 'ci abita',
  eAltri: (primo: string, altri: number) => `${primo} e altri ${altri}`,
  domicilioELavoro: 'domicilio e posto di lavoro',
  postoDiLavoro: 'posto di lavoro',
  domicilio: 'domicilio',

  // La testata e il fondo
  nessunIndirizzoAnagrafica: 'Nessun indirizzo scritto nell’anagrafica',
  sullaMappa: (collocati: number, scritti: number) =>
    `${plurale(collocati, 'indirizzo', 'indirizzi')} su ${scritti} sulla mappa`,
  inComune: (quanti: number) => ` · ${quanti} in comune`,
  senzaIndirizzo: (persone: number) => ` · ${quanti(persone, PIF)} senza indirizzo`,
  vuotoNessuno: 'Nessun indirizzo da mettere in mappa',
  vuotoDaTrovare: 'Indirizzi ancora da trovare',
  vuotoScrivi:
    `Gli indirizzi si scrivono nella scheda ${del(PIF)}, in Classi: ` +
    'domicilio e posto di lavoro.',
  vuotoCoordinate:
    'Il registro chiede le coordinate a OpenStreetMap, una volta per indirizzo, e se le tiene.',
  trovaIndirizzi: 'Trova gli indirizzi',
  /** Il nome del pulsante che le cerca, fra le virgolette. */
  inAttesa: (quanti: number, pulsante: string) =>
    `${plurale(quanti, 'indirizzo', 'indirizzi')} ${quanti === 1 ? 'aspetta' : 'aspettano'} ` +
    `ancora le coordinate: «${pulsante}».`,
  tuttiTrovati: 'Tutti gli indirizzi scritti hanno il loro punto.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Karte',
    vuotoAnno: 'Die Karte zeigt die Adressen der Klassen eines Schuljahrs.',
    aiuto: (sede) =>
      `Die Entfernungen gelten in Luftlinie ab dem Schulstandort ${sede}. ` +
      'Eine Markierung ist eine Adresse, keine Person: Wer alles dort ist, sagt das Kärtchen. ' +
      'Die gestrichelten Linien verbinden das Zuhause mit dem Arbeitsort: Mit der Maus darüber ' +
      'leuchtet eine einzelne auf, und ein Klick hält sie hell und dämpft den Rest der Karte.',

    sedeRiferimento: 'Der Punkt, von dem aus die Entfernungen gemessen werden',
    dallaSede: (distanza) => `${distanza} von der Schule, Luftlinie`,

    nessunLavoro: 'Kein Arbeitsort in den Personalien erfasst.',
    nessunDomicilio: 'Kein Wohnort in den Personalien erfasst.',
    nessunIndirizzo: 'Keine Adresse in den Personalien erfasst.',
    portaQui: 'Karte zu dieser Adresse bewegen',
    senzaCoordinate: 'Ohne Koordinaten gibt es keinen Punkt, zu dem man gehen kann',
    inTirocinio: (persone) => `${persone} in der Lehre`,
    persone: (persone) => `${persone} Personen`,
    soloPaese: 'nur der Ort',
    trova: 'Finden',
    ciLavora: 'arbeitet hier',
    ciAbita: 'wohnt hier',
    eAltri: (primo, altri) => `${primo} und ${altri} weitere`,
    domicilioELavoro: 'Wohnort und Arbeitsort',
    postoDiLavoro: 'Arbeitsort',
    domicilio: 'Wohnort',

    nessunIndirizzoAnagrafica: 'Keine Adresse in den Personalien erfasst',
    sullaMappa: (collocati, scritti) =>
      `${plurale(collocati, 'Adresse', 'Adressen')} von ${scritti} auf der Karte`,
    inComune: (quanti) => ` · ${quanti} gemeinsam`,
    senzaIndirizzo: (persone) => ` · ${persone} Lernende ohne Adresse`,
    vuotoNessuno: 'Keine Adresse für die Karte',
    vuotoDaTrovare: 'Adressen noch zu finden',
    vuotoScrivi:
      'Die Adressen erfasst man im Personenblatt, unter Klassen: Wohnort und Arbeitsort.',
    vuotoCoordinate:
      'Das Klassenbuch fragt OpenStreetMap einmal pro Adresse nach den Koordinaten und behält sie.',
    trovaIndirizzi: 'Adressen suchen',
    inAttesa: (quanti, pulsante) =>
      `${plurale(quanti, 'Adresse wartet', 'Adressen warten')} noch auf Koordinaten: ` +
      `«${pulsante}».`,
    tuttiTrovati: 'Alle erfassten Adressen haben ihren Punkt.',
  },
  fr: {
    titolo: 'Carte',
    vuotoAnno: 'La carte dessine les adresses des classes d’une année scolaire.',
    aiuto: (sede) =>
      `Les distances sont à vol d’oiseau depuis le site de ${sede}. ` +
      'Un repère est une adresse, pas une personne : qui s’y trouve, l’étiquette le dit. ' +
      'Les lignes pointillées relient le domicile au lieu de travail : la souris dessus en ' +
      'allume une seule, et un clic la garde allumée en atténuant le reste de la carte.',

    sedeRiferimento: 'Le point depuis lequel se lisent les distances',
    dallaSede: (distanza) => `${distanza} de l’école, à vol d’oiseau`,

    nessunLavoro: 'Aucun lieu de travail saisi dans les données personnelles.',
    nessunDomicilio: 'Aucun domicile saisi dans les données personnelles.',
    nessunIndirizzo: 'Aucune adresse saisie dans les données personnelles.',
    portaQui: 'Amener la carte sur cette adresse',
    senzaCoordinate: 'Sans coordonnées, il n’y a pas de point où aller',
    inTirocinio: (persone) => `${persone} en apprentissage`,
    persone: (persone) => `${persone} personnes`,
    soloPaese: 'seulement la localité',
    trova: 'Trouver',
    ciLavora: 'y travaille',
    ciAbita: 'y habite',
    eAltri: (primo, altri) => `${primo} et ${altri} autres`,
    domicilioELavoro: 'domicile et lieu de travail',
    postoDiLavoro: 'lieu de travail',
    domicilio: 'domicile',

    nessunIndirizzoAnagrafica: 'Aucune adresse saisie dans les données personnelles',
    sullaMappa: (collocati, scritti) =>
      `${plurale(collocati, 'adresse', 'adresses')} sur ${scritti} sur la carte`,
    inComune: (quanti) => ` · ${quanti} en commun`,
    senzaIndirizzo: (persone) =>
      ` · ${plurale(persone, 'personne en formation', 'personnes en formation')} sans adresse`,
    vuotoNessuno: 'Aucune adresse à mettre sur la carte',
    vuotoDaTrovare: 'Adresses encore à trouver',
    vuotoScrivi:
      'Les adresses s’écrivent dans la fiche de la personne en formation, dans Classes : ' +
      'domicile et lieu de travail.',
    vuotoCoordinate:
      'Le registre demande les coordonnées à OpenStreetMap, une fois par adresse, et les garde.',
    trovaIndirizzi: 'Trouver les adresses',
    inAttesa: (quanti, pulsante) =>
      `${plurale(quanti, 'adresse attend', 'adresses attendent')} encore les coordonnées : ` +
      `« ${pulsante} ».`,
    tuttiTrovati: 'Toutes les adresses saisies ont leur point.',
  },
  en: {
    titolo: 'Map',
    vuotoAnno: 'The map draws the addresses of a school year’s classes.',
    aiuto: (sede) =>
      `Distances are as the crow flies from the ${sede} school site. ` +
      'A pin is an address, not a person: the label says who else is there. ' +
      'The dashed lines join home to workplace: hovering lights up just one, and a click keeps ' +
      'it lit while dimming the rest of the map.',

    sedeRiferimento: 'The point distances are measured from',
    dallaSede: (distanza) => `${distanza} from the school, as the crow flies`,

    nessunLavoro: 'No workplace entered in the personal details.',
    nessunDomicilio: 'No home address entered in the personal details.',
    nessunIndirizzo: 'No address entered in the personal details.',
    portaQui: 'Move the map to this address',
    senzaCoordinate: 'Without coordinates there’s no point to go to',
    inTirocinio: (persone) => `${persone} apprentices`,
    persone: (persone) => `${persone} people`,
    soloPaese: 'town only',
    trova: 'Find',
    ciLavora: 'works here',
    ciAbita: 'lives here',
    eAltri: (primo, altri) => `${primo} and ${altri} others`,
    domicilioELavoro: 'home and workplace',
    postoDiLavoro: 'workplace',
    domicilio: 'home',

    nessunIndirizzoAnagrafica: 'No address entered in the personal details',
    sullaMappa: (collocati, scritti) =>
      `${plurale(collocati, 'address', 'addresses')} of ${scritti} on the map`,
    inComune: (quanti) => ` · ${quanti} shared`,
    senzaIndirizzo: (persone) => ` · ${plurale(persone, 'learner', 'learners')} without an address`,
    vuotoNessuno: 'No addresses to put on the map',
    vuotoDaTrovare: 'Addresses still to find',
    vuotoScrivi: 'Addresses go in the learner’s record, under Classes: home and workplace.',
    vuotoCoordinate:
      'The register asks OpenStreetMap for the coordinates, once per address, and keeps them.',
    trovaIndirizzi: 'Find addresses',
    inAttesa: (quanti, pulsante) =>
      `${plurale(quanti, 'address is', 'addresses are')} still waiting for coordinates: ` +
      `“${pulsante}”.`,
    tuttiTrovati: 'Every address entered has its point.',
  },
})
