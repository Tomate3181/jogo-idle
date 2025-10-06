import config from "../config.js";

// Classe base para todos os inimigos
class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene,
    x,
    y,
    texture = "enemy",
    type = "contact",
    savedData = {}
  ) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5);
    if (this.body) {
      // Boa prática: Garante que 'body' existe antes de tentar usá-lo
      this.body.setCollideWorldBounds(true); // Agora está correto, usando o 'body'
    }

    this.type = type; // 'contact' ou 'shooter'
    this.player = scene.player; // Referência ao player para perseguição/mira
    this.bullets = scene.bullets; // Referência ao grupo de projéteis do player (se usar para colisão ou algo)
    this.enemyBullets = scene.enemyBullets; // Referência ao grupo de projéteis dos inimigos (NOVO!)

    // Atributos base do inimigo (escaláveis pela WaveManager)
    this.health =
      savedData.baseEnemyHealth !== undefined
        ? savedData.baseEnemyHealth
        : config.ENEMY_INITIAL_HEALTH;
    this.maxHealth = this.health; // Inimigos não têm maxHealth "variável" como o player
    this.damage =
      savedData.baseEnemyDamage !== undefined
        ? savedData.baseEnemyDamage
        : config.ENEMY_INITIAL_DAMAGE;
    this.speed =
      savedData.baseEnemySpeed !== undefined
        ? savedData.baseEnemySpeed
        : config.ENEMY_INITIAL_SPEED;

    // Propriedades específicas para inimigos atiradores
    if (this.type === "shooter") {
      this.fireRate = 2000; // ms entre tiros
      this.lastShot = 0;
      this.shotSpeed = 150; // Velocidade do projétil do inimigo
      this.fleeDistance = 200; // Distância para começar a fugir do player
    }
  }

  // O Phaser.Physics.Arcade.Group.runChildUpdate(true) chama este método automaticamente
  update(time, delta) {
    if (!this.active || !this.player.active) {
      return;
    }

    // Todos os inimigos miram no player
    let angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.player.x,
      this.player.y
    );
    this.setRotation(angle);

    if (this.type === "contact") {
      this.moveToPlayer();
    } else if (this.type === "shooter") {
      this.handleShooterBehavior(time);
    }
  }

  moveToPlayer() {
    this.scene.physics.moveToObject(this, this.player, this.speed);
  }

  handleShooterBehavior(time) {
    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.player.x,
      this.player.y
    );

    if (distanceToPlayer < this.fleeDistance) {
      // Foge do player
      let angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        this.x,
        this.y
      ); // Ângulo oposto
      this.scene.physics.velocityFromRotation(
        angle,
        this.speed,
        this.body.velocity
      );
    } else {
      // Para de se mover se estiver longe o suficiente para atirar
      this.setVelocity(0);
    }

    // Atira
    if (time > this.lastShot + this.fireRate) {
      this.shoot();
      this.lastShot = time;
    }
  }

  shoot() {
    // Cria um projétil simples do inimigo
    let bullet = this.scene.add.rectangle(this.x, this.y, 6, 3, 0xff8800); // Bala laranja
    this.scene.physics.add.existing(bullet);
    this.enemyBullets.add(bullet); // Adiciona ao grupo correto de balas inimigas
    bullet.body.setAllowGravity(false);
    bullet.damage = this.damage; // Dano do projétil é o dano do inimigo
    bullet.owner = this; // Para evitar que inimigos tomem dano de suas próprias balas

    // Ajusta a velocidade para ir na direção do player
    let angleToPlayer = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.player.x,
      this.player.y
    );
    this.scene.physics.velocityFromRotation(
      angleToPlayer,
      this.shotSpeed,
      bullet.body.velocity
    );

    // Destroi a bala após um tempo ou ao colidir
    this.scene.time.delayedCall(3000, () => {
      if (bullet.active) bullet.destroy();
    });

    // Colisão da bala do inimigo com o player
    this.scene.physics.add.overlap(
      this.player,
      bullet,
      this.handleEnemyBulletHitPlayer,
      null,
      this
    );
  }

  handleEnemyBulletHitPlayer(player, bullet) {
    if (bullet.active) {
      bullet.destroy();
      player.takeDamageFromEnemy(player, { damage: bullet.damage }); // Passa um objeto simples com 'damage'
    }
  }

  takeDamage(amount) {
    this.health -= amount;

    this.setTint(0xff8888); // Feedback visual
    this.scene.time.delayedCall(150, () => this.clearTint());

    if (this.health <= 0) {
      this.die();
    }
  }

die() {
    // Primeiro, desative o corpo de física diretamente, se ele existir
    if (this.body) {
        this.body.enable = false; // Desativa a física para evitar mais colisões
    }
    this.setVisible(false); // Esconde o inimigo imediatamente

    // Emite o evento ANTES de remover do grupo, caso algum listener precise da referência.
    this.scene.events.emit("enemy-died", this);

    // Agora, remova do grupo de inimigos e destrua o objeto.
    // O 'false' para disableChild evita que o grupo tente chamar disableBody novamente,
    // já que fizemos isso manualmente acima.
    // Se a MainGameScene já está gerenciando os inimigos com group.add(newEnemy),
    // então o group.remove(this, true, true) é o mais adequado para limpeza total.
    if (this.scene.enemies) { // Verifique se o grupo existe na cena
        this.scene.enemies.remove(this, true, true); // remove da cena e destrói
    } else {
        // Fallback caso o grupo não esteja acessível (cenário improvável se tudo estiver configurado)
        console.warn("Grupo de inimigos não acessível na morte do inimigo. Destruindo diretamente.");
        this.destroy(); // Destrói o Game Object diretamente
    }
  }

  // --- Métodos de Reset ---
  reset() {
    // Se precisar reiniciar um inimigo específico (menos comum para inimigos que morrem)
    this.health = this.maxHealth;
    this.setActive(true).setVisible(true).clearTint();
    this.body.enable = true;
  }
}

export default Enemy;
