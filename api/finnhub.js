// api/finnhub.js - Vercel serverless function
// This runs on Vercel's servers, so CORS is never an issue

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, ...queryParams } = req.query;
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not configured in Vercel environment' });
  }

  const endpoint = path || 'quote';
  const params = new URLSearchParams({ ...queryParams, token: apiKey });
  const url = `https://finnhub.io/api/v1/${endpoint}?${params}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
