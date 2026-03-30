/**
 * Vercel Serverless Function: /api/vault-resources
 *
 * Fetches published vault resources from Airtable and returns them
 * in the format expected by vault.html.
 *
 * Required environment variable (set in Vercel project settings):
 *   AIRTABLE_TOKEN  — your Airtable Personal Access Token
 *
 * If AIRTABLE_TOKEN is not set, returns a 503 so vault.html falls
 * back to /resources.json automatically.
 */

const BASE_ID   = 'appIoGRWYlekTtxqY';
const TABLE_ID  = 'tbl4uX9QE5MK7qnsC';
const AIRTABLE_API = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

export default async function handler(req, res) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'AIRTABLE_TOKEN not configured' });
  }

  try {
    // Fetch all Published records (paginate if > 100)
    let records = [];
    let offset = undefined;

    do {
      const params = new URLSearchParams({
        filterByFormula: '{Status}="Published"',
        sort: JSON.stringify([{ field: 'Added Date', direction: 'asc' }]),
        ...(offset && { offset })
      });

      const resp = await fetch(`${AIRTABLE_API}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Airtable error ${resp.status}: ${err}`);
      }

      const page = await resp.json();
      records = records.concat(page.records || []);
      offset = page.offset;
    } while (offset);

    // Map Airtable records → vault resource shape
    const resources = records.map((rec, i) => {
      const f = rec.fields;
      return {
        id:            i + 1,
        title:         f['Title']        || '',
        provider:      f['Provider']     || '',
        type:          f['Type']         || 'Resource',
        url:           f['URL']          || '#',
        desc:          f['Description']  || '',
        tags:          f['Tags']         || [],
        sector:        [],
        profession:    [],
        hours:         0,
        value:         0,
        free:          f['Free']         ?? true,
        featured:      false,
        rating:        { credibility: 5, safety: 5, validity: 5 },
        validated:     true,
        validatedDate: f['Added Date']   ? formatDate(f['Added Date']) : 'Mar 2026',
        addedDate:     f['Added Date']   ? formatDate(f['Added Date']) : 'Mar 2026',
        addedBy:       f['Submitted By'] || 'Muhammad Seedat',
      };
    });

    // Build contributors list from addedBy field
    const contribMap = {};
    resources.forEach(r => {
      const key = r.addedBy;
      if (!contribMap[key]) contribMap[key] = 0;
      contribMap[key]++;
    });

    const contributors = Object.entries(contribMap).map(([name, count], i) => ({
      name,
      handle: name === 'Muhammad Seedat' ? '@southafricanbedouin' : '',
      role:   i === 0 ? 'Founder & Curator' : 'Resource Contributor',
      count,
      founder: name === 'Muhammad Seedat',
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ resources, contributors });

  } catch (err) {
    console.error('vault-resources error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
