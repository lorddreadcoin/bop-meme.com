(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // UI Elements
  const scoreEl = document.getElementById('scoreValue');
  const levelEl = document.getElementById('levelValue');
  const livesEl = document.getElementById('livesValue');
  const highScoreEl = document.getElementById('highScoreValue');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const finalLevelEl = document.getElementById('finalLevel');

  // Game settings
  const TILE_SIZE = 20;
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;
  const MAZE_WIDTH = CANVAS_WIDTH / TILE_SIZE;
  const MAZE_HEIGHT = CANVAS_HEIGHT / TILE_SIZE;

  // Load BOP images
  const pacImg = new Image();
  pacImg.src = '../assets/images/boplips.png';

  const powerUpImgs = [];
  ['../assets/images/bopbeachy.png', '../assets/images/moonbop.png', '../assets/images/bopclubber.png'].forEach(src => {
    const img = new Image();
    img.src = src;
    powerUpImgs.push(img);
  });

  // Classic Pac-Man maze (1=wall, 0=empty, 2=pellet, 3=power pellet)
  const mazeLayout = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,1,0,0,0,0,0,0,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  let gameState = { running: false, paused: false, gameOver: false };
  let pac = { x: 14.5 * TILE_SIZE, y: 9.5 * TILE_SIZE, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0, speed: 2, mouthAngle: 0.2, size: TILE_SIZE * 0.8, powerUpTime: 0, invulnerable: false, gridX: 14, gridY: 9 };
  let game = { score: 0, level: 1, lives: 3, highScore: localStorage.getItem('pacBopHighScore') || 0, pelletsEaten: 0, totalPellets: 0 };
  let enemies = [], particles = [], maze = [];

  const enemyTypes = [
    { color: '#ff006e', speed: 1.5, behavior: 'chase' },
    { color: '#bf00ff', speed: 1.2, behavior: 'patrol' },
    { color: '#ff8c00', speed: 1.8, behavior: 'random' },
    { color: '#00f0ff', speed: 1.0, behavior: 'ambush' }
  ];

  function init() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    pac.x = 14.5 * TILE_SIZE; pac.y = 9.5 * TILE_SIZE; pac.gridX = 14; pac.gridY = 9;
    pac.dirX = 0; pac.dirY = 0; pac.powerUpTime = 0; pac.invulnerable = false;
    generateLevel(); updateUI();
    gameState.running = true; gameState.gameOver = false;
    gameOverScreen.style.display = 'none';
    gameLoop();
  }

  function generateLevel() {
    maze = []; enemies = []; particles = []; game.pelletsEaten = 0; game.totalPellets = 0;
    for (let y = 0; y < mazeLayout.length; y++) {
      maze[y] = [];
      for (let x = 0; x < mazeLayout[y].length; x++) {
        maze[y][x] = mazeLayout[y][x];
        if (maze[y][x] === 2 || maze[y][x] === 3) game.totalPellets++;
      }
    }
    const enemyPos = [{ x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }];
    const numEnemies = Math.min(4, Math.floor(game.level / 2) + 2);
    for (let i = 0; i < numEnemies; i++) {
      const pos = enemyPos[i % enemyPos.length];
      enemies.push({
        x: (pos.x + 0.5) * TILE_SIZE, y: (pos.y + 0.5) * TILE_SIZE, gridX: pos.x, gridY: pos.y,
        dirX: 0, dirY: -1, ...enemyTypes[i % enemyTypes.length], size: TILE_SIZE * 0.7,
        frightened: false, frightenedTimer: 0
      });
    }
  }

  function handleInput() {
    document.addEventListener('keydown', (e) => {
      if (!gameState.running) return;
      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': pac.nextDirX = 0; pac.nextDirY = -1; break;
        case 'arrowdown': case 's': pac.nextDirX = 0; pac.nextDirY = 1; break;
        case 'arrowleft': case 'a': pac.nextDirX = -1; pac.nextDirY = 0; break;
        case 'arrowright': case 'd': pac.nextDirX = 1; pac.nextDirY = 0; break;
        case ' ': e.preventDefault(); gameState.paused = !gameState.paused; break;
      }
    });
  }

  function gameLoop() {
    if (!gameState.running) return;
    if (!gameState.paused && !gameState.gameOver) update();
    draw(); requestAnimationFrame(gameLoop);
  }

  function update() {
    updatePac(); updateEnemies(); updateParticles(); checkCollisions(); checkLevelComplete();
  }

  function updatePac() {
    const nextGridX = pac.gridX + pac.nextDirX;
    const nextGridY = pac.gridY + pac.nextDirY;
    if (canMoveTo(nextGridX, nextGridY)) { pac.dirX = pac.nextDirX; pac.dirY = pac.nextDirY; }
    
    const newX = pac.x + pac.dirX * pac.speed;
    const newY = pac.y + pac.dirY * pac.speed;
    const newGridX = Math.floor(newX / TILE_SIZE);
    const newGridY = Math.floor(newY / TILE_SIZE);
    
    if (canMoveTo(newGridX, newGridY)) {
      pac.x = newX; pac.y = newY; pac.gridX = newGridX; pac.gridY = newGridY;
    } else { pac.dirX = 0; pac.dirY = 0; }
    
    if (pac.x < 0) { pac.x = CANVAS_WIDTH - TILE_SIZE; pac.gridX = MAZE_WIDTH - 1; }
    if (pac.x > CANVAS_WIDTH) { pac.x = 0; pac.gridX = 0; }
    
    pac.mouthAngle = 0.2 + Math.abs(Math.sin(Date.now() / 150)) * 0.4;
    if (pac.powerUpTime > 0) {
      pac.powerUpTime--; pac.invulnerable = pac.powerUpTime > 0;
      enemies.forEach(enemy => { enemy.frightened = pac.powerUpTime > 0; });
    }
  }

  function canMoveTo(gridX, gridY) {
    if (gridX < 0 || gridX >= MAZE_WIDTH || gridY < 0 || gridY >= MAZE_HEIGHT) return gridY === 7;
    return maze[gridY] && maze[gridY][gridX] !== 1;
  }

  function updateEnemies() {
    enemies.forEach(enemy => {
      const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
      const currentGridX = Math.floor(enemy.x / TILE_SIZE);
      const currentGridY = Math.floor(enemy.y / TILE_SIZE);
      const validDirs = dirs.filter(dir => canMoveTo(currentGridX + dir.x, currentGridY + dir.y));
      
      if (!canMoveTo(currentGridX + enemy.dirX, currentGridY + enemy.dirY) && validDirs.length > 0) {
        const newDir = validDirs[Math.floor(Math.random() * validDirs.length)];
        enemy.dirX = newDir.x; enemy.dirY = newDir.y;
      }
      
      const speed = enemy.frightened ? enemy.speed * 0.5 : enemy.speed;
      enemy.x += enemy.dirX * speed; enemy.y += enemy.dirY * speed;
      if (enemy.x < 0) enemy.x = CANVAS_WIDTH - TILE_SIZE;
      if (enemy.x > CANVAS_WIDTH) enemy.x = 0;
    });
  }

  function updateParticles() {
    particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life--; p.alpha = p.life / p.maxLife; return p.life > 0; });
  }

  function checkCollisions() {
    const pacGridX = Math.floor(pac.x / TILE_SIZE);
    const pacGridY = Math.floor(pac.y / TILE_SIZE);
    
    if (maze[pacGridY] && maze[pacGridY][pacGridX] === 2) {
      maze[pacGridY][pacGridX] = 0; game.score += 10; game.pelletsEaten++;
      createParticles(pac.x, pac.y, '#39ff14', 3); updateUI();
    }
    
    if (maze[pacGridY] && maze[pacGridY][pacGridX] === 3) {
      maze[pacGridY][pacGridX] = 0; game.score += 50; pac.powerUpTime = 300; pac.invulnerable = true;
      createParticles(pac.x, pac.y, '#ff006e', 10); updateUI();
    }
    
    enemies.forEach(enemy => {
      const distance = Math.sqrt((pac.x - enemy.x) ** 2 + (pac.y - enemy.y) ** 2);
      if (distance < TILE_SIZE * 0.8) {
        if (enemy.frightened && pac.invulnerable) {
          game.score += 200; createParticles(enemy.x, enemy.y, enemy.color, 8);
          enemy.x = 14.5 * TILE_SIZE; enemy.y = 8.5 * TILE_SIZE; enemy.frightened = false; updateUI();
        } else if (!pac.invulnerable) {
          game.lives--;
          if (game.lives <= 0) { gameOver(); } else {
            pac.x = 14.5 * TILE_SIZE; pac.y = 9.5 * TILE_SIZE; pac.gridX = 14; pac.gridY = 9;
            pac.dirX = 0; pac.dirY = 0; pac.invulnerable = true; pac.powerUpTime = 120;
            createParticles(pac.x, pac.y, '#ff006e', 15);
          }
          updateUI();
        }
      }
    });
  }

  function checkLevelComplete() {
    let remaining = 0;
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 2 || maze[y][x] === 3) remaining++;
      }
    }
    if (remaining === 0) {
      game.level++; game.score += 1000;
      enemies.forEach(e => e.speed += 0.2);
      generateLevel(); updateUI();
      for (let i = 0; i < 50; i++) {
        createParticles(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT,
          ['#00f0ff', '#ff006e', '#39ff14', '#bf00ff'][Math.floor(Math.random() * 4)], 1);
      }
    }
  }

  function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 30, maxLife: 60, alpha: 1, color, size: Math.random() * 4 + 2 });
    }
  }

  function draw() {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawMaze(); drawPellets(); drawEnemies(); drawPac(); drawParticles(); drawUI();
    if (gameState.paused) drawPauseScreen();
  }

  function drawMaze() {
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 5;
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 1) ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    ctx.shadowBlur = 0;
  }

  function drawPellets() {
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
        const pixelY = y * TILE_SIZE + TILE_SIZE / 2;
        
        if (maze[y][x] === 2) {
          ctx.save(); ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 8; ctx.fillStyle = '#39ff14';
          ctx.beginPath(); ctx.arc(pixelX, pixelY, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (maze[y][x] === 3) {
          const imgIndex = (x + y) % powerUpImgs.length;
          if (powerUpImgs[imgIndex] && powerUpImgs[imgIndex].complete) {
            const pulse = Math.sin(Date.now() / 200) * 0.2 + 1;
            const size = TILE_SIZE * 0.8 * pulse;
            ctx.save(); ctx.shadowColor = '#ff006e'; ctx.shadowBlur = 15; ctx.globalAlpha = 0.9;
            ctx.drawImage(powerUpImgs[imgIndex], pixelX - size / 2, pixelY - size / 2, size, size);
            ctx.restore();
          }
        }
      }
    }
  }

  function drawEnemies() {
    enemies.forEach(enemy => {
      ctx.save();
      ctx.shadowColor = enemy.frightened ? '#0066ff' : enemy.color;
      ctx.fillStyle = enemy.frightened ? '#0066ff' : enemy.color;
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - enemy.size / 4, enemy.size / 2, Math.PI, 0);
      ctx.lineTo(enemy.x + enemy.size / 2, enemy.y + enemy.size / 4);
      for (let i = 0; i < 3; i++) {
        const waveX = enemy.x + enemy.size / 2 - (i + 1) * (enemy.size / 3);
        const waveY = enemy.y + enemy.size / 4 + (i % 2 === 0 ? -3 : 3);
        ctx.lineTo(waveX, waveY);
      }
      ctx.lineTo(enemy.x - enemy.size / 2, enemy.y + enemy.size / 4);
      ctx.closePath(); ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(enemy.x - 4, enemy.y - 6, 3, 0, Math.PI * 2);
      ctx.arc(enemy.x + 4, enemy.y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(enemy.x - 4 + enemy.dirX, enemy.y - 6 + enemy.dirY, 1.5, 0, Math.PI * 2);
      ctx.arc(enemy.x + 4 + enemy.dirX, enemy.y - 6 + enemy.dirY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPac() {
    if (!pacImg.complete) return;
    const size = pac.size * (pac.invulnerable ? 1.1 : 1);
    const alpha = pac.invulnerable ? 0.7 + Math.sin(Date.now() / 100) * 0.3 : 1;
    
    ctx.save(); ctx.globalAlpha = alpha;
    if (pac.powerUpTime > 0) { ctx.shadowColor = '#ff006e'; ctx.shadowBlur = 25; }
    
    ctx.translate(pac.x, pac.y);
    if (pac.dirX > 0) ctx.rotate(0);
    else if (pac.dirX < 0) ctx.rotate(Math.PI);
    else if (pac.dirY > 0) ctx.rotate(Math.PI / 2);
    else if (pac.dirY < 0) ctx.rotate(-Math.PI / 2);
    
    ctx.beginPath();
    const startAngle = pac.mouthAngle;
    const endAngle = Math.PI * 2 - pac.mouthAngle;
    ctx.arc(0, 0, size / 2, startAngle, endAngle);
    ctx.lineTo(0, 0); ctx.clip();
    ctx.drawImage(pacImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
  }

  function drawUI() {
    ctx.save(); ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`Level ${game.level}`, CANVAS_WIDTH - 10, 25);
    if (pac.powerUpTime > 0) {
      ctx.fillStyle = '#ff006e'; ctx.textAlign = 'center';
      ctx.fillText(`POWER: ${Math.ceil(pac.powerUpTime / 60)}s`, CANVAS_WIDTH / 2, 25);
    }
    ctx.restore();
  }

  function drawPauseScreen() {
    ctx.save(); ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#00f0ff'; ctx.font = '48px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.font = '16px Arial'; ctx.fillText('Press SPACE to continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    ctx.restore();
  }

  function updateUI() {
    scoreEl.textContent = game.score; levelEl.textContent = game.level;
    livesEl.textContent = game.lives; highScoreEl.textContent = game.highScore;
  }

  function gameOver() {
    gameState.gameOver = true; gameState.running = false;
    if (game.score > game.highScore) {
      game.highScore = game.score; localStorage.setItem('pacBopHighScore', game.highScore);
    }
    finalScoreEl.textContent = game.score; finalLevelEl.textContent = game.level;
    gameOverScreen.style.display = 'block';
  }

  window.restartGame = function() { game.score = 0; game.level = 1; game.lives = 3; init(); };

  function resizeCanvas() {
    const maxWidth = Math.min(canvas.parentElement.clientWidth - 40, 600);
    const scale = maxWidth / CANVAS_WIDTH;
    canvas.style.width = maxWidth + 'px'; canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
  }

  window.addEventListener('resize', resizeCanvas);
  pacImg.onload = () => { handleInput(); resizeCanvas(); updateUI(); init(); };
  if (pacImg.complete) { handleInput(); resizeCanvas(); updateUI(); init(); }
})();
