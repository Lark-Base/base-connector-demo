const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const PORT = Number(process.env.PORT || 3000);
const VERIFICATION_TOKEN = process.env.VERIFICATION_TOKEN || '';

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${req.headers.host}`;
}

function signatureIsValid(req, rawBody) {
  if (!VERIFICATION_TOKEN) return true;

  const timestamp = req.headers['x-base-request-timestamp'];
  const nonce = req.headers['x-base-request-nonce'];
  const signature = req.headers['x-base-signature'];
  if (!timestamp || !nonce || !signature) return false;

  const expected = crypto
    .createHash('sha1')
    .update(`${timestamp}${nonce}${VERIFICATION_TOKEN}${rawBody}`, 'utf8')
    .digest('hex');

  const actualBuffer = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-base-request-timestamp, x-base-request-nonce, x-base-signature',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      const htmlPath = path.join(__dirname, 'public', 'index.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      fs.createReadStream(htmlPath).pipe(res);
      return;
    }

    if (req.method === 'GET' && req.url === '/meta.json') {
      const baseUrl = publicBaseUrl(req);
      sendJson(res, 200, {
        schemaVersion: 1,
        version: '1.0.0',
        type: 'data_connector',
        extraData: {
          disabledPeriodicSync: true,
          dataSourceConfigUiUri: `${baseUrl}/`,
          initHeight: 226,
          initWidth: 420,
        },
        protocol: {
          type: 'http',
          httpProtocol: {
            uris: [
              { type: 'tableMeta', uri: '/api/table_meta' },
              { type: 'records', uri: '/api/records' },
            ],
          },
        },
      });
      return;
    }

    if (req.method === 'POST' && (req.url === '/api/table_meta' || req.url === '/api/records')) {
      try {
        const rawBody = await readBody(req);
        if (!signatureIsValid(req, rawBody)) {
          sendJson(res, 403, {
            code: 1254403,
            msg: JSON.stringify({ zh: '签名校验失败', en: 'Invalid request signature' }),
          });
          return;
        }

        if (req.url === '/api/table_meta') {
          sendJson(res, 200, {
            code: 0,
            msg: '',
            data: {
              tableName: 'Connector Demo',
              fields: [
                {
                  fieldID: 'demo_text',
                  fieldName: 'Demo',
                  fieldType: 1,
                  isPrimary: true,
                  description: 'Demo text',
                },
              ],
            },
          });
          return;
        }

        sendJson(res, 200, {
          code: 0,
          msg: '',
          data: {
            nextPageToken: '',
            hasMore: false,
            records: [
              {
                primaryID: 'demo_1',
                data: {
                  demo_text: 'Connector Demo',
                },
              },
            ],
          },
        });
      } catch (error) {
        sendJson(res, 500, {
          code: 1254500,
          msg: JSON.stringify({ zh: '服务异常', en: 'Internal server error' }),
        });
      }
      return;
    }

    sendJson(res, 404, {
      code: 404,
      msg: 'Not found',
    });
  });
}

if (require.main === module) {
  createServer().listen(PORT, '0.0.0.0', () => {
    console.log(`Connector demo listening on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { createServer };
