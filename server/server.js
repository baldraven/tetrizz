const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const GameRoom = require('./GameRoom');

app.use(express.static('./'));

const rooms = new Map();
const defaultRoom = new GameRoom('default');
rooms.set('default', defaultRoom);

io.on('connection', socket => {
    console.log('Player connected');
    
    const room = rooms.get('default');
    const playerId = room.players.size === 0 ? 'player1' : 'player2';
    
    room.addPlayer(socket);
    socket.emit('playerAssigned', { playerId });

    // Start game when two players are connected
    if (room.players.size === 2) {
        io.emit('startGame');
    }

    socket.on('gameUpdate', data => {
        room.updatePlayerState(socket.id, data);
        const otherPlayers = room.getOtherPlayers(socket.id);
        otherPlayers.forEach(playerId => {
            io.to(playerId).emit('gameUpdate', data);
        });
    });

    socket.on('disconnect', () => {
        room.removePlayer(socket.id);
    });
});

http.listen(3000, () => {
    console.log('Server running on port 3000');
});