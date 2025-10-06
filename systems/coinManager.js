// coinManager.js

// Constantes da área de jogo (podem ser passadas ou globalmente acessíveis)
const GAME_WIDTH = 800;   
const GAME_HEIGHT = 600;
const COLLECT_DISTANCE = 24; // Distância (px) em que a moeda é coletada automaticamente

export default class CoinManager {
    constructor(scene, player, hud) {
        this.scene = scene;
        this.player = player;
        this.hud = hud; // Para atualizar a HUD quando moedas são coletadas

        this.coins = this.scene.physics.add.group();

        // --- Variáveis de Moedas e Ímã ---
        this.score = 0; // O CoinManager vai gerenciar o score principal agora
        this.pointsPerCoin = 5;
        this.maxCoins = 2; // Quantidade máxima de moedas na tela
        this.coinSpawnInterval = 2000; // Intervalo para spawnar novas moedas
        this.magnetLevel = 0; // Nível do upgrade de ímã

        // Configura o spawn contínuo de moedas
        this.scene.time.addEvent({
            delay: this.coinSpawnInterval,
            callback: this.spawnCoins,
            callbackScope: this,
            loop: true
        });

        // Configura a colisão do player com as moedas
        this.scene.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    }

    // Carrega o estado salvo do gerenciador de moedas
    load(data) {
        this.score = data.score ?? 0;
        this.maxCoins = data.maxCoins ?? 2;
        this.magnetLevel = data.magnetLevel ?? 0;
        // Se houver outras variáveis relacionadas a moedas no save, carregue-as aqui
    }

    // Retorna os dados do gerenciador de moedas para salvar
    getSaveData() {
        return {
            score: this.score,
            maxCoins: this.maxCoins,
            magnetLevel: this.magnetLevel
        };
    }

    // --- Spawn de moedas aleatórias ---
    spawnCoins() {
        let currentCoins = this.coins.getChildren().filter(c => c.active).length;
        while (currentCoins < this.maxCoins) {
            let x = Phaser.Math.Between(50, GAME_WIDTH - 50); // Garante que spawnem na área de jogo
            let y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
            let coin = this.coins.create(x, y, 'coin').setScale(0.1);
            coin.setActive(true).setVisible(true);
            
            // Garantia: o body existe e respeita world bounds (vamos optar por travar posição)
            if (coin.body) {
                coin.body.setCollideWorldBounds(false); // Não rebater; vamos clamp manualmente no update
            }

            currentCoins++;
        }
    }

    // --- Coleta de Moedas ---
    collectCoin(player, coin) {
        coin.disableBody(true, true);
        this.score += this.pointsPerCoin;
        this.hud.updateScore(this.score); // Atualiza a pontuação na HUD
        // Não chamamos saveGame aqui, o jogo principal chamará periodicamente ou ao final de uma onda
    }

    // --- Lógica do Ímã (chamada no update da cena principal) ---
    updateMagnet(player) {
        if (this.magnetLevel > 0) {
            const baseMagnetSpeed = 80;
            const baseMagnetRange = 100;
            const magnetSpeed = baseMagnetSpeed + (this.magnetLevel - 1) * 60;
            const magnetRange = baseMagnetRange + (this.magnetLevel - 1) * 80;

            this.coins.getChildren().forEach(coin => {
                if (!coin.active) return;

                const dist = Phaser.Math.Distance.Between(player.x, player.y, coin.x, coin.y);

                if (dist <= magnetRange) {
                    // Puxa a moeda em direção ao player
                    const speedFactor = Phaser.Math.Clamp(1 - (dist / magnetRange), 0.2, 1);
                    const appliedSpeed = magnetSpeed * (0.5 + speedFactor);

                    const cAngle = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y);
                    const vx = Math.cos(cAngle) * appliedSpeed;
                    const vy = Math.sin(cAngle) * appliedSpeed;
                    coin.body.setVelocity(vx, vy);

                    // Coleta se estiver perto o suficiente
                    if (dist <= COLLECT_DISTANCE) {
                        this.collectCoin(player, coin);
                    }
                } else {
                    coin.body.setVelocity(0, 0); // Para a moeda se estiver fora do alcance
                }
                
                // Clampa a posição da moeda dentro da área de jogo
                if (coin.x < 0 || coin.x > GAME_WIDTH || coin.y < 0 || coin.y > GAME_HEIGHT) {
                    coin.x = Phaser.Math.Clamp(coin.x, 16, GAME_WIDTH - 16);
                    coin.y = Phaser.Math.Clamp(coin.y, 16, GAME_HEIGHT - 16);
                    coin.body.setVelocity(0, 0);
                }
            });
        }
    }

    // --- Funções de Upgrade relacionadas a moedas ---
    upgradeMaxCoins() {
        this.maxCoins += 1;
    }

    upgradeMagnet() {
        this.magnetLevel += 1;
    }

    // Getter para pontuação atual
    getScore() {
        return this.score;
    }

    // Setter para pontuação (útil para carregar ou resetar)
    setScore(newScore) {
        this.score = newScore;
        this.hud.updateScore(this.score);
    }
}