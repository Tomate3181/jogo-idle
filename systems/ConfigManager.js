import config from '../config.js';
import Enemy from '../objects/Enemy.js';
import { WeaponFactory } from '../weapons/WeaponFactory.js';

class ConfigManager {
    constructor(scene) { // Remove player, enemiesGroup, hud do construtor
        this.scene = scene;
        this.player = null; // Será definido em init()
        this.enemiesGroup = null; // Será definido em init()
        this.hud = null; // Será definido em init()
        this.playerBullets = null; // Será definido em init()
        this.enemyBulletsGroup = null; // Será definido em init()

        this.currentWave = 0; // Valores padrão, serão sobrescritos se houver save
        this.currentWorld = 1; // Valores padrão, serão sobrescritos se houver save
        this.wavesPerWorld = 10;
        this.bossWaveInterval = 10;

        this.waveTimerEvent = null;
        this.enemySpawnTimer = null;
        this.boss = null;

        this.baseEnemyHealth = config.ENEMY_INITIAL_HEALTH;
        this.baseEnemySpeed = config.ENEMY_INITIAL_SPEED;
        this.baseEnemyDamage = config.ENEMY_INITIAL_DAMAGE;
        this.maxEnemiesOnScreen = config.ENEMY_INITIAL_MAX_ON_SCREEN;

        this.dropCrates = this.scene.physics.add.group();

        // O listener para enemy-died pode ser adicionado aqui, pois a cena existe.
        // O evento 'enemy-died' virá da cena, que é emitido pelo próprio inimigo ou por this.scene.events.emit
        this.scene.events.on('enemy-died', this.handleEnemyDeath, this);
        this.scene.events.on('shutdown', this.destroy, this); // Garante que listeners sejam limpos
    }

    // Novo método init para configurar as referências e iniciar o jogo
    init(player, hud, enemiesGroup, playerBullets, enemyBulletsGroup, savedData = {}) {
        this.player = player;
        this.hud = hud;
        this.enemiesGroup = enemiesGroup;
        this.playerBullets = playerBullets; // Referência para as balas do player (se precisar)
        this.enemyBulletsGroup = enemyBulletsGroup; // Referência para as balas dos inimigos

        // Carrega os dados salvos se existirem
        this.currentWave = savedData.currentWave !== undefined ? savedData.currentWave : 0;
        this.currentWorld = savedData.currentWorld !== undefined ? savedData.currentWorld : 1;
        
        // Recalcula atributos do inimigo APÓS carregar wave/world, se for um jogo salvo
        if (savedData.currentWave) {
            this.recalculateEnemyAttributesForLoadedState();
        } else {
            // Se for um novo jogo, a onda inicial é 0, então chamamos aumento de dificuldade para a primeira onda.
            this.increaseDifficulty();
        }

        // Agora que temos as referências, iniciamos os timers
        this.startWaveTimer();
        this.startEnemySpawnTimer();

        // Atualiza a HUD com os dados carregados ou iniciais
        if (this.hud) {
            this.hud.updateWave(this.currentWave);
            // player.score, health, maxHealth já são atualizados pelo player e coinManager
            // this.hud.updateHealth(this.player.health, this.player.maxHealth);
            // this.hud.updateScore(this.player.score); 
        }
    }

    // --- Métodos de Onda/Mundo ---

    recalculateEnemyAttributesForLoadedState() {
        // Redefine para o estado inicial antes de aplicar os bônus
        this.baseEnemyHealth = config.ENEMY_INITIAL_HEALTH;
        this.baseEnemySpeed = config.ENEMY_INITIAL_SPEED;
        this.baseEnemyDamage = config.ENEMY_INITIAL_DAMAGE;
        this.maxEnemiesOnScreen = config.ENEMY_INITIAL_MAX_ON_SCREEN;
        
        // Aplica o aumento de atributos para cada mundo completo
        for (let w = 0; w < this.currentWorld - 1; w++) { // -1 porque o mundo atual já tem atributos ajustados pelas ondas
            this.baseEnemyHealth += config.WAVE_ENEMY_HEALTH_INCREASE * this.wavesPerWorld;
            this.baseEnemySpeed += config.WAVE_ENEMY_SPEED_INCREASE * this.wavesPerWorld;
            this.baseEnemyDamage += config.WAVE_ENEMY_DAMAGE_INCREASE * this.wavesPerWorld;
            this.maxEnemiesOnScreen += Math.floor(this.wavesPerWorld / config.WAVE_ENEMY_MAX_INCREASE_FREQ) * config.WAVE_ENEMY_MAX_AMOUNT_INCREASE;
        }

        // Aplica o aumento de atributos para as ondas no mundo atual
        for (let i = 0; i < (this.currentWave % this.wavesPerWorld); i++) {
            this.baseEnemyHealth += config.WAVE_ENEMY_HEALTH_INCREASE;
            this.baseEnemySpeed += config.WAVE_ENEMY_SPEED_INCREASE;
            this.baseEnemyDamage += config.WAVE_ENEMY_DAMAGE_INCREASE;
            if (i % config.WAVE_ENEMY_MAX_INCREASE_FREQ === 0) {
                 this.maxEnemiesOnScreen += config.WAVE_ENEMY_MAX_AMOUNT_INCREASE;
            }
        }
    }

    startWaveTimer() {
        if (this.waveTimerEvent) {
            this.waveTimerEvent.destroy();
        }
        this.waveTimerEvent = this.scene.time.addEvent({
            delay: config.WAVE_INTERVAL,
            callback: this.increaseDifficulty,
            callbackScope: this,
            loop: true
        });
        if (this.hud) this.hud.updateWave(this.currentWave);
    }

    startEnemySpawnTimer() {
        if (this.enemySpawnTimer) {
            this.enemySpawnTimer.destroy();
        }
        this.enemySpawnTimer = this.scene.time.addEvent({
            delay: config.ENEMY_SPAWN_INTERVAL,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    increaseDifficulty() {
        this.currentWave++;
        if (this.hud) this.hud.updateWave(this.currentWave);

        this.increaseEnemyAttributes();

        if (this.currentWave > 0 && this.currentWave % this.bossWaveInterval === 0) { // Garante que não spawne boss na onda 0
            this.spawnBoss();
            if (this.enemySpawnTimer) this.enemySpawnTimer.paused = true;
        }

        this.scene.cameras.main.shake(100, 0.005);
    }

    increaseEnemyAttributes() {
        this.baseEnemyHealth += config.WAVE_ENEMY_HEALTH_INCREASE;
        this.baseEnemySpeed += config.WAVE_ENEMY_SPEED_INCREASE;
        this.baseEnemyDamage += config.WAVE_ENEMY_DAMAGE_INCREASE;

        if (this.currentWave % config.WAVE_ENEMY_MAX_INCREASE_FREQ === 0) {
            this.maxEnemiesOnScreen += config.WAVE_ENEMY_MAX_AMOUNT_INCREASE;
        }
    }

    spawnEnemy() {
        if (!this.enemiesGroup || !this.player || this.boss) return; // Não spawna inimigos comuns se o boss estiver ativo

        if (this.enemiesGroup.getChildren().length < this.maxEnemiesOnScreen) {
            let x = Phaser.Math.Between(50, config.GAME_WIDTH - 250);
            let y = Phaser.Math.Between(50, config.GAME_HEIGHT - 50);

            // Evita spawnar perto do player
            let attempts = 0;
            const minSpawnDistance = 150; // Distância mínima do player
            while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minSpawnDistance && attempts < 10) {
                x = Phaser.Math.Between(50, config.GAME_WIDTH - 250);
                y = Phaser.Math.Between(50, config.GAME_HEIGHT - 50);
                attempts++;
            }

            let enemyType = (this.currentWave >= 2 && Phaser.Math.RND.between(0, 100) < 30) ? 'shooter' : 'contact';

            let newEnemy = new Enemy(this.scene, x, y, 'enemy', enemyType, {
                health: this.baseEnemyHealth, // Passa o health, speed e damage como parte das propriedades
                speed: this.baseEnemySpeed,
                damage: this.baseEnemyDamage,
            });
            this.enemiesGroup.add(newEnemy);

            // Se for um atirador, ele precisa do grupo de balas inimigas
            if (enemyType === 'shooter' && this.enemyBulletsGroup) {
                newEnemy.bullets = this.enemyBulletsGroup; // Define o grupo de balas para o inimigo atirador
            }
            // Adiciona o listener para a morte do inimigo diretamente no inimigo
            newEnemy.on('enemy-died', (enemy) => {
                this.scene.events.emit('enemy-died', enemy); // Repassa para a cena principal escutar
            }, this);
        }
    }

    spawnBoss() {
        if (!this.enemiesGroup || !this.player || this.boss) return; // Não spawna um novo boss se já houver um

        // Garante que todos os inimigos existentes sejam limpos antes do boss
        this.enemiesGroup.getChildren().forEach(enemy => enemy.die());

        let x = config.GAME_WIDTH / 2 - 100;
        let y = config.GAME_HEIGHT / 2;

        this.boss = new Enemy(this.scene, x, y, 'enemy', 'shooter', { // Boss é um atirador por padrão?
            health: this.baseEnemyHealth * 5, // Aumenta o health do boss
            speed: this.baseEnemySpeed * 0.8,
            damage: this.baseEnemyDamage * 2
        });
        this.boss.setScale(2);
        this.boss.setTint(0x880000);
        this.enemiesGroup.add(this.boss);
        if (this.enemyBulletsGroup) {
            this.boss.bullets = this.enemyBulletsGroup; // Define o grupo de balas para o boss atirador
        }
        // Adiciona o listener para a morte do boss
        this.boss.on('enemy-died', (enemy) => {
            this.scene.events.emit('enemy-died', enemy); // Repassa para a cena principal escutar
        }, this);

        console.log("BOSS SPAWNADO!");
    }

    handleEnemyDeath(enemy) {
        if (enemy === this.boss) {
            console.log("BOSS DERROTADO! Mundo completo!");
            this.boss = null;
            if (this.enemySpawnTimer) this.enemySpawnTimer.paused = false;

            this.currentWorld++;
            this.currentWave = (this.currentWorld - 1) * this.wavesPerWorld; // Ajusta a onda para o novo mundo
            if (this.hud) this.hud.updateWave(this.currentWave);

            // Aumenta os atributos base para o próximo mundo
            this.baseEnemyHealth += config.WAVE_ENEMY_HEALTH_INCREASE * this.wavesPerWorld;
            this.baseEnemySpeed += config.WAVE_ENEMY_SPEED_INCREASE * this.wavesPerWorld;
            this.baseEnemyDamage += config.WAVE_ENEMY_DAMAGE_INCREASE * this.wavesPerWorld;
            this.maxEnemiesOnScreen += Math.floor(this.wavesPerWorld / config.WAVE_ENEMY_MAX_INCREASE_FREQ) * config.WAVE_ENEMY_MAX_AMOUNT_INCREASE;

            this.spawnWeaponCrate(enemy.x, enemy.y);
        }
    }

    spawnWeaponCrate(x, y) {
        let crate = this.scene.physics.add.sprite(x, y, 'crate');
        crate.setImmovable(true);
        crate.setScale(0.5);
        this.dropCrates.add(crate);

        console.log("Baú de arma droppado!");
    }

    openCrate(player, crate) {
        if (!crate.active) return;
        crate.destroy();

        const weaponType = Phaser.Math.RND.pick(['pistol', 'sword']);
        const weaponVariation = WeaponFactory.getRandomWeaponVariation(weaponType);

        if (weaponVariation) {
            console.log(`Você encontrou uma ${weaponVariation.name} ${weaponType}!`);
            this.scene.events.emit('new-weapon-found', weaponVariation);
        } else {
            console.warn("Não foi possível gerar uma variação de arma.");
        }
    }

    // --- Métodos de Save/Load ---

    saveGame(data) {
        // Inclui os dados do CoinManager aqui (MainGameScene já faz isso ao chamar saveGame)
        localStorage.setItem('idleGameSave', JSON.stringify(data));
        console.log('Jogo salvo!', data);
    }

    loadGame() {
        const saved = localStorage.getItem('idleGameSave');
        if (saved) {
            const parsedData = JSON.parse(saved);
            console.log('Jogo carregado!', parsedData);
            return parsedData;
        }
        return {};
    }

    // --- Métodos de Reset ---

    reset() {
        if (this.waveTimerEvent) this.waveTimerEvent.destroy();
        if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();

        this.currentWave = 0;
        this.currentWorld = 1;
        this.boss = null;
        this.baseEnemyHealth = config.ENEMY_INITIAL_HEALTH;
        this.baseEnemySpeed = config.ENEMY_INITIAL_SPEED;
        this.baseEnemyDamage = config.ENEMY_INITIAL_DAMAGE;
        this.maxEnemiesOnScreen = config.ENEMY_INITIAL_MAX_ON_SCREEN;
        this.dropCrates.clear(true, true);

        // Não reinicia os timers aqui, o init() na cena principal fará isso após um restart.
        // O `init()` será chamado novamente para configurar um novo jogo ou um jogo carregado.
    }

    destroy() {
        if (this.waveTimerEvent) this.waveTimerEvent.destroy();
        if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
        this.scene.events.off('enemy-died', this.handleEnemyDeath, this);
        this.scene.events.off('shutdown', this.destroy, this); // Remove o próprio listener de shutdown
    }
}

export default ConfigManager;