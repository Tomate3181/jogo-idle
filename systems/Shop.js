import config from '../config.js';

class Shop {
    constructor(scene, player, hud, coinsGroup) {
        this.scene = scene;
        this.player = player;
        this.hud = hud;
        this.coinsGroup = coinsGroup; // Grupo de moedas para a lógica do ímã

        // Custos de upgrades (podem ser carregados de savedData no Player ou aqui)
        // Para simplificar, o player.js já carrega o nível. Aqui calculamos o custo com base no nível do player.
        this.upgradeCosts = {
            speed: config.UPGRADE_COST_SPEED_INITIAL + (player.speedLevel - 1) * config.UPGRADE_INCREASE_SPEED,
            coins: config.UPGRADE_COST_COINS_INITIAL + (player.coinLevel - 1) * config.UPGRADE_INCREASE_COINS,
            magnet: config.UPGRADE_COST_MAGNET_INITIAL + (player.magnetLevel) * config.UPGRADE_INCREASE_MAGNET, // MagnetLevel 0 para inicial
            maxHealth: config.UPGRADE_COST_MAX_HEALTH_INITIAL + (Math.floor((player.maxHealth - config.PLAYER_INITIAL_MAX_HEALTH) / config.UPGRADE_INCREASE_MAX_HEALTH)) * config.UPGRADE_INCREASE_MAX_HEALTH,
            damage: config.UPGRADE_COST_DAMAGE_INITIAL + (Math.floor((player.damage - config.PLAYER_INITIAL_DAMAGE) / config.UPGRADE_INCREASE_DAMAGE)) * config.UPGRADE_INCREASE_DAMAGE
        };

        this.shopTexts = {}; // Para armazenar referências aos textos dos botões
        this.createShopUI();

        // Adiciona um evento de atualização na cena para a lógica do ímã
        this.scene.events.on('update', this.magnetLogic, this);
        this.scene.events.once('shutdown', this.destroy, this);
    }

    createShopUI() {
        let shopContainer = this.scene.add.container(config.SHOP_POSITION_X, config.SHOP_POSITION_Y);

        let graphics = this.scene.add.graphics();
        graphics.fillStyle(0x333333, 0.8);
        graphics.fillRoundedRect(0, 0, 180, 400, 16);
        shopContainer.add(graphics);

        let title = this.scene.add.text(90, 10, 'LOJA', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
        shopContainer.add(title);

        const upgrades = [
            { key: 'speed', display: 'Velocidade', action: () => this.buyUpgrade('speed', config.UPGRADE_INCREASE_SPEED, this.player.upgradeSpeed, this.player.speedLevel) },
            { key: 'coins', display: 'Mais Moedas', action: () => this.buyUpgrade('coins', 1, this.player.upgradeCoinLevel, this.player.coinLevel) },
            { key: 'magnet', display: 'Ímã', action: () => this.buyUpgrade('magnet', 1, this.player.upgradeMagnetLevel, this.player.magnetLevel) },
            { key: 'maxHealth', display: 'Vida Max', action: () => this.buyUpgrade('maxHealth', config.UPGRADE_INCREASE_MAX_HEALTH, this.player.upgradeMaxHealth, Math.floor((this.player.maxHealth - config.PLAYER_INITIAL_MAX_HEALTH) / config.UPGRADE_INCREASE_MAX_HEALTH) + 1) },
            { key: 'damage', display: 'Dano', action: () => this.buyUpgrade('damage', config.UPGRADE_INCREASE_DAMAGE, this.player.upgradeDamage, Math.floor((this.player.damage - config.PLAYER_INITIAL_DAMAGE) / config.UPGRADE_INCREASE_DAMAGE) + 1) }
        ];

        upgrades.forEach((upgrade, index) => {
            let yPos = 50 + index * config.SHOP_ITEM_SPACING_Y;

            let btnGraphics = this.scene.add.graphics();
            btnGraphics.fillStyle(0x555555, 1);
            btnGraphics.fillRoundedRect(10, yPos, config.SHOP_ITEM_WIDTH, config.SHOP_ITEM_HEIGHT, 12);
            shopContainer.add(btnGraphics);

            let btnText = this.scene.add.text(90, yPos + config.SHOP_ITEM_HEIGHT / 2, '',
                { fontSize: '14px', fill: '#fff', align: 'center' }).setOrigin(0.5);
            shopContainer.add(btnText);
            this.shopTexts[upgrade.key] = btnText;

            let btnZone = this.scene.add.zone(10, yPos, config.SHOP_ITEM_WIDTH, config.SHOP_ITEM_HEIGHT).setOrigin(0).setInteractive();
            btnZone.on('pointerdown', upgrade.action);
            shopContainer.add(btnZone);

            btnZone.on('pointerover', () => btnGraphics.clear().fillStyle(0x777777, 1).fillRoundedRect(10, yPos, config.SHOP_ITEM_WIDTH, config.SHOP_ITEM_HEIGHT, 12));
            btnZone.on('pointerout', () => btnGraphics.clear().fillStyle(0x555555, 1).fillRoundedRect(10, yPos, config.SHOP_ITEM_WIDTH, config.SHOP_ITEM_HEIGHT, 12));
        });

        this.updateShopUI(); // Atualiza os textos da loja com os valores iniciais/carregados
    }

    buyUpgrade(key, amountToIncrease, playerMethod, currentLevel) {
        let cost = this.upgradeCosts[key];
        if (this.player.score >= cost) {
            this.player.score -= cost;
            playerMethod.call(this.player, amountToIncrease, cost); // Chama o método do player
            this.hud.updateScore(this.player.score); // Atualiza score na HUD

            // Atualiza o custo para o próximo nível
            switch (key) {
                case 'speed': this.upgradeCosts.speed += config.UPGRADE_INCREASE_SPEED; break;
                case 'coins': this.upgradeCosts.coins += config.UPGRADE_INCREASE_COINS; break;
                case 'magnet': this.upgradeCosts.magnet += config.UPGRADE_INCREASE_MAGNET; break;
                case 'maxHealth': this.upgradeCosts.maxHealth += config.UPGRADE_INCREASE_MAX_HEALTH; break;
                case 'damage': this.upgradeCosts.damage += config.UPGRADE_INCREASE_DAMAGE; break;
            }
            this.updateShopUI(); // Atualiza UI da loja
            this.hud.updateHealth(this.player.health, this.player.maxHealth); // Para o caso de MaxHealth
        } else {
            // Feedback visual ou sonoro de dinheiro insuficiente
            console.log("Pontos insuficientes para: " + key);
        }
    }

    updateShopUI() {
        this.shopTexts['speed'].setText(`Velocidade (Nível ${this.player.speedLevel})\nPreço: ${this.upgradeCosts.speed}`);
        this.shopTexts['coins'].setText(`Mais Moedas (Nível ${this.player.coinLevel})\nPreço: ${this.upgradeCosts.coins}`);
        this.shopTexts['magnet'].setText(`Ímã (Nível ${this.player.magnetLevel})\nPreço: ${this.upgradeCosts.magnet}`);
        this.shopTexts['maxHealth'].setText(`Vida Max (Nível ${Math.floor((this.player.maxHealth - config.PLAYER_INITIAL_MAX_HEALTH) / config.UPGRADE_INCREASE_MAX_HEALTH) + 1})\nPreço: ${this.upgradeCosts.maxHealth}`);
        this.shopTexts['damage'].setText(`Dano (Nível ${Math.floor((this.player.damage - config.PLAYER_INITIAL_DAMAGE) / config.UPGRADE_INCREASE_DAMAGE) + 1})\nPreço: ${this.upgradeCosts.damage}`);
    }

    getUpgradeCost(key) {
        return this.upgradeCosts[key];
    }

    // --- Lógica do Ímã ---
    magnetLogic() {
        if (this.player.magnetLevel > 0) {
            const magnetSpeed = config.MAGNET_BASE_SPEED + (this.player.magnetLevel - 1) * config.MAGNET_SPEED_PER_LEVEL;
            const magnetRange = config.MAGNET_BASE_RANGE + (this.player.magnetLevel - 1) * config.MAGNET_RANGE_PER_LEVEL;

            this.coinsGroup.getChildren().forEach(coin => {
                if (!coin.active) return;

                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y);

                if (dist <= magnetRange) {
                    const speedFactor = Phaser.Math.Clamp(1 - (dist / magnetRange), 0.2, 1);
                    const appliedSpeed = magnetSpeed * (0.5 + speedFactor);

                    const cAngle = Phaser.Math.Angle.Between(coin.x, coin.y, this.player.x, this.player.y);
                    const vx = Math.cos(cAngle) * appliedSpeed;
                    const vy = Math.sin(cAngle) * appliedSpeed;
                    coin.body.setVelocity(vx, vy);

                    // Coleta instantânea se muito próximo
                    if (dist <= config.COIN_COLLECT_DISTANCE) {
                        this.player.collectCoin(this.player, coin);
                        this.hud.updateScore(this.player.score); // Atualiza score na HUD
                    }
                } else {
                    coin.body.setVelocity(0, 0); // Moedas param de se mover se fora do alcance
                }

                // Clamp dentro da área de jogo (apenas para as moedas que não foram coletadas e se moveram)
                if (coin.active && (coin.x < 0 || coin.x > config.GAME_WIDTH || coin.y < 0 || coin.y > config.GAME_HEIGHT)) {
                    coin.x = Phaser.Math.Clamp(coin.x, 16, config.GAME_WIDTH - 16);
                    coin.y = Phaser.Math.Clamp(coin.y, 16, config.GAME_HEIGHT - 16);
                    coin.body.setVelocity(0, 0);
                }
            });
        }
    }

    reset() {
        // Redefine os custos de upgrade com base nos níveis iniciais do player ou nos valores padrão
        this.upgradeCosts = {
            speed: config.UPGRADE_COST_SPEED_INITIAL,
            coins: config.UPGRADE_COST_COINS_INITIAL,
            magnet: config.UPGRADE_COST_MAGNET_INITIAL,
            maxHealth: config.UPGRADE_COST_MAX_HEALTH_INITIAL,
            damage: config.UPGRADE_COST_DAMAGE_INITIAL
        };
        this.updateShopUI();
    }

    destroy() {
        this.scene.events.off('update', this.magnetLogic, this);
        // ... limpar outros elementos da UI da loja se necessário
    }
}

export default Shop;