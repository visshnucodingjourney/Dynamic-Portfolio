const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function getDb(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveDb(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getOne(name, key, val) {
  return getDb(name).find(r => r[key] === val) || null;
}

function getAll(name, filter = {}) {
  let rows = getDb(name);
  for (const [k, v] of Object.entries(filter)) rows = rows.filter(r => r[k] === v);
  return rows;
}

function insert(name, obj) {
  const rows = getDb(name);
  const id = Date.now();
  const record = { id, ...obj, created_at: new Date().toISOString() };
  rows.push(record);
  saveDb(name, rows);
  return record;
}

function update(name, id, obj) {
  const rows = getDb(name);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...obj };
  saveDb(name, rows);
  return rows[idx];
}

function remove(name, id) {
  const rows = getDb(name);
  const filtered = rows.filter(r => r.id !== id);
  saveDb(name, filtered);
  return filtered.length < rows.length;
}

// Seed initial data
function seed() {
  const bcrypt = require('bcryptjs');
  if (!fs.existsSync(path.join(DATA_DIR, 'admin.json'))) {
    saveDb('admin', [{ id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) }]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'settings.json'))) {
    saveDb('settings', [{
      id: 1,
      name: 'Your Name',
      title: 'Full Stack Developer & AI Engineer',
      bio: 'Passionate developer building intelligent solutions. I specialize in web development, AI/ML, and cybersecurity.',
      email: 'you@example.com',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: '',
      resume_filename: '',
      avatar_filename: '',
      visitor_count: 0
    }]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'projects.json'))) {
    saveDb('projects', [
      { id: 1, title: 'AI Chat Assistant', description: 'A full-stack chatbot powered by GPT-4 with real-time streaming.', category: 'AI', tags: 'Python,React,OpenAI', github_url: 'https://github.com', live_url: '', image_filename: '', featured: true, created_at: new Date().toISOString() },
      { id: 2, title: 'SecureVault', description: 'End-to-end encrypted password manager with zero-knowledge architecture.', category: 'Cybersecurity', tags: 'Node.js,AES-256,React', github_url: 'https://github.com', live_url: '', image_filename: '', featured: true, created_at: new Date().toISOString() },
      { id: 3, title: 'Portfolio CMS', description: 'This very portfolio — a dynamic CMS-driven site with admin panel.', category: 'Web', tags: 'Node.js,Express,JavaScript', github_url: '', live_url: '', image_filename: '', featured: false, created_at: new Date().toISOString() },
    ]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'skills.json'))) {
    saveDb('skills', [
      { id: 1, name: 'Python', level: 90, category: 'Languages', created_at: new Date().toISOString() },
      { id: 2, name: 'JavaScript', level: 88, category: 'Languages', created_at: new Date().toISOString() },
      { id: 3, name: 'React', level: 82, category: 'Frontend', created_at: new Date().toISOString() },
      { id: 4, name: 'Node.js', level: 85, category: 'Backend', created_at: new Date().toISOString() },
      { id: 5, name: 'Machine Learning', level: 75, category: 'AI/ML', created_at: new Date().toISOString() },
      { id: 6, name: 'Cybersecurity', level: 70, category: 'Security', created_at: new Date().toISOString() },
    ]);
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'certificates.json'))) saveDb('certificates', []);
  if (!fs.existsSync(path.join(DATA_DIR, 'messages.json'))) saveDb('messages', []);
}

module.exports = { getDb, saveDb, getOne, getAll, insert, update, remove, seed };
