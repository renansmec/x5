const https = require('https');
https.get('https://corsproxy.io/?' + encodeURIComponent('https://steamcommunity.com/id/gabelogannewell?xml=1'), res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("Content:", data.slice(0, 100)));
});
