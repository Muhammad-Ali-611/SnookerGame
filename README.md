# 🎱 Snooker Masters

A professional web-based snooker game built with HTML5, CSS3, and JavaScript. Experience the classic cue sport with realistic physics, intuitive controls, and authentic snooker rules.

![Snooker Masters](https://img.shields.io/badge/Status-Live-brightgreen) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow) ![HTML5](https://img.shields.io/badge/HTML5-Latest-orange) ![CSS3](https://img.shields.io/badge/CSS3-Modern-blue)

## 🎮 What is This Game?

**Snooker Masters** is an interactive browser-based snooker simulation that brings the excitement and strategy of professional snooker to your desktop. Snooker is a cue sport played on a rectangular table covered with green baize cloth, with pockets at each of the four corners and in the middle of each long side.

### About Snooker

Snooker is a precision sport that requires skill, strategy, and careful planning. Players use a cue stick to strike a white cue ball, which then hits other balls (15 red balls worth 1 point each, and 6 colored balls worth 2-7 points). The objective is to score more points than your opponent by potting balls in the correct sequence.

## ✨ Features

### 🎯 Gameplay Features
- **Realistic Physics Engine** - Accurate ball movement, collisions, and friction simulation
- **Professional Snooker Rules** - Enforces proper ball sequence (reds before colors)
- **Multiple Game Modes**:
  - **Classic Mode** - Standard snooker rules with foul penalties
  - **Practice Mode** - Unlimited balls, no penalties, perfect for learning
  - **Tournament Mode** - Strict rules with 7-point foul penalties
- **Visual Feedback** - Aiming preview, power indicator, and trajectory visualization
- **Score Tracking** - Real-time score, break tracking, and highest break records

### 🎨 Visual Features
- **Beautiful Table Design** - Professional green baize with realistic pockets and cushions
- **Smooth Animations** - Fluid ball movement and visual effects
- **Turn Indicators** - Clear display showing which ball type to pot next
- **Pot Animations** - Satisfying visual feedback when balls are potted
- **Score Popups** - Animated score displays for each potted ball

### 🔊 Audio Features
- **Sound Effects** - Ball collisions, cushion hits, and pot sounds
- **Volume Control** - Toggle sound on/off
- **Realistic Audio** - Different sounds based on impact velocity

### 🎮 Controls
- **Mouse Movement** - Preview aim direction
- **Click & Drag** - Set shot power (drag further = more power)
- **Release** - Execute shot
- **Shift + Drag** - Add topspin to shot
- **R Key** - Reset game
- **ESC Key** - Return to menu

## 🚀 Getting Started

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Snooker.git
   cd Snooker
   ```

2. **Run a local server** (required for proper functionality)
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Node.js
   npx http-server -p 8000
   ```

3. **Open in browser**
   - Navigate to `http://localhost:8000`
   - Or directly open `http://localhost:8000/game.html`

### Alternative: Direct File Opening

Simply open `index.html` in your web browser (though some features may be limited without a server).

## 📖 How to Play

### Snooker Rules

1. **Objective**: Score more points than your opponent by potting balls in the correct sequence.

2. **Ball Values**:
   - 🔴 Red balls: 1 point each (15 total)
   - 🟡 Yellow: 2 points
   - 🟢 Green: 3 points
   - 🟤 Brown: 4 points
   - 🔵 Blue: 5 points
   - 🩷 Pink: 6 points
   - ⚫ Black: 7 points

3. **Gameplay Sequence**:
   - **First**: Pot a red ball (worth 1 point)
   - **Then**: Pot a colored ball (worth 2-7 points)
   - **Repeat**: Continue alternating red → color until all reds are potted
   - **Finally**: Pot colored balls in order (yellow → green → brown → blue → pink → black)

4. **Fouls**:
   - Potting the wrong ball type
   - Potting the cue ball
   - Missing all balls
   - Penalties range from 4-7 points depending on game mode

5. **Winning**: The player with the highest score wins!

### Tips for Success

- 🎯 **Aim Carefully**: Use the aiming preview to plan your shots
- ⚡ **Control Power**: Adjust drag distance to control shot strength
- 🎱 **Plan Ahead**: Think about position for your next shot
- 💪 **Use Cushions**: Bounce off cushions to reach difficult balls
- 📊 **Track Your Break**: Build up your score with consecutive pots

## 🏗️ Project Structure

```
Snooker/
├── index.html          # Main landing page with game information
├── game.html           # Snooker game interface
├── game.js             # Core snooker game logic and physics
├── constants.js        # Game constants (ball types, values, physics)
├── sounds.js           # Audio management and sound effects
├── styles.css          # Styling and responsive design
├── main.js             # Landing page interactions
├── 8ball.html          # 8-ball pool variant (optional)
├── 8ball.js            # 8-ball game mechanics (optional)
└── README.md           # This file
```

## 🛠️ Technologies Used

- **HTML5** - Structure and canvas rendering
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Game logic, physics simulation, and interactions
- **Canvas API** - 2D graphics rendering
- **Web Audio API** - Sound effects generation

## 🎨 Key Technical Features

### Physics Engine
- Realistic ball-to-ball collision detection
- Cushion bounce physics with damping
- Friction simulation for natural deceleration
- Spin mechanics (topspin/backspin)

### Game Logic
- State management for game flow
- Rule enforcement system
- Score calculation and tracking
- Turn-based gameplay mechanics

### User Interface
- Responsive design for different screen sizes
- Real-time visual feedback
- Interactive controls
- Game state indicators

## 🐛 Known Issues & Future Improvements

- Colored balls are not respotted after being potted (simplified for gameplay)
- Multiplayer mode not yet implemented
- Tournament bracket system planned
- Advanced spin controls (sidespin) can be enhanced

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 👨‍💻 Author

Created with ❤️ for snooker enthusiasts everywhere.

## 🙏 Acknowledgments

- Inspired by professional snooker tournaments
- Built with modern web technologies
- Designed for accessibility and fun

---

**Enjoy playing Snooker Masters! 🎱**

For issues or questions, please open an issue on GitHub.
