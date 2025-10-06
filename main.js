import MenuScene from './scenes/MenuScene.js';
import MainGameScene from './scenes/MainGameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import config from './config.js';

const gameConfig = {
    type: Phaser.AUTO,
    width: config.GAME_WIDTH,
    height: config.GAME_HEIGHT,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: [MenuScene, MainGameScene, GameOverScene]
};

const game = new Phaser.Game(gameConfig);
