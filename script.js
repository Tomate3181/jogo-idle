const config = {
    type: Phaser.AUTO,
    width: 1000, // canvas maior para caber a loja
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let keys; // Alterado de cursors para keys para W,A,S,D
let coins;
let score = 0;
let scoreText;

// --- Upgrades ---
let playerSpeed = 100;
let maxCoins = 2;
let coinSpawnInterval = 2000;

let upgradeCostSpeed = 50;
let upgradeCostCoins = 100;
let magnetCost = 150;

// Níveis
let speedLevel = 1;
let coinLevel = 1;
let magnetLevel = 0;

// Pontos por moeda
let pointsPerCoin = 5;

// Ímã
let magnetActive = false;
let magnetDuration = 5000;

// Guardar textos da loja para atualização
let shopTexts = {};

// --- VARIÁVEIS DE COMBATE ---
let enemies;
let currentWeapon = 'pistol';
let inventory = ['pistol', 'sword'];
let bullets;
let lastShot = 0; // cooldown
let fireRate = 300; // ms entre tiros
let swordAttackCooldown = 500; // Cooldown para ataque de espada
let lastSwordAttack = 0;
let pointer;

let playerHealth = 100;
let playerMaxHealth = 100;
let playerDamage = 10;
let healthText;

let enemySpawnTimer;
let maxEnemies = 3; // Quantidade máxima de inimigos na tela

// --- VARIÁVEIS DE PROGRESSÃO POR TEMPO (ONDAS) ---
let currentWave = 0;
let waveText;
let waveTimerEvent;
const WAVE_INTERVAL = 30000; // 30 segundos por onda
let baseEnemyHealth = 30;
let baseEnemySpeed = 80;
let baseEnemyDamage = 10;

function preload() {
    this.load.image('player', 'player.png');
    this.load.image('coin', 'coin.png');
    this.load.image('red_square', 'enemy.png'); // Imagem temporária de quadrado vermelho
}

// --- LOCAL STORAGE ---
function saveGame() {
    const saveData = {
        score, speedLevel, coinLevel, magnetLevel,
        playerSpeed, maxCoins,
        upgradeCostSpeed, upgradeCostCoins, magnetCost,
        playerHealth, playerMaxHealth, playerDamage,
        currentWave // Salvar a onda atual
    };
    localStorage.setItem('idleGameSave', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('idleGameSave');
    if (saved) {
        const data = JSON.parse(saved);
        score = data.score !== undefined ? data.score : 0;
        speedLevel = data.speedLevel !== undefined ? data.speedLevel : 1;
        coinLevel = data.coinLevel !== undefined ? data.coinLevel : 1;
        magnetLevel = data.magnetLevel !== undefined ? data.magnetLevel : 0;
        playerSpeed = data.playerSpeed !== undefined ? data.playerSpeed : 100;
        maxCoins = data.maxCoins !== undefined ? data.maxCoins : 2;
        upgradeCostSpeed = data.upgradeCostSpeed !== undefined ? data.upgradeCostSpeed : 50;
        upgradeCostCoins = data.upgradeCostCoins !== undefined ? data.upgradeCostCoins : 100;
        magnetCost = data.magnetCost !== undefined ? data.magnetCost : 150;

        playerHealth = data.playerHealth !== undefined ? data.playerHealth : 100;
        playerMaxHealth = data.playerMaxHealth !== undefined ? data.playerMaxHealth : 100;
        playerDamage = data.playerDamage !== undefined ? data.playerDamage : 10;
        
        currentWave = data.currentWave !== undefined ? data.currentWave : 0; // Carrega a onda
    }
}

let hudTexts = {}; // Vai guardar referências para atualizar a HUD

function create() {
    loadGame(); // carrega progresso salvo

    // Substitui cursors por W,A,S,D
    keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Player
    player = this.physics.add.sprite(400, 300, 'player')
        .setCollideWorldBounds(true)
        .setScale(0.1);
    player.health = playerHealth; // Adiciona propriedade de saúde ao player sprite
    player.maxHealth = playerMaxHealth;
    player.damage = playerDamage;

    // Moedas
    coins = this.physics.add.group();
    spawnCoins(this);

    // Texto da pontuação
    scoreText = this.add.text(16, 16, `Pontos: ${score}`, { fontSize: '24px', fill: '#fff' });
    // Texto da saúde do jogador
    healthText = this.add.text(16, 48, `Vida: ${player.health}/${player.maxHealth}`, { fontSize: '24px', fill: '#0f0' });
    // Texto da onda
    waveText = this.add.text(16, 80, `Onda: ${currentWave}`, { fontSize: '24px', fill: '#00f' });

    // Colisão player-moeda
    this.physics.add.overlap(player, coins, collectCoin, null, this);

    // Spawn contínuo de moedas
    this.time.addEvent({
        delay: coinSpawnInterval,
        callback: () => spawnCoins(this),
        loop: true
    });

    // Criar a loja fora da área principal
    createShop(this);

    // Grupo de inimigos
    enemies = this.physics.add.group();

    // Inicia a primeira onda (ou a onda salva)
    increaseDifficulty.call(this); // Chama uma vez para configurar a primeira onda

    // Spawn contínuo de inimigos (agora usa maxEnemies atualizado pela onda)
    enemySpawnTimer = this.time.addEvent({
        delay: 3000, // Spawn a cada 3 segundos
        callback: () => {
            if (enemies.getChildren().length < maxEnemies) {
                spawnEnemy(this);
            }
        },
        loop: true
    });

    // Timer para aumentar a dificuldade (ondas)
    waveTimerEvent = this.time.addEvent({
        delay: WAVE_INTERVAL,
        callback: increaseDifficulty,
        callbackScope: this, // Garante que 'this' dentro de increaseDifficulty seja a cena
        loop: true
    });


    // Colisão inimigo ↔ player
    this.physics.add.overlap(player, enemies, hitEnemy, null, this);

    // Grupo de projéteis
    bullets = this.physics.add.group();

    // Input troca de armas
    this.input.keyboard.on('keydown-ONE', () => {
        currentWeapon = 'pistol';
        updateHUD();
    });
    this.input.keyboard.on('keydown-TWO', () => {
        currentWeapon = 'sword';
        updateHUD();
    });

    // Colisão balas ↔ inimigos
    this.physics.add.overlap(bullets, enemies, bulletHitEnemy, null, this);

    // Guardar o mouse
    pointer = this.input.activePointer;

    // HUD container
    const startX = config.width - 150; // canto direito
    const startY = config.height - 80; // canto inferior
    const spacingY = 40;

    inventory.forEach((weapon, index) => {
        // fundo da caixinha
        let bg = this.add.rectangle(startX + 50, startY - index * spacingY, 120, 30, 0x20232a, 0.8);
        bg.setStrokeStyle(2, 0xffffff, 0.3); // borda sutil
        bg.setOrigin(0.5);

        // texto da arma
        let text = this.add.text(startX + 50, startY - index * spacingY, weapon.toUpperCase(), {
            font: '18px "Arial"',
            fill: weapon === currentWeapon ? '#FFD700' : '#FFFFFF' // amarelo se selecionada
        }).setOrigin(0.5);

        hudTexts[weapon] = text;
    });

    updateHUD(); // Atualiza a HUD na criação
}

function updateHUD() {
    inventory.forEach(weapon => {
        if (hudTexts[weapon]) {
            hudTexts[weapon].setColor(weapon === currentWeapon ? '#FFD700' : '#FFFFFF');
        }
    });
    healthText.setText(`Vida: ${player.health}/${player.maxHealth}`);
    waveText.setText(`Onda: ${currentWave}`);
}

// Parâmetros do ímã
let baseMagnetSpeed = 50;  // nível 1
let baseMagnetRange = 100; // pixels nível 1

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += pointsPerCoin;
    scoreText.setText(`Pontos: ${score}`);
    saveGame(); // salva progresso
}

// Use estas constantes (defina no topo junto com outras variáveis)
const GAME_WIDTH = 800;   // área de jogo onde player e moedas devem permanecer
const GAME_HEIGHT = 600;
const COLLECT_DISTANCE = 24; // distância (px) em que a moeda é coletada automaticamente

// Spawn de moedas (assegura corpo e limites)
function spawnCoins(scene) {
    let currentCoins = coins.getChildren().filter(c => c.active).length;
    while (currentCoins < maxCoins) {
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(50, 550);
        // criar como physics sprite para acessar body facilmente
        let coin = coins.create(x, y, 'coin').setScale(0.1);
        coin.setActive(true).setVisible(true);

        // garantia: o body existe e respeita world bounds (vamos optar por travar posição)
        if (coin.body) {
            coin.body.setCollideWorldBounds(false); // não rebater; vamos clamp manualmente
        }

        currentCoins++;
    }
}

function update(time, delta) {
    // ---- Movimento do player ----
    player.setVelocity(0);

    if (keys.left.isDown) player.setVelocityX(-playerSpeed);
    if (keys.right.isDown) player.setVelocityX(playerSpeed);
    if (keys.up.isDown) player.setVelocityY(-playerSpeed);
    if (keys.down.isDown) player.setVelocityY(playerSpeed);


    // ---- Player mira para o mouse ----
    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.setRotation(angle);

    // ---- Ímã puxando moedas ----
    if (magnetLevel > 0) {
        const baseMagnetSpeed = 80;
        const baseMagnetRange = 100;
        const magnetSpeed = baseMagnetSpeed + (magnetLevel - 1) * 60;
        const magnetRange = baseMagnetRange + (magnetLevel - 1) * 80;

        coins.getChildren().forEach(coin => {
            if (!coin.active) return;

            const dist = Phaser.Math.Distance.Between(player.x, player.y, coin.x, coin.y);

            if (dist <= magnetRange) {
                const speedFactor = Phaser.Math.Clamp(1 - (dist / magnetRange), 0.2, 1);
                const appliedSpeed = magnetSpeed * (0.5 + speedFactor);

                const cAngle = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y);
                const vx = Math.cos(cAngle) * appliedSpeed;
                const vy = Math.sin(cAngle) * appliedSpeed;
                coin.body.setVelocity(vx, vy);

                if (dist <= COLLECT_DISTANCE) {
                    collectCoin(player, coin);
                }
            } else {
                coin.body.setVelocity(0, 0);
            }

            // clamp dentro da área
            if (coin.x < 0 || coin.x > GAME_WIDTH || coin.y < 0 || coin.y > GAME_HEIGHT) {
                coin.x = Phaser.Math.Clamp(coin.x, 16, GAME_WIDTH - 16);
                coin.y = Phaser.Math.Clamp(coin.y, 16, GAME_HEIGHT - 16);
                coin.body.setVelocity(0, 0);
            }
        });
    }

    // ---- Inimigos perseguindo ----
    enemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            this.physics.moveToObject(enemy, player, enemy.speed); // Usar a velocidade do inimigo
        }
    });

    // ---- Armas ----
    if (pointer.isDown) {
        if (currentWeapon === 'pistol' && time > lastShot + fireRate) {
            shootBullet(this, angle);
            lastShot = time;
        } else if (currentWeapon === 'sword' && time > lastSwordAttack + swordAttackCooldown) {
            swordAttack(this, angle);
            lastSwordAttack = time;
        }
    }
}



// --- LOJA ---
function createShop(scene) {
    let shopContainer = scene.add.container(820, 50); // fora da área principal

    // Fundo semi-transparente
    let graphics = scene.add.graphics();
    graphics.fillStyle(0x333333, 0.8);
    graphics.fillRoundedRect(0, 0, 180, 400, 16); // Aumentei a altura para novos upgrades
    shopContainer.add(graphics);

    // Título
    let title = scene.add.text(90, 10, 'LOJA', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
    shopContainer.add(title);

    // Upgrades
    const upgrades = [
        { key: 'Velocidade', cost: upgradeCostSpeed, action: () => buySpeed(scene) },
        { key: 'Mais Moedas', cost: upgradeCostCoins, action: () => buyCoins(scene) },
        { key: 'Ímã', cost: magnetCost, action: () => buyMagnet(scene) },
        { key: 'Vida Max', cost: 75, action: () => buyMaxHealth(scene) }, // Novo upgrade
        { key: 'Dano', cost: 100, action: () => buyPlayerDamage(scene) }  // Novo upgrade
    ];

    upgrades.forEach((upgrade, index) => {
        let yPos = 50 + index * 80; // Ajuste no espaçamento

        // Botão
        let btnGraphics = scene.add.graphics();
        btnGraphics.fillStyle(0x555555, 1);
        btnGraphics.fillRoundedRect(10, yPos, 160, 70, 12);
        shopContainer.add(btnGraphics);

        // Texto do botão
        let level = 0;
        let cost = upgrade.cost;
        if (upgrade.key === 'Velocidade') { level = speedLevel; cost = upgradeCostSpeed; }
        if (upgrade.key === 'Mais Moedas') { level = coinLevel; cost = upgradeCostCoins; }
        if (upgrade.key === 'Ímã') { level = magnetLevel; cost = magnetCost; }
        if (upgrade.key === 'Vida Max') { level = Math.floor((playerMaxHealth - 100) / 25) + 1; cost = 75 + (level - 1) * 25; }
        if (upgrade.key === 'Dano') { level = Math.floor((playerDamage - 10) / 5) + 1; cost = 100 + (level - 1) * 50; }

        let btnText = scene.add.text(90, yPos + 35, `${upgrade.key} (Nível ${level})\nPreço: ${cost}`,
            { fontSize: '14px', fill: '#fff', align: 'center' }).setOrigin(0.5);
        shopContainer.add(btnText);
        shopTexts[upgrade.key] = btnText;

        // Área interativa
        let btnZone = scene.add.zone(10, yPos, 160, 70).setOrigin(0).setInteractive();
        btnZone.on('pointerdown', upgrade.action);
        shopContainer.add(btnZone);

        // Feedback hover
        btnZone.on('pointerover', () => btnGraphics.clear().fillStyle(0x777777, 1).fillRoundedRect(10, yPos, 160, 70, 12));
        btnZone.on('pointerout', () => btnGraphics.clear().fillStyle(0x555555, 1).fillRoundedRect(10, yPos, 160, 70, 12));
    });
}

// --- Funções de upgrade ---
function buySpeed(scene) {
    if (score >= upgradeCostSpeed) {
        score -= upgradeCostSpeed;
        playerSpeed += 50;
        upgradeCostSpeed += 50;
        speedLevel += 1;
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
        saveGame();
    }
}

function buyCoins(scene) {
    if (score >= upgradeCostCoins) {
        score -= upgradeCostCoins;
        maxCoins += 1;
        upgradeCostCoins += 50;
        coinLevel += 1;
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
        saveGame();
    }
}

function buyMagnet(scene) {
    if (score >= magnetCost) {
        score -= magnetCost;
        magnetLevel += 1;
        magnetCost += 100;
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
        saveGame();
    }
}

function buyMaxHealth(scene) {
    let currentCost = 75 + (Math.floor((playerMaxHealth - 100) / 25)) * 25;
    if (score >= currentCost) {
        score -= currentCost;
        playerMaxHealth += 25;
        player.maxHealth = playerMaxHealth; // Atualiza no player sprite
        player.health = Math.min(player.health + 25, playerMaxHealth); // Cura um pouco ao aumentar a vida
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
        updateHUD(); // Atualiza a HUD da vida
        saveGame();
    }
}

function buyPlayerDamage(scene) {
    let currentCost = 100 + (Math.floor((playerDamage - 10) / 5)) * 50;
    if (score >= currentCost) {
        score -= currentCost;
        playerDamage += 5;
        player.damage = playerDamage; // Atualiza no player sprite
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
        saveGame();
    }
}

// --- FUNÇÃO PARA AUMENTAR A DIFICULDADE (ONDAS) ---
function increaseDifficulty() {
    currentWave++;
    waveText.setText(`Onda: ${currentWave}`);

    // Aumenta a saúde e velocidade dos inimigos
    baseEnemyHealth += 10; // Aumenta 10 de vida por onda
    baseEnemySpeed += 5; // Aumenta 5 de velocidade por onda
    baseEnemyDamage += 2; // Aumenta 2 de dano por onda

    // Aumenta o número máximo de inimigos (a cada 2 ondas, por exemplo)
    if (currentWave % 2 === 0) {
        maxEnemies += 1;
    }

    // Opcional: Efeito visual ou sonoro ao iniciar uma nova onda
    this.cameras.main.shake(100, 0.005); // Pequeno shake na câmera

    saveGame(); // Salva a nova onda
}

function spawnEnemy(scene) {
    let x = Phaser.Math.Between(50, 750);
    let y = Phaser.Math.Between(50, 550);
    let enemy = scene.physics.add.sprite(x, y, 'red_square')
        .setScale(1);
    enemy.body.setCollideWorldBounds(true);
    // Atributos do inimigo são baseados nos valores atuais da onda
    enemy.health = baseEnemyHealth; 
    enemy.damage = baseEnemyDamage; 
    enemy.speed = baseEnemySpeed; 
    enemies.add(enemy);
}

function hitEnemy(player, enemy) {
    if (!player.lastHitTime) player.lastHitTime = 0;
    const hitCooldown = 500;

    if (this.time.now > player.lastHitTime + hitCooldown) {
        player.health -= enemy.damage;
        player.lastHitTime = this.time.now;

        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());

        updateHUD();

        if (player.health <= 0) {
            // GAME OVER - Reinicia tudo
            this.scene.restart();
            score = 0;
            playerSpeed = 100;
            maxCoins = 2;
            coinSpawnInterval = 2000;
            upgradeCostSpeed = 50;
            upgradeCostCoins = 100;
            magnetCost = 150;
            speedLevel = 1;
            coinLevel = 1;
            magnetLevel = 0;
            playerHealth = 100;
            playerMaxHealth = 100;
            playerDamage = 10;
            currentWave = 0; // Reseta a onda
            baseEnemyHealth = 30; // Reseta atributos base do inimigo
            baseEnemySpeed = 80;
            baseEnemyDamage = 10;
            maxEnemies = 3; // Reseta max inimigos
            saveGame();
        }
    }
}

// Atualiza textos da loja
function updateShop() {
    shopTexts['Velocidade'].setText(`Velocidade (Nível ${speedLevel})\nPreço: ${upgradeCostSpeed}`);
    shopTexts['Mais Moedas'].setText(`Mais Moedas (Nível ${coinLevel})\nPreço: ${upgradeCostCoins}`);
    shopTexts['Ímã'].setText(`Ímã (Nível ${magnetLevel})\nPreço: ${magnetCost}`);
    
    let maxHealthLevel = Math.floor((playerMaxHealth - 100) / 25) + 1;
    let maxHealthCost = 75 + (maxHealthLevel - 1) * 25;
    shopTexts['Vida Max'].setText(`Vida Max (Nível ${maxHealthLevel})\nPreço: ${maxHealthCost}`);

    let damageLevel = Math.floor((playerDamage - 10) / 5) + 1;
    let damageCost = 100 + (damageLevel - 1) * 50;
    shopTexts['Dano'].setText(`Dano (Nível ${damageLevel})\nPreço: ${damageCost}`);
}

// armas

// ---- Pistola ----
function shootBullet(scene, angle) {
    let bullet = scene.add.rectangle(player.x, player.y, 8, 4, 0xffffff);
    scene.physics.add.existing(bullet);
    bullets.add(bullet);
    bullet.body.setAllowGravity(false);
    bullet.damage = player.damage;

    scene.physics.velocityFromRotation(angle, 400, bullet.body.velocity);

    scene.time.delayedCall(2000, () => bullet.destroy());
}

// ---- Espada ----
function swordAttack(scene, angle) {
    let distance = 40;
    let offsetX = Math.cos(angle) * distance;
    let offsetY = Math.sin(angle) * distance;

    let hitbox = scene.add.rectangle(player.x + offsetX, player.y + offsetY, 50, 30, 0x00ff00, 0.3);
    scene.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.body.enable = true;
    hitbox.body.setImmovable(true);
    hitbox.damage = player.damage;

    let enemiesHitBySword = new Set(); 

    scene.physics.overlap(hitbox, enemies, (box, enemy) => {
        if (!enemiesHitBySword.has(enemy)) {
            takeDamage.call(scene, enemy, box.damage); 
            enemiesHitBySword.add(enemy);
        }
    });

    scene.time.delayedCall(200, () => {
        hitbox.destroy();
    });
}

// ---- Colisão balas ↔ inimigos ----
function bulletHitEnemy(bullet, enemy) {
    bullet.destroy();
    takeDamage.call(this, enemy, bullet.damage);
}

// Nova função para aplicar dano a qualquer entidade (inimigo ou player)
function takeDamage(target, amount) {
    if (!target || !target.active) {
        return;
    }

    target.health -= amount;

    target.setTint(0xff8888);
    this.time.delayedCall(150, () => target.clearTint());

    if (target.health <= 0) {
        target.destroy();
        score += 10 + currentWave * 2; // Inimigos de ondas mais altas valem mais
        scoreText.setText(`Pontos: ${score}`);
        saveGame();
    }
}