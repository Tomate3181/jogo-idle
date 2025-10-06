import Weapon from './Weapon.js';
import config from '../config.js';

class Pistol extends Weapon {
    constructor(scene, player, bulletsGroup, name, configData) {
        super(scene, player, bulletsGroup, name, configData);
        this.type = 'pistol'; // Sobrescreve o tipo para garantir
        this.fireRate = configData.fireRate || config.PISTOL_FIRERATE; // Pode ser sobrescrito pelas variações
        this.bulletSpeed = configData.bulletSpeed || config.BULLET_SPEED; // Pode ser sobrescrito
        this.bulletLifetime = configData.bulletLifetime || config.BULLET_LIFETIME; // Pode ser sobrescrito

        // Propriedades específicas da pistola
        this.pellets = configData.pellets || 1; // Número de projéteis por tiro (para escopetas, por exemplo)
        this.spread = configData.spread || 0; // Dispersão do tiro em radianos
    }

    attack(time, pointer) {
        if (time > this.lastAttackTime + this.fireRate) {
            this.lastAttackTime = time;

            // Calcula o ângulo para o ponteiro do mouse
            const angleToTarget = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                pointer.worldX,
                pointer.worldY
            );

            for (let i = 0; i < this.pellets; i++) {
                // Adiciona dispersão se houver
                const currentAngle = angleToTarget + (Math.random() - 0.5) * this.spread;

                // Cria o projétil
                const bullet = this.bulletsGroup.create(this.player.x, this.player.y, 'bullet'); // 'bullet' é uma textura que você precisará carregar
                if (!bullet) {
                    console.warn("Could not create bullet. Is 'bullet' texture loaded?");
                    return;
                }

                bullet.setScale(0.05); // Ajuste o tamanho da bala
                bullet.setRotation(currentAngle);
                bullet.setTint(this.color); // Aplica a cor da variação

                this.scene.physics.moveTo(bullet, pointer.worldX, pointer.worldY, this.bulletSpeed);

                // Define o dano da bala
                bullet.damage = this.damage;

                // Configura a destruição da bala após um tempo
                this.scene.time.delayedCall(this.bulletLifetime, () => {
                    if (bullet.active) {
                        bullet.destroy();
                    }
                });
            }

            this.emit('shoot', this.player.x, this.player.y, angleToTarget); // Notifica a cena ou outros sistemas
        }
    }
}

export default Pistol;