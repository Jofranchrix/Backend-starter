/**
 * Very simple server test without database
 */

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/simple', (req, res) => {
  res.json({ message: 'Simple server working', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`✓ Simple server running on http://localhost:${port}`);
  console.log('Test: GET /simple');
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\nShutting down simple server...');
  process.exit(0);
});
