const config = {
    type: Phaser.AUTO,
    width: 800,
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

// Upgrades
let playerSpeed = 100;
let maxCoins = 2;
let coinSpawnInterval = 2000;
let upgradeCostSpeed = 50;
let upgradeCostCoins = 100;

// Níveis
let speedLevel = 1;
let coinLevel = 1;

// Pontos por moeda
let pointsPerCoin = 5; // antes era 10

function preload() {
    this.load.image('player', 'player.png');
    this.load.image('coin', 'coin.png');
}

function create() {
    // Player
    player = this.physics.add.sprite(400, 300, 'player')
        .setCollideWorldBounds(true)
        .setScale(0.1);

    // Moedas
    coins = this.physics.add.group();
    spawnCoins(this);

    // Texto da pontuação
    scoreText = this.add.text(16, 16, `Pontos: 0`, { fontSize: '32px', fill: '#fff' });

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

    // Criar a loja
    createShop(this);
}

function update() {
    player.setVelocity(0);
    if(cursors.left.isDown) player.setVelocityX(-playerSpeed);
    if(cursors.right.isDown) player.setVelocityX(playerSpeed);
    if(cursors.up.isDown) player.setVelocityY(-playerSpeed);
    if(cursors.down.isDown) player.setVelocityY(playerSpeed);
}

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += pointsPerCoin;
    scoreText.setText(`Pontos: ${score}`);
}

// Spawn de moedas aleatórias
function spawnCoins(scene){
    let currentCoins = coins.getChildren().filter(c => c.active).length;
    while(currentCoins < maxCoins){
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(50, 550);
        let coin = coins.create(x, y, 'coin').setScale(0.1);
        coin.setActive(true).setVisible(true);
        currentCoins++;
    }
}

// --- LOJA ---
let shopTexts = {}; // para atualizar preços e níveis dinamicamente

function createShop(scene) {
    let shopContainer = scene.add.container(600, 50);

    // Fundo semi-transparente
    let graphics = scene.add.graphics();
    graphics.fillStyle(0x333333, 0.8);
    graphics.fillRoundedRect(0, 0, 180, 220, 16);
    shopContainer.add(graphics);

    // Título
    let title = scene.add.text(90, 10, 'LOJA', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
    shopContainer.add(title);

    // Upgrades
    const upgrades = [
        { key: 'Velocidade', cost: upgradeCostSpeed, action: () => buySpeed(scene) },
        { key: 'Mais Moedas', cost: upgradeCostCoins, action: () => buyCoins(scene) }
    ];

    upgrades.forEach((upgrade, index) => {
        let yPos = 50 + index * 80;

        // Botão
        let btnGraphics = scene.add.graphics();
        btnGraphics.fillStyle(0x555555, 1);
        btnGraphics.fillRoundedRect(10, yPos, 160, 60, 12);
        shopContainer.add(btnGraphics);

        // Texto do botão
        let level = upgrade.key === 'Velocidade' ? speedLevel : coinLevel;
        let btnText = scene.add.text(90, yPos + 30, `${upgrade.key} (Nível ${level})\nPreço: ${upgrade.cost}`, 
            { fontSize: '14px', fill: '#fff', align: 'center' }).setOrigin(0.5);
        shopContainer.add(btnText);
        shopTexts[upgrade.key] = btnText;

        // Área interativa
        let btnZone = scene.add.zone(10, yPos, 160, 60).setOrigin(0).setInteractive();
        btnZone.on('pointerdown', upgrade.action);
        shopContainer.add(btnZone);

        // Feedback hover
        btnZone.on('pointerover', () => btnGraphics.clear().fillStyle(0x777777, 1).fillRoundedRect(10, yPos, 160, 60, 12));
        btnZone.on('pointerout', () => btnGraphics.clear().fillStyle(0x555555, 1).fillRoundedRect(10, yPos, 160, 60, 12));
    });
}

// Funções de upgrade
function buySpeed(scene) {
    if(score >= upgradeCostSpeed){
        score -= upgradeCostSpeed;
        playerSpeed += 50;
        upgradeCostSpeed += 50;
        speedLevel += 1;
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
    }
}

function buyCoins(scene) {
    if(score >= upgradeCostCoins){
        score -= upgradeCostCoins;
        maxCoins += 1;
        upgradeCostCoins += 50;
        coinLevel += 1;
        scoreText.setText(`Pontos: ${score}`);
        updateShop();
    }
}

// Atualiza preços e níveis na loja
function updateShop() {
    shopTexts['Velocidade'].setText(`Velocidade (Nível ${speedLevel})\nPreço: ${upgradeCostSpeed}`);
    shopTexts['Mais Moedas'].setText(`Mais Moedas (Nível ${coinLevel})\nPreço: ${upgradeCostCoins}`);
}
