// Receives the contact form and emails it through Resend.
// Needs two environment variables in Vercel: RESEND_API_KEY and CONTACT_TO (the inbox for inquiries).
// Optional: CONTACT_FROM (a sender on a domain verified in Resend).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const b = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  if (b.website) return res.status(200).json({ ok: true }); // honeypot
  const clean = (v, n) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
  const name = clean(b.name, 120), email = clean(b.email, 200);
  const message = String(b.message || '').trim().slice(0, 4000);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'invalid' });
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO) return res.status(503).json({ error: 'not_configured' });
  const lines = [
    `Name: ${name}`, `Email: ${email}`,
    `Kid: ${clean(b.kid, 80) || '-'}`, `Age: ${clean(b.age, 20) || '-'}`,
    `World: ${clean(b.world, 80) || '-'}`, `Plan: ${clean(b.plan, 80) || '-'}`, '', message || '(no message)',
  ];
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM || 'Kin World <onboarding@resend.dev>',
      to: [CONTACT_TO], reply_to: email,
      subject: `New Kin World inquiry from ${name}`, text: lines.join('\n'),
    }),
  });
  if (!r.ok) return res.status(502).json({ error: 'send_failed' });
  return res.status(200).json({ ok: true });
};
function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
