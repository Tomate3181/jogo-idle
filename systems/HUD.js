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
        this.weaponTexts = {}; // Para armazenar os textos das armas na HUD

        this.createHUD(savedData);
    }

    createHUD(savedData) {
        // Pontuação
        this.scoreText = this.scene.add.text(16, 16, `Pontos: ${this.player.score}`, { fontSize: '24px', fill: '#fff' });

        // Saúde do jogador
        this.healthText = this.scene.add.text(16, 48, `Vida: ${this.player.health}/${this.player.maxHealth}`, { fontSize: '24px', fill: '#0f0' });

        // Onda
        this.waveText = this.scene.add.text(16, 80, `Onda: ${savedData.currentWave !== undefined ? savedData.currentWave : 0}`, { fontSize: '24px', fill: '#00f' });

        // Display de armas na HUD
        const startX = config.GAME_WIDTH - config.HUD_OFFSET_X;
        const startY = config.GAME_HEIGHT - config.HUD_OFFSET_Y;

        this.weaponNames.forEach((weapon, index) => {
            let bg = this.scene.add.rectangle(startX + 50, startY - index * config.HUD_WEAPON_SPACING_Y, 120, 30, 0x20232a, 0.8);
            bg.setStrokeStyle(2, 0xffffff, 0.3);
            bg.setOrigin(0.5);

            let text = this.scene.add.text(startX + 50, startY - index * config.HUD_WEAPON_SPACING_Y, weapon.toUpperCase(), {
                font: '18px "Arial"',
                fill: weapon.toLowerCase() === this.initialWeaponName.toLowerCase() ? '#FFD700' : '#FFFFFF'
            }).setOrigin(0.5);

            this.weaponTexts[weapon.toLowerCase()] = text;
        });

        // Chame as atualizações iniciais aqui, se não forem feitas pelo player/configManager
        this.updateScore(this.player.score);
        this.updateHealth(this.player.health, this.player.maxHealth);
        this.updateWave(savedData.currentWave !== undefined ? savedData.currentWave : 0);
        this.updateWeaponDisplay(this.initialWeaponName);
    }

    // Método para ser chamado no update da MainGameScene, se necessário
    update() {
        // A HUD pode ser atualizada de forma mais granular por outros sistemas
        // Ou você pode chamar métodos específicos aqui se quiser uma atualização geral em cada frame.
        // Por exemplo, a vida do player pode mudar sem uma ação explícita da HUD, então atualizamos aqui.
        this.updateHealth(this.player.health, this.player.maxHealth);
    }

    updateScore(newScore) {
        this.scoreText.setText(`Pontos: ${newScore}`);
    }

    updateHealth(currentHealth, maxHealth) {
        this.healthText.setText(`Vida: ${currentHealth}/${maxHealth}`);
        // Mudar a cor do texto de vida conforme a porcentagem, por exemplo
        if (currentHealth < maxHealth * 0.2) {
            this.healthText.setColor('#f00'); // Vermelho
        } else if (currentHealth < maxHealth * 0.5) {
            this.healthText.setColor('#ff0'); // Amarelo
        } else {
            this.healthText.setColor('#0f0'); // Verde
        }
    }

    updateWave(newWave) {
        this.waveText.setText(`Onda: ${newWave}`);
    }

    updateWeaponDisplay(currentWeaponName) {
        this.weaponNames.forEach(weapon => {
            if (this.weaponTexts[weapon.toLowerCase()]) {
                this.weaponTexts[weapon.toLowerCase()].setColor(weapon.toLowerCase() === currentWeaponName.toLowerCase() ? '#FFD700' : '#FFFFFF');
            }
        });
    }

    // Resetar HUD para o estado inicial (Game Over)
    reset() {
        this.updateScore(0);
        this.updateHealth(config.PLAYER_INITIAL_HEALTH, config.PLAYER_INITIAL_MAX_HEALTH);
        this.updateWave(0);
        this.updateWeaponDisplay(this.initialWeaponName);
    }
}

export default HUD;