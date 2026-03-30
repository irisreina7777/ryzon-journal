export default async function handler(req, res) {
  try {
      // Fetching the JSON endpoint which has different rate limit triggers than XML
      const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
          headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              "Accept": "application/json"
          }
      });
      const data = await response.text();
      
      // If we get rate limited even on JSON
      if (data.includes('Request Denied') || data.includes('<html')) {
          return res.status(429).json({ error: "Rate limited by upstream server. Try again shortly." });
      }

      // Tell Vercel's Edge Network to cache this result for 1 full hour (3600s)
      // This prevents the Vercel backend from pinging Faireconomy servers too often
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      res.status(200).send(data);
  } catch (error) {
      console.error("Vercel Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch original JSON feed" });
  }
}
