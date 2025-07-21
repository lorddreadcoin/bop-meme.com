(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // UI Elements
  const scoreEl = document.getElementById('gameScoreValue');
  const levelEl = document.getElementById('gameLevelValue');
  const livesEl = document.getElementById('gameLivesValue');
  const highScoreEl = document.getElementById('gameHighScoreValue');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const finalLevelEl = document.getElementById('finalLevel');

  // Game settings
  const TILE_SIZE = 20;
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;
  let cols = CANVAS_WIDTH / TILE_SIZE;
  let rows = CANVAS_HEIGHT / TILE_SIZE;

  // Load BOP image
  const pacImg = new Image();
  pacImg.src = '../assets/images/boplips.png';

  // Create miniature versions of meme gallery images for power-ups
  const powerUpImages = [
    '../assets/images/bopbeachy.png',
    '../assets/images/moonbop.png',
    '../assets/images/bopclubber.png',
    '../assets/images/bopmartinipoolside.png'
  ];
  
  const powerUpImgs = [];
  powerUpImages.forEach((src, index) => {
    const img = new Image();
    img.src = src;
    powerUpImgs.push(img);
  });

  // Game state
  let gameState = {
    running: false,
    paused: false,
    gameOver: false
  };

  let pac = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 1.5,
    dirX: 1,
    dirY: 0,
    nextDirX: 1,
    nextDirY: 0,
    speed: 2,
    mouthAngle: 0.2,
    size: TILE_SIZE,
    powerUpTime: 0,
    invulnerable: false
  };

  let game = {
    score: 0,
    level: 1,
    lives: 3,
    highScore: localStorage.getItem('pacBopHighScore') || 0,
    pelletsEaten: 0,
    totalPellets: 0
  };

  let pellets = [];
  let powerUps = [];
  let enemies = [];
  let particles = [];

  // Enemy types with different behaviors
  const enemyTypes = [
    { color: '#ff006e', speed: 1.5, behavior: 'chase' },
    { color: '#bf00ff', speed: 1.2, behavior: 'patrol' },
    { color: '#ff8c00', speed: 1.8, behavior: 'random' },
    { color: '#00f0ff', speed: 1.0, behavior: 'ambush' }
  ];

  // Initialize game
  function init() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    cols = CANVAS_WIDTH / TILE_SIZE;
    rows = CANVAS_HEIGHT / TILE_SIZE;
    
    // Reset game state
    pac.x = TILE_SIZE * 1.5;
    pac.y = TILE_SIZE * 1.5;
    pac.dirX = 1;
    pac.dirY = 0;
    pac.nextDirX = 1;
    pac.nextDirY = 0;
    pac.powerUpTime = 0;
    pac.invulnerable = true;
    pac.startInvulnerability = 120; // 2 seconds of invulnerability at start
    
    game.pelletsEaten = 0;
    game.totalPellets = 0;
    
    generateLevel();
    updateUI();
    
    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    gameOverScreen.style.display = 'none';
    
    if (!gameLoopRunning) {
      gameLoopRunning = true;
      gameLoop();
    }
  }

  // Generate level with pellets, power-ups, and enemies
  function generateLevel() {
    pellets = [];
    powerUps = [];
    enemies = [];
    particles = [];
    
    // Create pellets in a grid pattern with some gaps for corridors
    for (let r = 2; r < rows - 2; r++) {
      for (let c = 2; c < cols - 2; c++) {
        // Skip some positions to create corridors
        if ((r % 4 === 0 || c % 4 === 0) && Math.random() > 0.3) {
          pellets.push({
            x: c * TILE_SIZE + TILE_SIZE / 2,
            y: r * TILE_SIZE + TILE_SIZE / 2,
            eaten: false,
            glowPhase: Math.random() * Math.PI * 2
          });
        }
      }
    }
    
    game.totalPellets = pellets.filter(p => !p.eaten).length;
    
    // Add power-ups (special BOP meme images)
    for (let i = 0; i < Math.min(4, Math.floor(game.level / 2) + 1); i++) {
      const x = (Math.random() * (cols - 4) + 2) * TILE_SIZE + TILE_SIZE / 2;
      const y = (Math.random() * (rows - 4) + 2) * TILE_SIZE + TILE_SIZE / 2;
      
      powerUps.push({
        x: x,
        y: y,
        type: i % powerUpImages.length,
        eaten: false,
        pulsePhase: Math.random() * Math.PI * 2,
        size: TILE_SIZE * 1.5
      });
    }
    
    // Add enemies based on level
    const numEnemies = Math.min(4, Math.floor(game.level / 2) + 1);
    const pacStartX = TILE_SIZE * 1.5;
    const pacStartY = TILE_SIZE * 1.5;
    const minDistance = TILE_SIZE * 5; // Minimum distance from Pac-BOP
    
    for (let i = 0; i < numEnemies; i++) {
      let enemy;
      let attempts = 0;
      
      // Keep trying to spawn enemy away from Pac-BOP
      do {
        enemy = {
          x: (Math.random() * (cols - 8) + 4) * TILE_SIZE + TILE_SIZE / 2,
          y: (Math.random() * (rows - 8) + 4) * TILE_SIZE + TILE_SIZE / 2,
          dirX: Math.random() > 0.5 ? 1 : -1,
          dirY: 0,
          ...enemyTypes[i % enemyTypes.length],
          size: TILE_SIZE * 0.8,
          lastDirectionChange: 0,
          targetX: 0,
          targetY: 0
        };
        attempts++;
      } while (Math.sqrt((enemy.x - pacStartX) ** 2 + (enemy.y - pacStartY) ** 2) < minDistance && attempts < 50);
      
      enemies.push(enemy);
    }
  }

  // Handle input - only add listener once
  let inputHandlerAdded = false;
  function handleInput() {
    if (inputHandlerAdded) return;
    inputHandlerAdded = true;
    
    document.addEventListener('keydown', (e) => {
      // Allow pause/unpause even when game is not running
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
        return;
      }
      
      if (!gameState.running || gameState.paused) return;
      
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          pac.nextDirX = 0;
          pac.nextDirY = -1;
          break;
        case 'arrowdown':
        case 's':
          pac.nextDirX = 0;
          pac.nextDirY = 1;
          break;
        case 'arrowleft':
        case 'a':
          pac.nextDirX = -1;
          pac.nextDirY = 0;
          break;
        case 'arrowright':
        case 'd':
          pac.nextDirX = 1;
          pac.nextDirY = 0;
          break;
      }
    });
  }

  function togglePause() {
    if (!gameState.running && !gameState.gameOver) {
      // Start the game if it hasn't started yet
      gameState.running = true;
      gameState.paused = false;
      if (!gameLoopRunning) {
        gameLoopRunning = true;
        gameLoop();
      }
    } else if (gameState.running) {
      // Toggle pause state
      gameState.paused = !gameState.paused;
      if (!gameState.paused && !gameLoopRunning) {
        gameLoopRunning = true;
        gameLoop();
      }
    }
  }

  // Game loop
  let gameLoopRunning = false;
  function gameLoop() {
    if (!gameState.running || gameState.gameOver) {
      gameLoopRunning = false;
      return;
    }
    
    if (!gameState.paused) {
      update();
    }
    
    draw();
    
    if (gameState.running && !gameState.gameOver) {
      requestAnimationFrame(gameLoop);
    } else {
      gameLoopRunning = false;
    }
  }

  // Update game state
  function update() {
    updatePac();
    updateEnemies();
    updatePowerUps();
    updateParticles();
    checkCollisions();
    checkLevelComplete();
  }

  function updatePac() {
    // Try to change direction
    const nextX = pac.x + pac.nextDirX * pac.speed;
    const nextY = pac.y + pac.nextDirY * pac.speed;
    
    if (isValidPosition(nextX, nextY)) {
      pac.dirX = pac.nextDirX;
      pac.dirY = pac.nextDirY;
    }
    
    // Move Pac-BOP
    const newX = pac.x + pac.dirX * pac.speed;
    const newY = pac.y + pac.dirY * pac.speed;
    
    if (isValidPosition(newX, newY)) {
      pac.x = newX;
      pac.y = newY;
    }
    
    // Wrap around screen edges
    if (pac.x < 0) pac.x = CANVAS_WIDTH;
    if (pac.x > CANVAS_WIDTH) pac.x = 0;
    
    // Update mouth animation
    const time = Date.now() / 150;
    pac.mouthAngle = 0.2 + Math.abs(Math.sin(time)) * 0.3;
    
    // Update power-up timer
    if (pac.powerUpTime > 0) {
      pac.powerUpTime--;
      pac.invulnerable = pac.powerUpTime > 0;
    }
    
    // Update start invulnerability
    if (pac.startInvulnerability > 0) {
      pac.startInvulnerability--;
      pac.invulnerable = true;
    }
  }

  function isValidPosition(x, y) {
    return x >= TILE_SIZE / 2 && 
           x <= CANVAS_WIDTH - TILE_SIZE / 2 && 
           y >= TILE_SIZE / 2 && 
           y <= CANVAS_HEIGHT - TILE_SIZE / 2;
  }

  function updateEnemies() {
    enemies.forEach(enemy => {
      const time = Date.now();
      
      switch (enemy.behavior) {
        case 'chase':
          // Chase Pac-BOP directly
          const dx = pac.x - enemy.x;
          const dy = pac.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            enemy.dirX = (dx / dist) * enemy.speed;
            enemy.dirY = (dy / dist) * enemy.speed;
          }
          break;
          
        case 'patrol':
          // Change direction periodically
          if (time - enemy.lastDirectionChange > 2000) {
            enemy.dirX = (Math.random() - 0.5) * 2 * enemy.speed;
            enemy.dirY = (Math.random() - 0.5) * 2 * enemy.speed;
            enemy.lastDirectionChange = time;
          }
          break;
          
        case 'random':
          // Random movement with frequent direction changes
          if (time - enemy.lastDirectionChange > 1000) {
            const directions = [
              { x: enemy.speed, y: 0 },
              { x: -enemy.speed, y: 0 },
              { x: 0, y: enemy.speed },
              { x: 0, y: -enemy.speed }
            ];
            const dir = directions[Math.floor(Math.random() * directions.length)];
            enemy.dirX = dir.x;
            enemy.dirY = dir.y;
            enemy.lastDirectionChange = time;
          }
          break;
          
        case 'ambush':
          // Try to intercept Pac-BOP's path
          const futureX = pac.x + pac.dirX * 50;
          const futureY = pac.y + pac.dirY * 50;
          const interceptDx = futureX - enemy.x;
          const interceptDy = futureY - enemy.y;
          const interceptDist = Math.sqrt(interceptDx * interceptDx + interceptDy * interceptDy);
          
          if (interceptDist > 0) {
            enemy.dirX = (interceptDx / interceptDist) * enemy.speed;
            enemy.dirY = (interceptDy / interceptDist) * enemy.speed;
          }
          break;
      }
      
      // Move enemy
      const newX = enemy.x + enemy.dirX;
      const newY = enemy.y + enemy.dirY;
      
      if (isValidPosition(newX, newY)) {
        enemy.x = newX;
        enemy.y = newY;
      } else {
        // Bounce off walls
        enemy.dirX *= -1;
        enemy.dirY *= -1;
      }
      
      // Wrap around screen edges
      if (enemy.x < 0) enemy.x = CANVAS_WIDTH;
      if (enemy.x > CANVAS_WIDTH) enemy.x = 0;
    });
  }

  function updatePowerUps() {
    powerUps.forEach(powerUp => {
      if (!powerUp.eaten) {
        powerUp.pulsePhase += 0.1;
      }
    });
  }

  function updateParticles() {
    particles = particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      particle.alpha = particle.life / particle.maxLife;
      return particle.life > 0;
    });
  }

  function checkCollisions() {
    // Check pellet collisions
    pellets.forEach(pellet => {
      if (!pellet.eaten && distance(pac, pellet) < TILE_SIZE / 1.5) {
        pellet.eaten = true;
        game.score += 10;
        game.pelletsEaten++;
        
        // Create particles
        createParticles(pellet.x, pellet.y, '#39ff14', 5);
        
        updateUI();
      }
    });
    
    // Check power-up collisions
    powerUps.forEach(powerUp => {
      if (!powerUp.eaten && distance(pac, powerUp) < TILE_SIZE) {
        powerUp.eaten = true;
        game.score += 100;
        pac.powerUpTime = 300; // 5 seconds at 60fps
        pac.invulnerable = true;
        
        // Create special particles
        createParticles(powerUp.x, powerUp.y, '#ff006e', 15);
        
        updateUI();
      }
    });
    
    // Check enemy collisions
    if (!pac.invulnerable) {
      enemies.forEach(enemy => {
        if (distance(pac, enemy) < TILE_SIZE) {
          game.lives--;
          
          if (game.lives <= 0) {
            gameOver();
          } else {
            // Reset Pac-BOP position
            pac.x = TILE_SIZE * 1.5;
            pac.y = TILE_SIZE * 1.5;
            pac.invulnerable = true;
            pac.powerUpTime = 120; // Brief invulnerability
            
            // Create death particles
            createParticles(pac.x, pac.y, '#ff006e', 20);
          }
          
          updateUI();
        }
      });
    }
  }

  function checkLevelComplete() {
    const remainingPellets = pellets.filter(p => !p.eaten).length;
    
    if (remainingPellets === 0) {
      game.level++;
      game.score += 500; // Level completion bonus
      
      // Increase difficulty
      enemies.forEach(enemy => {
        enemy.speed += 0.1;
      });
      
      generateLevel();
      updateUI();
      
      // Create celebration particles
      for (let i = 0; i < 50; i++) {
        createParticles(
          Math.random() * CANVAS_WIDTH,
          Math.random() * CANVAS_HEIGHT,
          ['#00f0ff', '#ff006e', '#39ff14', '#bf00ff'][Math.floor(Math.random() * 4)],
          1
        );
      }
    }
  }

  function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        alpha: 1,
        color: color,
        size: Math.random() * 3 + 1
      });
    }
  }

  function distance(obj1, obj2) {
    return Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2);
  }

  // Drawing functions
  function draw() {
    // Clear canvas with subtle glow effect
    ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    drawPellets();
    drawPowerUps();
    drawEnemies();
    drawPac();
    drawParticles();
    drawUI();
    
    if (gameState.paused) {
      drawPauseScreen();
    }
  }

  function drawPellets() {
    pellets.forEach(pellet => {
      if (!pellet.eaten) {
        const glow = Math.sin(pellet.glowPhase + Date.now() / 200) * 0.5 + 0.5;
        const size = 3 + glow * 2;
        
        ctx.save();
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10 + glow * 5;
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        pellet.glowPhase += 0.05;
      }
    });
  }

  function drawPowerUps() {
    powerUps.forEach((powerUp, index) => {
      if (!powerUp.eaten && powerUpImgs[powerUp.type] && powerUpImgs[powerUp.type].complete) {
        const pulse = Math.sin(powerUp.pulsePhase) * 0.2 + 1;
        const size = powerUp.size * pulse;
        
        ctx.save();
        ctx.shadowColor = '#ff006e';
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.8 + Math.sin(powerUp.pulsePhase) * 0.2;
        
        ctx.drawImage(
          powerUpImgs[powerUp.type],
          powerUp.x - size / 2,
          powerUp.y - size / 2,
          size,
          size
        );
        
        ctx.restore();
      }
    });
  }

  function drawEnemies() {
    enemies.forEach(enemy => {
      ctx.save();
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = enemy.color;
      
      // Draw enemy as a glowing circle with eyes
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(enemy.x - 4, enemy.y - 4, 2, 0, Math.PI * 2);
      ctx.arc(enemy.x + 4, enemy.y - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  }

  function drawPac() {
    if (!pacImg.complete) return;
    
    const size = pac.size * (pac.invulnerable ? 1.2 : 1);
    const alpha = pac.invulnerable ? 0.7 + Math.sin(Date.now() / 100) * 0.3 : 1;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Add glow effect
    if (pac.powerUpTime > 0) {
      ctx.shadowColor = '#ff006e';
      ctx.shadowBlur = 20;
    }
    
    // Rotate based on direction
    ctx.translate(pac.x, pac.y);
    if (pac.dirX > 0) ctx.rotate(0);
    else if (pac.dirX < 0) ctx.rotate(Math.PI);
    else if (pac.dirY > 0) ctx.rotate(Math.PI / 2);
    else if (pac.dirY < 0) ctx.rotate(-Math.PI / 2);
    
    // Create Pac-Man mouth effect with clipping
    ctx.beginPath();
    const startAngle = pac.mouthAngle;
    const endAngle = Math.PI * 2 - pac.mouthAngle;
    ctx.arc(0, 0, size / 2, startAngle, endAngle);
    ctx.lineTo(0, 0);
    ctx.clip();
    
    // Draw the BOP image
    ctx.drawImage(pacImg, -size / 2, -size / 2, size, size);
    
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 5;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  }

  function drawUI() {
    // Draw level indicator in corner
    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level ${game.level}`, CANVAS_WIDTH - 10, 25);
    ctx.restore();
  }

  function drawPauseScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#00f0ff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    ctx.font = '16px Arial';
    ctx.fillText('Press SPACE to continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    ctx.restore();
  }

  function updateUI() {
    scoreEl.textContent = game.score;
    levelEl.textContent = game.level;
    livesEl.textContent = game.lives;
    highScoreEl.textContent = game.highScore;
  }

  function gameOver() {
    gameState.gameOver = true;
    gameState.running = false;
    
    if (game.score > game.highScore) {
      game.highScore = game.score;
      localStorage.setItem('pacBopHighScore', game.highScore);
    }
    
    finalScoreEl.textContent = game.score;
    finalLevelEl.textContent = game.level;
    gameOverScreen.style.display = 'block';
  }

  // Global restart function
  window.restartGame = function() {
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    init();
  };

  // Resize handling
  function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(container.clientWidth - 40, 600);
    const scale = maxWidth / CANVAS_WIDTH;
    
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
  }

  window.addEventListener('resize', resizeCanvas);

  // Initialize game when image loads
  pacImg.onload = () => {
    handleInput();
    resizeCanvas();
    updateUI();
    init();
  };

  // Start immediately if image is already loaded
  if (pacImg.complete) {
    handleInput();
    resizeCanvas();
    updateUI();
    init();
  }
})();
