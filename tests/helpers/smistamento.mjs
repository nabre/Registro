// Il preambolo delle prove dello smistamento: il PDF di classe costruito al
// volo, l'azione chiamata come la chiama il centralino, e l'anno aperto con
// una classe di due e un modulo da raccogliere.
//
// Gira su `dist-tests/data.mjs`, dati e azioni in un grafo solo: con bundle
// separati il deposito sarebbe due. Le cartelle (`cartelleDiProva`) si fanno
// in testa al file di prova, prima di chiamare `archivioDiSmistamento`.

import { mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

/**
 * Un PDF di classe: una pagina per persona, con il nome in testa. Con
 * `titolo: null` la pagina porta solo il nome.
 */
export async function pagelle (nomi, { titolo = 'Pagella — DIC4a' } = {}) {
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (const nome of nomi) {
    const pagina = documento.addPage([595, 842])
    if (titolo !== null) pagina.drawText(titolo, { x: 60, y: 780, size: 16, font })
    pagina.drawText(`Allievo: ${nome}`, { x: 60, y: 740, size: 12, font })
  }
  return documento.save()
}

/** L'azione di `parte`, chiamata col contesto che il centralino le passa. */
export function eseguiAzione (archivio, parte, azione) {
  const contesto = {
    archivio,
    registro: archivio.registro,
    ancoraQui: () => true,
    modifica: (cambia, collezioni) => {
      archivio.modifica(cambia, collezioni)
      return { ok: true, errori: [] }
    },
  }
  return parte[azione.tipo](contesto, azione)
}

/**
 * L'anno 2026-2027 aperto in `dati`, col lettore di PDF pronto: la classe
 * DIC4a (Rossi Mario, Bianchi Luca), un corso di matematica e la consegna
 * «Pagella 3° anno» che raccoglie un modulo.
 */
export async function archivioDiSmistamento ({ lavoro, dati, docenteDiClasse = false }) {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  const moduli = await import('../../dist-tests/data.mjs')
  const dominio = await import('../../dist-tests/domain.mjs')
  const { Archivio, registraDeposito, Uri, impostaCaratteri, impostaWorker } = moduli

  // Il worker di pdfjs, come all'avvio: senza, nessuna pagina si legge.
  impostaWorker(
    pathToFileURL(fileURLToPath(new URL('../../dist-tests/pdf.worker.mjs', import.meta.url))).href,
  )
  impostaCaratteri(fileURLToPath(new URL('../../dist-tests/pdf-fonts', import.meta.url)))

  const archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    dominio.creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )

  const annoId = archivio.registro.anni[0].id
  const materia = dominio.creaMateria('Matematica', 'MAT')
  const classe = dominio.creaClasse(annoId, 'DIC4a')
  if (docenteDiClasse) classe.docenteDiClasse = true
  classe.allievi = [dominio.creaAllievo('Rossi', 'Mario'), dominio.creaAllievo('Bianchi', 'Luca')]
  const corso = dominio.creaCorso(classe.id, materia.id, 'DIC4a — Matematica')
  const consegna = dominio.creaConsegna(corso.id, 'Pagella 3° anno', '2026-10-01')
  consegna.documento = 'modulo'

  archivio.modifica((r) => {
    r.materie.push(materia)
    r.classi.push(classe)
    r.corsi.push(corso)
    r.consegne.push(consegna)
  }, ['registro', 'classi', 'corsi', 'consegne'])

  return { moduli, dominio, archivio, classe, consegna }
}
