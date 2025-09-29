const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('.'));

// Отдаём login.html на корень
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Простая память для пользователей и сообщений
const users = {};
const messages = { general: [] };

// Примитивный роут регистрации
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if(users[username]) return res.status(400).json({ error: 'User exists' });
  users[username] = password;
  res.json({ success: true });
});

// Примитивный роут логина
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(users[username] && users[username] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Socket.io
io.on('connection', socket => {
  let currentRoom = 'general';
  socket.join(currentRoom);
  socket.emit('chatHistory', messages[currentRoom]);

  socket.on('joinRoom', room => {
    socket.leave(currentRoom);
    currentRoom = room || 'general';
    socket.join(currentRoom);
    socket.emit('chatHistory', messages[currentRoom] || []);
  });

  socket.on('sendMessage', msg => {
    if(!messages[currentRoom]) messages[currentRoom] = [];
    messages[currentRoom].push({ user: 'anonymous', text: msg });
    io.to(currentRoom).emit('message', { user: 'anonymous', text: msg });
  });
});

server.listen(3000, () => console.log('Server started on http://localhost:3000'));
