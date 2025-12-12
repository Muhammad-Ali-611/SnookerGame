// Game State
let gameState = {
    balls: [],
    score: 0,
    redsLeft: 15,
    turn: 1,
    isShooting: false,
    lastPottedBall: null,
    gameRunning: true,
    fouls: 0,
    breaks: 0,
    highestBreak: 0,
    currentBreak: 0,
    gameMode: 'classic',  // CLASSIC, PRACTICE, TOURNAMENT
    gameModeRules: null   // Will be set to GAME_MODE_RULES[gameMode]
};

// Visual Effects State
let visualEffects = {
    potFlashes: [],      // Array of {x, y, time, duration}
    scorePopups: [],     // Array of {x, y, text, time, duration}
    cushionHits: []      // Array of {x, y, velocity, time}
};

// Mouse State
let mouseState = {
    x: 0,
    y: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
};

// Canvas and Context
let canvas, ctx;
// Ball Class
class Ball {
    constructor(x, y, type = BALL_TYPES.CUE) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.spin = 0;      // Angular velocity for spin
        this.topspin = 0;   // Top/back spin (vertical axis)
        this.sidespin = 0;  // Side spin (horizontal axis)
        this.type = type;
        this.radius = BALL_RADIUS;
        this.potted = false;
    }

    update() {
        if (this.potted) return;

        // Apply friction to linear velocity
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        // Apply friction to spin
        this.spin *= SPIN_FRICTION;
        this.topspin *= SPIN_FRICTION;
        this.sidespin *= SPIN_FRICTION;

        // Stop if speed is too low
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const spinMagnitude = Math.abs(this.spin) + Math.abs(this.topspin) + Math.abs(this.sidespin);
        if (speed < MIN_SPEED && spinMagnitude < 0.1) {
            this.vx = 0;
            this.vy = 0;
            this.spin = 0;
            this.topspin = 0;
            this.sidespin = 0;
            return;
        }

        // Apply topspin/backspin effect to velocity
        if (this.topspin !== 0) {
            const speedMag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speedMag > 0) {
                // Topspin increases forward velocity, backspin decreases it
                const topspinEffect = this.topspin * 0.02;
                this.vx *= (1 + topspinEffect);
                this.vy *= (1 + topspinEffect);
            }
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Handle wall collisions with proper cushion bounce
        this.handleWallCollisions();
    }

    handleWallCollisions() {
        const margin = this.radius;
        const tableBoundaries = {
            left: 100,
            right: 1100,
            top: 50,
            bottom: 550
        };

        // Top wall
        if (this.y - margin < tableBoundaries.top) {
            this.y = tableBoundaries.top + margin;
            const velocity = Math.abs(this.vy);
            this.vy *= -ELASTICITY;
            this.vy *= CUSHION_DAMPING;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
        // Bottom wall
        if (this.y + margin > tableBoundaries.bottom) {
            this.y = tableBoundaries.bottom - margin;
            const velocity = Math.abs(this.vy);
            this.vy *= -ELASTICITY;
            this.vy *= CUSHION_DAMPING;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }

        // Left wall
        if (this.x - margin < tableBoundaries.left) {
            this.x = tableBoundaries.left + margin;
            const velocity = Math.abs(this.vx);
            this.vx *= -ELASTICITY;
            this.vx *= CUSHION_DAMPING;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
        // Right wall
        if (this.x + margin > tableBoundaries.right) {
            this.x = tableBoundaries.right - margin;
            const velocity = Math.abs(this.vx);
            this.vx *= -ELASTICITY;
            this.vx *= CUSHION_DAMPING;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
    }

    collideWith(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.radius + other.radius) {
            // Collision detected
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            // Rotate velocities
            const vx1 = this.vx * cos + this.vy * sin;
            const vy1 = this.vy * cos - this.vx * sin;
            const vx2 = other.vx * cos + other.vy * sin;
            const vy2 = other.vy * cos - other.vx * sin;

            // Swap velocities (elastic collision, equal mass)
            const vx1Final = vx2;
            const vx2Final = vx1;

            // Rotate back
            this.vx = vx1Final * cos - vy1 * sin;
            this.vy = vy1 * cos + vx1Final * sin;
            other.vx = vx2Final * cos - vy2 * sin;
            other.vy = vy2 * cos + vx2Final * sin;

            // Separate balls
            const overlap = this.radius + other.radius - distance;
            const separationX = (overlap / 2) * cos;
            const separationY = (overlap / 2) * sin;
            this.x -= separationX;
            this.y -= separationY;
            other.x += separationX;
            other.y += separationY;

            // Play collision sound
            const relativeVelocity = Math.sqrt((vx1Final - vx2Final) ** 2 + (vy1 - vy2) ** 2);
            if (relativeVelocity > 0.5) {
                soundManager.playBallCollisionSound(relativeVelocity);
            }
        }
    }

    draw(ctx) {
        if (this.potted) return;

        try {
            ctx.save();

            // Shadow effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(this.x + 2, this.y + 3, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main ball - use solid color
            ctx.fillStyle = COLORS[this.type] || '#CCCCCC';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Edge highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Shine highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x - this.radius / 2.5, this.y - this.radius / 2.5, this.radius / 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw ball markings (numbers for reds, stripes for colors)
            if (this.type === BALL_TYPES.RED) {
                // Red balls - draw white circle with number
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.35, 0, Math.PI * 2);
                ctx.fill();
                
                // Number on red ball
                ctx.fillStyle = '#FF0000';
                ctx.font = 'bold ' + (this.radius * 1.2) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Assign number based on ball order
                const ballIndex = gameState.balls.indexOf(this);
                const redNum = (ballIndex - 6) % 15 + 1;  // Red balls start at index 6
                ctx.fillText(redNum, this.x, this.y);
            } else if ([BALL_TYPES.YELLOW, BALL_TYPES.GREEN, BALL_TYPES.BROWN, BALL_TYPES.BLUE, BALL_TYPES.PINK].includes(this.type)) {
                // Colored balls - draw stripe band
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.radius * 0.7, this.y);
                ctx.lineTo(this.x + this.radius * 0.7, this.y);
                ctx.stroke();
            } else if (this.type === BALL_TYPES.BLACK) {
                // Black ball - white circle with 8
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000000';
                ctx.font = 'bold ' + (this.radius * 1.3) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('8', this.x, this.y);
            }

            ctx.restore();
        } catch (e) {
            console.error('Error drawing ball:', e);
        }
    }

    isPotted(table) {
        return table.checkPocket(this);
    }
}

// Table Class
class Table {
    constructor() {
        // Exact pocket positions for 1200×600 table - at cushion corners
        // Professional snooker pocket radius: 26px (3.25 inches scaled)
        this.pockets = [
            { x: 100, y: 50, radius: 26 },      // Top Left
            { x: 600, y: 50, radius: 26 },      // Top Center
            { x: 1100, y: 50, radius: 26 },     // Top Right
            { x: 100, y: 550, radius: 26 },     // Bottom Left
            { x: 600, y: 550, radius: 26 },     // Bottom Center
            { x: 1100, y: 550, radius: 26 }     // Bottom Right
        ];
        
        // Table boundaries (cushion positions)
        this.boundaries = {
            left: 100,
            right: 1100,
            top: 50,
            bottom: 550,
            baulkLineY: 500,
            centerX: 600,
            centerY: 300
        };
    }

    draw(ctx) {
        // Canvas background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Outer wood frame/cushion border (professional thick border)
        // From (70, 30) to (1130, 570) = 1060×540 frame area
        ctx.fillStyle = '#3d2817';  // Dark brown wood
        ctx.fillRect(70, 30, 1060, 540);

        // Add darker edges for depth
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(70, 30, 1060, 8);      // Top edge
        ctx.fillRect(70, 562, 1060, 8);     // Bottom edge
        ctx.fillRect(70, 30, 8, 540);       // Left edge
        ctx.fillRect(1122, 30, 8, 540);     // Right edge

        // Felt - rich green gradient (professional playing surface)
        // From (100, 50) to (1100, 550) = 1000×500 cloth area
        const feltGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        feltGradient.addColorStop(0, '#1e7d4f');
        feltGradient.addColorStop(0.5, '#1a6b40');
        feltGradient.addColorStop(1, '#0f4620');
        ctx.fillStyle = feltGradient;
        ctx.fillRect(this.boundaries.left, this.boundaries.top, 
                     this.boundaries.right - this.boundaries.left,
                     this.boundaries.bottom - this.boundaries.top);

        // Cushion inner edge with 3D effect (visible border around cloth)
        ctx.strokeStyle = '#8B6914';  // Gold cushion edge
        ctx.lineWidth = 8;
        ctx.strokeRect(this.boundaries.left - 2, this.boundaries.top - 2,
                       (this.boundaries.right - this.boundaries.left) + 4,
                       (this.boundaries.bottom - this.boundaries.top) + 4);

        // Cushion highlight (top and left for 3D effect)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.boundaries.left - 2, this.boundaries.top - 2);
        ctx.lineTo(this.boundaries.right + 2, this.boundaries.top - 2);
        ctx.moveTo(this.boundaries.left - 2, this.boundaries.top - 2);
        ctx.lineTo(this.boundaries.left - 2, this.boundaries.bottom + 2);
        ctx.stroke();

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.boundaries.centerX, this.boundaries.top + 5);
        ctx.lineTo(this.boundaries.centerX, this.boundaries.bottom - 5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Baulk line (at y=500)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.boundaries.left + 5, this.boundaries.baulkLineY);
        ctx.lineTo(this.boundaries.right - 5, this.boundaries.baulkLineY);
        ctx.stroke();

        // D area (semicircle for cue ball placement)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.boundaries.centerX, this.boundaries.baulkLineY, 85, Math.PI, 0);
        ctx.stroke();

        // Spot markers (for color ball placement)
        const spotRadius = 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        // Center spot (blue position)
        ctx.fillRect(this.boundaries.centerX - spotRadius, this.boundaries.centerY - spotRadius, 
                     spotRadius * 2, spotRadius * 2);
        
        // Top spot (black position)
        ctx.fillRect(this.boundaries.centerX - spotRadius, 100 - spotRadius, 
                     spotRadius * 2, spotRadius * 2);

        // Draw pockets with professional appearance
        for (let i = 0; i < this.pockets.length; i++) {
            const pocket = this.pockets[i];
            
            // Outer pocket shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, pocket.radius + 2, 0, Math.PI * 2);
            ctx.fill();

            // Main pocket opening
            ctx.fillStyle = '#1a0f08';
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
            ctx.fill();

            // Pocket rim (leather/felt)
            ctx.strokeStyle = '#6b5a47';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Pocket highlight/depth
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, pocket.radius - 2, 0, Math.PI * 2);
            ctx.stroke();

            // Pocket shine (subtle light reflection)
            const shineGradient = ctx.createRadialGradient(
                pocket.x - pocket.radius / 2, pocket.y - pocket.radius / 2, 0,
                pocket.x, pocket.y, pocket.radius
            );
            shineGradient.addColorStop(0, 'rgba(100, 80, 60, 0.2)');
            shineGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = shineGradient;
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    checkPocket(ball) {
        for (let pocket of this.pockets) {
            const dx = ball.x - pocket.x;
            const dy = ball.y - pocket.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < pocket.radius) {
                return true;
            }
        }
        return false;
    }
}

// Cue Class
class Cue {
    constructor(ball) {
        this.ball = ball;
        this.angle = 0;
        this.power = 0;
    }

    update(mouseX, mouseY) {
        const dx = mouseX - this.ball.x;
        const dy = mouseY - this.ball.y;
        this.angle = Math.atan2(dy, dx);
    }

    draw(ctx) {
        ctx.save();

        // Aiming line with glow
        ctx.strokeStyle = 'rgba(255, 255, 150, 0.8)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 255, 0, 0.6)';
        ctx.shadowBlur = 15;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(this.ball.x, this.ball.y);
        ctx.lineTo(
            this.ball.x + Math.cos(this.angle) * 300,
            this.ball.y + Math.sin(this.angle) * 300
        );
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.setLineDash([]);

        // Impact circle preview
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
        ctx.lineWidth = 2;
        const impactDist = 50 + (this.power / 100) * 30;
        ctx.beginPath();
        ctx.arc(
            this.ball.x + Math.cos(this.angle) * impactDist,
            this.ball.y + Math.sin(this.angle) * impactDist,
            this.ball.radius * 2,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        // Cue stick
        const cueLength = 80 + this.power * 0.6;
        const cueX = this.ball.x - Math.cos(this.angle) * cueLength;
        const cueY = this.ball.y - Math.sin(this.angle) * cueLength;

        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 6 + this.power * 0.15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cueX, cueY);
        ctx.lineTo(this.ball.x - Math.cos(this.angle) * 10, this.ball.y - Math.sin(this.angle) * 10);
        ctx.stroke();

        // Cue tip
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.ball.x - Math.cos(this.angle) * 10, this.ball.y - Math.sin(this.angle) * 10, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Setup Ball Positions
function setupBalls() {
    // Cue ball starting position in D area (baulk line y=500, center x=600)
    gameState.balls.push(new Ball(600, 530, BALL_TYPES.CUE));

    // Colored balls - exact positions for 1200×600 table
    gameState.balls.push(new Ball(600, 300, BALL_TYPES.BLUE));      // Center
    gameState.balls.push(new Ball(600, 200, BALL_TYPES.PINK));      // Between black and blue
    gameState.balls.push(new Ball(600, 100, BALL_TYPES.BLACK));     // Near top cushion
    gameState.balls.push(new Ball(600, 500, BALL_TYPES.BROWN));     // Baulk line center
    gameState.balls.push(new Ball(400, 500, BALL_TYPES.YELLOW));    // Baulk line left
    gameState.balls.push(new Ball(800, 500, BALL_TYPES.GREEN));     // Baulk line right

    // Red balls - exact professional triangle formation (15 balls)
    // Centered at x=600, apex at y=230, spacing 21px between rows
    // Ball radius = 12px, horizontal spacing 24px between centers
    const redBalls = [
        // Row 1 (1 ball) - Apex
        { x: 600, y: 230 },
        
        // Row 2 (2 balls)
        { x: 588, y: 251 },
        { x: 612, y: 251 },
        
        // Row 3 (3 balls)
        { x: 576, y: 272 },
        { x: 600, y: 272 },
        { x: 624, y: 272 },
        
        // Row 4 (4 balls)
        { x: 564, y: 293 },
        { x: 588, y: 293 },
        { x: 612, y: 293 },
        { x: 636, y: 293 },
        
        // Row 5 (5 balls) - Base of triangle
        { x: 552, y: 314 },
        { x: 576, y: 314 },
        { x: 600, y: 314 },
        { x: 624, y: 314 },
        { x: 648, y: 314 }
    ];
    
    redBalls.forEach(pos => {
        gameState.balls.push(new Ball(pos.x, pos.y, BALL_TYPES.RED));
    });
}

// Event Listeners
function attachEventListeners() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    
    // Sound toggle button
    const soundToggleBtn = document.getElementById('sound-toggle');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', function() {
            soundManager.toggleSound();
            const isEnabled = soundManager.enabled !== false;
            soundToggleBtn.textContent = isEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        });
    }
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    mouseState.dragStartX = e.clientX - rect.left;
    mouseState.dragStartY = e.clientY - rect.top;
    mouseState.isDragging = true;
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseState.x = e.clientX - rect.left;
    mouseState.y = e.clientY - rect.top;

    if (gameState.isShooting) return;

    if (mouseState.isDragging) {
        const dx = mouseState.dragStartX - mouseState.x;
        const dy = mouseState.dragStartY - mouseState.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(distance / 3, 100);
        updatePowerDisplay(power);
    }
}

function handleMouseUp(e) {
    if (!mouseState.isDragging || gameState.isShooting) return;

    const dx = mouseState.dragStartX - mouseState.x;
    const dy = mouseState.dragStartY - mouseState.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
        const angle = Math.atan2(dy, dx);
        const power = Math.min(distance / 3, 100);
        const strength = (power / 100) * SHOT_POWER;

        gameState.balls[0].vx = Math.cos(angle) * strength;
        gameState.balls[0].vy = Math.sin(angle) * strength;

        // Add spin if Shift key is held during shot
        if (e.shiftKey) {
            // Shift + drag creates topspin/backspin based on drag direction
            const dragAngle = Math.atan2(mouseState.dragStartY - mouseState.y, 
                                         mouseState.dragStartX - mouseState.x);
            const spinAmount = (power / 100) * 5;  // Max spin of 5
            gameState.balls[0].topspin = spinAmount;  // Topspin effect
        }

        gameState.isShooting = true;
        gameState.breaks++;
        gameState.currentBreak = 0;  // Reset current break counter
        
        // Play shot sound
        soundManager.playShotSound(power / 100);
    }

    mouseState.isDragging = false;
    updatePowerDisplay(0);
}

function handleKeyDown(e) {
    if (e.key.toLowerCase() === 'r') {
        resetGame();
    } else if (e.key === 'Escape') {
        window.location.href = 'index.html';
    }
}

function resetGame() {
    gameState.balls = [];
    gameState.score = 0;
    gameState.redsLeft = 15;
    gameState.turn = 1;
    gameState.isShooting = false;
    gameState.lastPottedBall = null;
    gameState.fouls = 0;
    gameState.breaks = 0;
    gameState.currentBreak = 0;
    gameState.gameModeRules = GAME_MODE_RULES[gameState.gameMode];
    setupBalls();
    updateUI();
}

function updatePowerDisplay(power) {
    document.getElementById('power-value').textContent = Math.round(power) + '%';
    document.getElementById('power-fill').style.width = power + '%';
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('reds-left').textContent = gameState.redsLeft;
    document.getElementById('fouls').textContent = gameState.fouls;
    document.getElementById('highest-break').textContent = gameState.highestBreak;
    document.getElementById('game-mode').textContent = gameState.gameModeRules.name;
}

// Switch game mode
function setGameMode(mode) {
    if (GAME_MODES[mode] || GAME_MODES[mode.toUpperCase()]) {
        gameState.gameMode = mode.toLowerCase();
        gameState.gameModeRules = GAME_MODE_RULES[mode.toLowerCase()];
        resetGame();
    }
}

function getBallValue(type) {
    return BALL_VALUES[type] || 0;
}

// Initialize Game
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    gameState.balls = [];
    gameState.score = 0;
    gameState.redsLeft = 15;
    gameState.turn = 1;
    gameState.isShooting = false;
    gameState.lastPottedBall = null;
    gameState.gameRunning = true;
    gameState.fouls = 0;
    gameState.breaks = 0;
    gameState.highestBreak = 0;
    gameState.currentBreak = 0;
    gameState.gameMode = GAME_MODES.CLASSIC;
    gameState.gameModeRules = GAME_MODE_RULES[GAME_MODES.CLASSIC];

    setupBalls();
    attachEventListeners();
    gameLoop();
}

// Game Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!gameState.gameRunning) return;

    // Update all balls
    for (let ball of gameState.balls) {
        if (!ball.potted) {
            ball.update();
        }
    }

    // Ball-to-ball collisions
    for (let i = 0; i < gameState.balls.length; i++) {
        for (let j = i + 1; j < gameState.balls.length; j++) {
            if (!gameState.balls[i].potted && !gameState.balls[j].potted) {
                gameState.balls[i].collideWith(gameState.balls[j]);
            }
        }
    }

    // Check for potted balls
    const table = new Table();
    
    // Check if cue ball was potted (ball 0)
    if (!gameState.balls[0].potted && gameState.balls[0].isPotted(table)) {
        // Cue ball potted - place it on the spot in front of brown ball (on baulk line)
        gameState.balls[0].potted = true;
        gameState.balls[0].vx = 0;
        gameState.balls[0].vy = 0;
        
        // Reset position to spot on baulk line, slightly forward of brown ball
        gameState.balls[0].x = 600;
        gameState.balls[0].y = 480;  // Slightly forward of baulk line (500)
        gameState.balls[0].potted = false;  // Mark as no longer potted (back in play)
        gameState.isShooting = false;
    }
    
    // Check other balls (colored and red)
    for (let i = 1; i < gameState.balls.length; i++) {
        if (!gameState.balls[i].potted && gameState.balls[i].isPotted(table)) {
            const value = getBallValue(gameState.balls[i].type);
            gameState.score += value;
            gameState.lastPottedBall = gameState.balls[i].type;

            if (gameState.balls[i].type === BALL_TYPES.RED) {
                gameState.redsLeft--;
            }

            // Play pot sound
            soundManager.playPotSound();

            // Add pot flash effect
            const pocketPos = getPocketNearestToBall(gameState.balls[i]);
            visualEffects.potFlashes.push({
                x: pocketPos.x,
                y: pocketPos.y,
                time: 0,
                duration: 300
            });

            // Add score popup
            visualEffects.scorePopups.push({
                x: gameState.balls[i].x,
                y: gameState.balls[i].y,
                text: '+' + value,
                time: 0,
                duration: 800
            });

            updateUI();
        }
    }

    // Check if shooting is done
    if (gameState.isShooting) {
        let allStopped = true;
        for (let ball of gameState.balls) {
            if (!ball.potted) {
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                if (speed > MIN_SPEED) {
                    allStopped = false;
                    break;
                }
            }
        }

        if (allStopped) {
            gameState.isShooting = false;
        }
    }
}

function draw() {
    const table = new Table();
    table.draw(ctx);

    // Draw all balls
    for (let i = 0; i < gameState.balls.length; i++) {
        try {
            gameState.balls[i].draw(ctx);
        } catch (e) {
            console.error('Error drawing ball', i, ':', e);
        }
    }

    // Draw cue when aiming
    if (!gameState.isShooting && mouseState.isDragging) {
        const cue = new Cue(gameState.balls[0]);
        const dx = mouseState.dragStartX - mouseState.x;
        const dy = mouseState.dragStartY - mouseState.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        cue.power = Math.min(distance / 3, 100);
        cue.angle = Math.atan2(dy, dx);
        cue.draw(ctx);
    }

    // Draw aiming preview when mouse is over table
    if (!gameState.isShooting && !mouseState.isDragging && gameState.balls.length > 0) {
        drawAimingPreview();
    }

    // Draw visual effects (pot flashes and score popups)
    drawVisualEffects();
}

function drawAimingPreview() {
    if (!gameState.balls || gameState.balls.length === 0) return;
    
    const cueBall = gameState.balls[0];
    if (!cueBall) return;
    
    const dx = mouseState.x - cueBall.x;
    const dy = mouseState.y - cueBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 30) return;
    
    const angle = Math.atan2(dy, dx);
    
    ctx.save();
    
    // Aiming line
    ctx.strokeStyle = 'rgba(255, 255, 100, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(
        cueBall.x + Math.cos(angle) * 400,
        cueBall.y + Math.sin(angle) * 400
    );
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Impact zone
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
        cueBall.x + Math.cos(angle) * (cueBall.radius * 2.5),
        cueBall.y + Math.sin(angle) * (cueBall.radius * 2.5),
        cueBall.radius * 1.5,
        0,
        Math.PI * 2
    );
    ctx.stroke();
    
    ctx.restore();
}

// Draw visual effects (pot flashes and score popups)
function drawVisualEffects() {
    const currentTime = Date.now();

    // Draw pot flashes
    visualEffects.potFlashes = visualEffects.potFlashes.filter(flash => {
        const elapsed = currentTime - flash.startTime;
        if (!flash.startTime) {
            flash.startTime = currentTime;
        }
        const elapsed2 = currentTime - flash.startTime;
        const progress = elapsed2 / flash.duration;

        if (progress <= 1) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 215, 0, ${(1 - progress) * 0.6})`;
            ctx.beginPath();
            ctx.arc(flash.x, flash.y, 20 + progress * 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 215, 0, ${(1 - progress) * 0.8})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            return true;
        }
        return false;
    });

    // Draw score popups
    visualEffects.scorePopups = visualEffects.scorePopups.filter(popup => {
        const elapsed = currentTime - popup.startTime;
        if (!popup.startTime) {
            popup.startTime = currentTime;
        }
        const elapsed2 = currentTime - popup.startTime;
        const progress = elapsed2 / popup.duration;

        if (progress <= 1) {
            ctx.save();
            const opacity = 1 - progress;
            const yOffset = progress * 50;
            
            ctx.fillStyle = `rgba(255, 215, 0, ${opacity * 0.9})`;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(popup.text, popup.x, popup.y - yOffset);
            ctx.restore();
            return true;
        }
        return false;
    });
}

// Helper function to find nearest pocket to a ball
function getPocketNearestToBall(ball) {
    const table = new Table();
    let nearest = table.pockets[0];
    let minDistance = Infinity;

    for (let pocket of table.pockets) {
        const dx = pocket.x - ball.x;
        const dy = pocket.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = pocket;
        }
    }
    return nearest;
}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    initGame();
    updateUI();
});
