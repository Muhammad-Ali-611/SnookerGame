// 8-Ball Pool Game State
let gameState8Ball = {
    balls: [],
    players: [
        { name: 'Player 1', type: null, ballsLeft: 7, potted: 0 },
        { name: 'Player 2', type: null, ballsLeft: 7, potted: 0 }
    ],
    currentPlayer: 0,
    isShooting: false,
    gameRunning: true,
    fouls: 0,
    difficulty: 'casual',
    gameWinner: null,
    ballTypeDetermined: false  // Track if player has determined solid vs stripe
};

// Visual Effects State
let visualEffects8Ball = {
    potFlashes: [],
    scorePopups: [],
    cushionHits: []
};

// Mouse State
let mouseState8Ball = {
    x: 0,
    y: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
};

// Canvas and Context
let canvas8Ball, ctx8Ball;

// Ball Class for 8-Ball
class PoolBall {
    constructor(x, y, type = '0') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.spin = 0;
        this.topspin = 0;
        this.sidespin = 0;
        this.type = type;  // '0' = cue, '1'-'7' = solids, '9'-'15' = stripes, '8' = black
        this.radius = 9;   // Slightly smaller than snooker balls (pool balls)
        this.potted = false;
    }

    update() {
        if (this.potted) return;

        // Apply friction
        this.vx *= 0.985;
        this.vy *= 0.985;

        // Apply spin friction
        this.spin *= 0.995;
        this.topspin *= 0.995;

        // Stop if speed is too low
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const spinMag = Math.abs(this.spin) + Math.abs(this.topspin);
        if (speed < 0.08 && spinMag < 0.1) {
            this.vx = 0;
            this.vy = 0;
            this.spin = 0;
            this.topspin = 0;
            return;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Handle wall collisions
        this.handleWallCollisions();
    }

    handleWallCollisions() {
        const margin = this.radius;
        const boundaries = {
            left: 50,
            right: 950,
            top: 25,
            bottom: 475
        };

        // Left wall
        if (this.x - margin < boundaries.left) {
            this.x = boundaries.left + margin;
            const velocity = Math.abs(this.vx);
            this.vx *= -0.88 * 0.92;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
        // Right wall
        if (this.x + margin > boundaries.right) {
            this.x = boundaries.right - margin;
            const velocity = Math.abs(this.vx);
            this.vx *= -0.88 * 0.92;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
        // Top wall
        if (this.y - margin < boundaries.top) {
            this.y = boundaries.top + margin;
            const velocity = Math.abs(this.vy);
            this.vy *= -0.88 * 0.92;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
        // Bottom wall
        if (this.y + margin > boundaries.bottom) {
            this.y = boundaries.bottom - margin;
            const velocity = Math.abs(this.vy);
            this.vy *= -0.88 * 0.92;
            if (velocity > 1) soundManager.playCushionSound(velocity);
        }
    }

    collideWith(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.radius + other.radius) {
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            const vx1 = this.vx * cos + this.vy * sin;
            const vy1 = this.vy * cos - this.vx * sin;
            const vx2 = other.vx * cos + other.vy * sin;
            const vy2 = other.vy * cos - other.vx * sin;

            const vx1Final = vx2;
            const vx2Final = vx1;

            this.vx = vx1Final * cos - vy1 * sin;
            this.vy = vy1 * cos + vx1Final * sin;
            other.vx = vx2Final * cos - vy2 * sin;
            other.vy = vy2 * cos + vx2Final * sin;

            const overlap = this.radius + other.radius - distance;
            const separationX = (overlap / 2) * cos;
            const separationY = (overlap / 2) * sin;
            this.x -= separationX;
            this.y -= separationY;
            other.x += separationX;
            other.y += separationY;

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

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(this.x + 1, this.y + 2, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main ball
            if (this.type === '0') {
                // Cue ball - white
                ctx.fillStyle = '#FFFFFF';
            } else if (this.type === '8') {
                // Black 8-ball
                ctx.fillStyle = '#000000';
            } else if (parseInt(this.type) >= 1 && parseInt(this.type) <= 7) {
                // Solid balls - bright colors
                const colors = ['', '#FF0000', '#FFFF00', '#FF0000', '#000080', '#FF6600', '#008000', '#800080'];
                ctx.fillStyle = colors[parseInt(this.type)] || '#CCCCCC';
            } else {
                // Striped balls
                const colors = ['', '#FF0000', '#FFFF00', '#FF0000', '#000080', '#FF6600', '#008000', '#800080'];
                const ballNum = parseInt(this.type) - 8;
                ctx.fillStyle = colors[ballNum] || '#CCCCCC';
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x - this.radius / 2.5, this.y - this.radius / 2.5, this.radius / 4, 0, Math.PI * 2);
            ctx.fill();

            // Ball number/stripe
            if (this.type !== '0') {
                const ballNum = parseInt(this.type);
                
                if (ballNum >= 1 && ballNum <= 7) {
                    // Solid - white number
                    ctx.fillStyle = '#FFFFFF';
                } else if (ballNum === 8) {
                    // Black ball - white 8
                    ctx.fillStyle = '#FFFFFF';
                } else {
                    // Striped - white background with number
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000000';
                }

                ctx.font = 'bold ' + (this.radius * 1.5) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ballNum, this.x, this.y);
            }

            ctx.restore();
        } catch (e) {
            console.error('Error drawing ball:', e);
        }
    }

    isPotted(table) {
        for (let pocket of table.pockets) {
            const dist = Math.sqrt((this.x - pocket.x) ** 2 + (this.y - pocket.y) ** 2);
            if (dist < pocket.radius) {
                return true;
            }
        }
        return false;
    }
}

// Pool Table Class
class PoolTable {
    constructor() {
        // 6 pockets (standard 8-ball table)
        this.pockets = [
            { x: 50, y: 25, radius: 15 },      // Top Left
            { x: 500, y: 25, radius: 15 },     // Top Center
            { x: 950, y: 25, radius: 15 },     // Top Right
            { x: 50, y: 475, radius: 15 },     // Bottom Left
            { x: 500, y: 475, radius: 15 },    // Bottom Center
            { x: 950, y: 475, radius: 15 }     // Bottom Right
        ];

        this.boundaries = {
            left: 50,
            right: 950,
            top: 25,
            bottom: 475,
            centerX: 500,
            centerY: 250
        };
    }

    draw(ctx) {
        // Canvas background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 1000, 500);

        // Outer wood frame
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(20, 10, 960, 480);

        // Darker edges
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(20, 10, 960, 6);
        ctx.fillRect(20, 484, 960, 6);
        ctx.fillRect(20, 10, 6, 480);
        ctx.fillRect(974, 10, 6, 480);

        // Felt - green gradient
        const feltGradient = ctx.createLinearGradient(0, 0, 0, 500);
        feltGradient.addColorStop(0, '#1a6b40');
        feltGradient.addColorStop(0.5, '#0f5530');
        feltGradient.addColorStop(1, '#0a3520');
        ctx.fillStyle = feltGradient;
        ctx.fillRect(this.boundaries.left, this.boundaries.top,
                     this.boundaries.right - this.boundaries.left,
                     this.boundaries.bottom - this.boundaries.top);

        // Cushion edge
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 6;
        ctx.strokeRect(this.boundaries.left - 2, this.boundaries.top - 2,
                       (this.boundaries.right - this.boundaries.left) + 4,
                       (this.boundaries.bottom - this.boundaries.top) + 4);

        // Center spot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.boundaries.centerX - 2, this.boundaries.centerY - 2, 4, 4);

        // Draw pockets with shadows
        ctx.fillStyle = '#1a1a1a';
        for (let pocket of this.pockets) {
            ctx.beginPath();
            ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Pocket rim highlight
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    checkPocket(ball) {
        for (let pocket of this.pockets) {
            const dist = Math.sqrt((ball.x - pocket.x) ** 2 + (ball.y - pocket.y) ** 2);
            if (dist < pocket.radius) {
                return true;
            }
        }
        return false;
    }
}

// Cue class
class PoolCue {
    constructor(ball) {
        this.ball = ball;
        this.power = 0;
        this.visible = true;
    }

    update(mouseX, mouseY) {
        this.x = mouseX;
        this.y = mouseY;
    }

    draw(ctx) {
        if (!this.visible) return;

        const angle = Math.atan2(this.ball.y - this.y, this.ball.x - this.x);
        const impactDist = 25 + (this.power / 100) * 20;
        const cueX = this.ball.x - Math.cos(angle) * impactDist;
        const cueY = this.ball.y - Math.sin(angle) * impactDist;
        const cueLength = 60 + this.power * 0.4;

        ctx.save();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 5 + this.power * 0.1;
        ctx.beginPath();
        ctx.moveTo(cueX, cueY);
        ctx.lineTo(cueX - Math.cos(angle) * cueLength, cueY - Math.sin(angle) * cueLength);
        ctx.stroke();

        ctx.fillStyle = '#A0522D';
        ctx.beginPath();
        ctx.arc(cueX, cueY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function setupBalls8Ball() {
    // Cue ball at bottom center
    gameState8Ball.balls.push(new PoolBall(125, 400, '0'));

    // Triangle formation at top
    // Row 1 - 8 ball
    gameState8Ball.balls.push(new PoolBall(850, 250, '8'));

    // Row 2
    gameState8Ball.balls.push(new PoolBall(870, 240, '1'));
    gameState8Ball.balls.push(new PoolBall(870, 260, '9'));

    // Row 3
    gameState8Ball.balls.push(new PoolBall(890, 230, '2'));
    gameState8Ball.balls.push(new PoolBall(890, 250, '10'));
    gameState8Ball.balls.push(new PoolBall(890, 270, '3'));

    // Row 4
    gameState8Ball.balls.push(new PoolBall(910, 220, '4'));
    gameState8Ball.balls.push(new PoolBall(910, 240, '11'));
    gameState8Ball.balls.push(new PoolBall(910, 260, '5'));
    gameState8Ball.balls.push(new PoolBall(910, 280, '12'));

    // Row 5
    gameState8Ball.balls.push(new PoolBall(930, 210, '6'));
    gameState8Ball.balls.push(new PoolBall(930, 230, '13'));
    gameState8Ball.balls.push(new PoolBall(930, 250, '7'));
    gameState8Ball.balls.push(new PoolBall(930, 270, '14'));
    gameState8Ball.balls.push(new PoolBall(930, 290, '15'));
}

function attachEventListeners8Ball() {
    canvas8Ball.addEventListener('mousedown', handleMouseDown8Ball);
    canvas8Ball.addEventListener('mousemove', handleMouseMove8Ball);
    canvas8Ball.addEventListener('mouseup', handleMouseUp8Ball);
    document.addEventListener('keydown', handleKeyDown8Ball);
    document.getElementById('reset-btn').addEventListener('click', resetGame8Ball);

    const soundToggleBtn = document.getElementById('sound-toggle');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', function() {
            soundManager.toggleSound();
            const isEnabled = soundManager.enabled !== false;
            soundToggleBtn.textContent = isEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        });
    }
}

function handleMouseDown8Ball(e) {
    const rect = canvas8Ball.getBoundingClientRect();
    mouseState8Ball.dragStartX = e.clientX - rect.left;
    mouseState8Ball.dragStartY = e.clientY - rect.top;
    mouseState8Ball.isDragging = true;
}

function handleMouseMove8Ball(e) {
    const rect = canvas8Ball.getBoundingClientRect();
    mouseState8Ball.x = e.clientX - rect.left;
    mouseState8Ball.y = e.clientY - rect.top;

    if (mouseState8Ball.isDragging) {
        const dx = mouseState8Ball.dragStartX - mouseState8Ball.x;
        const dy = mouseState8Ball.dragStartY - mouseState8Ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(distance / 2.5, 100);
        updatePowerDisplay8Ball(power);
    }
}

function handleMouseUp8Ball(e) {
    if (!mouseState8Ball.isDragging || gameState8Ball.isShooting) return;

    const dx = mouseState8Ball.dragStartX - mouseState8Ball.x;
    const dy = mouseState8Ball.dragStartY - mouseState8Ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
        const angle = Math.atan2(dy, dx);
        const power = Math.min(distance / 2.5, 100);
        const strength = (power / 100) * 15;  // Shot power for pool

        gameState8Ball.balls[0].vx = Math.cos(angle) * strength;
        gameState8Ball.balls[0].vy = Math.sin(angle) * strength;

        if (e.shiftKey) {
            const spinAmount = (power / 100) * 5;
            gameState8Ball.balls[0].topspin = spinAmount;
        }

        gameState8Ball.isShooting = true;
        soundManager.playShotSound(power / 100);
    }

    mouseState8Ball.isDragging = false;
    updatePowerDisplay8Ball(0);
}

function handleKeyDown8Ball(e) {
    if (e.key.toLowerCase() === 'r') {
        resetGame8Ball();
    } else if (e.key === 'Escape') {
        window.location.href = 'index.html';
    }
}

function resetGame8Ball() {
    gameState8Ball.balls = [];
    gameState8Ball.players[0].type = null;
    gameState8Ball.players[0].ballsLeft = 7;
    gameState8Ball.players[0].potted = 0;
    gameState8Ball.players[1].type = null;
    gameState8Ball.players[1].ballsLeft = 7;
    gameState8Ball.players[1].potted = 0;
    gameState8Ball.currentPlayer = 0;
    gameState8Ball.isShooting = false;
    gameState8Ball.gameRunning = true;
    gameState8Ball.fouls = 0;
    gameState8Ball.gameWinner = null;
    gameState8Ball.ballTypeDetermined = false;
    setupBalls8Ball();
    updateUI8Ball();
}

function updatePowerDisplay8Ball(power) {
    document.getElementById('power-value').textContent = Math.round(power) + '%';
    document.getElementById('power-fill').style.width = power + '%';
}

function updateUI8Ball() {
    const currentPlayer = gameState8Ball.players[gameState8Ball.currentPlayer];
    document.getElementById('player').textContent = currentPlayer.name;
    document.getElementById('player-balls').textContent = currentPlayer.type ? (currentPlayer.type === 'solid' ? 'Solids' : 'Stripes') : '-';
    document.getElementById('balls-left').textContent = currentPlayer.ballsLeft;
    document.getElementById('fouls').textContent = gameState8Ball.fouls;
    
    if (gameState8Ball.gameWinner) {
        document.getElementById('game-status').textContent = gameState8Ball.gameWinner + ' Wins!';
    } else {
        document.getElementById('game-status').textContent = currentPlayer.name + ' Turn';
    }
}

function setGameDifficulty(difficulty) {
    gameState8Ball.difficulty = difficulty;
    document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
    document.getElementById('mode-' + difficulty).classList.add('active');
}

function update8Ball() {
    if (!gameState8Ball.gameRunning) return;

    // Update all balls
    for (let ball of gameState8Ball.balls) {
        ball.update();
    }

    // Check collisions between balls
    for (let i = 0; i < gameState8Ball.balls.length; i++) {
        for (let j = i + 1; j < gameState8Ball.balls.length; j++) {
            gameState8Ball.balls[i].collideWith(gameState8Ball.balls[j]);
        }
    }

    // Check potted balls
    const table = new PoolTable();
    let cuePotted = false;
    let ballsPotted = [];

    if (!gameState8Ball.balls[0].potted && gameState8Ball.balls[0].isPotted(table)) {
        gameState8Ball.balls[0].potted = true;
        gameState8Ball.balls[0].vx = 0;
        gameState8Ball.balls[0].vy = 0;
        gameState8Ball.balls[0].x = 125;
        gameState8Ball.balls[0].y = 400;
        gameState8Ball.balls[0].potted = false;
        gameState8Ball.fouls++;
        cuePotted = true;
        soundManager.playPotSound();
    }

    for (let i = 1; i < gameState8Ball.balls.length; i++) {
        if (!gameState8Ball.balls[i].potted && gameState8Ball.balls[i].isPotted(table)) {
            gameState8Ball.balls[i].potted = true;
            const ballNum = parseInt(gameState8Ball.balls[i].type);
            
            // Determine player type on first ball potted
            if (!gameState8Ball.ballTypeDetermined) {
                if (ballNum >= 1 && ballNum <= 7) {
                    gameState8Ball.players[gameState8Ball.currentPlayer].type = 'solid';
                    gameState8Ball.players[1 - gameState8Ball.currentPlayer].type = 'stripe';
                } else if (ballNum >= 9 && ballNum <= 15) {
                    gameState8Ball.players[gameState8Ball.currentPlayer].type = 'stripe';
                    gameState8Ball.players[1 - gameState8Ball.currentPlayer].type = 'solid';
                }
                gameState8Ball.ballTypeDetermined = true;
            }

            ballsPotted.push(i);
            soundManager.playPotSound();

            const pocketPos = table.pockets[0];
            visualEffects8Ball.potFlashes.push({
                x: pocketPos.x,
                y: pocketPos.y,
                time: 0,
                duration: 300,
                startTime: Date.now()
            });

            visualEffects8Ball.scorePopups.push({
                x: gameState8Ball.balls[i].x,
                y: gameState8Ball.balls[i].y,
                text: 'Ball ' + ballNum,
                time: 0,
                duration: 800,
                startTime: Date.now()
            });

            updateUI8Ball();
        }
    }

    // Check if shooting is done
    if (gameState8Ball.isShooting) {
        let allStopped = true;
        for (let ball of gameState8Ball.balls) {
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed > 0.1) {
                allStopped = false;
                break;
            }
        }

        if (allStopped) {
            gameState8Ball.isShooting = false;

            // Check win condition
            if (ballsPotted.length > 0) {
                const potted = ballsPotted[0];
                const ballNum = parseInt(gameState8Ball.balls[potted].type);

                if (ballNum === 8) {
                    gameState8Ball.gameWinner = gameState8Ball.players[gameState8Ball.currentPlayer].name;
                    gameState8Ball.gameRunning = false;
                }
            }

            // Switch players if no balls potted (unless it was cue ball)
            if (ballsPotted.length === 0 && !cuePotted) {
                gameState8Ball.currentPlayer = 1 - gameState8Ball.currentPlayer;
            } else if (cuePotted) {
                gameState8Ball.currentPlayer = 1 - gameState8Ball.currentPlayer;
            }

            updateUI8Ball();
        }
    }
}

function draw8Ball() {
    const table = new PoolTable();
    table.draw(ctx8Ball);

    // Draw balls
    for (let i = 0; i < gameState8Ball.balls.length; i++) {
        gameState8Ball.balls[i].draw(ctx8Ball);
    }

    // Draw cue
    const cue = new PoolCue(gameState8Ball.balls[0]);
    cue.power = parseFloat(document.getElementById('power-value').textContent) || 0;
    cue.update(mouseState8Ball.x, mouseState8Ball.y);
    cue.draw(ctx8Ball);

    // Draw visual effects
    drawVisualEffects8Ball();
}

function drawVisualEffects8Ball() {
    const currentTime = Date.now();

    visualEffects8Ball.potFlashes = visualEffects8Ball.potFlashes.filter(flash => {
        const elapsed = currentTime - flash.startTime;
        const progress = elapsed / flash.duration;

        if (progress <= 1) {
            ctx8Ball.save();
            ctx8Ball.fillStyle = `rgba(255, 215, 0, ${(1 - progress) * 0.6})`;
            ctx8Ball.beginPath();
            ctx8Ball.arc(flash.x, flash.y, 15 + progress * 25, 0, Math.PI * 2);
            ctx8Ball.fill();
            ctx8Ball.restore();
            return true;
        }
        return false;
    });

    visualEffects8Ball.scorePopups = visualEffects8Ball.scorePopups.filter(popup => {
        const elapsed = currentTime - popup.startTime;
        const progress = elapsed / popup.duration;

        if (progress <= 1) {
            ctx8Ball.save();
            const opacity = 1 - progress;
            const yOffset = progress * 40;
            
            ctx8Ball.fillStyle = `rgba(255, 215, 0, ${opacity * 0.9})`;
            ctx8Ball.font = 'bold 18px Arial';
            ctx8Ball.textAlign = 'center';
            ctx8Ball.textBaseline = 'middle';
            ctx8Ball.fillText(popup.text, popup.x, popup.y - yOffset);
            ctx8Ball.restore();
            return true;
        }
        return false;
    });
}

function gameLoop8Ball() {
    update8Ball();
    draw8Ball();
    requestAnimationFrame(gameLoop8Ball);
}

function initGame8Ball() {
    canvas8Ball = document.getElementById('gameCanvas');
    ctx8Ball = canvas8Ball.getContext('2d');

    gameState8Ball.balls = [];
    gameState8Ball.currentPlayer = 0;
    gameState8Ball.isShooting = false;
    gameState8Ball.gameRunning = true;
    gameState8Ball.fouls = 0;
    gameState8Ball.gameWinner = null;
    gameState8Ball.ballTypeDetermined = false;

    setupBalls8Ball();
    attachEventListeners8Ball();
    gameLoop8Ball();
}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    initGame8Ball();
    updateUI8Ball();
});
