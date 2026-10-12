const assert = require('node:assert/strict');
const test = require('node:test');
const { createServer } = require('../server');

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('serves demo UI and connector contract', async () => {
  await withServer(async (baseUrl) => {
    const ui = await fetch(`${baseUrl}/`);
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /连接器插件 Demo/);

    const meta = await fetch(`${baseUrl}/meta.json`, {
      headers: { 'x-forwarded-proto': 'https' },
    }).then((response) => response.json());
    assert.equal(meta.type, 'data_connector');
    assert.equal(meta.extraData.dataSourceConfigUiUri.startsWith('https://'), true);

    const tableMeta = await fetch(`${baseUrl}/api/table_meta`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ params: '{}', context: '{}' }),
    }).then((response) => response.json());
    assert.equal(tableMeta.code, 0);
    assert.equal(tableMeta.data.fields[0].fieldID, 'demo_text');

    const records = await fetch(`${baseUrl}/api/records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ params: '{}', context: '{}' }),
    }).then((response) => response.json());
    assert.equal(records.code, 0);
    assert.equal(records.data.records[0].data.demo_text, 'Connector Demo');
  });
});
