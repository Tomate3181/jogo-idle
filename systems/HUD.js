import config from '../config.js';

class HUD {
    constructor(scene, player, weaponNames, initialWeaponName, savedData = {}) {
        this.scene = scene;
        this.player = player;
        this.weaponNames = weaponNames;
        this.initialWeaponName = initialWeaponName;

        this.scoreText = null;
        this.healthText = null;
        this.waveText = null;
        this.weaponTexts = {};
        this.weaponBgs = {}; // Para gradiente e neon

        this.createHUD(savedData);
    }

    createHUD(savedData) {
        // ----------------------
        // Pontuação
        // ----------------------
        this.scoreText = this.scene.add.text(16, 16, `Pontos: ${this.player.score}`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, stroke: true, fill: true }
        });

        // ----------------------
        // Saúde do jogador
        // ----------------------
        this.healthText = this.scene.add.text(16, 56, `Vida: ${this.player.health}/${this.player.maxHealth}`, {
            fontSize: '26px',
            fontFamily: 'Arial',
            fill: '#0f0',
            stroke: '#000',
            strokeThickness: 4
        });

        // ----------------------
        // Onda
        // ----------------------
        this.waveText = this.scene.add.text(16, 96, `Onda: ${savedData.currentWave ?? 0}`, {
            fontSize: '26px',
            fontFamily: 'Arial',
            fill: '#00aaff',
            stroke: '#000',
            strokeThickness: 4
        });

        // ----------------------
        // Armas
        // ----------------------
        const startX = config.GAME_WIDTH - config.HUD_OFFSET_X;
        const startY = config.GAME_HEIGHT - config.HUD_OFFSET_Y;

        this.weaponNames.forEach((weapon, index) => {
            // Fundo com gradiente neon
            let bg = this.scene.add.rectangle(
                startX + 50, 
                startY - index * config.HUD_WEAPON_SPACING_Y, 
                120, 
                30, 
                0x111111, 
                0.8
            );
            bg.setOrigin(0.5);
            bg.setStrokeStyle(2, 0xffffff, 0.3);
            this.weaponBgs[weapon.toLowerCase()] = bg;

            // Texto da arma
            let text = this.scene.add.text(
                startX + 50, 
                startY - index * config.HUD_WEAPON_SPACING_Y, 
                weapon.toUpperCase(), 
                {
                    fontSize: '18px',
                    fontFamily: 'Arial',
                    fill: weapon.toLowerCase() === this.initialWeaponName.toLowerCase() ? '#FFD700' : '#FFFFFF',
                    stroke: '#000',
                    strokeThickness: 2,
                    shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, stroke: true, fill: true }
                }
            ).setOrigin(0.5);

            this.weaponTexts[weapon.toLowerCase()] = text;
        });

        // Atualizações iniciais
        this.updateScore(this.player.score);
        this.updateHealth(this.player.health, this.player.maxHealth);
        this.updateWave(savedData.currentWave ?? 0);
        this.updateWeaponDisplay(this.initialWeaponName);
    }

    update() {
        this.updateHealth(this.player.health, this.player.maxHealth);
    }

    updateScore(newScore) {
        this.scoreText.setText(`Pontos: ${newScore}`);
        // Pequena animação de escala
        this.scene.tweens.add({
            targets: this.scoreText,
            scale: { from: 1.2, to: 1 },
            duration: 200,
            ease: 'Power1'
        });
    }

    updateHealth(currentHealth, maxHealth) {
        this.healthText.setText(`Vida: ${currentHealth}/${maxHealth}`);

        // Gradiente de cor
        const percentage = currentHealth / maxHealth;
        let color;
        if (percentage > 0.5) color = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color(255, 255, 0), // Amarelo
            new Phaser.Display.Color(0, 255, 0),   // Verde
            1, percentage
        );
        else color = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color(255, 0, 0),   // Vermelho
            new Phaser.Display.Color(255, 255, 0), // Amarelo
            1, percentage * 2
        );
        const hex = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
        this.healthText.setColor('#' + hex.toString(16).padStart(6, '0'));
    }

    updateWave(newWave) {
        this.waveText.setText(`Onda: ${newWave}`);
        // Shake leve ao trocar onda
        this.scene.tweens.add({
            targets: this.waveText,
            x: this.waveText.x + 5,
            yoyo: true,
            repeat: 1,
            duration: 100
        });
    }

    updateWeaponDisplay(currentWeaponName) {
        this.weaponNames.forEach(weapon => {
            const lower = weapon.toLowerCase();
            if (this.weaponTexts[lower]) {
                const isCurrent = lower === currentWeaponName.toLowerCase();
                this.weaponTexts[lower].setColor(isCurrent ? '#FFD700' : '#FFFFFF');

                // Neon glow effect
                this.weaponBgs[lower].setFillStyle(isCurrent ? 0xffd700 : 0x20232a, 0.8);
                this.scene.tweens.add({
                    targets: this.weaponBgs[lower],
                    scale: { from: 1.05, to: 1 },
                    duration: 150,
                    ease: 'Power1'
                });
            }
        });
    }

    reset() {
        this.updateScore(0);
        this.updateHealth(config.PLAYER_INITIAL_HEALTH, config.PLAYER_INITIAL_MAX_HEALTH);
        this.updateWave(0);
        this.updateWeaponDisplay(this.initialWeaponName);
    }
}

export default HUD;
    