import config from "../config.js";

class Player extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, savedData = {}) {
    super(scene, x, y, "player");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.1);

    if (this.body) {
      this.body.setCollideWorldBounds(true);
      this.body.setAllowGravity(false);
    }

    // --- Propriedades do jogador ---
    // REMOVIDO: this.score = savedData.score !== undefined ? savedData.score : 0;
    // O score agora é gerenciado pelo CoinManager

    this.health =
      savedData.playerHealth !== undefined
        ? savedData.playerHealth
        : config.PLAYER_INITIAL_HEALTH;
    this.maxHealth =
      savedData.playerMaxHealth !== undefined
        ? savedData.playerMaxHealth
        : config.PLAYER_INITIAL_MAX_HEALTH;
    this.damage =
      savedData.playerDamage !== undefined
        ? savedData.playerDamage
        : config.PLAYER_INITIAL_DAMAGE;
    this.speed =
      savedData.playerSpeed !== undefined
        ? savedData.playerSpeed
        : config.PLAYER_INITIAL_SPEED;

    // --- Níveis de upgrades ---
    // REMOVIDO: this.coinLevel e this.magnetLevel. O CoinManager agora os gerencia.
    // O Player ainda mantém speedLevel, pois speed é uma propriedade diretamente do Player.
    this.speedLevel =
      savedData.speedLevel !== undefined ? savedData.speedLevel : 1;

    // REMOVIDO: this.pointsPerCoin = config.COIN_POINTS_VALUE;

    this.lastHitTime = 0;

    this.scene.events.once("shutdown", this.destroy, this);
  }

  // --- Métodos de Atualização ---
  update(keys, pointer, time) {
    this.handleMovement(keys);
    this.handleRotation(pointer);
  }

  handleMovement(keys) {
    this.body.setVelocity(0);

    if (keys.left.isDown) this.body.setVelocityX(-this.speed);
    if (keys.right.isDown) this.body.setVelocityX(this.speed);
    if (keys.up.isDown) this.body.setVelocityY(-this.speed);
    if (keys.down.isDown) this.body.setVelocityY(this.speed);
  }

  handleRotation(pointer) {
    let angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      pointer.worldX,
      pointer.worldY
    );
    this.setRotation(angle);
  }

  // --- Métodos de Interação ---

  // REMOVIDO: collectCoin(player, coin) e addScore(amount)
  // Essas lógicas agora são totalmente gerenciadas pelo CoinManager.

  takeDamageFromEnemy(player, enemy) {
    if (!player.lastHitTime) player.lastHitTime = 0;

    if (this.scene.time.now > player.lastHitTime + config.PLAYER_HIT_COOLDOWN) {
      player.health -= enemy.damage;
      player.lastHitTime = this.scene.time.now;

      player.setTint(0xff0000);
      this.scene.time.delayedCall(200, () => player.clearTint());

      if (player.health <= 0) {
        player.health = 0;
        this.emit("player-died");
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
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  upgradeDamage(amount, cost) {
    this.damage += amount;
  }

  // REMOVIDO: upgradeCoinLevel(amount, cost) e upgradeMagnetLevel(amount, cost)
  // Esses upgrades agora chamam diretamente os métodos do CoinManager.

  // --- Métodos de Reset ---
  reset() {
    // REMOVIDO: this.score = 0;
    this.health = config.PLAYER_INITIAL_HEALTH;
    this.maxHealth = config.PLAYER_INITIAL_MAX_HEALTH;
    this.damage = config.PLAYER_INITIAL_DAMAGE;
    this.speed = config.PLAYER_INITIAL_SPEED;

    this.speedLevel = 1;
    // REMOVIDO: this.coinLevel = 1;
    // REMOVIDO: this.magnetLevel = 0;

    this.lastHitTime = 0;
    this.setPosition(config.GAME_WIDTH / 2 - 100, config.GAME_HEIGHT / 2);
    this.setVisible(true).setActive(true).clearTint();
    this.body.enable = true;
  }

  destroy() {
    if (this.scene && this.scene.events) {
      this.scene.events.off("shutdown", this.destroy, this);
    }
    super.destroy();
  }
}

export default Player;