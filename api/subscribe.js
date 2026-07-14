// Vercel Serverless Function: POST /api/subscribe
// Adds email to MailerLite subscriber group.

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

  const { MAILERLITE_API_KEY, MAILERLITE_GROUP_ID } = process.env;
  if (!MAILERLITE_API_KEY || !MAILERLITE_GROUP_ID) {
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

  const endpoint = 'https://connect.mailerlite.com/api/subscribers';
  const payload = {
    email,
    groups: [MAILERLITE_GROUP_ID],
    status: 'active',
  };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // MailerLite: 201 = 신규 생성, 200 = 이미 존재(업서트).
    if (upstream.status === 201) {
      return send(res, 200, { status: 'ok' });
    }
    if (upstream.status === 200) {
      return send(res, 409, { status: 'duplicate' });
    }
    if (upstream.status === 422) {
      return send(res, 400, { status: 'invalid' });
    }
    return send(res, 500, { status: 'error' });
  } catch {
    return send(res, 500, { status: 'error' });
  }
}
