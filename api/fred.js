// api/fred.js - Vercel serverless function for FRED economic data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FRED_API_KEY not configured' });
  }

  const { endpoint = 'series/observations', ...rest } = req.query;
  const cleanParams = new URLSearchParams({ ...rest, api_key: apiKey, file_type: 'json' });
  const url = `https://api.stlouisfed.org/fred/${endpoint}?${cleanParams}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
