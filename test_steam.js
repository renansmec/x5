const fetch = globalThis.fetch;
async function test() {
  const url = "https://steamcommunity.com/id/gabelogannewell";
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const html = data.contents;
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  console.log("MATCH:", match?.[1]);
}
test();
