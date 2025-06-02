const pool = require('../db/db');
const bcrypt = require('bcryptjs');

module.exports = function(app) {

  // Page d'accueil
  app.get('/', async (req, res) => {
    try {
      const categories = await pool.query('SELECT * FROM categories');
      res.render('index', { categories: categories.rows, user: req.session.user });
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // Inscription
  app.get('/register', (req, res) => res.render('register'));
  app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
        [username, email, hashedPassword]
      );
      res.redirect('/login');
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // Connexion
  app.get('/login', (req, res) => res.render('login'));
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/');
      } else {
        res.send('Email ou mot de passe incorrect');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // Déconnexion
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  // Contact
  app.get('/contact', (req, res) => {
    res.render('contact', { user: req.session.user, message: null });
  });
  app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    console.log(`Message reçu de ${name} (${email}): ${message}`);
    res.render('contact', { user: req.session.user, message: 'Nous avons bien reçu votre message. Merci !' });
  });

  // Affichage produits par catégorie
  app.get('/category/:id', async (req, res) => {
    try {
      const category = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
      if (category.rows.length === 0) return res.status(404).send('Catégorie non trouvée');
      const products = await pool.query('SELECT * FROM products WHERE category_id = $1', [req.params.id]);
      res.render('category', { category: category.rows[0], products: products.rows, user: req.session.user });
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // Ajouter au panier
  app.get('/add-to-cart/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const userId = req.session.user.id;
    const productId = req.params.id;

    try {
      const result = await pool.query('SELECT * FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      if (result.rows.length > 0) {
        await pool.query('UPDATE cart SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      } else {
        await pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, 1)', [userId, productId]);
      }
      res.redirect('/cart');
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // Afficher le panier
  app.get('/cart', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const userId = req.session.user.id;
    try {
      const result = await pool.query(`
        SELECT products.id, products.name, products.price, cart.quantity
        FROM cart
        JOIN products ON cart.product_id = products.id
        WHERE cart.user_id = $1
      `, [userId]);

      const cartItems = result.rows;
      let total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      res.render('cart', { cartItems, total, user: req.session.user });
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // Supprimer du panier ✅
  app.get('/remove-from-cart/:productId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const userId = req.session.user.id;
    const productId = req.params.productId;
    try {
      await pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      res.redirect('/cart');
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // ➕ Augmenter la quantité dans le panier
  app.post('/cart/increase/:productId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const userId = req.session.user.id;
    const productId = req.params.productId;
    try {
      await pool.query('UPDATE cart SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      res.redirect('/cart');
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });

  // ➖ Diminuer la quantité dans le panier
  app.post('/cart/decrease/:productId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const userId = req.session.user.id;
    const productId = req.params.productId;
    try {
      const result = await pool.query('SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      const currentQty = result.rows[0]?.quantity;

      if (currentQty > 1) {
        await pool.query('UPDATE cart SET quantity = quantity - 1 WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      } else {
        await pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
      }

      res.redirect('/cart');
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });
};
