import config from "../config.js";
import Player from "../objects/Player.js";
import Enemy from "../objects/Enemy.js";
import Shop from "../systems/Shop.js";
import HUD from "../systems/HUD.js";
import ConfigManager from "../systems/ConfigManager.js";
import { WeaponFactory } from "../weapons/WeaponFactory.js";
import CoinManager from '../systems/coinManager.js';

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
    // this.coins = null; // Remova este, o CoinManager vai gerenciar as moedas

    this.coinManager = null; // Adicione a propriedade para o CoinManager

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
    this.load.image("coin", "assets/coin.png"); // Já está aqui, ótimo!
    this.load.image("enemy", "assets/enemy.png");
    this.load.image("crate", "assets/crate.png");
    this.load.image("bullet", "assets/bullet.png");
  }

  create() {
    // Inicializa o gerenciador de save/load ANTES de criar outros objetos que dependem dele
    this.configManager = new ConfigManager(this, null, null, null);
    const savedData = this.scene.settings.data?.loadSave
      ? this.configManager.loadGame()
      : {};

    // Grupos de física
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    // this.coins = this.physics.add.group(); // Remova esta linha, CoinManager gerenciará o grupo

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

    // --- Inicialização do CoinManager ---
    // Passe a cena, o player e a HUD
    this.coinManager = new CoinManager(this, this.player, this.hud);
    // Se houver dados salvos para o CoinManager, carregue-os
    if (savedData && savedData.coinManager) {
      this.coinManager.load(savedData.coinManager);
      // this.hud.updateScore(this.coinManager.getScore()); // Garante que a HUD reflita o score carregado
    }
    this.hud.updateScore(this.coinManager.getScore());
    // O CoinManager já configura o spawn contínuo em seu construtor
    // e já chama spawnCoins() pela primeira vez no time event.
    // this.coinManager.spawnCoins(); // Opcional: para spawnar algumas moedas imediatamente, sem esperar o primeiro intervalo.

    // Shop
    // O Shop precisará de uma referência ao CoinManager para upgrades de moedas e ímã
    this.shop = new Shop(this, this.player, this.hud, this.coinManager); // Passe o coinManager

    // Re-inicializa o ConfigManager com o player e hud AGORA que eles existem
    this.configManager.init(
      this.player,
      this.hud,
      this.enemies,
      this.bullets,
      this.enemyBullets
    );

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
    // Colisão do player com as moedas (usando o grupo do CoinManager)
    this.physics.add.overlap(
      this.player,
      this.coinManager.coins, // Use o grupo de moedas do CoinManager
      this.coinManager.collectCoin, // O CoinManager tem o método de coleta
      null,
      this.coinManager // O CoinManager é o contexto (this) para collectCoin
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

    // Timer para salvar o jogo periodicamente
    this.time.addEvent({
      delay: 5000,
      callback: () => {
        const coinManagerData = this.coinManager.getSaveData(); // Pega os dados do CoinManager
        this.configManager.saveGame({
          score: this.coinManager.getScore(), // Pega o score do CoinManager
          speedLevel: this.player.speedLevel, // Ainda do player
          // As propriedades abaixo (maxCoins, magnetLevel, upgradeCosts) agora vêm do CoinManager ou do Shop, que as delega ao CoinManager
          coinManager: coinManagerData, // Salva os dados do CoinManager
          playerSpeed: this.player.speed,
          playerHealth: this.player.health,
          playerMaxHealth: this.player.maxHealth,
          playerDamage: this.player.damage,
          currentWave: this.configManager.currentWave,
          currentWorld: this.configManager.currentWorld,
          // shopUpgrades: this.shop.getSaveData() // Se o shop tiver dados a salvar
        });
      },
      loop: true,
    });

    // Escuta o evento de morte do player para reiniciar o jogo
    this.player.on("player-died", this.restartGame, this);

    // Se o debug mode estiver ativado, exibe os bodies de física
    if (config.DEBUG_MODE) {
      this.physics.world.createDebugGraphic();
      this.physics.world.drawDebug = true;
    }
  }

  update(time, delta) {
    // Atualiza o player (movimento, rotação)
    this.player.update(this.keys, this.pointer, time);

    // --- Chame o update do ímã do CoinManager aqui ---
    this.coinManager.updateMagnet(this.player);

    // Lógica de ataque do player
    if (this.pointer.isDown && this.currentWeapon) {
      this.currentWeapon.attack(time, this.pointer);
    }

    // Atualiza a HUD (vida, pontuação, onda)
    this.hud.update();
  }

  // --- Métodos Auxiliares ---

  // spawnInitialCoins() não é mais necessário aqui, o CoinManager cuida disso.
  // Pode ser removido.

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
      if (!enemy.active) {
        // Quando um inimigo morre, adicione moedas
        this.coinManager.setScore(this.coinManager.getScore() + config.COIN_POINTS_VALUE * 2 + this.configManager.currentWave * 2);
        // Não é necessário atualizar a HUD diretamente aqui, o CoinManager já chama hud.updateScore()
        // quando o score é setado ou uma moeda é coletada via collectCoin.
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

  handleEnemyDeath(enemy) {
    // Este método agora é menos crítico, pois o score é atualizado em handleBulletHitEnemy
    // e o ConfigManager lida com a lógica da onda/boss.
  }

  restartGame() {
    console.log("Player morreu — indo para Game Over...");
    this.scene.start("GameOverScene");
  }
}

export default MainGameScene;