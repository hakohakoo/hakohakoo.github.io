class Coordinate {
  constructor({ nw, se }) {
    this.nw = nw;
    this.se = se;
    this.center = { x: (se.x + nw.x) / 2, y: (nw.y + se.y) / 2 };
  }

  getCoordinate() {
    return { nw: this.nw, se: this.se, center: this.center };
  }

  setCoordinate({ nw = -1, se = -1, center = -1 } = {}) {
    if (nw !== -1) this.nw = nw;
    if (se !== -1) this.se = se;
    if (center !== -1) this.center = center;
  }
}

export class Ground extends Coordinate {
  constructor({ dom, nw, se, type }) {
    super({ nw, se });
    this.dom = dom;
    this.type = type;
  }
}

export class NPC extends Coordinate {
  constructor({ dom, nw, se, text }) {
    super({ nw, se });
    this.dom = dom;
    this.text = text;
    this.talkedCount = 0;
  }
}

export class Player extends Coordinate {
  static DEF_JUMP_STEP = 3;
  static DEF_HALF_JUMP_STEP = 0;
  static PLAYER_WIDTH = 22;
  static PLAYER_HEIGHT = 22;

  constructor({ dom, bgdom, bgskydom, gdom, tipsdom, collisionProcesser, textProcesser, npcUnits, groundUnits, nw, se, windowdom, audioPlayer }) {
    super({ nw, se });
    this.dom = dom;
    this.gdom = gdom;
    this.bgdom = bgdom;
    this.bgskydom = bgskydom;
    this.tipsdom = tipsdom;
    this.windowdom = windowdom;
    this.audioPlayer = audioPlayer;
    this.npcUnits = npcUnits;
    this.groundUnits = groundUnits;
    this.currJumpStep = Player.DEF_JUMP_STEP;
    this.collisionProcesser = collisionProcesser;
    this.state = 'idle'; // 'jump'
    this.dirction = 'right';
    this.textProcesser = textProcesser;
    this.curNPC = null;
    this.curKey = undefined;

    this.initButton();
  }

  initButton() {
    function refreshStep() {
      if (this.curKey === 'KeyD') {
        this.moveRight(this.groundUnits);
        this.audioPlayer.playById({ id: 'walk', loop: true });
      } else if (this.curKey === 'KeyA') {
        this.moveLeft(this.groundUnits);
        this.audioPlayer.playById({ id: 'walk', loop: true });
      } else {
        this.anime('idle');
        this.audioPlayer.stopById('walk');
      }
      if (this.state === 'jump') {
        this.jump(this.groundUnits);
        this.audioPlayer.stopById('walk');
      }
      this.windowdom.requestAnimationFrame(refreshStep.bind(this));
    }
    this.windowdom.addEventListener('keydown', (e) => {
      if (this.curNPC && e.code === 'KeyE' && !this.textProcesser.isTalk) {
        this.textProcesser.start(this.curNPC);
        this.textProcesser.next();
      } else if (this.textProcesser.isTalk) {
        this.curKey = undefined;
        if (e.code === 'KeyE' || e.code === 'Space') this.textProcesser.next();
      } else if (e.code === 'Space') {
        this.audioPlayer.playById({ id: 'jump' });
        this.state = 'jump';
      } else {
        this.curKey = e.code;
      }
    });
    this.windowdom.addEventListener('keyup', (e) => {
      if (this.curKey === e.code) {
        this.curKey = undefined;
      }
    });
    this.windowdom.requestAnimationFrame(refreshStep.bind(this));
  }

  setCoordinate(nwx, nwy) {
    const gdomWidth = this.gdom.scrollWidth;
    const gdomLeft = Number(this.gdom.style.left.slice(0, this.gdom.style.left.indexOf('p')));
    const bgdomLeft = Number(this.bgdom.style.left.slice(0, this.bgdom.style.left.indexOf('p')));
    const domLeft = Number(this.dom.style.left.slice(0, this.dom.style.left.indexOf('p')));

    if (nwx && this.nw.x !== nwx) {
      if (nwx > this.nw.x) {
        // 更改屏幕显示
        this.dirction = 'right';
        if (domLeft >= 160 && gdomLeft + gdomWidth >= 320) {
          this.gdom.style.left = `${gdomLeft - 2}px`;
          this.bgdom.style.left = `${bgdomLeft - 2}px`;
          this.bgskydom.style = `background-position: ${bgdomLeft / 2}px 0px`;
        } else {
          this.dom.style.left = `${domLeft + 2}px`;
        }
      } else if (nwx < this.nw.x) {
        this.dirction = 'left';
        if (domLeft <= 160 && gdomLeft < 0) {
          this.gdom.style.left = `${gdomLeft + 2}px`;
          this.bgdom.style.left = `${bgdomLeft + 2}px`;
          this.bgskydom.style = `background-position: ${bgdomLeft / 2}px 0px`;
        } else {
          this.dom.style.left = `${domLeft - 2}px`;
        }
      }
      // 更改游戏世界坐标
      this.nw.x = nwx;
      this.se.x = this.nw.x + Player.PLAYER_WIDTH;
      this.center.x = this.nw.x + Player.PLAYER_WIDTH / 2;
      if (this.state !== 'jump') this.anime('run');
    }
    if (nwy && this.nwy !== nwy) {
      this.nw.y = nwy;
      this.se.y = this.nw.y - Player.PLAYER_HEIGHT;
      this.center.y = this.nw.y - Player.PLAYER_HEIGHT / 2;
      this.dom.style.bottom = `${this.se.y}px`;
      this.anime('idle');
    }

    const npc = this.collisionProcesser.checkIntersect({ nw: this.nw, se: this.se, center: this.center }, this.npcUnits);
    this.curNPC = npc;
    if (npc) this.showTips();
    else this.showTips(false);
  }

  showTips(show = true) {
    if (show) {
      const playerLeft = Number(this.dom.style.left.slice(0, this.dom.style.left.indexOf('p')));
      const playerBottom = Number(this.dom.style.bottom.slice(0, this.dom.style.bottom.indexOf('p')));

      this.tipsdom.style.left = `${playerLeft + 8}px`;
      this.tipsdom.style.bottom = `${playerBottom + 35}px`;
      this.tipsdom.style.display = 'block';
    } else {
      if (this.tipsdom.style.display === 'none') return;
      this.tipsdom.style.display = 'none';
    }
  }

  anime(type) {
    if (type === 'idle' &&
      (this.dom.classList.contains('player--idle')) &&
      ((this.dirction === 'left' && this.dom.classList.contains('reverse') ||
        (this.dirction === 'right' && !this.dom.classList.contains('reverse'))))) return;
    if (type === 'run' &&
      (this.dom.classList.contains('player--run')) &&
      ((this.dirction === 'left' && this.dom.classList.contains('reverse') ||
        (this.dirction === 'right' && !this.dom.classList.contains('reverse'))))) return;

    this.dom.classList.remove('reverse', 'player--run', 'player--idle');
    if (type === 'idle') {
      if (this.dirction === 'left') this.dom.classList.add('reverse');
      this.dom.classList.add('player--idle');
    } else if (type === 'run') {
      if (this.dirction === 'left') this.dom.classList.add('reverse');
      this.dom.classList.add('player--run');
    }
  }

  moveRight(checkunits) {
    let nextCoor = {
      nw: { x: this.nw.x, y: this.nw.y - 4 },
      se: { x: this.se.x, y: this.se.y - 4 },
      center: { x: this.center.x, y: this.center.y - 4 },
    }
    const downCollisionUnit = this.collisionProcesser.checkDownCollision(nextCoor, checkunits);

    if (!downCollisionUnit && this.state !== 'jump') {
      this.currJumpStep = Player.DEF_HALF_JUMP_STEP;
      this.state = 'jump';
      this.jump(checkunits);
    }

    nextCoor = {
      nw: { x: this.nw.x + 2, y: this.nw.y },
      se: { x: this.se.x + 2, y: this.se.y },
      center: { x: this.center.x + 2, y: this.center.y },
    }
    const rightCollisionUnit = this.collisionProcesser.checkRightCollision(nextCoor, checkunits);

    this.setCoordinate((rightCollisionUnit) ? (rightCollisionUnit.nw.x - Player.PLAYER_WIDTH) : (this.nw.x + 2));
  }
  moveLeft(checkunits) {
    let nextCoor = {
      nw: { x: this.nw.x, y: this.nw.y - 4 },
      se: { x: this.se.x, y: this.se.y - 4 },
      center: { x: this.center.x, y: this.center.y - 4 },
    }
    const downCollisionUnit = this.collisionProcesser.checkDownCollision(nextCoor, checkunits);

    if (!downCollisionUnit && this.state !== 'jump') {
      this.currJumpStep = Player.DEF_HALF_JUMP_STEP;
      this.state = 'jump';
      this.jump(checkunits);
    }

    nextCoor = {
      nw: { x: this.nw.x - 2, y: this.nw.y },
      se: { x: this.se.x - 2, y: this.se.y },
      center: { x: this.center.x - 2, y: this.center.y },
    }
    const leftCollisionUnit = this.collisionProcesser.checkLeftCollision(nextCoor, checkunits);
    this.setCoordinate((leftCollisionUnit) ? (leftCollisionUnit.se.x) : (this.nw.x - 2));
  }
  jump(checkunits) {
    let nextCoor;
    if (this.currJumpStep > Player.DEF_HALF_JUMP_STEP) {
      nextCoor = {
        nw: { x: this.nw.x, y: this.nw.y + Math.floor(this.currJumpStep ** 2) },
        se: { x: this.se.x, y: this.se.y + Math.floor(this.currJumpStep ** 2) },
        center: { x: this.center.x, y: this.center.y + Math.floor(this.currJumpStep ** 2) },
      }
      const upCollisionUnit = this.collisionProcesser.checkUpCollision(nextCoor, checkunits);
      if (!upCollisionUnit) {
        this.currJumpStep -= 0.2;
        this.setCoordinate(undefined, this.nw.y + Math.floor(this.currJumpStep ** 2));
      } else {
        this.setCoordinate(undefined, upCollisionUnit.se.y);
        this.currJumpStep = 0;
      }
    } else if (this.currJumpStep <= Player.DEF_HALF_JUMP_STEP) {
      nextCoor = {
        nw: { x: this.nw.x, y: this.nw.y - 4 },
        se: { x: this.se.x, y: this.se.y - 4 },
        center: { x: this.center.x, y: this.center.y - 4 },
      }
      const downCollisionUnit = this.collisionProcesser.checkDownCollision(nextCoor, checkunits);

      if (!downCollisionUnit) {
        this.setCoordinate(undefined, this.nw.y - 4);
      } else {
        this.setCoordinate(undefined, downCollisionUnit.nw.y + Player.PLAYER_HEIGHT);
        this.currJumpStep = Player.DEF_JUMP_STEP;
        this.state = 'idle';
      }
    }
  }
}

export class CollisionProcesser {
  constructor() { }

  checkIntersect(spriteCoor, units) {
    let collisionUnit;
    for (let unit of units) {
      const unitCoor = unit.getCoordinate();
      if (Math.abs(spriteCoor.center.x - unitCoor.center.x) <
        (spriteCoor.center.x - spriteCoor.nw.x + unitCoor.center.x - unitCoor.nw.x) &&
        Math.abs(spriteCoor.center.y - unitCoor.center.y) <
        (spriteCoor.center.y - spriteCoor.se.y + unitCoor.center.y - unitCoor.se.y)) { collisionUnit = unit; break; }
    }
    return collisionUnit;
  }
  checkDownCollision(spriteCoor, units) {
    let collisionUnit;
    for (let unit of units) {
      const unitCoor = unit.getCoordinate();
      if (((spriteCoor.nw.x > unitCoor.nw.x && spriteCoor.nw.x < unitCoor.se.x) ||
        (spriteCoor.se.x > unitCoor.nw.x && spriteCoor.se.x < unitCoor.se.x) ||
        (spriteCoor.center.x > unitCoor.nw.x && spriteCoor.center.x < unitCoor.se.x)) &&
        spriteCoor.se.y < unitCoor.nw.y &&
        spriteCoor.se.y > unitCoor.se.y) { collisionUnit = unit; break; }
    }
    return collisionUnit;
  }
  checkUpCollision(spriteCoor, units) {
    let collisionUnit;
    for (let unit of units) {
      if (unit.type === 'board') continue;
      const unitCoor = unit.getCoordinate();
      if (((spriteCoor.nw.x > unitCoor.nw.x && spriteCoor.nw.x < unitCoor.se.x) ||
        (spriteCoor.se.x > unitCoor.nw.x && spriteCoor.se.x < unitCoor.se.x) ||
        (spriteCoor.center.x > unitCoor.nw.x && spriteCoor.center.x < unitCoor.se.x)) &&
        spriteCoor.nw.y < unitCoor.nw.y &&
        spriteCoor.nw.y > unitCoor.se.y) { collisionUnit = unit; break; }
    }
    return collisionUnit;
  }
  checkRightCollision(spriteCoor, units) {
    let collisionUnit;
    for (let unit of units) {
      if (unit.type === 'board') continue;
      const unitCoor = unit.getCoordinate();
      if (((spriteCoor.nw.y < unitCoor.nw.y && spriteCoor.nw.y > unitCoor.se.y) ||
        (spriteCoor.se.y < unitCoor.nw.y && spriteCoor.se.y > unitCoor.se.y) ||
        (spriteCoor.center.y < unitCoor.nw.y && spriteCoor.center.y > unitCoor.se.y)) &&
        spriteCoor.se.x > unitCoor.nw.x &&
        spriteCoor.se.x < unitCoor.se.x) { collisionUnit = unit; break; }
    }
    return collisionUnit;
  }
  checkLeftCollision(spriteCoor, units) {
    let collisionUnit;
    for (let unit of units) {
      if (unit.type === 'board') continue;
      const unitCoor = unit.getCoordinate();
      if (((spriteCoor.nw.y < unitCoor.nw.y && spriteCoor.nw.y > unitCoor.se.y) ||
        (spriteCoor.se.y < unitCoor.nw.y && spriteCoor.se.y > unitCoor.se.y) ||
        (spriteCoor.center.y < unitCoor.nw.y && spriteCoor.center.y > unitCoor.se.y)) &&
        spriteCoor.nw.x > unitCoor.nw.x &&
        spriteCoor.nw.x < unitCoor.se.x) { collisionUnit = unit; break; }
    }
    return collisionUnit;
  }
}

export class AudioPlayer {
  constructor(urls) {
    this.urls = {};
    this.ismuted = true;
    urls.forEach(element => {
      const dom = document.createElement('audio');
      dom.src = element.src;
      dom.preload = 'auto';
      this.urls[element.id] = dom;
    });
  }

  playById({ id, loop, muted }) {
    if (this.urls[id].paused === false || this.ismuted) return;
    this.urls[id].loop = loop;
    this.urls[id].muted = muted;
    this.urls[id].play();
  }

  stopById(id) {
    if (this.urls[id].loop) this.urls[id].loop = false;
  }

  mutedAll() {
    for (let e in this.urls) {
      this.urls[e].muted = true;
    }
    this.ismuted = true;
  }

  unmutedAll() {
    for (let e in this.urls) {
      this.urls[e].muted = false;
    }
    this.ismuted = false;
    this.playById({ id: 'bgm', loop: true });
  }
}

export class TextProcesser {
  constructor({ dom }) {
    this.dom = dom;
    this.isTalk = false;
    this.curText = null;
  }

  start(npc) {
    this.npc = npc;
    this.npcText = npc.text;
    this.isTalk = true;
    this.curText = this.npcText[this.npcText.start[this.npcText.talkedCount]];
    this.dom.innerHTML = '';
  }

  next() {
    if (!this.curText) { this.end(); return; }

    this.dom.style.animation = '';
    this.dom.style.display = 'none';
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.dom.style.animation = 'typing 1s steps(19, end)';
        this.dom.style.display = 'block';
      });
    });

    this.dom.innerHTML = `
      <div class="text-box_content">${this.curText.text}</div>
      <div class="text-box_triangle">▼</div>
    `;
    this.curText = this.npcText[this.curText.next];
  }

  end() {
    if (this.npcText.talkedCount < this.npcText.start.length - 1) this.npcText.talkedCount += 1;
    this.isTalk = false;
    this.curText = null;
    this.dom.innerHTML = '';
  }
}