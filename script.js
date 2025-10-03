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
    if(saved){
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
}

function update() {
    player.setVelocity(0);
    if(cursors.left.isDown) player.setVelocityX(-playerSpeed);
    if(cursors.right.isDown) player.setVelocityX(playerSpeed);
    if(cursors.up.isDown) player.setVelocityY(-playerSpeed);
    if(cursors.down.isDown) player.setVelocityY(playerSpeed);

    // Ímã ativo
    if(magnetActive){
        coins.getChildren().forEach(coin => {
            if(coin.active){
                this.physics.moveToObject(coin, player, 200);
            }
        });
    }
}

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += pointsPerCoin;
    scoreText.setText(`Pontos: ${score}`);
    saveGame(); // salva progresso
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
        if(upgrade.key === 'Velocidade') level = speedLevel;
        if(upgrade.key === 'Mais Moedas') level = coinLevel;
        if(upgrade.key === 'Ímã') level = magnetLevel;

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
    if(score >= upgradeCostSpeed){
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
    if(score >= upgradeCostCoins){
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
    if(score >= magnetCost){
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

// Atualiza textos da loja
function updateShop() {
    shopTexts['Velocidade'].setText(`Velocidade (Nível ${speedLevel})\nPreço: ${upgradeCostSpeed}`);
    shopTexts['Mais Moedas'].setText(`Mais Moedas (Nível ${coinLevel})\nPreço: ${upgradeCostCoins}`);
    shopTexts['Ímã'].setText(`Ímã (Nível ${magnetLevel})\nPreço: ${magnetCost}`);
}
