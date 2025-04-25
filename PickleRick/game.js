const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const titleScreen = document.getElementById("titleScreen");

const GRAVITY = 0.6;
const FRICTION = 0.9;
let lives = 5;
let gameOver = false;
let level = 1;
let keys = {};
let platforms = [];
let enemies = [];
let screws = [];
let screwCooldown = 0;
let attackTimeout = null;

let showText = "";
let showTextTimer = 0;

let hurtScreen = false; // Variable to track if the screen should be red

const playerImg = new Image();
playerImg.src = "assets/pickle.png";
const playerJumpImg = new Image();
playerJumpImg.src = "assets/pickle_jump.png";
const playerAttackImg = new Image();
playerAttackImg.src = "assets/pickle_attack.png";
const screwImg = new Image();
screwImg.src = "assets/screw.png";
const sewerBg = new Image();
sewerBg.src = "assets/sewer.png";
const ratImg = new Image();
ratImg.src = "assets/rat.png";
const mortyImg = new Image();
mortyImg.src = "assets/morty.png";

const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height,
  speed: 5
};

const player = {
  x: 50,
  y: 300,
  width: 60,
  height: 80,
  velX: 0,
  velY: 0,
  speed: 6,
  jumpPower: -15,
  grounded: false,
  facingRight: true,
  state: "idle"
};

function createEnemy(x, y) {
  return {
    x, y,
    width: 60,
    height: 60,
    img: ratImg,
    speed: 1.2,
    direction: 1,
    velY: 0,
    grounded: false,
    attackMode: false
  };
}

const flag = {
  x: 1100,
  y: 80,
  width: 60,
  height: 80,
  img: mortyImg
};

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && titleScreen.style.display !== "none") {
    titleScreen.style.display = "none";
    canvas.style.display = "block";
    startGame();
  }
});

function checkCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function createScrew() {
  if (screwCooldown > 0) return;
  const screw = {
    x: player.facingRight ? player.x + player.width : player.x - 10,
    y: player.y + player.height / 2,
    width: 10,
    height: 10,
    speed: 12,
    direction: player.facingRight ? 1 : -1
  };
  screws.push(screw);
  screwCooldown = 15;
  player.state = "attack";
  if (attackTimeout) clearTimeout(attackTimeout);
  attackTimeout = setTimeout(() => {
    if (player.grounded) player.state = "idle";
  }, 200);
}

function loadLevel() {
  player.x = 50;
  player.y = 300;
  player.facingRight = true;
  player.state = "idle";
  platforms = [];
  enemies = [];

  let enemyCount = 0;
  const totalEnemies = 20;

  for (let i = 0; i < 6; i++) {
    const offset = i * 1200;

    platforms.push(
      { x: offset + 200, y: 150, width: 200, height: 20 },
      { x: offset + 500, y: 300, width: 200, height: 20 },
      { x: offset + 800, y: 150, width: 200, height: 20 },
      { x: offset + 400, y: 450, width: 200, height: 20 }
    );

    platforms.push({ x: offset, y: 580, width: 1200, height: 20 });

    for (let j = 0; j < 4 && enemyCount < totalEnemies; j++) {
      const ex = offset + 200 + (j * 250);
      const ey = 120 + (j % 2) * 50;
      enemies.push(createEnemy(ex, ey));
      enemyCount++;
    }
  }

  // Special rat that increases lives by 5
  enemies[0].livesBonus = 5;

  flag.x = 1200 * 6 - 120;
  flag.y = 100;
}

function startGame() {
  loadLevel();
  update();
}

function update() {
  if (gameOver) {
    draw();
    return;
  }

  if (keys["ArrowLeft"] || keys["KeyA"]) {
    if (player.velX > -player.speed) player.velX--;
    player.facingRight = false;
  }
  if (keys["ArrowRight"] || keys["KeyD"]) {
    if (player.velX < player.speed) player.velX++;
    player.facingRight = true;
  }

  if ((keys["ArrowUp"] || keys["KeyW"]) && player.grounded) {
    player.velY = player.jumpPower;
    player.grounded = false;
    player.state = "jump";
  }

  if (keys["Space"]) {
    createScrew();
  }

  player.velX *= FRICTION;
  player.velY += GRAVITY;
  player.x += player.velX;
  player.y += player.velY;

  player.grounded = false;
  platforms.forEach(p => {
    if (checkCollision(player, p) && player.velY >= 0) {
      player.y = p.y - player.height;
      player.velY = 0;
      player.grounded = true;
    }
  });

  if (player.grounded && player.state !== "attack") {
    player.state = "idle";
  }

  screws.forEach(screw => screw.x += screw.speed * screw.direction);
  screws = screws.filter(s => s.x > 0 && s.x < 1200 * 6);

  screws.forEach(screw => {
    enemies.forEach(enemy => {
      if (checkCollision(screw, enemy)) {
        // No life increase here
        enemies = enemies.filter(e => e !== enemy);
        screws = screws.filter(s => s !== screw);
      }
    });
  });

  enemies.forEach(enemy => {
    const dist = Math.abs(player.x - enemy.x);
    if (dist < 200) {
      enemy.attackMode = true;
      enemy.direction = player.x < enemy.x ? -1 : 1;
    } else {
      enemy.attackMode = false;
    }

    const speed = enemy.attackMode ? enemy.speed * 1.5 : enemy.speed;
    enemy.x += speed * enemy.direction;

    enemy.velY += GRAVITY;
    enemy.y += enemy.velY;

    enemy.grounded = false;
    platforms.forEach(p => {
      if (checkCollision(enemy, p) && enemy.velY > 0) {
        enemy.y = p.y - enemy.height;
        enemy.velY = 0;
        enemy.grounded = true;
      }
    });

    // Collision with player (repelling effect)
    if (checkCollision(player, enemy)) {
      // Repel the player and the enemy by adjusting their velocities
      player.velX = (player.velX > 0 ? 5 : -5);  // Immediate bounce off
      player.velY = -5; // Small bounce back

      enemy.velX = (enemy.velX > 0 ? 5 : -5); // Bounce off too
      enemy.velY = -5; // Small bounce back

      lives--; // Decrease lives on collision
      hurtScreen = true; // Trigger red screen effect

      if (lives <= 0) {
        gameOver = true;
        showText = "YOU LOSE";
        draw();
        return;
      }
    }
  });

  // Check for level completion (colliding with the goal/flag)
  if (checkCollision(player, flag)) {
    setTimeout(() => {
      gameOver = true;
      showText = "LEVEL COMPLETE!";
      draw();
    }, 200);
  }

  screwCooldown = Math.max(0, screwCooldown - 1);

  if (player.x > camera.x + camera.width / 2) {
    camera.x = player.x - camera.width / 2;
  }
  if (player.x < camera.x + camera.width / 4) {
    camera.x = player.x - camera.width / 4;
  }
  camera.x = Math.max(0, Math.min(camera.x, 1200 * 6 - canvas.width));

  draw();
  requestAnimationFrame(update);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (hurtScreen) {
    // Make the screen red for a moment when Rick gets hurt
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Red transparent screen
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTimeout(() => { hurtScreen = false; }, 1000); // Reset after 1 second
  }

  for (let i = 0; i < 6; i++) {
    ctx.drawImage(sewerBg, i * 1200 - camera.x, 0, 1200, canvas.height);
  }

  ctx.fillStyle = "#00ff00";
  ctx.font = "20px Arial";
  ctx.fillText("Lives: " + lives, 10, 25);
  ctx.fillText("Level: " + level, 1100, 25);

  if (gameOver) {
    ctx.fillStyle = "lime";
    ctx.font = "48px 'SewerFont'";
    ctx.fillText(showText, canvas.width / 2 - 150, canvas.height / 2);
    return;
  }

  ctx.save();
  if (!player.facingRight) {
    ctx.translate(player.x + player.width / 2 - camera.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(player.x + player.width / 2 - camera.x), 0);
  }

  let img = playerImg;
  if (player.state === "jump") img = playerJumpImg;
  else if (player.state === "attack") img = playerAttackImg;

  ctx.drawImage(img, player.x - camera.x, player.y, player.width, player.height);
  ctx.restore();

  let message = "";
  if (player.state === "idle") {
    message = "Pickle Riiiiiickkkk!!!";
  } else if (player.state === "attack") {
    message = "F*ck you ratf*ck";
    setTimeout(() => { showText = ""; }, 2000);  // Keep message for 2 seconds
  } else if (player.state === "jump") {
    message = "High AF mf";
  }

  if (message) {
    ctx.fillStyle = "white";
    ctx.font = "30px 'SewerFont'"; // Use the same font as the title screen
    ctx.fillText(message, player.x - camera.x, player.y - 30);
  }

  platforms.forEach(p => {
    ctx.fillStyle = "#777";
    ctx.fillRect(p.x - camera.x, p.y, p.width, p.height);
    ctx.strokeStyle = "#00ffcc";
    ctx.strokeRect(p.x - camera.x, p.y, p.width, p.height);
  });

  enemies.forEach(enemy => {
    ctx.drawImage(enemy.img, enemy.x - camera.x, enemy.y, enemy.width, enemy.height);
  });

  screws.forEach(screw => {
    ctx.drawImage(screwImg, screw.x - camera.x, screw.y, screw.width, screw.height);
  });

  ctx.drawImage(flag.img, flag.x - camera.x, flag.y, flag.width, flag.height);
}
