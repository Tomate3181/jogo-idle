import Pistol from './Pistol.js';
import Sword from './Sword.js';

export class WeaponFactory {
    static weaponVariations = {
        pistol: [
            {
                name: "Pistola Básica",
                description: "Uma pistola padrão.",
                damageMultiplier: 1.0,
                fireRate: 300, // ms
                bulletSpeed: 400, // px/s
                pellets: 1,
                spread: 0,
                color: 0x888888, // Cinza
                icon: 'pistol_basic_icon' // Você precisará de ícones
            },
            {
                name: "Revólver Pesado",
                description: "Lento, mas com grande poder de parada.",
                damageMultiplier: 1.8,
                fireRate: 600,
                bulletSpeed: 500,
                pellets: 1,
                spread: 0,
                color: 0x663300, // Marrom
                icon: 'pistol_heavy_icon'
            },
            {
                name: "Submetralhadora Rápida",
                description: "Baixo dano, alta cadência de tiro.",
                damageMultiplier: 0.6,
                fireRate: 100,
                bulletSpeed: 350,
                pellets: 1,
                spread: 0.1, // Pequena dispersão
                color: 0x444444, // Cinza escuro
                icon: 'pistol_smg_icon'
            },
            {
                name: "Escopeta de Combate",
                description: "Dispara vários projéteis em um cone.",
                damageMultiplier: 0.7, // Dano por pellet
                fireRate: 800,
                bulletSpeed: 300,
                pellets: 5,
                spread: 0.5, // Grande dispersão
                color: 0xBBBBBB, // Cinza claro
                icon: 'pistol_shotgun_icon'
            }
        ],
        sword: [
            {
                name: "Espada Curta",
                description: "Rápida e eficaz a curta distância.",
                damageMultiplier: 1.0,
                attackCooldown: 500, // ms
                attackDistance: 40, // px
                hitboxWidth: 50,
                hitboxHeight: 30,
                hitboxLifetime: 150, // ms
                color: 0xAAAAAA, // Cinza prata
                icon: 'sword_short_icon'
            },
            {
                name: "Espada Longa",
                description: "Mais alcance e dano, mas mais lenta.",
                damageMultiplier: 1.5,
                attackCooldown: 800,
                attackDistance: 60,
                hitboxWidth: 70,
                hitboxHeight: 40,
                hitboxLifetime: 200,
                color: 0x777777, // Cinza
                icon: 'sword_long_icon'
            },
            {
                name: "Adaga Veloz",
                description: "Dano baixo, mas ataque extremamente rápido.",
                damageMultiplier: 0.7,
                attackCooldown: 250,
                attackDistance: 30,
                hitboxWidth: 30,
                hitboxHeight: 20,
                hitboxLifetime: 100,
                color: 0xCCCCCC, // Prata claro
                icon: 'sword_dagger_icon'
            },
            {
                name: "Espadão Pesado",
                description: "Dano massivo, mas com um ataque muito lento.",
                damageMultiplier: 2.5,
                attackCooldown: 1200,
                attackDistance: 80,
                hitboxWidth: 90,
                hitboxHeight: 50,
                hitboxLifetime: 300,
                color: 0x555555, // Cinza escuro
                icon: 'sword_greatsword_icon'
            }
        ]
    };

    static createWeapon(scene, player, bulletsGroup, weaponType, variationConfig) {
        if (!variationConfig) {
            console.error(`Configuração de variação não fornecida para ${weaponType}.`);
            return null;
        }

        switch (weaponType) {
            case 'pistol':
                return new Pistol(scene, player, bulletsGroup, variationConfig.name, variationConfig);
            case 'sword':
                // Para a espada, o 'bulletsGroup' é ignorado, mas mantido para consistência na assinatura
                return new Sword(scene, player, null, variationConfig.name, variationConfig);
            default:
                console.warn(`Tipo de arma desconhecido: ${weaponType}`);
                return null;
        }
    }

    static getWeaponVariations(weaponType) {
        return this.weaponVariations[weaponType] || [];
    }

    static getRandomWeaponVariation(weaponType) {
        const variations = this.getWeaponVariations(weaponType);
        if (variations.length > 0) {
            return Phaser.Math.RND.pick(variations);
        }
        return null;
    }
}