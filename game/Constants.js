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
};

export const POINTS = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800
};

export const LEVEL = {
  0: 800,
  1: 720,
  2: 630,
  3: 550,
  4: 470,
  5: 380
};
