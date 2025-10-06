class Weapon extends Phaser.Events.EventEmitter {
    constructor(scene, player, bulletsGroup, name, configData = {}) {
        super();
        this.scene = scene;
        this.player = player;
        this.bulletsGroup = bulletsGroup; // Pode ser null para armas corpo a corpo
        this.name = name; // Ex: 'Pistola Básica', 'Espada de Ferro'
        this.type = configData.type; // 'pistol' ou 'sword'

        this.damage = configData.damageMultiplier * (this.player ? this.player.damage : 10); // Baseado no player damage
        this.fireRate = configData.fireRateMultiplier * 300; // Ex: 300ms base (para armas que atiram)
        this.attackCooldown = configData.attackCooldownMultiplier * 500; // Ex: 500ms base (para armas corpo a corpo)
        this.bulletSpeed = configData.bulletSpeedMultiplier * 400; // Ex: 400px/s base (para armas que atiram)
        this.color = configData.color || 0xffffff;

        this.lastAttackTime = 0;
    }

    // Método abstrato que as classes filhas devem implementar
    attack(time, pointer) {
        // Implementar nas classes filhas (Pistol, Sword)
        console.warn('Método attack() não implementado na classe filha.');
    }

    // Método para ser chamado quando a arma é equipada
    onEquip() {
        console.log(`${this.name} equipada.`);
    }

    // Método para ser chamado quando a arma é desequipada
    onUnequip() {
        console.log(`${this.name} desequipada.`);
    }
}

export default Weapon;