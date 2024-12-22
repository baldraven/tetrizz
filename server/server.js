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
    console.log('Player connected with ID:', socket.id);
    
    const room = rooms.get('default');
    if (!room) {
        console.error('Default room not found!');
        return;
    }

    // Check if room is full
    if (room.players.size >= 2) {
        console.log('Room is full, rejecting connection');
        socket.emit('roomFull');
        socket.disconnect();
        return;
    }

    // Check if this socket is already connected
    if (room.players.has(socket.id)) {
        console.log('Player already connected:', socket.id);
        socket.disconnect();
        return;
    }

    const playerId = room.players.size === 0 ? 'player1' : 'player2';
    console.log(`Assigning player as: ${playerId}`);
    
    room.addPlayer(socket);
    socket.emit('playerAssigned', { playerId });

    // Start game when two players are connected
    if (room.players.size === 2) {
        console.log('Two players connected, starting game...');
        io.emit('startGame', { initialQueue: room.pieceQueue });
    }

    socket.on('gameUpdate', data => {
        room.updatePlayerState(socket.id, data);
        const otherPlayers = room.getOtherPlayers(socket.id);
        otherPlayers.forEach(playerId => {
            io.to(playerId).emit('gameUpdate', data);
        });
    });

    socket.on('requestPiece', () => {
        const room = rooms.get('default');
        const piece = room.getNextPiece();
        io.emit('queueUpdate', {
            queue: room.pieceQueue,
            nextPiece: piece
        });
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        const playerRole = room.playerRoles.get(socket.id);
        console.log(`${playerRole} disconnected`);
        room.removePlayer(socket.id);
        
        // Notify remaining player
        io.emit('playerDisconnected', { playerRole });
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

http.listen(3000, () => {
    console.log('Server running on port 3000');
    console.log('Default room created with ID:', defaultRoom.id);
});