import { SHAPES, POINTS, LEVEL, COLORS, GARBAGE_RULES } from './Constants.js';
import Board from './Board.js';
import Piece from './Piece.js';

export default class Game {
  constructor() {
    this.board = new Board();
    this.level = 0;  // Keep level for speed
    this.isGameOver = false;
    this.pieceQueue = [];  // Initialize empty queue
    this.currentPiece = null;  // Don't generate piece immediately
    this.lockDelay = 500; // 500ms lock delay
    this.lockTimer = 0;
    this.isLocking = false;
    this.lastMoveWasReset = false;
    this.holdPiece = null;
    this.hasHeldThisTurn = false;
    this.garbageQueue = 0;
    this.lastClearWasSpecial = false;
    this.combo = -1;
    this.onGarbageSend = null; // Callback for sending garbage
    this.onTSpin = null;  // Add callback for T-spin events
    this.onCombo = null;  // Add callback for combo events
    this.debug = true; // Add debug flag
    console.log('Game instance created with debug enabled');
  }

  generatePiece() {
    if (!this.pieceQueue || this.pieceQueue.length === 0) {
      console.log('Waiting for piece queue...');
      return null;
    }
    const type = this.pieceQueue.shift(); // Remove and get the next piece
    const piece = new Piece(SHAPES[type], type);
    
    // Check for top out (game over)
    if (this.board.isCollision(piece, piece.position)) {
      this.isGameOver = true;
      return null;
    }
    
    return piece;
  }

  // Add method to initialize the first piece
  initializeFirstPiece() {
    if (this.currentPiece === null && this.pieceQueue.length > 0) {
      this.currentPiece = this.generatePiece();
    }
  }

  updateQueue(newQueue) {
    this.pieceQueue = newQueue;
  }

  update() {
    if (this.isGameOver) return 'gameover';  // Add this line at the start
    if (this.isGameOver || !this.currentPiece) return;

    const newPosition = this.currentPiece.move('down');
    
    if (this.board.isCollision(this.currentPiece, newPosition)) {
        // Start lock delay if not already started
        if (!this.isLocking) {
            this.isLocking = true;
            this.lockTimer = this.lockDelay;
            return 'locking';
        }
        
        // Update lock timer
        this.lockTimer -= this.getDropInterval();
        
        // Lock piece when timer expires
        if (this.lockTimer <= 0) {
            this.lockPiece();
            this.isLocking = false;
            this.lastMoveWasReset = false;
            return 'locked';
        }
        return 'locking';
    } else {
        // Reset lock state when piece moves down successfully
        this.isLocking = false;
        this.lastMoveWasReset = false;
        this.currentPiece.position = newPosition;
        return 'moved';
    }
  }

  lockPiece() {
    if (!this.currentPiece) return;

    // Place the piece
    this.board.placePiece(this.currentPiece);

    // Check for game over immediately after placing piece
    if (this.board.grid[0].some(cell => cell !== 0)) {
        this.isGameOver = true;
        this.currentPiece = null;
        return;
    }

    // Process rest of lock piece logic only if not game over
    if (!this.isGameOver) {
        const isTSpin = this.checkTSpin(this.currentPiece.position);
        const linesCleared = this.board.clearLines();
        
        if (linesCleared > 0 || isTSpin) {
            const garbageAmount = this.calculateGarbage(linesCleared, isTSpin);
            if (garbageAmount > 0 && this.onGarbageSend) {
                this.onGarbageSend(garbageAmount);
            }
        }

        this.addGarbageLines();
    }

    this.currentPiece = null;
    this.hasHeldThisTurn = false;
  }

  getDropInterval() {
    const baseInterval = 1000; // 1 second base interval
    const speedFactor = Math.pow(0.8, this.level); // Exponential speed increase
    return baseInterval * speedFactor;
  }

  getGhostPiecePosition() {
    if (!this.currentPiece) return null;
    
    // Create a proper ghost piece with the same structure as currentPiece
    let ghostPiece = new Piece(this.currentPiece.shape, this.currentPiece.type);
    ghostPiece.position = { ...this.currentPiece.position };
    ghostPiece.rotationState = this.currentPiece.rotationState;

    // Drop the ghost piece as far as it can go
    while (!this.board.isCollision(ghostPiece, {
      x: ghostPiece.position.x,
      y: ghostPiece.position.y + 1
    })) {
      ghostPiece.position.y++;
    }

    return ghostPiece;
  }

  // Add method to handle movements during lock delay
  tryMove(newPosition) {
    if (this.isLocking && !this.lastMoveWasReset && 
        !this.board.isCollision(this.currentPiece, newPosition)) {
        // Allow 15 move resets maximum
        this.lockTimer = this.lockDelay;
        this.lastMoveWasReset = true;
        return true;
    }
    return !this.board.isCollision(this.currentPiece, newPosition);
  }

  holdCurrentPiece() {
    if (this.hasHeldThisTurn || !this.currentPiece) return false;
    
    const currentType = this.currentPiece.type;
    const currentShape = SHAPES[currentType];
    
    if (this.holdPiece === null) {
        // Store current piece in hold
        this.holdPiece = { type: currentType, shape: currentShape };
        // Current piece becomes null to trigger next piece request
        this.currentPiece = null;
    } else {
        // Swap current piece with hold piece
        const tempHold = this.holdPiece;
        this.holdPiece = { type: currentType, shape: currentShape };
        this.currentPiece = new Piece(SHAPES[tempHold.type], tempHold.type);
    }
    
    this.hasHeldThisTurn = true;
    return true;
  }

  handleInput(key) {
    if (this.isGameOver) return false;  // Add this line at the start
    // ...existing code...
  }

  checkTSpin(position) {
    if (this.currentPiece.type !== 'T') return false;

    // Count filled corners
    let corners = 0;
    const { x, y } = position;
    const cornerPositions = [
        [x, y],       // top-left
        [x + 2, y],   // top-right
        [x, y + 2],   // bottom-left
        [x + 2, y + 2] // bottom-right
    ];

    corners = cornerPositions.filter(([cx, cy]) => 
        cy < 0 || cy >= this.board.height || 
        cx < 0 || cx >= this.board.width ||
        this.board.grid[cy][cx]
    ).length;

    return corners >= 3;
  }

  calculateGarbage(linesCleared, isTSpin) {
    let garbageAmount = 0;

    // Base garbage calculation
    if (isTSpin) {
        switch(linesCleared) {
            case 1: garbageAmount = GARBAGE_RULES.TSPIN_SINGLE; break;
            case 2: garbageAmount = GARBAGE_RULES.TSPIN_DOUBLE; break;
            case 3: garbageAmount = GARBAGE_RULES.TSPIN_TRIPLE; break;
        }
    } else {
        switch(linesCleared) {
            case 1: garbageAmount = GARBAGE_RULES.SINGLE; break;
            case 2: garbageAmount = GARBAGE_RULES.DOUBLE; break;
            case 3: garbageAmount = GARBAGE_RULES.TRIPLE; break;
            case 4: garbageAmount = GARBAGE_RULES.TETRIS; break;
        }
    }

    if (this.debug) {
        console.log('Base garbage:', garbageAmount);
    }

    // Back-to-back bonus
    if (this.lastClearWasSpecial && (isTSpin || linesCleared === 4)) {
        garbageAmount = Math.ceil(garbageAmount * 1.5);
        if (this.debug) console.log('B2B bonus applied:', garbageAmount);
    }

    // Combo bonus
    if (linesCleared > 0) {
        this.combo++;
        if (this.combo < GARBAGE_RULES.COMBO_TABLE.length) {
            const comboGarbage = GARBAGE_RULES.COMBO_TABLE[this.combo];
            if (this.debug) console.log('Combo bonus:', comboGarbage);
            garbageAmount += comboGarbage;
        }
    } else {
        this.combo = -1;
    }

    this.lastClearWasSpecial = isTSpin || linesCleared === 4;
    return garbageAmount;
  }

  receiveGarbage(amount) {
    console.log('📥 Receiving garbage:', amount, 'Current queue:', this.garbageQueue);
    if (this.garbageQueue <= 0) {
        this.garbageQueue = amount;
    } else {
        // Stack the garbage
        this.garbageQueue += amount;
    }
    console.log('Updated garbage queue:', this.garbageQueue);
  }

  addGarbageLines() {
    if (this.garbageQueue <= 0) return;

    console.log('🔼 Adding garbage lines:', this.garbageQueue);
    
    // Create garbage lines with random holes
    const linesToAdd = Math.min(this.garbageQueue, this.board.height);
    const garbageLines = [];
    
    for (let i = 0; i < linesToAdd; i++) {
        const hole = Math.floor(Math.random() * this.board.width);
        const line = Array(this.board.width).fill('garbage');
        line[hole] = 0;
        garbageLines.push(line);
    }

    // Add the garbage lines to the board
    this.board.addGarbageLines(garbageLines);
    
    // Reset garbage queue
    this.garbageQueue = 0;
    console.log('✅ Added garbage lines, queue reset');
  }

  rotate(direction = 'clockwise') {
    if (!this.currentPiece) return false;
    
    // Special handling for O piece - no rotation needed
    if (this.currentPiece.type === 'O') return true;
    
    const rotationResult = this.currentPiece.rotate(direction);
    const basePos = this.currentPiece.position;
    
    // Try all possible kick positions
    for (const kick of [{ x: 0, y: 0 }, ...rotationResult.kicks]) {
      const newPos = {
        x: basePos.x + kick.x,
        y: basePos.y + kick.y
      };
      
      // Create a test piece with the proper shape array
      const testPiece = {
        shape: rotationResult.shape,
        position: newPos,
        type: this.currentPiece.type
      };
      
      if (!this.board.isCollision(testPiece, newPos)) {
        this.currentPiece.shape = rotationResult.shape;
        this.currentPiece.position = newPos;
        this.currentPiece.rotationState = rotationResult.newState;
        return true;
      }
    }
    
    return false;
  }

  // Update tryMove to use rotate method
  tryMove(position) {
    if (!this.currentPiece) return false;
    
    if (!this.board.isCollision(this.currentPiece, position)) {
      this.currentPiece.position = position;
      return true;
    }
    return false;
  }
}
