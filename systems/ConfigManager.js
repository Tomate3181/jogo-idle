import config from '../config.js';
import Enemy from '../objects/Enemy.js';
import { WeaponFactory } from '../weapons/WeaponFactory.js';

class ConfigManager {
    constructor(scene, player, enemiesGroup, hud, savedData = {}) {
        this.scene = scene;
        this.player = player; // Pode ser null inicialmente
        this.enemiesGroup = enemiesGroup; // Pode ser null inicialmente
        this.hud = hud; // Pode ser null inicialmente
        this.enemyBulletsGroup = null; // Precisa de uma referência ao grupo de balas inimigas

        this.currentWave = savedData.currentWave !== undefined ? savedData.currentWave : 0;
        this.currentWorld = savedData.currentWorld !== undefined ? savedData.currentWorld : 1;
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

        if (savedData.currentWave) {
            this.recalculateEnemyAttributesForLoadedState();
        }

        // Os timers só devem ser iniciados APÓS init() ser chamado e player/hud existirem
        // Portanto, remova as chamadas aqui.
        // this.startWaveTimer();
        // this.startEnemySpawnTimer();

        // O listener para enemy-died pode ser adicionado aqui, pois a cena existe.
        this.scene.events.on('enemy-died', this.handleEnemyDeath, this);
    }

    // Novo método init para configurar as referências
    init(player, hud, enemiesGroup, playerBullets, enemyBulletsGroup) {
        this.player = player;
        this.hud = hud;
        this.enemiesGroup = enemiesGroup;
        this.playerBullets = playerBullets; // Referência para as balas do player (se precisar)
        this.enemyBulletsGroup = enemyBulletsGroup; // Referência para as balas dos inimigos

        // Agora que temos as referências, iniciamos os timers
        this.startWaveTimer();
        this.startEnemySpawnTimer();

        // Atualiza a HUD com os dados carregados
        if (this.hud) {
            this.hud.updateWave(this.currentWave);
            this.hud.updateHealth(this.player.health, this.player.maxHealth);
            this.hud.updateScore(this.player.score);
        }
    }

    // --- Métodos de Onda/Mundo ---

    recalculateEnemyAttributesForLoadedState() {
        this.baseEnemyHealth = config.ENEMY_INITIAL_HEALTH;
        this.baseEnemySpeed = config.ENEMY_INITIAL_SPEED;
        this.baseEnemyDamage = config.ENEMY_INITIAL_DAMAGE;
        this.maxEnemiesOnScreen = config.ENEMY_INITIAL_MAX_ON_SCREEN;

        for (let w = 0; w < this.currentWorld; w++) {
            this.baseEnemyHealth += config.WAVE_ENEMY_HEALTH_INCREASE * this.wavesPerWorld;
            this.baseEnemySpeed += config.WAVE_ENEMY_SPEED_INCREASE * this.wavesPerWorld;
            this.baseEnemyDamage += config.WAVE_ENEMY_DAMAGE_INCREASE * this.wavesPerWorld;
            this.maxEnemiesOnScreen += Math.floor(this.wavesPerWorld / config.WAVE_ENEMY_MAX_INCREASE_FREQ) * config.WAVE_ENEMY_MAX_AMOUNT_INCREASE;
        }

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

        if (this.currentWave % this.bossWaveInterval === 0) {
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
        if (!this.enemiesGroup || !this.player) return; // Garante que os grupos e player existem

        if (this.enemiesGroup.getChildren().length < this.maxEnemiesOnScreen && !this.boss) {
            let x = Phaser.Math.Between(50, config.GAME_WIDTH - 250);
            let y = Phaser.Math.Between(50, config.GAME_HEIGHT - 50);

            let enemyType = (this.currentWave >= 2 && Phaser.Math.RND.between(0, 100) < 30) ? 'shooter' : 'contact';

            let newEnemy = new Enemy(this.scene, x, y, 'enemy', enemyType, {
                baseEnemyHealth: this.baseEnemyHealth,
                baseEnemySpeed: this.baseEnemySpeed,
                baseEnemyDamage: this.baseEnemyDamage,
            });
            this.enemiesGroup.add(newEnemy);

            // Se for um atirador, ele precisa do grupo de balas inimigas
            if (enemyType === 'shooter' && this.enemyBulletsGroup) {
                newEnemy.bullets = this.enemyBulletsGroup; // Define o grupo de balas para o inimigo atirador
            }
            // Adiciona o listener para a morte do inimigo diretamente no inimigo
            // Isso evita múltiplos listeners e garante que o evento seja emitido quando o inimigo morre
            newEnemy.on('enemy-died', (enemy) => {
                this.scene.events.emit('enemy-died', enemy); // Repassa para a cena principal escutar
            }, this);
        }
    }

    spawnBoss() {
        if (!this.enemiesGroup || !this.player) return;

        this.enemiesGroup.getChildren().forEach(enemy => enemy.die());

        let x = config.GAME_WIDTH / 2 - 100;
        let y = config.GAME_HEIGHT / 2;

        this.boss = new Enemy(this.scene, x, y, 'enemy', 'shooter', { // Boss é um atirador por padrão?
            baseEnemyHealth: this.baseEnemyHealth * 5,
            baseEnemySpeed: this.baseEnemySpeed * 0.8,
            baseEnemyDamage: this.baseEnemyDamage * 2
        });
        this.boss.setScale(2);
        this.boss.setTint(0x880000);
        this.enemiesGroup.add(this.boss);
        if (this.enemyBulletsGroup) {
            this.boss.bullets = this.enemyBulletsGroup; // Define o grupo de balas para o boss atirador
        }
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

            this.baseEnemyHealth += config.WAVE_ENEMY_HEALTH_INCREASE * this.wavesPerWorld;
            this.baseEnemySpeed += config.WAVE_ENEMY_SPEED_INCREASE * this.wavesPerWorld;
            this.baseEnemyDamage += config.WAVE_ENEMY_DAMAGE_INCREASE * this.wavesPerWorld;
            this.maxEnemiesOnScreen += Math.floor(this.wavesPerWorld / config.WAVE_ENEMY_MAX_INCREASE_FREQ) * config.WAVE_ENEMY_MAX_AMOUNT_INCREASE;

            this.spawnWeaponCrate(enemy.x, enemy.y);
        }
    }

    spawnWeaponCrate(x, y) {
        let crate = this.scene.physics.add.sprite(x, y, 'crate'); // Usa a textura 'crate'
        crate.setImmovable(true);
        crate.setScale(0.5);
        this.dropCrates.add(crate);

        // A colisão do crate com o player é gerenciada na MainGameScene
        console.log("Baú de arma droppado!");
    }

    openCrate(player, crate) {
        if (!crate.active) return;
        crate.destroy();

        const weaponType = Phaser.Math.RND.pick(['pistol', 'sword']);
        const weaponVariation = WeaponFactory.getRandomWeaponVariation(weaponType);

        if (weaponVariation) {
            console.log(`Você encontrou uma ${weaponVariation.name} ${weaponType}!`);
            // Aqui você precisaria de uma forma de adicionar esta nova arma ao inventário do player
            // e/ou permitir que ele a equipe.
            // Por enquanto, vamos apenas logar e considerar que o player 'recebeu'.
            // A MainGameScene precisaria de um método para adicionar novas armas ao inventário
            // e atualizar a HUD.
            this.scene.events.emit('new-weapon-found', weaponVariation); // Emite um evento para a cena principal
        } else {
            console.warn("Não foi possível gerar uma variação de arma.");
        }
    }

    // --- Métodos de Save/Load ---

    saveGame(data) {
        localStorage.setItem('idleGameSave', JSON.stringify(data));
        console.log('Jogo salvo!', data);
    }

    loadGame() {
        const saved = localStorage.getItem('idleGameSave');
        if (saved) {
            console.log('Jogo carregado!', JSON.parse(saved));
            return JSON.parse(saved);
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

        // Reinicia os timers APÓS o reset completo, via init() novamente na cena principal
        // this.startWaveTimer();
        // this.startEnemySpawnTimer();
    }

    destroy() {
        if (this.waveTimerEvent) this.waveTimerEvent.destroy();
        if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
        this.scene.events.off('enemy-died', this.handleEnemyDeath, this);
    }
}

export default ConfigManager;