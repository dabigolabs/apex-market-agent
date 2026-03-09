// api/news.js - Vercel serverless function for news feeds

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { source = 'finnhub', symbol, category = 'general' } = req.query;
  
  try {
    let data;
    
    if (source === 'finnhub') {
      const apiKey = process.env.FINNHUB_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
      
      const endpoint = symbol 
        ? `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateMinus(7)}&to=${getToday()}&token=${apiKey}`
        : `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`;
      
      const response = await fetch(endpoint);
      data = await response.json();
    } else {
      return res.status(400).json({ error: 'Unknown source' });
    }
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
