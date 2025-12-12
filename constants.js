// Game Constants
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

// Ball Physics (Professional Snooker Parameters)
const BALL_RADIUS = 12;              // pixels (real snooker: ~2.1cm scaled to canvas)
const BALL_MASS = 1;                 // kg (for realistic collisions)

// Friction & Bounce
const FRICTION = 0.982;              // 0-1: higher = slower deceleration (realistic felt)
const ELASTICITY = 0.88;             // 0-1: bounciness on cushion collision
const CUSHION_DAMPING = 0.92;        // energy loss on wall bounce
const SPIN_FRICTION = 0.995;         // spin/sidespin deceleration

// Movement Thresholds
const MIN_SPEED = 0.08;              // pixels/frame (when ball stops moving)

// Stroke/Shot Power
const SHOT_POWER = 18;               // multiplier (power × this = initial velocity)
const MAX_POWER = 100;               // % (cap on power bar)
const MIN_POWER = 5;                 // % (minimum force needed to move ball)

// Ball Types
const BALL_TYPES = {
    CUE: 'cue',
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    BROWN: 'brown',
    BLUE: 'blue',
    PINK: 'pink',
    BLACK: 'black'
};

// Ball Values
const BALL_VALUES = {
    red: 1,
    yellow: 2,
    green: 3,
    brown: 4,
    blue: 5,
    pink: 6,
    black: 7
};

// Colors
const COLORS = {
    cue: '#FFFFFF',
    red: '#FF0000',
    yellow: '#FFFF00',
    green: '#008000',
    brown: '#8B4513',
    blue: '#0000FF',
    pink: '#FFC0CB',
    black: '#000000',
    felt: '#1a5f3b',
    pocket: '#000000',
    border: '#8B4513'
};

// Game Modes
const GAME_MODES = {
    CLASSIC: 'classic',      // Professional snooker rules
    PRACTICE: 'practice',    // Infinite balls, no penalties
    TOURNAMENT: 'tournament' // Strict rules with foul penalties
};

// Game Mode Rules
const GAME_MODE_RULES = {
    classic: {
        name: 'Classic Snooker',
        infiniteBalls: false,
        foulPenalty: 4,
        description: 'Standard snooker rules'
    },
    practice: {
        name: 'Practice Mode',
        infiniteBalls: true,
        foulPenalty: 0,
        description: 'Unlimited balls, no penalties'
    },
    tournament: {
        name: 'Tournament Mode',
        infiniteBalls: false,
        foulPenalty: 7,
        description: 'Strict rules with 7-point fouls'
    }
};
