"""Genera le cinque immagini della documentazione in docs/immagini/*.png.

Risoluzione: 2880x1800 (1440x900 con device_scale_factor=2).
Esecuzione:
  node esbuild.mjs --ui
  python tools/genera_screenshot_docs.py
"""

from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

root = Path(__file__).resolve().parents[1]

PONTE = '''
window.richieste = []
window.acquireVsCodeApi = () => ({
  getState: () => null, setState: () => {},
  postMessage: (m) => {
    richieste.push(m)
    if (m.id) setTimeout(() => window.dispatchEvent(new MessageEvent('message',
      { data: { tipo: 'risposta', id: m.id, ok: true } })), 0)
  },
})
'''

DATASET_JS = '''
(() => {
  const anno = {
    id: 'anno-2026-2027',
    etichetta: '2026/2027',
    inizio: '2026-08-31',
    fine: '2027-06-30',
    semestri: [
      { id: 'sem-1', numero: 1, etichetta: '1° semestre', inizio: '2026-08-31', fine: '2027-01-29' },
      { id: 'sem-2', numero: 2, etichetta: '2° semestre', inizio: '2027-02-01', fine: '2027-06-30' },
    ],
    sospensioni: [
      { id: 'autunno', etichetta: 'Vacanze autunnali', inizio: '2026-10-31', fine: '2026-11-08' },
    ],
  };

  const nomiAllievi = [
    ['Barbieri', 'Elena'], ['Bianchi', 'Luca'], ['Colombo', 'Chiara'], ['Conti', 'Marco'],
    ['Ferrari', 'Matteo'], ['Fontana', 'Giulia'], ['Galli', 'Sara'], ['Lombardi', 'Nicola'],
    ['Marino', 'Tommaso'], ['Moretti', 'Davide'], ['Neri', 'Paolo'], ['Ricci', 'Sofia'],
    ['Rossi', 'Maria'], ['Verdi', 'Anna']
  ];

  const allieviCls1 = nomiAllievi.map(([c, n], i) => ({
    id: `all-${String(i+1).padStart(2, '0')}`,
    cognome: c, nome: n, sesso: 'F', codiceFiscale: '', natoIl: '2008-01-01',
    attivo: true, recapiti: [], contatti: [], ritiratoIl: null
  }));

  const allieviCls2 = Array.from({ length: 12 }, (_, i) => ({
    id: `all-ele-${i+1}`, cognome: `Allievo${i+1}`, nome: 'ELE', sesso: 'M',
    attivo: true, recapiti: [], contatti: [], ritiratoIl: null
  }));

  const allieviCls3 = Array.from({ length: 13 }, (_, i) => ({
    id: `all-inf-${i+1}`, cognome: `Allievo${i+1}`, nome: 'INF', sesso: 'M',
    attivo: true, recapiti: [], contatti: [], ritiratoIl: null
  }));

  const classi = [
    { id: 'cls-1', annoId: anno.id, nome: 'I MEC A', colore: '#3b82f6', docenteDiClasse: true, allievi: allieviCls1 },
    { id: 'cls-2', annoId: anno.id, nome: 'II ELE B', colore: '#10b981', docenteDiClasse: false, allievi: allieviCls2 },
    { id: 'cls-3', annoId: anno.id, nome: 'III INF C', colore: '#f59e0b', docenteDiClasse: false, allievi: allieviCls3 },
  ];

  const materie = [
    { id: 'mat-1', nome: 'Calcolo professionale', sigla: 'CAL', colore: '#3b82f6' },
    { id: 'mat-2', nome: 'Elettrotecnica', sigla: 'ELE', colore: '#10b981' },
    { id: 'mat-3', nome: 'Informatica', sigla: 'INF', colore: '#f59e0b' },
  ];

  const corsi = [
    {
      id: 'cor-1', classeId: 'cls-1', materiaId: 'mat-1', titolo: 'I MEC A · Calcolo professionale',
      colore: '#2563eb',
      orario: [
        { id: 'ric-1-1', giorno: 1, inizio: '08:20', durataMin: 90 },
        { id: 'ric-1-2', giorno: 3, inizio: '10:15', durataMin: 45 },
        { id: 'ric-1-3', giorno: 3, inizio: '13:30', durataMin: 90 },
      ]
    },
    {
      id: 'cor-2', classeId: 'cls-2', materiaId: 'mat-2', titolo: 'II ELE B · Elettrotecnica',
      colore: '#059669',
      orario: [
        { id: 'ric-2-1', giorno: 1, inizio: '14:25', durataMin: 45 },
        { id: 'ric-2-2', giorno: 2, inizio: '13:30', durataMin: 90 },
        { id: 'ric-2-3', giorno: 4, inizio: '08:20', durataMin: 90 },
      ]
    },
    {
      id: 'cor-3', classeId: 'cls-3', materiaId: 'mat-3', titolo: 'III INF C · Informatica',
      colore: '#d97706',
      orario: [
        { id: 'ric-3-1', giorno: 2, inizio: '08:20', durataMin: 90 },
        { id: 'ric-3-2', giorno: 3, inizio: '08:20', durataMin: 90 },
        { id: 'ric-3-3', giorno: 5, inizio: '10:15', durataMin: 90 },
      ]
    },
  ];

  const piani = [
    {
      id: 'piano-1',
      corsoId: 'cor-1',
      obiettivi: ['Unità di misura', 'Proporzioni e percentuali'],
      attivita: [
        {
          id: 'att-1',
          titolo: 'Verifica 1 — unità di misura',
          tipo: 'valutazione',
          durataUd: 1,
          risorse: [],
          valutazione: { titolo: 'Verifica 1 — unità di misura', tipo: 'scritto', peso: 1 }
        },
        {
          id: 'att-2',
          titolo: 'Verifica 2 — proporzioni',
          tipo: 'valutazione',
          durataUd: 1,
          risorse: [],
          valutazione: { titolo: 'Verifica 2 — proporzioni', tipo: 'scritto', peso: 1 }
        },
        {
          id: 'att-3',
          titolo: 'Esercitazione — percentuali',
          tipo: 'valutazione',
          durataUd: 1,
          risorse: [],
          valutazione: { titolo: 'Esercitazione — percentuali', tipo: 'scritto', peso: 0.5 }
        },
      ],
      risorse: [],
      tag: [],
      creatoIl: '2026-08-31T08:00:00Z',
      aggiornatoIl: '2026-08-31T08:00:00Z'
    }
  ];

  const lunediSettimane = [
    '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05',
    '2026-10-12', // sett 42 (lez 19, 20, 21)
    '2026-10-19', '2026-10-26', // sett 43, 44
    '2026-11-09', '2026-11-16', '2026-11-23' // sett 46, 47, 48
  ];

  function aggiungiGiorni(iso, g) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + g);
    return d.toISOString().slice(0, 10);
  }

  let lezId = 1;
  const lezioni = [];

  for (const lun of lunediSettimane) {
    const mar = aggiungiGiorni(lun, 1);
    const mer = aggiungiGiorni(lun, 2);
    const gio = aggiungiGiorni(lun, 3);
    const ven = aggiungiGiorni(lun, 4);

    const isPassata = lun <= '2026-10-12';

    // Per evitare buchi da compilare nelle lezioni passate:
    const presenzeSvolte1 = allieviCls1.map(a => ({ allievoId: a.id, stati: ['presente'] }));
    const presenzeSvolte2 = allieviCls2.map(a => ({ allievoId: a.id, stati: ['presente'] }));
    const presenzeSvolte3 = allieviCls3.map(a => ({ allievoId: a.id, stati: ['presente'] }));

    // cor-1 (I MEC A): Lun 08:20 (90 min), Mer 10:15 (45 min), Mer 13:30 (90 min)
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-1', data: lun,
      slot: [{ id: `s-${lezId}`, inizio: '08:20', fine: '09:50', tipo: 'lezione' }],
      stato: isPassata ? 'svolta' : 'pianificata',
      pianoId: 'piano-1', avanzamento: [], presenze: isPassata ? presenzeSvolte1 : [], osservazioni: []
    });

    const lezMer1015 = {
      id: `lez-${lezId++}`, corsoId: 'cor-1', data: mer,
      slot: [{ id: `s-${lezId}`, inizio: '10:15', fine: '11:00', tipo: 'lezione' }],
      stato: (mer <= '2026-10-14') ? 'svolta' : 'pianificata',
      pianoId: 'piano-1', avanzamento: [], presenze: [], osservazioni: []
    };
    if (mer < '2026-10-14') {
      lezMer1015.presenze = presenzeSvolte1;
    } else if (mer === '2026-10-14') {
      lezMer1015.presenze = allieviCls1.map(a => {
        if (a.id === 'all-02') return { allievoId: a.id, stati: ['assente'] };
        if (a.id === 'all-06') return { allievoId: a.id, stati: ['ritardo'], minuti: 10 };
        return { allievoId: a.id, stati: ['presente'] };
      });
    }
    lezioni.push(lezMer1015);

    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-1', data: mer,
      slot: [{ id: `s-${lezId}`, inizio: '13:30', fine: '15:00', tipo: 'lezione' }],
      stato: mer < '2026-10-14' ? 'svolta' : 'pianificata',
      pianoId: 'piano-1', avanzamento: [], presenze: mer < '2026-10-14' ? presenzeSvolte1 : [], osservazioni: []
    });

    // cor-2 (II ELE B): Lun 14:25 (45 min), Mar 13:30 (90 min), Gio 08:20 (90 min)
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-2', data: lun,
      slot: [{ id: `s-${lezId}`, inizio: '14:25', fine: '15:10', tipo: 'lezione' }],
      stato: isPassata ? 'svolta' : 'pianificata',
      pianoId: null, avanzamento: [], presenze: isPassata ? presenzeSvolte2 : [], osservazioni: []
    });
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-2', data: mar,
      slot: [{ id: `s-${lezId}`, inizio: '13:30', fine: '15:00', tipo: 'lezione' }],
      stato: isPassata ? 'svolta' : 'pianificata',
      pianoId: null, avanzamento: [], presenze: isPassata ? presenzeSvolte2 : [], osservazioni: []
    });
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-2', data: gio,
      slot: [{ id: `s-${lezId}`, inizio: '08:20', fine: '09:50', tipo: 'lezione' }],
      stato: gio < '2026-10-14' ? 'svolta' : 'pianificata',
      pianoId: null, avanzamento: [], presenze: gio < '2026-10-14' ? presenzeSvolte2 : [], osservazioni: []
    });

    // cor-3 (III INF C): Mar 08:20 (90 min), Mer 08:20 (90 min), Ven 10:15 (90 min)
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-3', data: mar,
      slot: [{ id: `s-${lezId}`, inizio: '08:20', fine: '09:50', tipo: 'lezione' }],
      stato: isPassata ? 'svolta' : 'pianificata',
      pianoId: null, avanzamento: [], presenze: isPassata ? presenzeSvolte3 : [], osservazioni: []
    });
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-3', data: mer,
      slot: [{ id: `s-${lezId}`, inizio: '08:20', fine: '09:50', tipo: 'lezione' }],
      stato: mer <= '2026-10-14' ? 'svolta' : 'pianificata',
      pianoId: null, avanzamento: [], presenze: mer <= '2026-10-14' ? presenzeSvolte3 : [], osservazioni: []
    });
    lezioni.push({
      id: `lez-${lezId++}`, corsoId: 'cor-3', data: ven,
      slot: [{ id: `s-${lezId}`, inizio: '10:15', fine: '11:45', tipo: 'lezione' }],
      stato: ven < '2026-10-14' ? 'svolta' : 'pianificata',
      pianoId: null, avanzamento: [], presenze: ven < '2026-10-14' ? presenzeSvolte3 : [], osservazioni: []
    });
  }

  const consegne = [
    {
      id: 'cng-1', corsoId: 'cor-1', testo: 'Esercizi di ripasso — Calcolo professionale',
      tipo: 'compito', a: 'classe', allieviIds: [], data: '2026-10-12', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null,
      fatte: [
        { chi: 'all-01', fattaIl: '2026-10-13T09:00:00Z' },
        { chi: 'all-03', fattaIl: '2026-10-13T09:00:00Z' },
        { chi: 'all-05', fattaIl: '2026-10-13T09:00:00Z' },
        { chi: 'all-08', fattaIl: '2026-10-13T09:00:00Z' },
      ],
      creataIl: '2026-10-12T08:00:00Z', aggiornataIl: '2026-10-12T08:00:00Z'
    },
    {
      id: 'cng-2', corsoId: 'cor-1', testo: 'Firma della verifica corretta',
      tipo: 'amministrativo', a: 'classe', allieviIds: [], data: '2026-10-07', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null,
      fatte: [
        { chi: 'all-01', fattaIl: '2026-10-08T09:00:00Z' },
        { chi: 'all-02', fattaIl: '2026-10-08T09:00:00Z' },
        { chi: 'all-04', fattaIl: '2026-10-08T09:00:00Z' },
      ],
      creataIl: '2026-10-07T08:00:00Z', aggiornataIl: '2026-10-07T08:00:00Z'
    },
    // 3 consegne per cor-2
    {
      id: 'cng-ele-1', corsoId: 'cor-2', testo: 'Relazione di laboratorio',
      tipo: 'compito', a: 'classe', allieviIds: [], data: '2026-10-05', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null, fatte: [], creataIl: '2026-10-05T08:00:00Z', aggiornataIl: '2026-10-05T08:00:00Z'
    },
    {
      id: 'cng-ele-2', corsoId: 'cor-2', testo: 'Scheda componenti',
      tipo: 'materiale', a: 'classe', allieviIds: [], data: '2026-10-08', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null, fatte: [], creataIl: '2026-10-08T08:00:00Z', aggiornataIl: '2026-10-08T08:00:00Z'
    },
    {
      id: 'cng-ele-3', corsoId: 'cor-2', testo: 'Esercizi legge di Ohm',
      tipo: 'compito', a: 'classe', allieviIds: [], data: '2026-10-12', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null, fatte: [], creataIl: '2026-10-12T08:00:00Z', aggiornataIl: '2026-10-12T08:00:00Z'
    },
    // 3 consegne per cor-3
    {
      id: 'cng-inf-1', corsoId: 'cor-3', testo: 'Diagramma di flusso',
      tipo: 'compito', a: 'classe', allieviIds: [], data: '2026-10-06', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null, fatte: [], creataIl: '2026-10-06T08:00:00Z', aggiornataIl: '2026-10-06T08:00:00Z'
    },
    {
      id: 'cng-inf-2', corsoId: 'cor-3', testo: 'Installazione ambiente Python',
      tipo: 'preparazione', a: 'classe', allieviIds: [], data: '2026-10-07', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null, fatte: [], creataIl: '2026-10-07T08:00:00Z', aggiornataIl: '2026-10-07T08:00:00Z'
    },
    {
      id: 'cng-inf-3', corsoId: 'cor-3', testo: 'Esercizio variabili e tipi',
      tipo: 'compito', a: 'classe', allieviIds: [], data: '2026-10-13', dataLezioneId: null,
      scadenza: null, scadenzaLezioneId: null, fatte: [], creataIl: '2026-10-13T08:00:00Z', aggiornataIl: '2026-10-13T08:00:00Z'
    },
  ];

  const scala = { min: 1, max: 6, sufficienza: 4, passo: 0.25 };

  const votiVal1 = [
    { allievoId: 'all-01', valore: 3.5, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-02', valore: 3.25, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-03', valore: 5.25, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-04', valore: 3.75, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-05', valore: 5.75, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-06', valore: 4.5, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-07', valore: 3.25, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-08', valore: 4.75, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-09', valore: 3.5, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-10', valore: 4.75, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-11', valore: null, assente: true, riconsegnataIl: null },
    { allievoId: 'all-12', valore: 3.5, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-13', valore: 5.5, assente: false, riconsegnataIl: '2026-09-14' },
    { allievoId: 'all-14', valore: 4.75, assente: false, riconsegnataIl: '2026-09-14' },
  ];

  const votiVal2 = [
    { allievoId: 'all-01', valore: 5.25, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-02', valore: 4.25, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-03', valore: 4, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-04', valore: 4, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-05', valore: 3.75, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-06', valore: 4, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-07', valore: 4, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-08', valore: 5.75, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-09', valore: 6, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-10', valore: 4.25, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-11', valore: 4.5, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-12', valore: 3.5, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-13', valore: 3.5, assente: false, riconsegnataIl: '2026-09-23' },
    { allievoId: 'all-14', valore: 5, assente: false, riconsegnataIl: '2026-09-23' },
  ];

  const votiVal3 = [
    { allievoId: 'all-01', valore: 5.75, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-02', valore: 5, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-03', valore: 5, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-04', valore: 4.75, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-05', valore: 4, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-06', valore: null, assente: true, riconsegnataIl: null },
    { allievoId: 'all-07', valore: 3.5, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-08', valore: 6, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-09', valore: 5.75, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-10', valore: 3.5, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-11', valore: 3.75, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-12', valore: 4.25, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-13', valore: 4.25, assente: false, riconsegnataIl: '2026-10-01' },
    { allievoId: 'all-14', valore: 4.75, assente: false, riconsegnataIl: '2026-10-01' },
  ];

  // Recuperi per le 5 prove
  const recuperiVal1 = [
    { allievoId: 'all-01', previstoIl: '2026-09-28', riconsegnataIl: null, nota: '', dispensato: false, aggiornatoIl: '2026-09-28T09:00:00Z' },
    { allievoId: 'all-03', previstoIl: '2026-09-28', riconsegnataIl: null, nota: '', dispensato: false, aggiornatoIl: '2026-09-28T09:00:00Z' },
  ];

  const recuperiVal3 = [
    { allievoId: 'all-04', previstoIl: '2026-10-08', riconsegnataIl: null, nota: '', dispensato: false, aggiornatoIl: '2026-10-08T09:00:00Z' },
    { allievoId: 'all-10', previstoIl: '2026-10-08', riconsegnataIl: null, nota: '', dispensato: false, aggiornatoIl: '2026-10-08T09:00:00Z' },
    { allievoId: 'all-14', previstoIl: '2026-10-08', riconsegnataIl: null, nota: '', dispensato: false, aggiornatoIl: '2026-10-08T09:00:00Z' },
  ];

  const valutazioni = [
    {
      id: 'val-1', corsoId: 'cor-1', lezioneId: 'lez-2', pianoId: 'piano-1', attivitaId: 'att-1',
      titolo: 'Verifica 1 — unità di misura', tipo: 'scritto', data: '2026-09-07',
      peso: 1, scala, voti: votiVal1, recuperi: recuperiVal1, allegati: [],
      creatoIl: '2026-09-07T08:00:00Z', aggiornatoIl: '2026-09-14T08:00:00Z'
    },
    {
      id: 'val-2', corsoId: 'cor-1', lezioneId: 'lez-5', pianoId: 'piano-1', attivitaId: 'att-2',
      titolo: 'Verifica 2 — proporzioni', tipo: 'scritto', data: '2026-09-16',
      peso: 1, scala, voti: votiVal2, recuperi: [], allegati: [],
      creatoIl: '2026-09-16T08:00:00Z', aggiornatoIl: '2026-09-23T08:00:00Z'
    },
    {
      id: 'val-3', corsoId: 'cor-1', lezioneId: 'lez-8', pianoId: 'piano-1', attivitaId: 'att-3',
      titolo: 'Esercitazione — percentuali', tipo: 'scritto', data: '2026-09-24',
      peso: 0.5, scala, voti: votiVal3, recuperi: recuperiVal3, allegati: [],
      creatoIl: '2026-09-24T08:00:00Z', aggiornatoIl: '2026-10-01T08:00:00Z'
    },
  ];

  const check = [
    {
      id: 'chk-1',
      corsoId: 'cor-1',
      colonne: [
        { id: 'chk-col-1', titolo: 'Regolamento laboratorio' },
        { id: 'chk-col-2', titolo: 'Manuale officina' },
      ],
      spunte: [
        { allievoId: 'all-01', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-02', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-03', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-04', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-05', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-06', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-07', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-08', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-09', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-10', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-12', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-13', colonnaId: 'chk-col-1', data: '2026-09-07' },
        { allievoId: 'all-14', colonnaId: 'chk-col-1', data: '2026-09-07' },
      ],
      creatoIl: '2026-08-31T08:00:00Z',
      aggiornatoIl: '2026-09-07T08:00:00Z'
    }
  ];

  const registro = Object.assign(prova.registroVuoto(), {
    impostazioni: {
      ...prova.registroVuoto().impostazioni,
      scala,
      oraInizioGiornata: '07:30',
      oraFineGiornata: '18:00',
      giorniVisibili: [1, 2, 3, 4, 5],
      minutiUd: 45,
      pause: { prima: { inizio: '09:50', durataMin: 25 }, seguenti: [{ dopoUd: 2, durataMin: 15 }] }
    },
    anni: [anno],
    annoCorrenteId: anno.id,
    materie,
    classi,
    corsi,
    lezioni,
    valutazioni,
    consegne,
    piani,
    check,
  });

  window.__REGISTRO_DOCS__ = registro;
  return registro;
})()
'''

def crea_pagina(context):
    page = context.new_page()
    page.add_init_script("""
        const realDate = Date;
        const FIXED = new realDate('2026-10-14T10:15:00').getTime();
        class MockDate extends realDate {
            constructor(...args) {
                if (args.length === 0) super(FIXED);
                else super(...args);
            }
            static now() { return FIXED; }
        }
        window.Date = MockDate;
    """)
    page.set_content('<html lang="it"><head><title>Regiklass</title></head><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    page.evaluate(DATASET_JS)
    return page

def attendi_disegno(page):
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    page.wait_for_timeout(300)

def genera_tutto():
    dest_dir = root / 'docs/immagini'
    dest_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Calendario chiaro
        print("1. Genero calendario.png...")
        ctx_light = browser.new_context(
            viewport={'width': 1440, 'height': 900},
            device_scale_factor=2,
            color_scheme='light'
        )
        page1 = crea_pagina(ctx_light)
        page1.evaluate("""() => {
            const reg = window.__REGISTRO_DOCS__;
            prova.aggiorna({
                registro: reg,
                caricato: true,
                vista: 'calendario',
                modoCalendario: 'settimana',
                data: '2026-10-14',
                adessoData: '2026-10-14',
                adessoOra: '10:15',
                corsoId: null,
                classeId: null,
                filtroCorsoAgendaId: null,
                semestreId: null,
                documenti: { corrente: 'C:/scuola/2026-2027.regi', provvisorio: false, elenco: [] }
            });
            prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.calendario'));
        }""")
        attendi_disegno(page1)
        path_cal = dest_dir / 'calendario.png'
        page1.screenshot(path=str(path_cal))
        ctx_light.close()

        # 2. Calendario scuro
        print("2. Genero calendario-scuro.png...")
        ctx_dark = browser.new_context(
            viewport={'width': 1440, 'height': 900},
            device_scale_factor=2,
            color_scheme='dark'
        )
        page2 = crea_pagina(ctx_dark)
        page2.evaluate("""() => {
            const reg = window.__REGISTRO_DOCS__;
            prova.aggiorna({
                registro: reg,
                caricato: true,
                vista: 'calendario',
                modoCalendario: 'settimana',
                data: '2026-10-14',
                adessoData: '2026-10-14',
                adessoOra: '10:15',
                corsoId: null,
                classeId: null,
                filtroCorsoAgendaId: null,
                semestreId: null,
                documenti: { corrente: 'C:/scuola/2026-2027.regi', provvisorio: false, elenco: [] }
            });
            prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.calendario'));
        }""")
        attendi_disegno(page2)
        path_cal_dark = dest_dir / 'calendario-scuro.png'
        page2.screenshot(path=str(path_cal_dark))
        ctx_dark.close()

        # 3. Lezione (classe.png)
        print("3. Genero classe.png...")
        ctx_classe = browser.new_context(
            viewport={'width': 1440, 'height': 900},
            device_scale_factor=2,
            color_scheme='light'
        )
        page3 = crea_pagina(ctx_classe)
        page3.evaluate("""() => {
            const reg = window.__REGISTRO_DOCS__;
            const lez20 = reg.lezioni.find(l => l.corsoId === 'cor-1' && l.data === '2026-10-14' && l.slot[0].inizio === '10:15');
            prova.aggiorna({
                registro: reg,
                caricato: true,
                vista: 'lezione',
                corsoId: 'cor-1',
                classeId: 'cls-1',
                filtroClasseId: 'cls-1',
                lezioneId: lez20.id,
                data: '2026-10-14',
                adessoData: '2026-10-14',
                adessoOra: '10:15',
                schedaLezione: 'amministrazione',
                semestreId: null,
                documenti: { corrente: 'C:/scuola/2026-2027.regi', provvisorio: false, elenco: [] }
            });
            prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.corso.registro'));
            prova.aggiorna({ lezioneId: lez20.id });
        }""")
        attendi_disegno(page3)
        path_classe = dest_dir / 'classe.png'
        page3.screenshot(path=str(path_classe))
        ctx_classe.close()

        # 4. Valutazioni (valutazioni.png)
        print("4. Genero valutazioni.png...")
        ctx_val = browser.new_context(
            viewport={'width': 1440, 'height': 900},
            device_scale_factor=2,
            color_scheme='light'
        )
        page4 = crea_pagina(ctx_val)
        page4.evaluate("""() => {
            const reg = window.__REGISTRO_DOCS__;
            prova.aggiorna({
                registro: reg,
                caricato: true,
                vista: 'valutazioni',
                corsoId: 'cor-1',
                classeId: 'cls-1',
                filtroClasseId: 'cls-1',
                valutazioneId: 'val-3',
                data: '2026-10-14',
                adessoData: '2026-10-14',
                adessoOra: '10:15',
                semestreId: null,
                documenti: { corrente: 'C:/scuola/2026-2027.regi', provvisorio: false, elenco: [] }
            });
            prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.corso.valutazioni'));
            prova.aggiorna({ valutazioneId: 'val-3' });
        }""")
        attendi_disegno(page4)
        path_val = dest_dir / 'valutazioni.png'
        page4.screenshot(path=str(path_val))
        ctx_val.close()

        # 5. Pendenze (pendenze.png)
        print("5. Genero pendenze.png...")
        ctx_pend = browser.new_context(
            viewport={'width': 1440, 'height': 900},
            device_scale_factor=2,
            color_scheme='light'
        )
        page5 = crea_pagina(ctx_pend)
        page5.evaluate("""() => {
            const reg = window.__REGISTRO_DOCS__;
            prova.aggiorna({
                registro: reg,
                caricato: true,
                vista: 'todo',
                schedaTodo: 'tutte',
                data: '2026-10-14',
                adessoData: '2026-10-14',
                adessoOra: '10:15',
                semestreId: null,
                documenti: { corrente: 'C:/scuola/2026-2027.regi', provvisorio: false, elenco: [] }
            });
            prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.pendenze'));
        }""")
        attendi_disegno(page5)
        path_pend = dest_dir / 'pendenze.png'
        page5.screenshot(path=str(path_pend))
        ctx_pend.close()

        browser.close()

    print("\nVerifica dimensioni immagini:")
    for f in [path_cal, path_cal_dark, path_classe, path_val, path_pend]:
        with Image.open(f) as im:
            print(f"  {f.name}: {im.size} (atteso: 2880x1800)")
            assert im.size == (2880, 1800), f"Dimensione errata per {f.name}"

    print("\nTutti i 5 screenshot sono stati generati con successo!")

if __name__ == '__main__':
    genera_tutto()
