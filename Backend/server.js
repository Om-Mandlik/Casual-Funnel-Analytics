require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const routes = require('./routes');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_analytics';
const origins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()) : true;

const app = express();
app.use(cors({ origin: origins }));

// The tracker posts as text/plain so the browser skips a CORS preflight and sendBeacon works.
app.use(express.json({ type: ['application/json', 'text/plain'], limit: '256kb' }));

// Serves /tracker.js and the demo pages (/demo/index.html, /demo/pricing.html)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', routes);

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API + tracker listening on http://localhost:${PORT}`);
      console.log(`Demo page:               http://localhost:${PORT}/demo/index.html`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
