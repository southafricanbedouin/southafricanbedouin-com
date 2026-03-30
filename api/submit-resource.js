/**
 * Vercel Serverless Function: /api/submit-resource
 *
 * Receives a resource submission from /submit.html and creates a
 * "Pending Review" record in the Airtable Vault Resources table.
 *
 * Required environment variable (set in Vercel project settings):
 *   AIRTABLE_TOKEN  — your Airtable Personal Access Token
 */

const BASE_ID  = 'appIoGRWYlekTtxqY';
const TABLE_ID = 'tbl4uX9QE5MK7qnsC';

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Submissions are temporarily unavailable. Please email hello@southafricanbedouin.com' });
  }

  const { title, url, provider, type, desc, tags, submitter_name, submitter_email, why } = req.body || {};

  // Server-side validation
  if (!title?.trim())          return res.status(400).json({ error: 'Title is required.' });
  if (!url?.trim())            return res.status(400).json({ error: 'URL is required.' });
  if (!provider?.trim())       return res.status(400).json({ error: 'Provider is required.' });
  if (!type?.trim())           return res.status(400).json({ error: 'Type is required.' });
  if (!desc?.trim())           return res.status(400).json({ error: 'Description is required.' });
  if (!submitter_name?.trim()) return res.status(400).json({ error: 'Your name is required.' });

  // Basic URL check
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL.' }); }

  // Build Airtable record
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const reviewNotes = why ? `Submitter note: ${why}` : '';

  const fields = {
    'fldrW30ipg0SCGYTz': title.trim(),
    'fldpOX7Y7gRf1Qll6': provider.trim(),
    'fldDMI24CXlQHXxHp': type.trim(),
    'fld6TDsZonbh1ixdC': url.trim(),
    'fldEi7MA68OTfJfLp': desc.trim(),
    'fldGkUatHEekySUx2': Array.isArray(tags) ? tags : [],
    'fldJ5TBuKayjHacos': 'Pending Review',
    'fldKVEnZTrTQxjVMu': true,
    'fld5Zb93Go82EvwW6': submitter_name.trim(),
    'fldjVkwJnedx3abGe': today,
    ...(submitter_email?.trim() && { 'fld38Tjoz9lHbtBCU': submitter_email.trim() }),
    ...(reviewNotes && { 'fldLdUt7I9TqxYXIp': reviewNotes }),
  };

  try {
    const resp = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields, typecast: true }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Airtable error:', err);
      return res.status(502).json({ error: 'Could not save your submission. Please try again.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('submit-resource error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
