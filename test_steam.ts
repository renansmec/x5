import fetch from "node-fetch";

async function test() {
  const steamUrl = "https://steamcommunity.com/id/gabelogannewell";
  console.log("Fetching:", steamUrl);
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(steamUrl)}`);
    const data = await res.json();
    const html = data.contents;
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    console.log("MATCH:", match ? match[1] : "No match found");
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
