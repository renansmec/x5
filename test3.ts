import fetch from "node-fetch";

async function test() {
  const url = "https://steamcommunity.com/id/gabelogannewell?xml=1";
  try {
    const res = await fetch(\`https://corsproxy.io/?\${encodeURIComponent(url)}\`);
    const xml = await res.text();
    const match = xml.match(/<avatarFull><!\\[CDATA\\[(.*?)\\]\\]><\\/avatarFull>/);
    console.log("MATCH:", match ? match[1] : "not found");
  } catch (e) {
    console.error(e);
  }
}
test();
