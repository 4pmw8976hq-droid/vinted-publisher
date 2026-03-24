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

app.post('/publish', async (req, res) => {
  const { title, description, price, imageUrl, recordId } = req.body;

  if (!title || !description || !price || !imageUrl) {
    return res.status(400).json({ error: 'Mancano campi obbligatori (title, description, price, imageUrl)' });
  }

  const browser = await chromium.launch({ headless: true });
  const statePath = path.join(__dirname, 'vinted-state.json');

  if (!fs.existsSync(statePath)) {
    await browser.close();
    return res.status(500).json({ error: 'Stato di login non trovato. Esegui prima node login.js o crea vinted-state.json' });
  }

  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();

  try {
    let imagePath;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const tempDir = '/tmp';
      imagePath = path.join(tempDir, `${Date.now()}.jpg`);
      await downloadImage(imageUrl, imagePath);
    } else {
      imagePath = imageUrl;
    }

    await page.goto('https://www.vinted.it/upload');
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });

    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', description);
    await page.fill('input[name="price"]', price);

    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles(imagePath);

    // await page.click('select[name="category"]');
    // await page.selectOption('select[name="category"]', 'Home & Living');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 });

    const listingUrl = page.url();

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
