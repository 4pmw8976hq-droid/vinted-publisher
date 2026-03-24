const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createWriteStream } = require('fs');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function downloadImage(url, dest) {
  const response = await axios({ url, responseType: 'stream' });
  await pipeline(response.data, createWriteStream(dest));
}

// Endpoint per pubblicare su Vinted
app.post('/publish', async (req, res) => {
  const { title, description, price, imageUrl, recordId } = req.body;

  // Validazione
  if (!title || !description || !price || !imageUrl) {
    return res.status(400).json({ error: 'Mancano campi obbligatori (title, description, price, imageUrl)' });
  }

  const browser = await chromium.launch({ headless: true });
  const statePath = path.join(__dirname, 'vinted-state.json');

  // Carica lo stato di login: prima prova variabile d'ambiente, poi file locale
  let context;
  if (process.env.VINTED_STATE) {
    try {
      const state = JSON.parse(process.env.VINTED_STATE);
      context = await browser.newContext({ storageState: state });
    } catch (e) {
      await browser.close();
      return res.status(500).json({ error: 'Errore nel parsing della variabile VINTED_STATE', details: e.message });
    }
  } else if (fs.existsSync(statePath)) {
    context = await browser.newContext({ storageState: statePath });
  } else {
    await browser.close();
    return res.status(500).json({ error: 'Stato di login non trovato. Imposta VINTED_STATE o fornisci il file vinted-state.json' });
  }

  const page = await context.newPage();

  try {
    // Gestisci immagine: se è un URL, scarica; altrimenti usa il percorso locale
    let imagePath;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const tempDir = '/tmp';
      imagePath = path.join(tempDir, `${Date.now()}.jpg`);
      await downloadImage(imageUrl, imagePath);
    } else {
      imagePath = imageUrl;  // assume sia un percorso assoluto valido
    }

    // Vai alla pagina di upload di Vinted
    await page.goto('https://www.vinted.it/upload');
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });

    // Compila i campi
    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', description);
    await page.fill('input[name="price"]', price);

    // Carica l'immagine
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles(imagePath);

    // Se Vinted richiede categoria, puoi sbloccare commentando le righe sotto
    // await page.click('select[name="category"]');
    // await page.selectOption('select[name="category"]', 'Home & Living');

    // Clicca sul pulsante di invio
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 });

    const listingUrl = page.url();

    // Risposta positiva
    res.json({ success: true, url: listingUrl, recordId });
  } catch (error) {
    console.error('Errore durante la pubblicazione:', error.message);
    res.status(500).json({ success: false, error: error.message, recordId });
  } finally {
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});
