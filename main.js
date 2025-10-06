import MainGameScene from './scenes/MainGameScene.js';
import config from './config.js';

const gameConfig = {
    type: Phaser.AUTO,
    width: config.GAME_WIDTH,
    height: config.GAME_HEIGHT,
    parent: 'game-container', // Um ID de div se você quiser encaixar o jogo
    physics: {
        default: 'arcade',
        arcade: {
            // debug: config.DEBUG_MODE, // Ative isso para ver os limites dos corpos de física
            gravity: { y: 0 } // Desativa a gravidade
        }
    },
    scene: [MainGameScene]
};

const game = new Phaser.Game(gameConfig);