const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // отдаём html из этой же папки

const JWT_SECRET = 'supersecretkey';
const users = {}; // in-memory users
const messages = {}; // in-memory rooms

// --- Auth ---
function generateToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ message: 'User exists' });
  users[username] = await bcrypt.hash(password, 10);
  const token = generateToken(username);
  res.json({ token, username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!users[username]) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, users[username]);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  const token = generateToken(username);
  res.json({ token, username });
});

// --- Socket.io ---
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ room, username }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;
    if (!messages[room]) messages[room] = [];
    socket.emit('chatHistory', messages[room]);
    socket.to(room).emit('message', { user: 'system', text: `${username} joined` });
  });

  socket.on('sendMessage', (msg) => {
    const m = { user: socket.username, text: msg };
    messages[socket.room].push(m);
    io.to(socket.room).emit('message', m);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
