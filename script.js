// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

// Create engine
const engine = Engine.create();
const world = engine.world;

// Create renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent'
    }
});

// Run the renderer
Render.run(render);

// Create runner
const runner = Runner.create();
Runner.run(runner, engine);

// --- Game Variables ---
let currentBlock = null;
let blockCount = 0;
let isCooldown = false;
const scoreElement = document.getElementById('score');

// --- Boundaries ---
// Central Platform: 300px wide (variable), centered
const platformWidth = 300;
const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 50, platformWidth, 20, {
    isStatic: true,
    render: { fillStyle: '#4CAF50' }
});

// Remove walls so blocks can fall off
Composite.add(world, [ground]);

// --- Game Loop for Game Over ---
Events.on(engine, 'beforeUpdate', () => {
    if (!gameStarted) return; // CHANGE: Don't check for game over if game stopped

    // Check if any body has fallen off the screen
    const bodies = Composite.allBodies(world);
    for (let body of bodies) {
        // Ignore the ground itself and the current block we are holding
        if (body === ground || body === currentBlock) continue;

        if (body.position.y > window.innerHeight + 100) {
            gameOver();
            break; // Stop checking other bodies
        }
    }
});

// --- Game Over Logic ---

const gameOverModal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');

const homeBtn = document.getElementById('home-btn');
const homeQuitBtn = document.getElementById('home-quit-btn');

function resetGame() {
    // Reset game state
    blockCount = 0;
    scoreElement.innerText = `Blocs: 0`;

    // Clear existing blocks (keep ground)
    const bodies = Composite.allBodies(world);
    for (let body of bodies) {
        if (body !== ground && body.label !== 'Ground') {
            if (body === ground) continue;
            Composite.remove(world, body);
        }
    }
}

restartBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    resetGame();
    gameStarted = true;
    SoundEngine.playMusic(); // Resume music
});

homeBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    resetGame();
    startScreen.classList.remove('hidden'); // Show start screen
    gameStarted = false;
    // Don't play music yet, wait for user to click Start
});


const quitAction = () => {
    // Try to close the window
    window.close();

    // Use a fallback if window.close() is blocked (most browsers block it if not opened by script)
    // We replace the entire body with a goodbye message
    document.body.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;font-family:'Segoe UI', sans-serif;flex-direction:column;text-align:center;">
            <h1 style="font-size:3rem;margin-bottom:20px;">Jeu Quitté</h1>
            <p style="font-size:1.5rem;">Merci d'avoir joué !</p>
            <p style="opacity:0.7;margin-top:10px;">Vous pouvez fermer cet onglet.</p>
        </div>
    `;
};

quitBtn.addEventListener('click', quitAction);
homeQuitBtn.addEventListener('click', quitAction);

function gameOver() {
    SoundEngine.gameOver();
    SoundEngine.stopMusic(); // Stop music on game over

    // Show Modal instead of alert
    finalScoreElement.innerText = `Score Final: ${blockCount}`;
    gameOverModal.classList.remove('hidden');

    gameStarted = false;
    // We don't show the start screen here, we stay on the Game Over screen until restart
}

// --- Input Handling ---

// --- Game Logic ---
let gameStarted = false;
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const musicToggle = document.getElementById('music-toggle');
const sfxToggle = document.getElementById('sfx-toggle');

// Audio State
let musicEnabled = true;
let sfxEnabled = true;

// --- Audio Engine (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SoundEngine = {
    playTone: function (freq, type, duration, vol = 0.1) {
        if (!sfxEnabled || audioCtx.state === 'suspended') return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    spawn: function () {
        // High pitch "pop"
        this.playTone(600, 'sine', 0.1, 0.1);
    },

    drop: function () {
        // Lower pitch "thud"
        this.playTone(200, 'triangle', 0.15, 0.15);
    },

    gameOver: function () {
        // Descending slide
        if (!sfxEnabled || audioCtx.state === 'suspended') return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
    },

    // Music System
    musicInterval: null,
    playMusic: function () {
        if (this.musicInterval) clearInterval(this.musicInterval);
        if (!musicEnabled) return;

        let noteIndex = 0;
        // Simple C Major Arpeggio-ish sequence
        const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];

        this.musicInterval = setInterval(() => {
            if (!musicEnabled || audioCtx.state === 'suspended') return;

            // Soft background beep
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(notes[noteIndex], audioCtx.currentTime);

            gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Very quiet
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);

            noteIndex = (noteIndex + 1) % notes.length;
        }, 600); // BPM
    },

    stopMusic: function () {
        if (this.musicInterval) clearInterval(this.musicInterval);
    }
};

startBtn.addEventListener('click', () => {
    // Resume AudioContext on user interaction
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    startGame();
    SoundEngine.playMusic();
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

musicToggle.addEventListener('change', (e) => {
    musicEnabled = e.target.checked;
    if (musicEnabled) {
        if (gameStarted) SoundEngine.playMusic();
    } else {
        SoundEngine.stopMusic();
    }
});

sfxToggle.addEventListener('change', (e) => {
    sfxEnabled = e.target.checked;
});

function startGame() {
    gameStarted = true;
    startScreen.classList.add('hidden');

    // Reset game state
    blockCount = 0;
    scoreElement.innerText = `Blocs: 0`;

    // Clear existing blocks (keep ground)
    const bodies = Composite.allBodies(world);
    for (let body of bodies) {
        if (body !== ground && body.label !== 'Ground') {
            if (body === ground) continue;
            Composite.remove(world, body);
        }
    }
}

// Interaction events
// Interaction events
// Bind events to the canvas specifically to avoid UI interference
const canvas = render.canvas;

// Mouse Events
canvas.addEventListener('mousedown', (e) => {
    if (!gameStarted) return;

    // Sound
    SoundEngine.spawn();

    // Spawn block anywhere user clicks, but force it to appear at the top
    spawnBlock(e.clientX, 100);
});

canvas.addEventListener('mousemove', (e) => {
    if (currentBlock) {
        // Clamp X to be within screen boundaries
        const margin = 60;
        const clampedX = Math.max(margin, Math.min(e.clientX, window.innerWidth - margin));

        Matter.Body.setPosition(currentBlock, { x: clampedX, y: 100 });
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (currentBlock) {
        // Drop Sound
        SoundEngine.drop();

        // Drop the block
        Matter.Body.setStatic(currentBlock, false);
        currentBlock = null;

        // Update score
        blockCount++;
        scoreElement.innerText = `Blocs: ${blockCount}`;
    }
});

// Touch Events (Mobile Support)
canvas.addEventListener('touchstart', (e) => {
    if (!gameStarted) return;

    e.preventDefault(); // Critical for avoiding scrolling

    // Since we bind to canvas, e.target should be the canvas.
    const touch = e.touches[0];

    // Sound
    SoundEngine.spawn();

    spawnBlock(touch.clientX, 100);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!gameStarted) return;
    e.preventDefault(); // Always prevent scrolling on the game canvas

    if (currentBlock) {
        const touch = e.touches[0];
        // Clamp X to be within screen boundaries
        const margin = 60;
        const clampedX = Math.max(margin, Math.min(touch.clientX, window.innerWidth - margin));

        Matter.Body.setPosition(currentBlock, { x: clampedX, y: 100 });
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault(); // Prevent potential mouse emulation firing after
    if (currentBlock) {
        // Drop Sound
        SoundEngine.drop();

        // Drop the block
        Matter.Body.setStatic(currentBlock, false);
        currentBlock = null;

        // Update score
        blockCount++;
        scoreElement.innerText = `Blocs: ${blockCount}`;
    }
});

// --- Helper Functions ---

function spawnBlock(x, y) {
    if (currentBlock) return; // Don't spawn if already holding one

    const rand = Math.random();
    let type;

    // Probabilities:
    // 70% Square (0 - 0.7)
    // 20% Plank  (0.7 - 0.9)
    // 10% Triangle (0.9 - 1.0)

    if (rand < 0.7) {
        type = 'square';
    } else if (rand < 0.9) {
        type = 'plank';
    } else {
        type = 'triangle';
    }

    const color = getRandomColor();
    const commonOptions = {
        isStatic: true, // Hold it static while dragging
        restitution: 0.2, // Bounciness
        friction: 0.6,
        render: {
            fillStyle: color,
            strokeStyle: 'white',
            lineWidth: 2
        }
    };

    let body;

    switch (type) {
        case 'square':
            body = Bodies.rectangle(x, y, 60, 60, commonOptions);
            break;
        case 'plank':
            body = Bodies.rectangle(x, y, 120, 30, commonOptions);
            break;
        case 'triangle':
            body = Bodies.polygon(x, y, 3, 35, commonOptions);
            break;
    }

    // Random Rotation: 0, 90, 180 (corrected from 160), -90
    const angles = [0, 90, 180, -90];
    const randomAngle = angles[Math.floor(Math.random() * angles.length)];
    Matter.Body.setAngle(body, randomAngle * (Math.PI / 180));

    currentBlock = body;
    Composite.add(world, currentBlock);
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`; // Bright HSL colors
}

// --- Resize Handling ---
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;

    // Reposition ground
    Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight - 50 });
});
