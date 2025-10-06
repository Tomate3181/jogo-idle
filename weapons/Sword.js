import Weapon from './Weapon.js';
import config from '../config.js';

class Sword extends Weapon {
    constructor(scene, player, bulletsGroup, name, configData) {
        super(scene, player, bulletsGroup, name, configData);
        this.type = 'sword'; // Sobrescreve o tipo para garantir
        this.attackCooldown = configData.attackCooldown || config.SWORD_ATTACK_COOLDOWN; // Pode ser sobrescrito
        this.attackDistance = configData.attackDistance || config.SWORD_ATTACK_DISTANCE;
        this.hitboxWidth = configData.hitboxWidth || config.SWORD_HITBOX_WIDTH;
        this.hitboxHeight = configData.hitboxHeight || config.SWORD_HITBOX_HEIGHT;
        this.hitboxLifetime = configData.hitboxLifetime || config.SWORD_HITBOX_LIFETIME;
    }

    attack(time, pointer) {
        if (time > this.lastAttackTime + this.attackCooldown) {
            this.lastAttackTime = time;

            // Calcula a posição do hitbox da espada
            const angleToTarget = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                pointer.worldX,
                pointer.worldY
            );

            // Calcula o offset da hitbox em relação ao player
            const offsetX = Math.cos(angleToTarget) * this.attackDistance;
            const offsetY = Math.sin(angleToTarget) * this.attackDistance;

            const hitboxX = this.player.x + offsetX;
            const hitboxY = this.player.y + offsetY;

            // Cria um hitbox temporário
            const hitbox = this.scene.add.zone(hitboxX, hitboxY, this.hitboxWidth, this.hitboxHeight);
            this.scene.physics.world.enable(hitbox);
            hitbox.body.setAllowGravity(false);
            hitbox.body.moves = false; // O hitbox não se move
            hitbox.damage = this.damage; // Atribui o dano da espada ao hitbox
            hitbox.owner = this.player; // Para evitar que o player se atinja (se aplicável)
            hitbox.setRotation(angleToTarget); // Rotaciona o hitbox

            // Adiciona o hitbox a um grupo temporário (ou o gerencia diretamente)
            // Para simplicidade, vamos usar o grupo de balas para gerenciar a colisão,
            // mas o ideal seria ter um grupo específico para hitboxes de melee
            // ou gerenciar a colisão diretamente aqui.
            // Para este exemplo, vamos adicionar diretamente ao grupo de colisão
            this.scene.physics.add.overlap(hitbox, this.scene.enemies, this.handleSwordHitEnemy, null, this);

            // Feedback visual (opcional)
            // let debugRect = this.scene.add.rectangle(hitboxX, hitboxY, this.hitboxWidth, this.hitboxHeight, this.color, 0.3);
            // debugRect.setRotation(angleToTarget);

            // Destrói o hitbox após um curto período
            this.scene.time.delayedCall(this.hitboxLifetime, () => {
                if (hitbox.active) {
                    hitbox.destroy();
                }
            });

            this.emit('swing', this.player.x, this.player.y, angleToTarget); // Notifica a cena
        }
    }

    handleSwordHitEnemy(hitbox, enemy) {
        if (hitbox.active && enemy.active) {
            enemy.takeDamage(hitbox.damage);
            // Desativa o hitbox para que ele não atinja o mesmo inimigo várias vezes no mesmo ataque
            hitbox.destroy();
        }
    }
}

export default Sword;