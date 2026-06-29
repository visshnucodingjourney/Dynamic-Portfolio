const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const store = require('./store');

const app = express();
store.seed();

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(session({ secret: 'portfolio_secret_2024', resave: false, saveUninitialized: false }));

const auth = (req, res, next) => {
  if (req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ── PUBLIC API ────────────────────────────────────────────
app.get('/api/public/settings', (req, res) => {
  const s = store.getAll('settings')[0] || {};
  // bump visitor count
  store.update('settings', s.id, { visitor_count: (s.visitor_count || 0) + 1 });
  res.json(s);
});

app.get('/api/public/projects', (req, res) => {
  let projects = store.getAll('projects');
  if (req.query.category && req.query.category !== 'All')
    projects = projects.filter(p => p.category === req.query.category);
  res.json(projects.reverse());
});

app.get('/api/public/skills', (req, res) => res.json(store.getAll('skills')));
app.get('/api/public/certificates', (req, res) => res.json(store.getAll('certificates').reverse()));

app.post('/api/public/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' });
  store.insert('messages', { name, email, message, read: false });
  res.json({ success: true });
});

// ── AUTH ──────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const admin = store.getOne('admin', 'username', username);
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  req.session.admin = true;
  res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => res.json({ loggedIn: !!req.session.admin }));

// ── ADMIN API ─────────────────────────────────────────────
// Settings
app.get('/api/admin/settings', auth, (req, res) => res.json(store.getAll('settings')[0]));
app.post('/api/admin/settings', auth, upload.fields([{ name: 'avatar' }, { name: 'resume' }]), (req, res) => {
  const s = store.getAll('settings')[0];
  const updates = { ...req.body };
  if (req.files?.avatar) updates.avatar_filename = req.files.avatar[0].filename;
  if (req.files?.resume) updates.resume_filename = req.files.resume[0].filename;
  res.json(store.update('settings', s.id, updates));
});

// Projects
app.get('/api/admin/projects', auth, (req, res) => res.json(store.getAll('projects').reverse()));
app.post('/api/admin/projects', auth, upload.single('image'), (req, res) => {
  const data = { ...req.body, featured: req.body.featured === 'true' };
  if (req.file) data.image_filename = req.file.filename;
  res.json(store.insert('projects', data));
});
app.put('/api/admin/projects/:id', auth, upload.single('image'), (req, res) => {
  const data = { ...req.body, featured: req.body.featured === 'true' };
  if (req.file) data.image_filename = req.file.filename;
  res.json(store.update('projects', parseInt(req.params.id), data));
});
app.delete('/api/admin/projects/:id', auth, (req, res) => {
  store.remove('projects', parseInt(req.params.id));
  res.json({ success: true });
});

// Skills
app.get('/api/admin/skills', auth, (req, res) => res.json(store.getAll('skills')));
app.post('/api/admin/skills', auth, (req, res) => res.json(store.insert('skills', req.body)));
app.put('/api/admin/skills/:id', auth, (req, res) =>
  res.json(store.update('skills', parseInt(req.params.id), req.body)));
app.delete('/api/admin/skills/:id', auth, (req, res) => {
  store.remove('skills', parseInt(req.params.id));
  res.json({ success: true });
});

// Certificates
app.get('/api/admin/certificates', auth, (req, res) => res.json(store.getAll('certificates').reverse()));
app.post('/api/admin/certificates', auth, upload.single('file'), (req, res) => {
  const data = { ...req.body };
  if (req.file) data.filename = req.file.filename;
  res.json(store.insert('certificates', data));
});
app.delete('/api/admin/certificates/:id', auth, (req, res) => {
  store.remove('certificates', parseInt(req.params.id));
  res.json({ success: true });
});

// Messages
app.get('/api/admin/messages', auth, (req, res) => res.json(store.getAll('messages').reverse()));
app.delete('/api/admin/messages/:id', auth, (req, res) => {
  store.remove('messages', parseInt(req.params.id));
  res.json({ success: true });
});

// Change password
app.post('/api/admin/change-password', auth, (req, res) => {
  const { current, newPass } = req.body;
  const admin = store.getAll('admin')[0];
  if (!bcrypt.compareSync(current, admin.password))
    return res.status(400).json({ error: 'Current password incorrect' });
  store.update('admin', admin.id, { password: bcrypt.hashSync(newPass, 10) });
  res.json({ success: true });
});

// Serve pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Portfolio running on http://localhost:${PORT}`));
