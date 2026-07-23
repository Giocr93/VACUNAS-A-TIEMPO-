const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.VAT_TEST_URL || 'http://127.0.0.1:8765/index.html';
const DRAFT_KEY = 'vat.captureDraft.v192';
const patient = { id: 101, curp: 'TEST010101HDFABC01', name: 'Paciente', pat: 'Prueba', mat: '', birth: '2020-01-01', sex: 'Masculino' };
const inventory = [
  { id: 201, vaccine: 'BCG', lot: 'BCG-TEST', expiry: '2028-12-31', qty: 10, laboratory: 'Lab A' },
  { id: 202, vaccine: 'SRP', lot: 'SRP-TEST', expiry: '2028-12-31', qty: 10, laboratory: 'Lab B' }
];
const appData = { patients: [patient], vaccinations: [], inventory, appointments: [], stockAdjustments: [], monthClosures: [] };
const completeDraft = {
  schemaVersion: 2,
  at: Date.now(),
  payload: {
    patient: '101',
    commonDate: '2026-07-23',
    vaccinator: 'Enfermera Prueba',
    reviewed: true,
    rows: [{
      mode: 'current', vaccine: 'BCG', dose: 'Única', date: '2026-07-23', lotId: '201',
      manualLot: '', expiry: '2028-12-31', lab: 'Lab A', route: 'Intradérmica',
      site: 'Brazo derecho', obs: 'Sin incidencias'
    }]
  }
};

async function newPage(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.evaluate(({ appData }) => {
    localStorage.setItem('vat_v1_data', JSON.stringify(appData));
    sessionStorage.setItem('vat_session', 'active');
  }, { appData });
  return { context, page };
}

async function seedAndReload(page, draft, storage = 'localStorage', acceptRecovery = true) {
  if (storage === 'IndexedDB') {
    await page.evaluate(async ({ draft, key }) => {
      localStorage.removeItem(key);
      await VATStorage.put(key, draft, { entity: 'captureDraft', schemaVersion: 2 });
    }, { draft, key: DRAFT_KEY });
  } else {
    await page.evaluate(({ draft, key }) => {
      if (typeof draft === 'string') localStorage.setItem(key, draft);
      else localStorage.setItem(key, JSON.stringify(draft));
    }, { draft, key: DRAFT_KEY });
  }
  const dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    if (dialog.type() === 'confirm' && !acceptRecovery) await dialog.dismiss();
    else await dialog.accept();
  });
  await page.reload();
  await page.waitForTimeout(500);
  return dialogs;
}

async function field(page, selector, property = 'value') {
  return page.locator(selector).evaluate((element, property) => element[property], property);
}

(async () => {
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, BASE_URL).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(process.cwd(), relative);
    if (!file.startsWith(process.cwd())) { response.writeHead(403).end(); return; }
    fs.createReadStream(file).on('error', () => response.writeHead(404).end()).pipe(response);
  });
  await new Promise(resolve => server.listen(8765, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.VAT_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const results = [];
  async function run(name, test) {
    try { await test(); results.push(`PASS ${name}`); }
    catch (error) { results.push(`FAIL ${name}: ${error.stack || error}`); throw error; }
  }

  try {
    await run('A. Borrador completo', async () => {
      const { context, page } = await newPage(browser);
      const dialogs = await seedAndReload(page, completeDraft);
      assert(dialogs.some(x => x.type === 'confirm'));
      assert.equal(await field(page, '#vatV165Patient'), '101');
      assert.equal(await field(page, '.m65-vaccine'), 'BCG');
      assert.equal(await field(page, '.m65-dose'), 'Única');
      assert.equal(await field(page, '.m65-date'), '2026-07-23');
      assert.equal(await field(page, '.m65-lot'), '201');
      assert.equal(await field(page, '.m65-obs'), 'Sin incidencias');
      await context.close();
    });

    await run('B. Paciente sin vacunas', async () => {
      const { context, page } = await newPage(browser);
      const draft = { at: Date.now(), payload: { patient: '101', commonDate: '2026-07-23', vaccinator: 'Enfermera Prueba', reviewed: false, rows: [] } };
      await seedAndReload(page, draft);
      assert.equal(await field(page, '#vatV165Patient'), '101');
      assert.equal(await page.locator('.vat-v165-row').count(), 1);
      assert.equal(await field(page, '.m65-vaccine'), '');
      await context.close();
    });

    await run('C. Vacunas seleccionadas', async () => {
      const { context, page } = await newPage(browser);
      const draft = structuredClone(completeDraft);
      draft.payload.rows.push({ mode: 'history', vaccine: 'SRP', dose: 'Primera', date: '2024-01-10', manualLot: 'CARTILLA-1', expiry: '', lab: '', route: 'Subcutánea', site: 'Brazo', obs: 'Antecedente' });
      await seedAndReload(page, draft);
      assert.equal(await page.locator('.vat-v165-row').count(), 2);
      assert.deepEqual(await page.locator('.m65-vaccine').evaluateAll(elements => elements.map(x => x.value)), ['BCG', 'SRP']);
      assert.deepEqual(await page.locator('.m65-mode').evaluateAll(elements => elements.map(x => x.value)), ['current', 'history']);
      await context.close();
    });

    await run('D. Borrador antiguo de localStorage', async () => {
      const { context, page } = await newPage(browser);
      const legacy = { timestamp: Date.now(), patientId: 101, fechaComun: '2026-07-23', vacunador: 'Enfermera Antigua', reviewed: 1, vaccines: [{ biologico: 'SRP', dosis: 'Primera', fecha: '2024-01-10', lote: 'LEG-1', laboratorio: 'Lab antiguo', via: 'Subcutánea', sitio: 'Brazo', observaciones: 'Migrado' }] };
      await seedAndReload(page, legacy);
      assert.equal(await field(page, '#vatV165Patient'), '101');
      assert.equal(await field(page, '.m65-vaccine'), 'SRP');
      assert.equal(await field(page, '.m65-manual-lot'), 'LEG-1');
      assert.equal(await field(page, '.m65-lab'), 'Lab antiguo');
      await context.close();
    });

    await run('E. Borrador desde IndexedDB', async () => {
      const { context, page } = await newPage(browser);
      await seedAndReload(page, completeDraft, 'IndexedDB');
      assert.equal(await field(page, '#vatV165Patient'), '101');
      assert.equal(await field(page, '.m65-vaccine'), 'BCG');
      assert.equal(await page.evaluate(async key => VATStorage.get(key), DRAFT_KEY), null);
      await context.close();
    });

    await run('F. Borrador corrupto', async () => {
      const { context, page } = await newPage(browser);
      const dialogs = await seedAndReload(page, '{no-es-json');
      assert(dialogs.some(x => x.type === 'alert' && x.message.includes('corrupto')));
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DRAFT_KEY), null);
      assert.equal(await page.locator('#app').evaluate(element => element.classList.contains('hidden')), false);
      await context.close();
    });

    await run('G. Cancelar recuperación', async () => {
      const { context, page } = await newPage(browser);
      await seedAndReload(page, completeDraft, 'localStorage', false);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DRAFT_KEY), null);
      assert.equal(await page.evaluate(async key => VATStorage.get(key), DRAFT_KEY), null);
      let repeated = false;
      page.on('dialog', async dialog => { repeated = true; await dialog.dismiss(); });
      await page.reload();
      await page.waitForTimeout(350);
      assert.equal(repeated, false);
      await context.close();
    });

    await run('H. Guardar después de recuperar', async () => {
      const { context, page } = await newPage(browser);
      await seedAndReload(page, completeDraft);
      assert.deepEqual(await page.evaluate(() => vatV192SummaryData().issues), []);
      await page.locator('#vatV180ReviewBtn').click();
      await page.locator('#vatV180ProfessionalConfirm').check();
      await page.locator('button', { hasText: 'Guardar todas las vacunas' }).click();
      await page.waitForTimeout(500);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vat_v1_data')));
      if (saved.vaccinations.length !== 1) console.log('Diagnóstico Guardar:', await page.locator('#vatV165Msg').textContent());
      assert.equal(saved.vaccinations.length, 1);
      assert.equal(saved.vaccinations[0].vaccine, 'BCG');
      assert.equal(saved.inventory.find(x => x.id === 201).qty, 9);
      assert.match(await page.locator('#vatV165Msg').textContent(), /registrada/);
      await context.close();
    });
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    console.log(results.join('\n'));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
