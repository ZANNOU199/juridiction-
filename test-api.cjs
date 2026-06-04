const http = require('http');

const data = JSON.stringify({
  competitionName: 'ARENA CHAMPIONSHIP',
  competitionLogo: '',
  tournamentSize: 16,
  juryAccounts: [
    { username: 'judge1', password: 'password1' },
    { username: 'judge2', password: 'password2' },
    { username: 'judge3', password: 'password3' }
  ],
  participants: [
    { id: 'p1', name: 'B-BOY 1', photo: 'https://via.placeholder.com/150' },
    { id: 'p2', name: 'B-BOY 2', photo: 'https://via.placeholder.com/150' }
  ],
  matches: [
    { id: 'm1', redTeamId: 'p1', blueTeamId: 'p2', round: 'Final' }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/configure',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', body);
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
