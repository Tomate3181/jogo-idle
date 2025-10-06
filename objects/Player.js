import config from '../config.js';

class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, savedData = {}) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.1);

        // O 'body' de física é criado por scene.physics.add.existing(this);
        // AGORA podemos usar this.body.setCollideWorldBounds
        if (this.body) { // Boa prática: verificar se o body existe
            this.body.setCollideWorldBounds(true);
            this.body.setAllowGravity(false); // Player não deve ter gravidade
        }


        // Propriedades do jogador
        this.score = savedData.score !== undefined ? savedData.score : 0;
        this.health = savedData.playerHealth !== undefined ? savedData.playerHealth : config.PLAYER_INITIAL_HEALTH;
        this.maxHealth = savedData.playerMaxHealth !== undefined ? savedData.playerMaxHealth : config.PLAYER_INITIAL_MAX_HEALTH;
        this.damage = savedData.playerDamage !== undefined ? savedData.playerDamage : config.PLAYER_INITIAL_DAMAGE;
        this.speed = savedData.playerSpeed !== undefined ? savedData.playerSpeed : config.PLAYER_INITIAL_SPEED;

        // Níveis de upgrades (armazenados no player, mesmo que comprados na loja)
        this.speedLevel = savedData.speedLevel !== undefined ? savedData.speedLevel : 1;
        this.coinLevel = savedData.coinLevel !== undefined ? savedData.coinLevel : 1;
        this.magnetLevel = savedData.magnetLevel !== undefined ? savedData.magnetLevel : 0; // Ímã é um upgrade

        this.pointsPerCoin = config.COIN_POINTS_VALUE;

        this.lastHitTime = 0; // Cooldown para receber dano

        // Eventos personalizados (para a cena reagir à morte do player)
        this.scene.events.once('shutdown', this.destroy, this);
    }

    // --- Métodos de Atualização ---
    update(keys, pointer, time) {
        this.handleMovement(keys);
        this.handleRotation(pointer);
    }

handleMovement(keys) {
        // Altere 'this.setVelocity(0);' para 'this.body.setVelocity(0);'
        this.body.setVelocity(0); 

        // Altere 'this.setVelocityX(-this.speed);' para 'this.body.setVelocityX(-this.speed);'
        if (keys.left.isDown) this.body.setVelocityX(-this.speed);

        // Altere 'this.setVelocityX(this.speed);' para 'this.body.setVelocityX(this.speed);'
        if (keys.right.isDown) this.body.setVelocityX(this.speed);

        // Altere 'this.setVelocityY(-this.speed);' para 'this.body.setVelocityY(-this.speed);'
        if (keys.up.isDown) this.body.setVelocityY(-this.speed);
        
        // Altere 'this.setVelocityY(this.speed);' para 'this.body.setVelocityY(this.speed);'
        if (keys.down.isDown) this.body.setVelocityY(this.speed);
    }

    handleRotation(pointer) {
        let angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
        this.setRotation(angle);
    }

    // --- Métodos de Interação ---

    // Chamado quando o player "toca" uma moeda
    collectCoin(player, coin) {
        if (!coin.active) return;

        coin.disableBody(true, true);
        this.addScore(this.pointsPerCoin);
    }

    addScore(amount) {
        this.score += amount;
        // A HUD será atualizada externamente pela cena principal
    }

    takeDamageFromEnemy(player, enemy) {
        // 'player' é a instância de Player (this)
        // 'enemy' é a instância do Enemy que causou o dano

        if (!player.lastHitTime) player.lastHitTime = 0; // Garante que a propriedade existe
        
        if (this.scene.time.now > player.lastHitTime + config.PLAYER_HIT_COOLDOWN) {
            player.health -= enemy.damage;
            player.lastHitTime = this.scene.time.now;

            player.setTint(0xff0000);
            this.scene.time.delayedCall(200, () => player.clearTint());

            if (player.health <= 0) {
                player.health = 0; // Garante que a vida não seja negativa
                this.scene.events.emit('player-died'); // Emite um evento para a cena principal
            }
        }
    }

    // --- Métodos de Upgrade ---
    upgradeSpeed(amount, cost) {
        this.speed += amount;
        this.speedLevel++;
    }

    upgradeMaxHealth(amount, cost) {
        this.maxHealth += amount;
        this.health = Math.min(this.health + amount, this.maxHealth); // Cura um pouco ao aumentar a vida
    }

    upgradeDamage(amount, cost) {
        this.damage += amount;
    }
    
    upgradeCoinLevel(amount, cost) {
        // Isso afetará o Collectibles (que não existe mais como classe separada)
        // Então, esta função é mais um registro de nível para o Shop determinar o custo
        this.coinLevel++; 
    }

    upgradeMagnetLevel(amount, cost) {
        this.magnetLevel++;
    }

    // --- Métodos de Reset ---
    reset() {
        this.score = 0;
        this.health = config.PLAYER_INITIAL_HEALTH;
        this.maxHealth = config.PLAYER_INITIAL_MAX_HEALTH;
        this.damage = config.PLAYER_INITIAL_DAMAGE;
        this.speed = config.PLAYER_INITIAL_SPEED;

        this.speedLevel = 1;
        this.coinLevel = 1;
        this.magnetLevel = 0;

        this.lastHitTime = 0;
        this.setPosition(config.GAME_WIDTH / 2 - 100, config.GAME_HEIGHT / 2); // Posição inicial
        this.setVisible(true).setActive(true).clearTint();
        this.body.enable = true;
    }

    destroy() {
        // Limpeza de eventos ou outros recursos quando o objeto é destruído
        this.scene.events.off('shutdown', this.destroy, this);
        super.destroy();
    }
}

export default Player;