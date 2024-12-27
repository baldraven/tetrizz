export const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]], // Changed from vertical to horizontal
  J: [[1, 0, 0], [1, 1, 1]], // Changed from vertical to horizontal
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

export const COLORS = {
  I: '#00f0f0', // Cyan
  O: '#f0f000', // Yellow
  T: '#a000f0', // Purple
  L: '#f0a000', // Orange
  J: '#0000f0', // Blue
  S: '#00f000', // Green
  Z: '#f00000', // Red
  garbage: '#888888' // Add color for garbage lines
};

export const POINTS = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  TSPIN: 400,
  TSPIN_SINGLE: 800,
  TSPIN_DOUBLE: 1200,
  TSPIN_TRIPLE: 1600,
  BACK_TO_BACK_MULTIPLIER: 1.5
};

export const LEVEL = {
  0: 800,
  1: 720,
  2: 630,
  3: 550,
  4: 470,
  5: 380
};

export const GARBAGE_RULES = {
  SINGLE: 0,
  DOUBLE: 1,
  TRIPLE: 2,
  TETRIS: 4,
  TSPIN: 0,
  TSPIN_SINGLE: 2,
  TSPIN_DOUBLE: 4,
  TSPIN_TRIPLE: 6,
  COMBO_TABLE: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4],
  PERFECT_CLEAR: 10
};
