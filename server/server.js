const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const GameRoom = require('./GameRoom');

app.use(express.static(path.join(__dirname, '../')));

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

    // Add roomId to socket when joining
    socket.roomId = 'default';

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
    
    const { role, gameState } = room.addPlayer(socket);
    socket.emit('playerAssigned', { 
        playerId: role, 
        gameState,
        currentQueue: room.pieceQueue
    });

    // Start game when two players are connected
    if (room.players.size === 2) {
        console.log('Two players connected, starting game...');
        // Always get current game state, whether it's new or existing
        const { firstPiece, queue } = room.getCurrentOrNewGameState();
        io.emit('startGame', { firstPiece, initialQueue: queue });
    }

    socket.on('gameUpdate', data => {
        room.updatePlayerState(socket.id, data);
        const otherPlayers = room.getOtherPlayers(socket.id);
        
        // If game is over, notify all players who won
        if (data.isGameOver) {
            const winner = otherPlayers[0]; // The other player won
            io.emit('gameOver', { winner });
        }
        
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

    socket.on('requestRestart', () => {
        const room = rooms.get('default');
        room.resetGame();
        // Initialize new bags and get first piece and queue
        const { firstPiece, queue } = room.initializeBags();
        io.emit('gameRestart');
        io.emit('startGame', { firstPiece, initialQueue: queue });
    });

    // Handle garbage sending
    socket.on('sendGarbage', ({ amount }) => {
        console.log(`🎮 Player ${socket.id} sending ${amount} garbage lines`);
        
        const room = rooms.get('default');
        if (!room) {
            console.error('❌ Room not found for garbage sending');
            return;
        }

        const opponents = room.getOtherPlayers(socket.id);
        console.log(`📨 Sending ${amount} garbage lines to opponents:`, opponents);
        
        opponents.forEach(opponentId => {
            console.log(`📬 Emitting ${amount} garbage to ${opponentId}`);
            io.to(opponentId).emit('receiveGarbage', { amount });
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