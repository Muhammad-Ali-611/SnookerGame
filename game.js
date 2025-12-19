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
    gameModeRules: null,   // Will be set to GAME_MODE_RULES[gameMode]
    expectingRed: true,   // True when player should pot a red ball
    message: '',           // Current game message
    messageTime: 0        // When to clear message
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
        if (speed < MIN_SPEED && spinMagnitude < 0.05) {
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
        const minDistance = this.radius + other.radius;

        if (distance < minDistance && distance > 0) {
            // Collision detected - use proper elastic collision physics
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            // Rotate coordinate system so collision happens along x-axis
            const vx1 = this.vx * cos + this.vy * sin;
            const vy1 = this.vy * cos - this.vx * sin;
            const vx2 = other.vx * cos + other.vy * sin;
            const vy2 = other.vy * cos - other.vx * sin;

            // Elastic collision with equal mass (swap x-velocities, keep y-velocities)
            const vx1Final = vx2;
            const vx2Final = vx1;

            // Rotate velocities back to original coordinate system
            this.vx = vx1Final * cos - vy1 * sin;
            this.vy = vy1 * cos + vx1Final * sin;
            other.vx = vx2Final * cos - vy2 * sin;
            other.vy = vy2 * cos + vx2Final * sin;

            // Separate balls to prevent overlap
            const overlap = minDistance - distance;
            const separationX = (overlap / 2) * cos;
            const separationY = (overlap / 2) * sin;
            this.x -= separationX;
            this.y -= separationY;
            other.x += separationX;
            other.y += separationY;

            // Play collision sound based on relative velocity
            const relativeVelocity = Math.abs(vx1Final - vx2Final);
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
                // Red balls - solid red, no markings needed for snooker
                // Optional: add subtle number for identification
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = 'bold ' + (this.radius * 0.8) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const ballIndex = gameState.balls.indexOf(this);
                if (ballIndex >= 6) {
                    const redNum = (ballIndex - 6) % 15 + 1;
                    ctx.fillText(redNum, this.x, this.y);
                }
            } else if (this.type === BALL_TYPES.YELLOW) {
                // Yellow ball - white stripe
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.radius * 0.7, this.y);
                ctx.lineTo(this.x + this.radius * 0.7, this.y);
                ctx.stroke();
            } else if (this.type === BALL_TYPES.GREEN) {
                // Green ball - white stripe
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.radius * 0.7, this.y);
                ctx.lineTo(this.x + this.radius * 0.7, this.y);
                ctx.stroke();
            } else if (this.type === BALL_TYPES.BROWN) {
                // Brown ball - white stripe
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.radius * 0.7, this.y);
                ctx.lineTo(this.x + this.radius * 0.7, this.y);
                ctx.stroke();
            } else if (this.type === BALL_TYPES.BLUE) {
                // Blue ball - white stripe
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.radius * 0.7, this.y);
                ctx.lineTo(this.x + this.radius * 0.7, this.y);
                ctx.stroke();
            } else if (this.type === BALL_TYPES.PINK) {
                // Pink ball - white stripe
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.radius * 0.7, this.y);
                ctx.lineTo(this.x + this.radius * 0.7, this.y);
                ctx.stroke();
            } else if (this.type === BALL_TYPES.BLACK) {
                // Black ball - white circle spot
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.35, 0, Math.PI * 2);
                ctx.fill();
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

        // Aiming line with glow (shows trajectory)
        ctx.strokeStyle = 'rgba(255, 255, 150, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 255, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(this.ball.x, this.ball.y);
        ctx.lineTo(
            this.ball.x + Math.cos(this.angle) * 400,
            this.ball.y + Math.sin(this.angle) * 400
        );
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.setLineDash([]);

        // Power indicator circle
        ctx.strokeStyle = `rgba(255, ${200 - this.power * 1.5}, 0, 0.7)`;
        ctx.lineWidth = 2;
        const impactDist = 30 + (this.power / 100) * 40;
        ctx.beginPath();
        ctx.arc(
            this.ball.x + Math.cos(this.angle) * impactDist,
            this.ball.y + Math.sin(this.angle) * impactDist,
            this.ball.radius * 1.8,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        // Cue stick (drawn behind ball)
        const cueLength = 100 + this.power * 0.8;
        const cueStartX = this.ball.x - Math.cos(this.angle) * (cueLength + this.ball.radius);
        const cueStartY = this.ball.y - Math.sin(this.angle) * (cueLength + this.ball.radius);
        const cueEndX = this.ball.x - Math.cos(this.angle) * (this.ball.radius + 5);
        const cueEndY = this.ball.y - Math.sin(this.angle) * (this.ball.radius + 5);

        // Cue stick gradient
        const cueGradient = ctx.createLinearGradient(cueStartX, cueStartY, cueEndX, cueEndY);
        cueGradient.addColorStop(0, '#654321'); // Dark brown
        cueGradient.addColorStop(0.5, '#8B4513'); // Medium brown
        cueGradient.addColorStop(1, '#A0522D'); // Lighter brown
        
        ctx.strokeStyle = cueGradient;
        ctx.lineWidth = 8 + this.power * 0.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(cueEndX, cueEndY);
        ctx.stroke();

        // Cue tip (leather)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cueEndX, cueEndY, 7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1;
        ctx.stroke();

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
    if (gameState.isShooting) return; // Don't allow aiming while balls are moving
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Only allow aiming if clicking near the cue ball
    if (gameState.balls.length > 0 && !gameState.balls[0].potted) {
        const cueBall = gameState.balls[0];
        const dx = mouseX - cueBall.x;
        const dy = mouseY - cueBall.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Allow dragging if clicking within reasonable distance of cue ball
        if (distance < 200) {
            mouseState.dragStartX = mouseX;
            mouseState.dragStartY = mouseY;
            mouseState.isDragging = true;
        }
    }
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
    if (!mouseState.isDragging || gameState.isShooting) {
        mouseState.isDragging = false;
        updatePowerDisplay(0);
        return;
    }

    if (gameState.balls.length === 0 || gameState.balls[0].potted) {
        mouseState.isDragging = false;
        updatePowerDisplay(0);
        return;
    }

    const dx = mouseState.dragStartX - mouseState.x;
    const dy = mouseState.dragStartY - mouseState.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Minimum distance to register a shot
    if (distance > 10) {
        const cueBall = gameState.balls[0];
        
        // Calculate angle from cue ball to drag end point
        const angle = Math.atan2(dy, dx);
        const power = Math.min(distance / 3, 100);
        const strength = (power / 100) * SHOT_POWER;

        // Apply velocity to cue ball
        cueBall.vx = Math.cos(angle) * strength;
        cueBall.vy = Math.sin(angle) * strength;

        // Add spin if Shift key is held during shot
        if (e.shiftKey) {
            // Shift + drag creates topspin/backspin based on drag direction
            const spinAmount = (power / 100) * 5;  // Max spin of 5
            cueBall.topspin = spinAmount;  // Topspin effect
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
    gameState.expectingRed = true;
    gameState.message = '';
    gameState.messageTime = 0;
    gameState.gameModeRules = GAME_MODE_RULES[gameState.gameMode];
    visualEffects.potFlashes = [];
    visualEffects.scorePopups = [];
    visualEffects.cushionHits = [];
    setupBalls();
    updateUI();
}

function updatePowerDisplay(power) {
    document.getElementById('power-value').textContent = Math.round(power) + '%';
    document.getElementById('power-fill').style.width = power + '%';
}

function updateUI() {
    const scoreEl = document.getElementById('score');
    const redsLeftEl = document.getElementById('reds-left');
    const foulsEl = document.getElementById('fouls');
    const highestBreakEl = document.getElementById('highest-break');
    const gameModeEl = document.getElementById('game-mode');
    
    if (scoreEl) scoreEl.textContent = gameState.score;
    if (redsLeftEl) redsLeftEl.textContent = gameState.redsLeft;
    if (foulsEl) foulsEl.textContent = gameState.fouls;
    if (highestBreakEl) highestBreakEl.textContent = gameState.highestBreak;
    if (gameModeEl) gameModeEl.textContent = gameState.gameModeRules ? gameState.gameModeRules.name : 'Unknown';
}

// Switch game mode
function setGameMode(mode) {
    const modeKey = mode.toLowerCase();
    if (GAME_MODE_RULES[modeKey]) {
        gameState.gameMode = modeKey;
        gameState.gameModeRules = GAME_MODE_RULES[modeKey];
        
        // Update active button
        document.querySelectorAll('.btn-mode').forEach(btn => {
            btn.classList.remove('active');
        });
        const btnId = 'mode-' + modeKey;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.add('active');
        }
        
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
    gameState.expectingRed = true;
    gameState.message = '';
    gameState.messageTime = 0;

    setupBalls();
    attachEventListeners();
    updateUI();
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

    // Ball-to-ball collisions (check all pairs once)
    for (let i = 0; i < gameState.balls.length; i++) {
        if (gameState.balls[i].potted) continue;
        
        for (let j = i + 1; j < gameState.balls.length; j++) {
            if (!gameState.balls[j].potted) {
                gameState.balls[i].collideWith(gameState.balls[j]);
            }
        }
    }

    // Check for potted balls
    const table = new Table();
    
    // Check if cue ball was potted (ball 0)
    if (gameState.balls.length > 0 && !gameState.balls[0].potted && gameState.balls[0].isPotted(table)) {
        // Cue ball potted - place it back on the baulk line
        gameState.balls[0].vx = 0;
        gameState.balls[0].vy = 0;
        
        // Reset position to spot on baulk line (D area)
        gameState.balls[0].x = 600;
        gameState.balls[0].y = 480;  // Slightly forward of baulk line (500)
        
        // Apply foul penalty
        gameState.fouls++;
        gameState.score = Math.max(0, gameState.score - gameState.gameModeRules.foulPenalty);
        
        // Play foul sound
        soundManager.playBeep(200, 300, 0.5);
    }
    
    // Check other balls (colored and red)
    for (let i = 1; i < gameState.balls.length; i++) {
        if (!gameState.balls[i].potted && gameState.balls[i].isPotted(table)) {
            const ball = gameState.balls[i];
            const value = getBallValue(ball.type);
            let isValidPot = true;
            
            // Apply snooker rules (only in classic/tournament mode)
            if (gameState.gameMode !== 'practice') {
                if (gameState.expectingRed) {
                    // Should pot a red ball
                    if (ball.type !== BALL_TYPES.RED) {
                        isValidPot = false;
                        gameState.message = 'Foul! Must pot a red ball first';
                        gameState.messageTime = Date.now() + 3000;
                        gameState.fouls++;
                        gameState.score = Math.max(0, gameState.score - gameState.gameModeRules.foulPenalty);
                    }
                } else {
                    // Should pot a colored ball
                    if (ball.type === BALL_TYPES.RED) {
                        isValidPot = false;
                        gameState.message = 'Foul! Must pot a colored ball';
                        gameState.messageTime = Date.now() + 3000;
                        gameState.fouls++;
                        gameState.score = Math.max(0, gameState.score - gameState.gameModeRules.foulPenalty);
                    }
                }
            }
            
            if (isValidPot) {
                // Mark ball as potted
                ball.potted = true;
                ball.vx = 0;
                ball.vy = 0;
                
                // Update score
                gameState.score += value;
                gameState.currentBreak += value;
                gameState.lastPottedBall = ball.type;

                if (ball.type === BALL_TYPES.RED) {
                    gameState.redsLeft = Math.max(0, gameState.redsLeft - 1);
                    gameState.expectingRed = false; // Next should be a color
                } else {
                    // Colored ball potted - if reds remain, next should be red
                    if (gameState.redsLeft > 0) {
                        gameState.expectingRed = true;
                        // In real snooker, colored balls are respotted, but for simplicity we'll skip that
                    } else {
                        // All reds are gone, pot colors in order
                        gameState.expectingRed = false;
                    }
                }

                // Play pot sound
                soundManager.playPotSound();

                // Add pot flash effect
                const pocketPos = getPocketNearestToBall(ball);
                visualEffects.potFlashes.push({
                    x: pocketPos.x,
                    y: pocketPos.y,
                    startTime: null,
                    duration: 300
                });

                // Add score popup
                visualEffects.scorePopups.push({
                    x: ball.x,
                    y: ball.y,
                    text: '+' + value,
                    startTime: null,
                    duration: 800
                });

                // Update highest break
                if (gameState.currentBreak > gameState.highestBreak) {
                    gameState.highestBreak = gameState.currentBreak;
                }
            } else {
                // Invalid pot - mark as potted but don't score
                ball.potted = true;
                ball.vx = 0;
                ball.vy = 0;
                soundManager.playBeep(200, 300, 0.5); // Foul sound
            }

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
            // Reset current break if no balls were potted this turn
            if (gameState.currentBreak === 0) {
                gameState.currentBreak = 0;
            }
        }
    }
    
    // Clear message after timeout
    if (gameState.message && Date.now() > gameState.messageTime) {
        gameState.message = '';
    }
}

function draw() {
    const table = new Table();
    table.draw(ctx);

    // Draw all balls
    for (let i = 0; i < gameState.balls.length; i++) {
        try {
            if (!gameState.balls[i].potted) {
                gameState.balls[i].draw(ctx);
            }
        } catch (e) {
            console.error('Error drawing ball', i, ':', e);
        }
    }

    // Draw cue when aiming (only if cue ball exists and isn't potted)
    if (!gameState.isShooting && mouseState.isDragging && gameState.balls.length > 0 && !gameState.balls[0].potted) {
        const cue = new Cue(gameState.balls[0]);
        const dx = mouseState.dragStartX - mouseState.x;
        const dy = mouseState.dragStartY - mouseState.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        cue.power = Math.min(distance / 3, 100);
        cue.angle = Math.atan2(dy, dx);
        cue.draw(ctx);
    }

    // Draw aiming preview when mouse is over table
    if (!gameState.isShooting && !mouseState.isDragging && gameState.balls.length > 0 && !gameState.balls[0].potted) {
        drawAimingPreview();
    }

    // Draw visual effects (pot flashes and score popups)
    drawVisualEffects();
    
    // Draw game message
    if (gameState.message) {
        drawGameMessage();
    }
    
    // Draw turn indicator
    drawTurnIndicator();
}

function drawGameMessage() {
    ctx.save();
    ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
    ctx.fillRect(50, 50, 300, 60);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 300, 60);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gameState.message, 200, 80);
    ctx.restore();
}

function drawTurnIndicator() {
    if (gameState.isShooting) return;
    
    ctx.save();
    const indicatorY = 120;
    const indicatorText = gameState.expectingRed ? 'Pot RED ball' : 'Pot COLORED ball';
    const indicatorColor = gameState.expectingRed ? '#FF0000' : '#FFD700';
    
    ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
    ctx.fillRect(50, indicatorY, 250, 35);
    
    ctx.strokeStyle = indicatorColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(50, indicatorY, 250, 35);
    
    ctx.fillStyle = indicatorColor;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(indicatorText, 60, indicatorY + 17.5);
    ctx.restore();
}

function drawAimingPreview() {
    if (!gameState.balls || gameState.balls.length === 0) return;
    
    const cueBall = gameState.balls[0];
    if (!cueBall || cueBall.potted) return;
    
    const dx = mouseState.x - cueBall.x;
    const dy = mouseState.y - cueBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only show preview if mouse is reasonably far from cue ball
    if (distance < 50) return;
    
    const angle = Math.atan2(dy, dx);
    
    ctx.save();
    
    // Aiming line (dashed)
    ctx.strokeStyle = 'rgba(255, 255, 150, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.shadowColor = 'rgba(255, 255, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(
        cueBall.x + Math.cos(angle) * 500,
        cueBall.y + Math.sin(angle) * 500
    );
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.setLineDash([]);
    
    // Impact zone indicator
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
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
    
    // Direction arrow
    const arrowLength = 30;
    const arrowX = cueBall.x + Math.cos(angle) * (cueBall.radius + arrowLength);
    const arrowY = cueBall.y + Math.sin(angle) * (cueBall.radius + arrowLength);
    
    ctx.fillStyle = 'rgba(255, 255, 100, 0.7)';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
        arrowX - Math.cos(angle - Math.PI / 6) * 10,
        arrowY - Math.sin(angle - Math.PI / 6) * 10
    );
    ctx.lineTo(
        arrowX - Math.cos(angle + Math.PI / 6) * 10,
        arrowY - Math.sin(angle + Math.PI / 6) * 10
    );
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Draw visual effects (pot flashes and score popups)
function drawVisualEffects() {
    const currentTime = Date.now();

    // Draw pot flashes
    visualEffects.potFlashes = visualEffects.potFlashes.filter(flash => {
        if (!flash.startTime) {
            flash.startTime = currentTime;
        }
        const elapsed = currentTime - flash.startTime;
        const progress = elapsed / flash.duration;

        if (progress <= 1) {
            ctx.save();
            const alpha = (1 - progress) * 0.6;
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(flash.x, flash.y, 20 + progress * 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 1.3})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            return true;
        }
        return false;
    });

    // Draw score popups
    visualEffects.scorePopups = visualEffects.scorePopups.filter(popup => {
        if (!popup.startTime) {
            popup.startTime = currentTime;
        }
        const elapsed = currentTime - popup.startTime;
        const progress = elapsed / popup.duration;

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
    // Ensure constants are loaded
    if (typeof BALL_TYPES === 'undefined' || typeof GAME_MODE_RULES === 'undefined') {
        console.error('Constants not loaded! Make sure constants.js is loaded before game.js');
        return;
    }
    
    initGame();
    
    // Show initial instructions
    setTimeout(() => {
        if (gameState.message === '') {
            gameState.message = 'Click and drag from cue ball to aim and set power';
            gameState.messageTime = Date.now() + 4000;
        }
    }, 500);
});
