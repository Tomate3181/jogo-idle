const config = {
    type: Phaser.AUTO,
    width: 1000, // canvas maior para caber a loja
    height: 600,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let cursors;
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

function preload() {
    this.load.image('player', 'player.png');
    this.load.image('coin', 'coin.png');
}

// --- LOCAL STORAGE ---
function saveGame() {
    const saveData = {
        score, speedLevel, coinLevel, magnetLevel,
        playerSpeed, maxCoins,
        upgradeCostSpeed, upgradeCostCoins, magnetCost
    };
    localStorage.setItem('idleGameSave', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('idleGameSave');
    if (saved) {
        const data = JSON.parse(saved);
        score = data.score || 0;
        speedLevel = data.speedLevel || 1;
        coinLevel = data.coinLevel || 1;
        magnetLevel = data.magnetLevel || 0;
        playerSpeed = data.playerSpeed || 100;
        maxCoins = data.maxCoins || 2;
        upgradeCostSpeed = data.upgradeCostSpeed || 50;
        upgradeCostCoins = data.upgradeCostCoins || 100;
        magnetCost = data.magnetCost || 150;
    }
}

function create() {
    loadGame(); // carrega progresso salvo

    // Player
    player = this.physics.add.sprite(400, 300, 'player')
        .setCollideWorldBounds(true)
        .setScale(0.1);

    // Moedas
    coins = this.physics.add.group();
    spawnCoins(this);

    // Texto da pontuação
    scoreText = this.add.text(16, 16, `Pontos: ${score}`, { fontSize: '32px', fill: '#fff' });

    // Controles
    cursors = this.input.keyboard.createCursorKeys();

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

    // spawn inicial
    spawnEnemy(this);

    // colisão inimigo ↔ player
    this.physics.add.overlap(player, enemies, hitEnemy, null, this);
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

// Spawn de moedas aleatórias
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

// update() — lógica do ímã melhorada e proteção contra sair do mundo
function update() {
    player.setVelocity(0);
    if (cursors.left.isDown) player.setVelocityX(-playerSpeed);
    if (cursors.right.isDown) player.setVelocityX(playerSpeed);
    if (cursors.up.isDown) player.setVelocityY(-playerSpeed);
    if (cursors.down.isDown) player.setVelocityY(playerSpeed);

    // Ímã: somente se nível > 0 (ímã passivo por nível). Fazemos controle por distância.
    if (magnetLevel > 0) {
        // parâmetros escaláveis por nível
        const baseMagnetSpeed = 80; // velocidade base
        const baseMagnetRange = 100; // alcance base
        const magnetSpeed = baseMagnetSpeed + (magnetLevel - 1) * 60; // aumenta por nível
        const magnetRange = baseMagnetRange + (magnetLevel - 1) * 80; // alcance aumenta por nível

        coins.getChildren().forEach(coin => {
            if (!coin.active) return;

            // distância entre player e moeda
            const dist = Phaser.Math.Distance.Between(player.x, player.y, coin.x, coin.y);

            // se estiver dentro do alcance, atraímos; a velocidade diminui conforme se aproxima
            if (dist <= magnetRange) {
                // quanto mais perto, mais rápido (inverso do que estava antes)
                const speedFactor = Phaser.Math.Clamp(1 - (dist / magnetRange), 0.2, 1);
                const appliedSpeed = magnetSpeed * (0.5 + speedFactor);
                // 0.5 é pra nunca ficar muito lento

                const angle = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y);
                const vx = Math.cos(angle) * appliedSpeed;
                const vy = Math.sin(angle) * appliedSpeed;
                coin.body.setVelocity(vx, vy);

                // coleta automática se estiver colado
                if (dist <= COLLECT_DISTANCE) {
                    collectCoin(player, coin);
                }
            } else {
                coin.body.setVelocity(0, 0);
            }


            // Proteção extra: se a moeda tiver saído dos limites do mundo, colocamos ela de volta dentro (clamp)
            if (coin.x < 0 || coin.x > GAME_WIDTH || coin.y < 0 || coin.y > GAME_HEIGHT) {
                // trava dentro da área de jogo (com padding)
                coin.x = Phaser.Math.Clamp(coin.x, 16, GAME_WIDTH - 16);
                coin.y = Phaser.Math.Clamp(coin.y, 16, GAME_HEIGHT - 16);
                coin.body.setVelocity(0, 0);
            }
        });
    } else {
        // se ímã não ativo, garantir que moedas não fiquem com velocidade residual
        coins.getChildren().forEach(coin => {
            if (coin.active && coin.body) {
                // se o corpo tiver velocidade pequena, zera
                if (Math.abs(coin.body.velocity.x) < 1 && Math.abs(coin.body.velocity.y) < 1) {
                    coin.body.setVelocity(0, 0);
                }
            }
        });
    }

     enemies.getChildren().forEach(enemy => {
        this.physics.moveToObject(enemy, player, 80); // velocidade de perseguição
    });
}


// --- LOJA ---
function createShop(scene) {
    let shopContainer = scene.add.container(820, 50); // fora da área principal

    // Fundo semi-transparente
    let graphics = scene.add.graphics();
    graphics.fillStyle(0x333333, 0.8);
    graphics.fillRoundedRect(0, 0, 180, 300, 16);
    shopContainer.add(graphics);

    // Título
    let title = scene.add.text(90, 10, 'LOJA', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
    shopContainer.add(title);

    // Upgrades
    const upgrades = [
        { key: 'Velocidade', cost: upgradeCostSpeed, action: () => buySpeed(scene) },
        { key: 'Mais Moedas', cost: upgradeCostCoins, action: () => buyCoins(scene) },
        { key: 'Ímã', cost: magnetCost, action: () => buyMagnet(scene) }
    ];

    upgrades.forEach((upgrade, index) => {
        let yPos = 50 + index * 90;

        // Botão
        let btnGraphics = scene.add.graphics();
        btnGraphics.fillStyle(0x555555, 1);
        btnGraphics.fillRoundedRect(10, yPos, 160, 70, 12);
        shopContainer.add(btnGraphics);

        // Texto do botão
        let level = 0;
        if (upgrade.key === 'Velocidade') level = speedLevel;
        if (upgrade.key === 'Mais Moedas') level = coinLevel;
        if (upgrade.key === 'Ímã') level = magnetLevel;

        let btnText = scene.add.text(90, yPos + 35, `${upgrade.key} (Nível ${level})\nPreço: ${upgrade.cost}`,
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

        magnetActive = true;
        scene.time.delayedCall(magnetDuration + magnetLevel * 1000, () => {
            magnetActive = false;
        });
    }
}

function spawnEnemy(scene) {
    let x = Phaser.Math.Between(50, 750);
    let y = Phaser.Math.Between(50, 550);
    let enemy = scene.add.rectangle(x, y, 30, 30, 0xff0000); // quadrado vermelho
    scene.physics.add.existing(enemy);
    enemy.body.setCollideWorldBounds(true);
    enemies.add(enemy);
}

function hitEnemy(player, enemy) {
    // exemplo: perder pontos
    score = Math.max(0, score - 20);
    scoreText.setText('Pontos: ' + score);

    // opcional: empurrar player ou piscar
    player.setTint(0xff0000);
    scene.time.delayedCall(200, () => player.clearTint());
}

// Atualiza textos da loja
function updateShop() {
    shopTexts['Velocidade'].setText(`Velocidade (Nível ${speedLevel})\nPreço: ${upgradeCostSpeed}`);
    shopTexts['Mais Moedas'].setText(`Mais Moedas (Nível ${coinLevel})\nPreço: ${upgradeCostCoins}`);
    shopTexts['Ímã'].setText(`Ímã (Nível ${magnetLevel})\nPreço: ${magnetCost}`);
}
