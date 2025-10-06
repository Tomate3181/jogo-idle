import config from '../config.js';

class Shop {
    // Agora o Shop recebe o coinManager em vez de coinsGroup
    constructor(scene, player, hud, coinManager) { 
        this.scene = scene;
        this.player = player;
        this.hud = hud;
        this.coinManager = coinManager; // Armazena a referência ao CoinManager

        // Os custos dos upgrades são baseados nos NÍVEIS que são controlados por Player e CoinManager
        this.upgradeCosts = {
            // O score agora vem do CoinManager, mas os níveis de upgrade ainda estão no player
            speed: config.UPGRADE_COST_SPEED_INITIAL + (player.speedLevel - 1) * config.UPGRADE_INCREASE_SPEED,
            coins: config.UPGRADE_COST_COINS_INITIAL + (this.coinManager.maxCoins - config.INITIAL_MAX_COINS) * config.UPGRADE_INCREASE_COINS, // Baseado no maxCoins do CoinManager
            magnet: config.UPGRADE_COST_MAGNET_INITIAL + (this.coinManager.magnetLevel) * config.UPGRADE_INCREASE_MAGNET, // Baseado no magnetLevel do CoinManager
            maxHealth: config.UPGRADE_COST_MAX_HEALTH_INITIAL + (Math.floor((player.maxHealth - config.PLAYER_INITIAL_MAX_HEALTH) / config.UPGRADE_INCREASE_MAX_HEALTH)) * config.UPGRADE_INCREASE_MAX_HEALTH,
            damage: config.UPGRADE_COST_DAMAGE_INITIAL + (Math.floor((player.damage - config.PLAYER_INITIAL_DAMAGE) / config.UPGRADE_INCREASE_DAMAGE)) * config.UPGRADE_INCREASE_DAMAGE
        };

        this.shopTexts = {};
        this.createShopUI();

        // REMOVIDO: this.scene.events.on('update', this.magnetLogic, this);
        // A lógica do ímã é responsabilidade do CoinManager e seu update() na cena principal.
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
            // Ação de 'coins' e 'magnet' agora chama os métodos do CoinManager
            { key: 'coins', display: 'Mais Moedas', action: () => this.buyUpgrade('coins', 1, this.coinManager.upgradeMaxCoins, this.coinManager.maxCoins) },
            { key: 'magnet', display: 'Ímã', action: () => this.buyUpgrade('magnet', 1, this.coinManager.upgradeMagnet, this.coinManager.magnetLevel) },
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

        this.updateShopUI();
    }

    buyUpgrade(key, amountToIncrease, methodToCall, currentLevel) {
        let cost = this.upgradeCosts[key];
        // O score agora é gerenciado pelo CoinManager
        if (this.coinManager.getScore() >= cost) {
            this.coinManager.setScore(this.coinManager.getScore() - cost); // Reduz o score via CoinManager
            
            // Chama o método apropriado, com o contexto correto
            if (key === 'coins' || key === 'magnet') {
                methodToCall.call(this.coinManager, amountToIncrease); // Chama o método do CoinManager
            } else {
                methodToCall.call(this.player, amountToIncrease, cost); // Chama o método do Player
            }
            
            this.hud.updateScore(this.coinManager.getScore()); // Atualiza score na HUD usando o CoinManager

            // Atualiza o custo para o próximo nível
            switch (key) {
                case 'speed': this.upgradeCosts.speed += config.UPGRADE_INCREASE_SPEED; break;
                case 'coins': this.upgradeCosts.coins += config.UPGRADE_INCREASE_COINS; break;
                case 'magnet': this.upgradeCosts.magnet += config.UPGRADE_INCREASE_MAGNET; break;
                case 'maxHealth': this.upgradeCosts.maxHealth += config.UPGRADE_INCREASE_MAX_HEALTH; break;
                case 'damage': this.upgradeCosts.damage += config.UPGRADE_INCREASE_DAMAGE; break;
            }
            this.updateShopUI();
            this.hud.updateHealth(this.player.health, this.player.maxHealth); // Para o caso de MaxHealth
        } else {
            console.log("Pontos insuficientes para: " + key);
        }
    }

    updateShopUI() {
        this.shopTexts['speed'].setText(`Velocidade (Nível ${this.player.speedLevel})\nPreço: ${this.upgradeCosts.speed}`);
        // As informações de nível de moedas e ímã vêm do CoinManager
        this.shopTexts['coins'].setText(`Mais Moedas (Nível ${this.coinManager.maxCoins})\nPreço: ${this.upgradeCosts.coins}`);
        this.shopTexts['magnet'].setText(`Ímã (Nível ${this.coinManager.magnetLevel})\nPreço: ${this.upgradeCosts.magnet}`);
        this.shopTexts['maxHealth'].setText(`Vida Max (Nível ${Math.floor((this.player.maxHealth - config.PLAYER_INITIAL_MAX_HEALTH) / config.UPGRADE_INCREASE_MAX_HEALTH) + 1})\nPreço: ${this.upgradeCosts.maxHealth}`);
        this.shopTexts['damage'].setText(`Dano (Nível ${Math.floor((this.player.damage - config.PLAYER_INITIAL_DAMAGE) / config.UPGRADE_INCREASE_DAMAGE) + 1})\nPreço: ${this.upgradeCosts.damage}`);
    }

    getUpgradeCost(key) {
        return this.upgradeCosts[key];
    }

    // REMOVIDO: Toda a função magnetLogic()
    // Agora é responsabilidade do CoinManager.updateMagnet()

    reset() {
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
        // REMOVIDO: this.scene.events.off('update', this.magnetLogic, this);
        // O evento de update para magnetLogic não é mais escutado.
        // ... limpar outros elementos da UI da loja se necessário
    }
}

export default Shop;