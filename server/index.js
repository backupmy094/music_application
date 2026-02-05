const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
// Note: Using the provided string but forcing standard MongoDB driver protocol if needed.
// The user provided an atlas-sql string, which might fail with Mongoose. 
// Attempting to construct a standard SRV string or fallback to the provided one.
// Fallback logic: If the string contains 'atlas-sql', we might need a standard 'mongodb+srv' one.
// For now, I'll use a hardcoded placeholder that the user MUST replace if the one below fails, 
// or I will try to use the one they gave but it looks like a BI connector.
// Actually, let's try to use a standard local one for dev if the remote one is tricky, 
// OR just use the AUTH specific one if I can.
// Let's use a generic error handler to warn the user.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/music_app';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = await User.findOne({ username });
        if (user) return res.status(400).json({ msg: 'Username taken' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        const payload = { user: { id: user.id, username: user.username } };
        jwt.sign(payload, 'secret_key_change_me', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { user: { id: user.id, username: user.username } };
        jwt.sign(payload, 'secret_key_change_me', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Room state storage (in-memory)
// structure: { roomCode: { hostId, users: [{id, username, role}], currentState: {...} } }
const rooms = {};

// Helper to generate room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new room
    socket.on('create-room', ({ username } = {}) => {
        const roomCode = generateRoomCode();
        // Use provided username or default to 'Host' (defensive)
        const hostName = username || 'Host';

        rooms[roomCode] = {
            hostId: socket.id,
            users: [{ id: socket.id, username: hostName, role: 'host' }],
            currentState: {
                trackIndex: 0,
                currentTime: 0,
                isPlaying: false,
                isLooping: false
            }
        };
        socket.join(roomCode);
        socket.emit('room-created', { roomCode, role: 'host' });
        io.to(roomCode).emit('room-users-update', rooms[roomCode].users);
        console.log(`Room created: ${roomCode} by ${socket.id}`);
    });

    // Join an existing room
    socket.on('join-room', ({ roomCode, username } = {}) => {
        if (!roomCode) {
            socket.emit('error', 'Room code required');
            return;
        }

        const room = rooms[roomCode];
        if (room) {
            // Prevent duplicate join
            if (!room.users.find(u => u.id === socket.id)) {
                room.users.push({ id: socket.id, username: username || 'Guest', role: 'listener' });
            }

            socket.join(roomCode);
            socket.emit('room-joined', { roomCode, role: 'listener' });

            // Update everyone's user list
            io.to(roomCode).emit('room-users-update', room.users);

            // Request initial state from host
            io.to(room.hostId).emit('request-sync', { requesterId: socket.id });
            console.log(`User ${socket.id} joined room ${roomCode}`);
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    // Host sends sync data to a new listener
    socket.on('send-sync', ({ requesterId, state }) => {
        io.to(requesterId).emit('sync-state', state);
    });

    // Sync playback events (Host to Listeners)
    socket.on('playback-action', ({ roomCode, action, data }) => {
        const room = rooms[roomCode];
        if (room && socket.id === room.hostId) {
            // Update room state
            room.currentState = { ...room.currentState, ...data };
            // Broadcast to others in the room
            socket.to(roomCode).emit('sync-action', { action, data });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];

            // If host leaves, close room (or migrate host - simple version closes)
            if (room.hostId === socket.id) {
                io.to(roomCode).emit('error', 'Host disconnected. Room closed.');
                delete rooms[roomCode];
            } else {
                // Remove user from room
                const wasInRoom = room.users.some(u => u.id === socket.id);
                if (wasInRoom) {
                    room.users = room.users.filter(u => u.id !== socket.id);
                    io.to(roomCode).emit('room-users-update', room.users); // Update list
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
// Listen on all interfaces to allow local network access
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
