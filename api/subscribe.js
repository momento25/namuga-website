// Vercel Serverless Function: POST /api/subscribe
// Adds email to Stibee mailing list.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (chunk) => { buf += chunk; });
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function send(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { status: 'method_not_allowed' });
  }

  const { STIBEE_API_KEY, STIBEE_LIST_ID } = process.env;
  if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
    return send(res, 500, { status: 'error' });
  }

  let body;
  try { body = await readJson(req); }
  catch { return send(res, 400, { status: 'invalid' }); }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const consent = body.consent === true;
  if (!EMAIL_RE.test(email) || !consent) {
    return send(res, 400, { status: 'invalid' });
  }

  const endpoint = `https://api.stibee.com/v1/lists/${encodeURIComponent(STIBEE_LIST_ID)}/subscribers`;
  const payload = {
    eventOccurredBy: 'SUBSCRIBER',
    confirmEmailYN: 'N',
    subscribers: [{ email }],
  };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json().catch(() => ({}));

    if (upstream.ok && data && data.Ok !== false) {
      return send(res, 200, { status: 'ok' });
    }

    const msg = typeof data?.Message === 'string' ? data.Message : '';
    if (msg.includes('이미') || upstream.status === 409) {
      return send(res, 409, { status: 'duplicate' });
    }
    return send(res, 500, { status: 'error' });
  } catch {
    return send(res, 500, { status: 'error' });
  }
}
