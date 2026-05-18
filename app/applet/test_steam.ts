import fetch from "node-fetch";

async function test() {
  const urls = [
    "https://steamcommunity.com/id/gabelogannewell",
    "https://steamcommunity.com/profiles/76561197960287930"
  ];
  for (const steamUrl of urls) {
    console.log("Fetching:", steamUrl);
    try {
      const res = await fetch(\`https://api.allorigins.win/get?url=\${encodeURIComponent(steamUrl + "?xml=1")}\`);
      const data = await res.json();
      const xml = data.contents;
      const match = xml.match(/<avatarFull><!\\[CDATA\\[(.*?)\\]\\]><\\/avatarFull>/);
      console.log("MATCH XML:", match ? match[1] : "No match found");
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

test();
