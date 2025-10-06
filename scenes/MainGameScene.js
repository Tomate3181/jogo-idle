import config from "../config.js";
import Player from "../objects/Player.js";
import Enemy from "../objects/Enemy.js";
import Shop from "../systems/Shop.js";
import HUD from "../systems/HUD.js";
import ConfigManager from "../systems/ConfigManager.js";
import { WeaponFactory } from "../weapons/WeaponFactory.js";

class MainGameScene extends Phaser.Scene {
  constructor() {
    super("MainGameScene");
    this.player = null;
    this.enemies = null;
    this.bullets = null;
    this.enemyBullets = null;
    this.shop = null;
    this.hud = null;
    this.configManager = null;
    this.coins = null;

    this.currentWeapon = null;
    this.weapons = {};
    this.playerInventory = {
      pistol: [],
      sword: [],
    };
    this.pointer = null;
    this.keys = null;
    this.loadSave = false;
  }

  preload() {
    this.load.image("player", "assets/player.png");
    this.load.image("coin", "assets/coin.png");
    this.load.image("enemy", "assets/enemy.png");
    this.load.image("crate", "assets/crate.png"); // Caminho correto para o baú
    this.load.image("bullet", "assets/bullet.png"); // Imagem para as balas da pistola
  }

  create() {
    // Inicializa o gerenciador de save/load ANTES de criar outros objetos que dependem dele
    // ConfigManager agora faz o loadGame
    // Passa null para player, enemiesGroup, hud inicialmente, e inicializa com init() depois
    this.configManager = new ConfigManager(this, null, null, null);
    const savedData = this.scene.settings.data?.loadSave
      ? this.configManager.loadGame()
      : {};

    // Grupos de física
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.coins = this.physics.add.group();

    // Player
    this.player = new Player(
      this,
      config.GAME_WIDTH / 2 - 100,
      config.GAME_HEIGHT / 2,
      savedData
    );

    // Configura input do teclado (WASD)
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Armas iniciais do player
    const basicPistol = WeaponFactory.createWeapon(
      this,
      this.player,
      this.bullets,
      "pistol",
      WeaponFactory.getWeaponVariations("pistol")[0]
    );
    const basicSword = WeaponFactory.createWeapon(
      this,
      this.player,
      this.bullets,
      "sword",
      WeaponFactory.getWeaponVariations("sword")[0]
    );

    this.weapons.pistol = basicPistol;
    this.weapons.sword = basicSword;
    this.currentWeapon = this.weapons.pistol;

    this.playerInventory.pistol.push(basicPistol);
    this.playerInventory.sword.push(basicSword);

    // HUD - Agora criada DEPOIS do player e com os dados salvos para a onda
    this.hud = new HUD(
      this,
      this.player,
      ["pistol", "sword"],
      "pistol",
      savedData
    );

    // Shop
    this.shop = new Shop(this, this.player, this.hud, this.coins);

    // Re-inicializa o ConfigManager com o player e hud AGORA que eles existem
    this.configManager.init(
      this.player,
      this.hud,
      this.enemies,
      this.bullets,
      this.enemyBullets
    );

    // Spawn inicial de moedas
    this.spawnInitialCoins();

    // Input para troca de armas
    this.input.keyboard.on("keydown-ONE", () => {
      this.equipWeapon("pistol");
    });
    this.input.keyboard.on("keydown-TWO", () => {
      this.equipWeapon("sword");
    });

    // Pega o ponteiro do mouse
    this.pointer = this.input.activePointer;

    // --- Adição de colisões e overlaps ---
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.player.collectCoin,
      null,
      this.player
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.player.takeDamageFromEnemy,
      null,
      this.player
    );
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.handleBulletHitEnemy,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this.handleEnemyBulletHitPlayer,
      null,
      this
    );

    // Colisão dos baús (ConfigManager criará os baús)
    this.physics.add.overlap(
      this.player,
      this.configManager.dropCrates,
      this.configManager.openCrate,
      null,
      this.configManager
    );

    // Timer para salvar o jogo periodicamente (ConfigManager faz o save)
    this.time.addEvent({
      delay: 5000,
      callback: () =>
        this.configManager.saveGame({
          score: this.player.score,
          speedLevel: this.player.speedLevel,
          coinLevel: this.player.coinLevel,
          magnetLevel: this.player.magnetLevel,
          playerSpeed: this.player.speed,
          maxCoins: this.shop.maxCoinsSpawned,
          upgradeCostSpeed: this.shop.getUpgradeCost("speed"),
          upgradeCostCoins: this.shop.getUpgradeCost("coins"),
          magnetCost: this.shop.getUpgradeCost("magnet"),
          playerHealth: this.player.health,
          playerMaxHealth: this.player.maxHealth,
          playerDamage: this.player.damage,
          currentWave: this.configManager.currentWave,
          currentWorld: this.configManager.currentWorld,
        }),
      loop: true,
    });

    // Escuta o evento de morte do player para reiniciar o jogo
    // A instância do player já emite player-died, então escutamos diretamente nele
    this.player.on("player-died", this.restartGame, this);

    // O ConfigManager já escuta 'enemy-died'. Não precisamos de outro listener aqui.
    // O `forEach` abaixo adicionava múltiplos listeners ao reiniciar a cena.
    // this.enemies.getChildren().forEach(enemy => {
    //     if (!enemy.listenerAdded) {
    //         enemy.on('enemy-died', this.handleEnemyDeath, this);
    //         enemy.listenerAdded = true;
    //     }
    // });

    // Se o debug mode estiver ativado, exibe os bodies de física
    if (config.DEBUG_MODE) {
      this.physics.world.createDebugGraphic();
      this.physics.world.drawDebug = true;
    }
  }

  update(time, delta) {
    // Atualiza o player (movimento, rotação)
    this.player.update(this.keys, this.pointer, time);

    // Lógica do ímã (agora no Shop)
    this.shop.magnetLogic(); // Não precisa passar time e delta aqui, o shop já tem acesso ao time da cena

    // Lógica de ataque do player
    if (this.pointer.isDown && this.currentWeapon) {
      this.currentWeapon.attack(time, this.pointer);
    }

    // Atualiza a HUD (vida, pontuação, onda)
    this.hud.update();
  }

  // --- Métodos Auxiliares ---

  spawnInitialCoins() {
    let currentCoins = this.coins.getChildren().filter((c) => c.active).length;
    while (currentCoins < this.shop.maxCoinsSpawned) {
      let x = Phaser.Math.Between(50, config.GAME_WIDTH - 250);
      let y = Phaser.Math.Between(50, config.GAME_HEIGHT - 50);
      let coin = this.coins.create(x, y, "coin").setScale(0.1);
      coin.setActive(true).setVisible(true);
      if (coin.body) {
        coin.body.setCollideWorldBounds(false);
        coin.body.setCircle(coin.width * 0.5); // Garante que a colisão seja um círculo
      }
      currentCoins++;
    }
  }

  equipWeapon(weaponType) {
    if (this.weapons[weaponType]) {
      this.currentWeapon = this.weapons[weaponType];
      this.hud.updateWeaponDisplay(this.currentWeapon.name);
      console.log(`Arma equipada: ${this.currentWeapon.name}`);
    }
  }

  handleBulletHitEnemy(bullet, enemy) {
    if (bullet.active && enemy.active) {
      bullet.destroy();
      enemy.takeDamage(bullet.damage);
      // O evento 'enemy-died' será emitido pelo próprio inimigo se ele morrer
      if (!enemy.active) {
        // Aumenta a pontuação apenas uma vez por morte
        this.player.addScore(
          config.COIN_POINTS_VALUE * 2 + this.configManager.currentWave * 2
        );
        this.hud.updateScore(this.player.score);
        // ConfigManager já escuta o evento 'enemy-died' para lógica de boss, etc.
        // Mas, se o inimigo morreu, ele mesmo emitirá 'enemy-died' para a cena
        // e o ConfigManager que escuta a cena, vai lidar com isso.
      }
    }
  }

  handleEnemyBulletHitPlayer(player, bullet) {
    if (bullet.active && player.active) {
      bullet.destroy();
      player.takeDamageFromEnemy(player, { damage: bullet.damage });
      this.hud.updateHealth(player.health, player.maxHealth);
    }
  }

  // O método handleEnemyDeath na MainGameScene não é estritamente necessário
  // se o ConfigManager já estiver lidando com a lógica de pontuação e boss
  // ao receber o evento 'enemy-died'.
  // No entanto, se você quiser que a MainGameScene faça algo adicional
  // ao receber este evento, você pode mantê-lo.
  handleEnemyDeath(enemy) {
    // A pontuação já é adicionada em handleBulletHitEnemy
    // ou você pode mover TODA a lógica de pontuação para cá.
    // Por simplicidade, vou manter a pontuação onde está (handleBulletHitEnemy)
    // e deixar o ConfigManager lidar com a lógica de boss.
  }

  restartGame() {
    console.log("Player morreu — indo para Game Over...");
    this.scene.start("GameOverScene");
  }
}

export default MainGameScene;
