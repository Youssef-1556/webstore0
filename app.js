const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');

// Configuration session
app.use(session({
  secret: 'ton_secret',
  resave: false,
  saveUninitialized: false
}));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
require('./routes/index')(app); // ⚠️ IMPORTANT

// Lancer serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
