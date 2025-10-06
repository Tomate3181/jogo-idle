export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 100, "GAME OVER", {
        fontSize: "64px",
        fill: "#ff0000",
        fontFamily: "Arial",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const newGameButton = this.add
      .text(width / 2, height / 2, "NEW GAME", {
        fontSize: "32px",
        fill: "#ffffff",
        backgroundColor: "#222",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    const menuButton = this.add
      .text(width / 2, height / 2 + 80, "MENU", {
        fontSize: "32px",
        fill: "#ffffff",
        backgroundColor: "#222",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive();

    newGameButton.on("pointerdown", () => {
      this.scene.start("MainGameScene"); // Reinicia o jogo
    });

    menuButton.on("pointerdown", () => {
      this.scene.start("MenuScene"); // Vai para o menu
    });
  }
}
