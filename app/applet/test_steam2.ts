import fetch from "node-fetch";

async function test() {
  const url = "https://steamcommunity.com/id/gabelogannewell?xml=1";
  const res = await fetch(\`https://api.allorigins.win/get?url=\${encodeURIComponent(url)}\`);
  const text = await res.text();
  console.log("Response text:", text);
}
test();
