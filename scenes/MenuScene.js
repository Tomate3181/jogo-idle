import config from '../config.js';

class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        // Carrega imagens ou fontes do menu, se necessário
        this.load.image('player', 'assets/player.png'); // opcional, só pra exibir
    }

    create() {
        // Fundo simples
        this.cameras.main.setBackgroundColor('#222');

        // Título
        this.add.text(config.GAME_WIDTH / 2, 100, 'IDLE WAVE GAME', {
            fontSize: '48px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Botão "New Game"
        const newGameText = this.add.text(config.GAME_WIDTH / 2, 250, 'New Game', {
            fontSize: '32px',
            color: '#00ff00',
        }).setOrigin(0.5).setInteractive();

        newGameText.on('pointerdown', () => {
            localStorage.removeItem('idleGameSave'); // reseta o save
            this.startGame();
        });

        // Botão "Continue"
        const continueText = this.add.text(config.GAME_WIDTH / 2, 350, 'Continue', {
            fontSize: '32px',
            color: '#00ffff',
        }).setOrigin(0.5).setInteractive();

        continueText.on('pointerdown', () => {
            const save = localStorage.getItem('idleGameSave');
            if (save) {
                this.startGame(true); // passa true pra carregar
            } else {
                // Feedback se não existe save
                this.showMessage('No save found!');
            }
        });

        // Instrução para começar a onda
        this.startInstruction = this.add.text(config.GAME_WIDTH / 2, 500, 'Press ENTER to start wave', {
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);
        this.startInstruction.setVisible(false);

        // Input ENTER
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        this.canStartWave = false; // só vai ficar true após New Game ou Continue
    }

    update() {
        if (this.canStartWave && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.events.emit('start-wave');
        }
    }

    startGame(loadSave = false) {
        this.canStartWave = true;
        this.startInstruction.setVisible(true);

        // Armazena se vai carregar save ou não
        this.loadSave = loadSave;

        // Espera o ENTER para realmente começar a cena
        this.events.once('start-wave', () => {
            this.scene.start('MainGameScene', { loadSave: this.loadSave });
        });
    }

    showMessage(text) {
        if (this.messageText) this.messageText.destroy();
        this.messageText = this.add.text(config.GAME_WIDTH / 2, 400, text, {
            fontSize: '24px',
            color: '#ff0000',
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            if (this.messageText) this.messageText.destroy();
        });
    }
}

export default MenuScene;
