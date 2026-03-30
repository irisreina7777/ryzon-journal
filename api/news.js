export default async function handler(req, res) {
  try {
      // Vercel serverless function fetching directly to bypass browser CORS and public proxy Cloudflare blocks
      const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.xml", {
          headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept": "text/xml,application/xml"
          }
      });
      const xmlData = await response.text();
      res.setHeader("Content-Type", "text/xml");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200).send(xmlData);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch original XML feed" });
  }
}
