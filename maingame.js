class Cell { //основной класс
  constructor(id, x, y, state) {
    this.initPos(x, y);
    this.initSpeed();
    this.initHome();
    
    //инициализация:
    this.state = 0; 
    this.alive = true;
    this.id = id;
    this.time = timeNow();
    this.st = states[0];
    this.frame = 0;
    this.teleportated = false;
    this.magnet = null;
    this.magneted = false;
    this.parasitetime = false;
    this.relived = false;
    this.speedc = 1;
    this.food = options.food ?? 0;
    this.type = "cell";
    this.isInfectable();
    this.landscape();
    this.counterAdd(true);
    
    if (state) this.toState(state, true);
  }
  initPos(x, y, z) { //установка позиции
    this.x = x ?? random(options.size-style.size)+(style.size/2);
    this.y = y ?? random(options.size-style.size)+(style.size/2);
    this.z = z ?? 0;
  }
  initSpeed() { //установка скорости
    this.speed = { x: random(options.speed)-(options.speed/2), y: random(options.speed)-(options.speed/2) };
  }
  initHome(full) { //установка "дома"
    if (options.quar && !full) this.home = { minx: Math.max(style.size/2, this.x-options.quar), miny: Math.max(style.size/2, this.y-options.quar), maxx: Math.min(options.size-(style.size/2), this.x+options.quar), maxy: Math.min(options.size-(style.size/2), this.y+options.quar) };
    else this.home = { minx: style.size/2, miny: style.size/2, maxx: options.size-(style.size/2), maxy: options.size-(style.size/2) };
  }
  isInfectable() {
    this.infect = this.st.infect ? this.st.infect-1:this.state;
    this.infectable = this.st.zone && this.st.prob;
  }
  counterAdd(birth) { //обновление счётчика
    if (birth) counter.cells++;
    this.st.count.cells++;
  }
  counterMin(dead) { //обновление счётчика
    if (dead) counter.cells--;
    this.st.count.cells--;
  }
  teleporto(fx, fy, sx, sy, st, size) { //телепортация
    size ??= style.size;
    let trans = this.trans();
    this.frame = frame;
    this.teleportated = { st: st ?? this.st, x: this.x, y: this.y, land: Object.assign({}, this.land), trans: () => trans };
    this.x = testCordMinMax(random(sx-fx)+fx, size);
    this.y = testCordMinMax(random(sy-fy)+fy, size);
    this.landscape();
  }
  lnd(i, c) {
    return this.land.type == i && this.land.pow/(c ?? 1) > rnd();
  }
  isEvent() {
    return this.st.antievent <= rnd();
  }
  toState(state, init) { //метод перехода в другое состояние
    if (this.alive && !(this.state && !init && this.lnd(27))) { //ландшафт "плесень"
      let laststate = this.st;
      this.counterMin();
      
      if (this.st.allone) { //свойство "все за одного"
        this.st.allone = false;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].id != this.id && arr[i].state == this.state) arr[i].toState(state);
        }
        this.st.allone = true;
      }
      
      this.state = state;
      this.time = timeNow();
      this.frame = frame;
      this.st = states[state];
      this.counterAdd();
      
      if (this.st.teleporto && !init) this.teleporto(this.x-this.st.teleporto, this.y-this.st.teleporto, this.x+this.st.teleporto, this.y+this.st.teleporto, laststate); //свойство "телепорт"
      else this.teleportated = false;
      
      if (this.st.rest) { //свойство "отдых"
        this.restend = timeNow()+this.st.rest;
        this.infectable = false;
      } else this.isInfectable();
    }
  }
  timeend() {
    if (rnd() <= this.st.heal) this.toState(this.st.transform == -1 ? Math.floor(random(states.length)):(this.st.transform ?? 0)); //свойство "излечение"
    else this.dead();
  }
  dead() { //метод "смерти"
    if (this.alive) {
      if (this.lnd(11)) this.toState(0); //ландшафт "лагерь"
      else {
        //обновление:
        this.alive = false;
        this.time = timeNow();
        this.frame = frame;
        
        if (!this.st.after) {
          this.infectable = false;
          this.counterMin(true);
        } else { //свойство "инфекция после смерти"
          if (!this.infectable) this.counterMin(true);
        }
        if (this.st.mosquito) { //свойство "москиты"
          for (let i = 0; i < this.st.mosquito; i++)  spec.push(new Mosquito(spec.length, this.x, this.y, this.state));
        }
      }
      if (this.lnd(6)) arr.push(new Rat(arr.length, this.x, this.y)); //ландшафт "свалка"
    }
  }
  lands() { //обработка ландшафтов
    if (this.lnd(1)) this.dead(); //"отравленная зона"
    if (this.lnd(18) && event.dragoned) this.dead(); //"драконья зона"
    if (this.lnd(12, this.st.builder ? 100:1)) this.dead(); //"строительная зона"
    if (this.state && this.lnd(2)) this.toState(0); //"санитарная зона"
    if (this.lnd(7) && this.st.allergy != -1) this.toState(this.st.allergy); //"аллергенная зона"
    if (this.lnd(13)) {
      this.dead();
      arr[this.id] = new Rat(this.id, this.x, this.y, this.state);
    } //"магическая зона"
    if (this.lnd(9) && this.st.waterscary) this.dead(); //"морская зона"
    if (this.lnd(10, 1000)) explosion(); //"взрывоопасная зона"
    if (this.lnd(22) && event.ztime) this.z = event.z; //"трёхмерная зона"
    if (this.lnd(16)) this.teleporto(0, 0, options.size, options.size); //"научная зона"
    if (this.land.type == 26) this.food += this.land.pow*10; //"магазинная зона"
  }
  handler() { //метод обработчика
    if (this.alive) {
      this.lands();
      if (this.st.time && this.time+this.st.time <= timeNow()) this.timeend(); //обработка "срока жизни"
      if (this.st.eats && options.food && this.land.type != 26) this.food -= this.st.eats; //свойство "затраты"
      if (options.food && this.food < 0) this.dead();
    }
    
    if (this.restend && this.restend < timeNow() && this.alive) { //свойство "отдых"
      this.infectable = true;
      this.restend = false;
    }
    
    if (!this.alive && this.infectable && this.st.after+this.time < timeNow()) { //свойство "инфекция после смерти"
      this.infectable = false;
      this.st.count.cells--;
      counter.cells--;
    }
    
    if (!this.alive && this.st.relivetime && this.time+this.st.relivetime < timeNow() && !this.relived) { //свойство "воскрешение"
      if (this.st.reliveprob > rnd()) arr[this.id] = new Cell(this.id, this.x, this.y, this.st.transform == -1 ? Math.floor(random(states.length)):(this.st.transform ?? 0));
      else this.relived = true; //уже пытался "возродиться"
    }
    
    if ((this.infectable || (this.st.magnet && this.st.magnetpow && this.alive) || (this.st.parasite && this.alive) || this.st.scary) && this.frame !== frame) { //проверка "заражения"
      let inzone = 0; //счётчик клеток в зоне заражения
      for (let i = 0; i < arr.length; i++) { //проверка всех клеток
        let p = arr[i];
        if (p.state != this.infect && p.state != this.state && p.alive && (!this.st.group || this.st.group != p.st.group)) { //проверка "не мой ли это друг?"
          if (p.type == "cell" && this.st.magnet && this.st.magnetpow && p.x >= this.x-this.st.magnet && p.x <= this.x+this.st.magnet && p.y >= this.y-this.st.magnet && p.y <= this.y+this.st.magnet) { //свойство "магнит"
            let c = (this.st.magnet-Math.sqrt(((this.x-p.x)**2)+((this.y-p.y)**2)))/this.st.magnet; //расстояние
            p.magnet = p.magnet ?? { x: 0, y: 0 };
            switch (this.st.magnettype ?? 0) { //свойство "тип магнита"
              case 0: //"новый"
                p.magnet.y += p.y < this.y ? this.st.magnetpow*c:-this.st.magnetpow*c;
                p.magnet.x += p.x < this.x ? this.st.magnetpow*c:-this.st.magnetpow*c;
                break;
              case 1: //"только X"
                p.magnet.x += p.x < this.x ? this.st.magnetpow*c:-this.st.magnetpow*c;
                break;
              case 2: //"только Y"
                p.magnet.y += p.y < this.y ? this.st.magnetpow*c:-this.st.magnetpow*c;
                break;
              case 3: //"старый"
                p.magnet.y += p.y < this.y ? this.st.magnetpow:-this.st.magnetpow;
                p.magnet.x += p.x < this.x ? this.st.magnetpow:-this.st.magnetpow;
                break;
              case 4: //"старый X"
                p.magnet.x += p.x < this.x ? this.st.magnetpow:-this.st.magnetpow;
                break;
              case 5: //"старый Y"
                p.magnet.y += p.y < this.y ? this.st.magnetpow:-this.st.magnetpow;
                break;
            }
          }
          if (this.lnd(24) && this.land.x == p.land.x && this.land.y == p.land.y && !p.st.brave && this.st.scary) p.dead(); //ландшафт "жуткая зона" и свойство "страшный"
          if (((this.lnd(3) && p.land.type == 3 && p.type == "cell") /* ландшафт "зона биологической опасности" */ || (this.x-this.st.zone <= p.x && this.x+this.st.zone >= p.x && this.y-this.st.zone <= p.y && this.y+this.st.zone >= p.y)) && ! (this.lnd(14) && p.land.type == 14 && p.type == "cell") /* ландшафт "зона строгого контроля" */ && (this.z == p.z || this.st.thirdmetric || p.type != "cell")/* третье измерение */) { //проверка зоны заражения
            inzone++;
            if (this.st.stopping) p.speedc *= 1-this.st.stopping; //свойство "остановка"
            if (this.infectable) {
              if (rnd() < this.st.prob /* свойство "вероятность" */+(p.st.defect ?? 0 /* свойство "уязвимость" */)+(this.land.type == 5 ? this.land.pow:0 /* ландшафт "зона повышенного заражения */) && (p.st.protect ?? 0 /* свойство "защита" */)-(this.st.spikes ?? 0 /* свойство "шипы" */) < rnd()) { //проверка вероятности заражения
                let killer = Math.max(this.st.killer, (event.wared && this.land.type == 20) ? this.land.pow:0);
                if (rnd() < killer) { //свойство "убийца"
                  p.dead();
                } else {
              	if (!(event.quared && this.isEvent())) {
              	  if (rnd() < p.st.potion) this.dead();
                    if (this.st.magic > rnd()) {
                      p.dead();
                      arr[i] = new Rat(i, p.x, p.y, this.state); //свойство "волшебство"
                    } else p.toState(this.infect);
                  }
                }
                for (let i = 0; i < this.st.farinf; i++) arr[Math.floor(random(arr.length))].toState(this.state); //свойство "дальняя атака"
              } else {
                if (rnd() < this.st.attacktrans && p.state != this.st.transform) { //свойство "переатака"
                  p.toState(this.st.transform == -1 ? Math.floor(random(states.length)):(this.st.transform ?? 0));
                } else {
                  if (rnd() < p.st.cattack) this.toState(p.state); //свойство "контратака"
                }
              }
            }
          }
        }
      }
      if (this.alive && inzone == 0 && this.st.parasite) { //свойство "паразит"
        if (!this.parasitetime) this.parasitetime = timeNow();
      } else {
        this.parasitetime = false;
      }
    }
    
    if (this.st.parasite && this.alive && this.parasitetime && this.parasitetime+this.st.parasite < timeNow()) this.dead(); //свойство "паразит"
  }
  move() { //метод движения
    if (this.alive) {
      if (this.st.crazy/10 > rnd()) this.speed = { x: random(options.speed)-(options.speed/2), y: random(options.speed)-(options.speed/2) }; //свойство "сумасшедший"
      if (this.st.zwalker > rnd()) this.z = Math.floor(random(5))-2; //свойство "странник"
      let c = this.land.type == 4 ? 1-(this.land.pow):(this.land.type == 17 ? this.land.pow+1:1); //ландшафты "пляжная зона" и "ледяная зона"
      
      if (this.st.robber && options.quar) this.initHome(true); //свойство "грабитель"
      let home = Object.assign({}, this.home);
      
      if (!this.st.builder) { //свойство "строитель"
        let px = options.size/landscape.res;
        if (this.land.x != landscape.res-1) {
          if (landscape.type[this.land.x+1][this.land.y] == 12) home.maxx = Math.min(home.maxx, ((this.land.x+1)*px)-(style.size/2));
        }
        if (this.land.x != 0) {
          if (landscape.type[this.land.x-1][this.land.y] == 12) home.minx = Math.max(home.minx, (this.land.x*px)+(style.size/2));
        }
        if (this.land.y != landscape.res-1) {
          if (landscape.type[this.land.x][this.land.y+1] == 12) home.maxy = Math.min(home.maxy, ((this.land.y+1)*px)-(style.size/2));
        }
        if (this.land.y != 0) {
          if (landscape.type[this.land.x][this.land.y-1] == 12) home.miny = Math.max(home.miny, (this.land.y*px)+(style.size/2));
        }
      }
      
      let magnet = this.magnet ?? { x: 0, y: 0 };
      if (this.magnet) this.magneted = true;
      else this.magneted = false;
      
      //движение:
      this.x += (this.speed.x*(this.st.speed ?? 1)*c*this.speedc)+magnet.x;
      this.y += (this.speed.y*(this.st.speed ?? 1)*c*this.speedc)+magnet.y;
      
      //проверка касания края
      if (this.x < home.minx) this.speed.x *=-1, this.x = home.minx;
      if (this.x > home.maxx) this.speed.x *=-1, this.x = home.maxx;
      if (this.y < home.miny) this.speed.y *=-1, this.y = home.miny;
      if (this.y > home.maxy) this.speed.y *=-1, this.y = home.maxy;
      
      this.landscape();
    }
  }
  trans() {
    return (this.st.transparent ? 128:255)*(this.land.type == 21 && !event.showed ? 1-this.land.pow:1)*(this.z == 0 ? 1:0.5);
  }
  fig(size, f) {
    f ??= x => x;
    size ??= 1;
    ctx.fillStyle = (this.st.color) + ahex(f(this.trans()));
    ctx.fillRect(X((this.x-(style.size/2*size))*scale+15), Y((this.y-(style.size/2*size))*scale+15), X(style.size*size*scale), Y(style.size*size*scale));
  }
  render() { //метод отрисовки на холсте
    if (!this.st.invisible) { //свойство "невидимка"
      if (this.alive) {
        if (this.teleportated) { //отрисовка "телепортации"
          if (frame < this.frame+5 && style.anim && this.frame !== false) {
            this.fig.call(this.teleportated, 1, x => 255-(x/5*(frame-this.frame)));
            this.fig(1, x => x/5*(frame-this.frame));
          } else this.fig();
        } else {
          this.fig();
          if (this.magneted && style.anim) this.fig(2, x => x/2); //отрисовка "магнита"
          else {
            if (frame < this.frame+5 && style.chanim && this.frame !== false) this.fig(2, x => x*(5-frame+this.frame)/10); //отрисовка заражения
          }
        }
      } else {
        if (frame < this.frame+15 && style.deadanim) { //отрисовка "смерти"
          let fram = frame-this.frame;
          this.fig(fram/7.5+1, x => x*(15-fram)/15);
        }
      }
    }
  }
  first() { //метод пре-отрисовки (для элементов нижнего слоя)
    if (!this.alive) {
      if (this.infectable) { //отрисовка "инфекции после смерти"
        let fill = (x, y, s, x_, y_, c) => {
          ctx.fillStyle = c;
          ctx.fillRect(X((x_+(style.size*x))*scale+15), Y((y_+(style.size*y))*scale+15), X(s*style.size*scale), Y(s*style.size*scale));
        };
        fill(-0.75, -0.75, 0.6, this.x, this.y, this.st.color + ahex(this.trans()/3*(style.anim ? Math.sin(degToRad(frame*30))+1:1)));
        fill(0.75, -0.75, 1, this.x, this.y, this.st.color + ahex(this.trans()/3*(style.anim ? Math.sin(degToRad(frame*30+180))+1:1)));
        fill(-0.75, 0.75, 1, this.x, this.y, this.st.color + ahex(this.trans()/3*(style.anim ? Math.sin(degToRad(frame*30+180))+1:1)));
        fill(0.75, 0.75, 0.8, this.x, this.y, this.st.color + ahex(this.trans()/3*(style.anim ? Math.sin(degToRad(frame*30))+1:1)));
      } else {
        if (style.dots) { //отрисовка "следов"
          ctx.fillStyle = (style.dots.color == "ill" ? this.st.color:style.dots.color) + ahex(this.trans()-80);
          ctx.fillRect(X(this.x*scale+15-(style.dots.size/2)), Y(this.y*scale+15-(style.dots.size/2)), X(style.dots.size*scale), Y(style.dots.size*scale));
        }
      }
    }
  }
  end() { //метод окончания обработки
    this.magnet = null;
    this.speedc = 1;
  }
  landscape() { //метод проверки ландшафта
    let px = options.size/landscape.res;
    this.land = { x: Math.floor(this.x/px), y: Math.floor(this.y/px) };
    this.land.type = this.st.antiland > rnd() ? 0:landscape.type[this.land.x][this.land.y];
    this.land.pow = landscape.pow[this.land.x][this.land.y];
  }
}

class  Mosquito { //класс "москита"
  constructor(id, x, y, state) {
    this.speed = { x: random(options.mosquitospeed)-(options.mosquitospeed/2), y: random(options.mosquitospeed)-(options.mosquitospeed/2) }; //установка скорости
    //инициализация:
    this.x = x;
    this.y = y;
    this.state = state;
    this.id = id;
    this.alive = true;
    this.st = states[this.state];
    this.time = timeNow();
    this.type = "mosquito";
    this.landscape();
  }
  render() { //метод отрисовки на холсте
    if (this.alive) {
      let x_ = style.anim ? Math.cos(degToRad(frame*30))*style.mosquitosize*1.5:0;
      let y_ = style.anim ? Math.sin(degToRad(frame*30))*style.mosquitosize*1.5:0;
      let trans = this.st.transparent ? 128:255;
      
      ctx.fillStyle = this.st.color + ahex(trans);
      ctx.fillRect(X(testCordMinMax(this.x-(style.mosquitosize/2)+x_, style.mosquitosize)*scale+15), Y(testCordMinMax(this.y-(style.mosquitosize/2)+y_, style.mosquitosize)*scale+15), X(style.mosquitosize*scale), Y(style.mosquitosize*scale));
      ctx.fillStyle = this.st.color + ahex(trans/2);
      ctx.fillRect(X((this.x+x_-style.mosquitosize)*scale+15), Y((this.y-style.mosquitosize+y_)*scale+15), X(style.mosquitosize*2*scale), Y(style.mosquitosize*2*scale)); 
    }
  }
  handler() { //метод обработчика
    if (this.alive) {
      if (this.land.type == 8 && this.land.pow > rnd()) this.alive = false; //ландшафт "охотничья зона"
    
      //проверка заражения:
      for (let i = 0; i < arr.length; i++) { //проверка всех остальных клеток
        let p = arr[i];
        if (p.state != this.state && p.alive && (!this.st.group || this.st.group != p.st.group)) { //прверка "не мой ли это друг?"
          if (this.x - options.mosquitozone <= p.x && this.x + options.mosquitozone >= p.x && this.y - options.mosquitozone <= p.y && this.y + options.mosquitozone >= p.y) { //проверка зоны заражения
            if (rnd() < options.mosquitoprob && (p.st.protect ?? 0 /* свойство "защита" */) < rnd()) { //проверка вероятности
              p.toState(this.state);
            }
          }
        }
      
        if (options.mosquitotime && this.time+options.mosquitotime < timeNow()) this.alive = false; //проверка "срока жизни"
      }
    }
  }
  move() { //метод движения
    if (this.alive) {
      let home = { minx: style.mosquitosize, miny: style.mosquitosize, maxx: options.size-(style.mosquitosize), maxy: options.size-(style.mosquitosize) };
      
      //движение:
      this.x += this.speed.x;
      this.y += this.speed.y;
      
      //проверка касания края:
      if (this.x < home.minx) this.speed.x *=-1, this.x = home.minx;
      if (this.x > home.maxx) this.speed.x *=-1, this.x = home.maxx;
      if (this.y < home.miny) this.speed.y *=-1, this.y = home.miny;
      if (this.y > home.maxy) this.speed.y *=-1, this.y = home.maxy;
      
      this.landscape();
    }
  }
  landscape() { //метод проверки ландшафта
    let px = options.size/landscape.res;
    this.land = { x: Math.floor(this.x/px), y: Math.floor(this.y/px) };
    this.land.type = landscape.type[this.land.x][this.land.y];
    this.land.pow = landscape.pow[this.land.x][this.land.y];
  }
  first() {}
  end() {}
}

class Rat { //класс "крысы"
  lnd = Cell.prototype.lnd;
  isInfectable = Cell.prototype.isInfectable;
  constructor(id, x, y, state) {
    this.initPos(x, y);
    this.initSpeed();
    
    //инициализация:
    this.state = state ?? 0;
    this.id = id;
    this.alive = true;
    this.time = timeNow();
    this.st = states[this.state];
    this.frame = this.state ? 0:false;
    this.type = "rat";
    this.isInfectable();
    this.counterAdd(true);
    this.landscape();
  }
  initPos(x, y) { //установка позиции
    this.x = x ?? random(options.size-style.ratsize)+(style.ratsize/2);
    this.y = y ?? random(options.size-style.ratsize)+(style.ratsize/2);
  }
  initSpeed() { //установка скорости
    this.speed = { x: random(options.ratspeed)-(options.ratspeed/2), y: random(options.ratspeed)-(options.ratspeed/2) };
  }
  counterAdd(birth) { //обновление счётчика
    if (birth) counter.special++;
    this.st.count.special++;
  }
  counterMin(dead) { //обновление счётчика
    if (dead) counter.special--;
    this.st.count.special--;
  }
  isEvent(rats) {
    return rats ?? false;
  }
  teleporto(fx, fy, sx, sy, st) { //телепортация
    Cell.prototype.teleporto.call(this, fx, fy, sx, sy, st, style.ratsize);
  }
  toState(state) { //метод перехода в другое состояние
    if (this.alive) {
      let laststate = this.st;
      this.counterMin();
      
      this.state = state;
      this.time = timeNow();
      this.frame = frame;
      this.st = states[this.state];
      this.infect = this.st.infect ? this.st.infect-1:this.state;
      this.infectable = this.st.prob && this.st.zone;
      this.counterAdd();
    }
  }
  dead() { //метод "смерти"
    if (this.alive) {
      this.alive = false;
      this.time = timeNow();
      this.frame = frame;
      this.infectable = false;
      this.counterMin(true);
    }
  }
  handler() { //метод обработчика
    if (this.lnd(8)) this.dead(); //ландшафт "охотничья зона"
    if (this.alive && this.lnd(15)) {
      this.dead();
      arr[this.id] = new Cell(this.id, this.x, this.y, this.state);
    } //ландшафт "человечья зона"
    
    if (this.infectable && this.frame !== frame) { //проверка заражения
      for (let i = 0; i < arr.length; i++) { //проверка всех клеток
        let p = arr[i];
        if (p.state != this.infect && p.state != this.state && p.alive && p.type != "rat") { //проверка "не мой ли это друг?" и "не крыса ли это?"
          if (this.x-this.st.zone <= p.x && this.x+this.st.zone >= p.x && this.y-this.st.zone <= p.y && this.y+this.st.zone >= p.y) { //проверка зоны заражения
            if (rnd() < this.st.prob && (p.st.protect ?? 0 /* свойство "защита" */) < rnd()) p.toState(this.infect); //проверка вероятности заражения
          }
        }
      }
    }
  }
  move() { //метод движения
    if (this.alive) {
      let home = { minx: style.ratsize/2, miny: style.ratsize/2, maxx: options.size-(style.ratsize/2), maxy: options.size-(style.ratsize/2) };
      
      //движение:
      this.x += this.speed.x;
      this.y += this.speed.y;
      
      //проверка касания края:
      if (this.x < home.minx) this.speed.x *=-1, this.x = home.minx;
      if (this.x > home.maxx) this.speed.x *=-1, this.x = home.maxx;
      if (this.y < home.miny) this.speed.y *=-1, this.y = home.miny;
      if (this.y > home.maxy) this.speed.y *=-1, this.y = home.maxy;
      
      this.landscape();
    }
  }
  trans() {
    return (this.st.transparent ? 128:255);
  }
  fig(size, f, clr) {
    f ??= x => x;
    size ??= 1;
    ctx.fillStyle = (clr ?? this.st.color) + ahex(f(this.trans()));
    ctx.beginPath();
    ctx.moveTo(X((this.x-(style.ratsize*size/2))*scale+15), Y((this.y+(style.ratsize*size/2))*scale+15));
    ctx.lineTo(X((this.x+(style.ratsize*size/2))*scale+15), Y((this.y+(style.ratsize*size/2))*scale+15));
    ctx.lineTo(X(this.x*scale+15), Y((this.y-(style.ratsize*size/2))*scale+15));
    ctx.closePath();
    ctx.fill();
  }
  render() { //метод отрисовки на холсте
    if (!this.st.invisible) { //свойство "невидимка"
      if (this.alive) {
        this.fig();
        if (frame < this.frame+5 && style.chanim && this.frame !== false) this.fig(2, x => x*(5-frame+this.frame)/10); //отрисовка перехода в другое состояние
      } else {
        if (frame < this.frame+15 && style.deadanim) { //отрисовка "смерти"
          let fram = frame-this.frame;
          this.fig(fram/7.5+1, x => x*(15-fram)/15);
        }
      }
    }
  }
  landscape() { //метод проверки ландшафта
    let px = options.size/landscape.res;
    this.land = { x: Math.floor(this.x/px), y: Math.floor(this.y/px) };
    this.land.type = landscape.type[this.land.x][this.land.y];
    this.land.pow = landscape.pow[this.land.x][this.land.y];
  }
  first() {}
  end() {}
}

class Ball extends Rat {
  constructor(id, x, y, state) {
    super(id, x, y, state);
    this.type = "ball";
  }
  teleporto(fx, fy, sx, sy, st) { //телепортация
    Cell.prototype.teleporto.call(this, fx, fy, sx, sy, st, style.ballsize);
  }
  toState(state) {
    super.toState(state);
    if (this.alive) {
      this.speed.x += -gravitation.x*10;
      this.speed.y += -gravitation.y*10;
    }
  }
  move() { //метод движения
    if (this.alive) {
      let home = { minx: style.ballsize/2, miny: style.ballsize/2, maxx: options.size-(style.ballsize/2), maxy: options.size-(style.ballsize/2) };
      
      //движение:
      this.speed.x += gravitation.x;
      this.speed.y += gravitation.y;
      this.x += this.speed.x;
      this.y += this.speed.y;
      
      //проверка касания края:
      if (this.x < home.minx) this.speed.x *=-options.balljump*(1-rnd()*(options.ballrnd ?? 0.1)), this.x = home.minx;
      if (this.x > home.maxx) this.speed.x *=-options.balljump*(1-rnd()*(options.ballrnd ?? 0.1)), this.x = home.maxx;
      if (this.y < home.miny) this.speed.y *=-options.balljump*(1-rnd()*(options.ballrnd ?? 0.1)), this.y = home.miny;
      if (this.y > home.maxy) this.speed.y *=-options.balljump*(1-rnd()*(options.ballrnd ?? 0.1)), this.y = home.maxy;
      
      this.landscape();
    }
  }
  fig(size, f) {
    f ??= x => x;
    size ??= 1;
    ctx.fillStyle = (this.st.color) + ahex(f(this.trans()));
    ctx.beginPath();
    ctx.arc(X(this.x*scale+15), Y(this.y*scale+15), X(size*style.ballsize/2), 0, Math.PI*2);
    ctx.fill();
  }
}

class Robot { //класс робота
  constructor(id, x, y) {
    //инициализация:
    this.x = x;
    this.y = y;
    this.speed = { x: options.botspeed*(random(options.botspeed*2)-options.botspeed), y: options.botspeed*(random(options.botspeed*2)-options.botspeed) };
    this.id = id;
    this.time = timeNow();
    this.frame = false;
    this.alive = true;
    this.type = "robot";
    this.home = { minx: style.botsize/2, miny: style.botsize/2, maxx: options.size-(style.botsize/2), maxy: options.size-(style.botsize/2) };
  }
  dead() { //метод "смерти"
    if (this.alive) {
      this.alive = false;
      this.time = timeNow();
      this.frame = frame;
    }
  }
  handler() { //метод обработчика
    if (this.alive) {
      if (options.bottime && this.time+options.bottime < timeNow()) this.dead(); //проверка "срока поломки"
      
      for (let i = 0; i < arr.length; i++) { //проверка других клеток
        let p = arr[i];
        if (p.x <= this.x+options.botzone && p.x >= this.x-options.botzone && p.y <= this.y+options.botzone && p.y >= this.y-options.botzone) { //проверка зоны
          if (rnd() < options.botprob && rnd() >= (p.st.protect ?? 0)) p.dead();
        }
      }
    }
  }
  move() { //метод движения
    if (this.alive) {
      //движение:
      this.x += this.speed.x;
      this.y += this.speed.y;
      
      //проверка касания края:
      if (this.x < this.home.minx) this.speed.x *=-1, this.x = this.home.minx;
      if (this.x > this.home.maxx) this.speed.x *=-1, this.x = this.home.maxx;
      if (this.y < this.home.miny) this.speed.y *=-1, this.y = this.home.miny;
      if (this.y > this.home.maxy) this.speed.y *=-1, this.y = this.home.maxy;
    }
  }
  fig(size, a) {
    size ??= 1;
    ctx.fillStyle = (style.botcolor) + ahex(a ?? 255);
    ctx.beginPath();
    ctx.moveTo(X(this.x*scale+15), Y((this.y-style.botsize/2*size)*scale+15));
    ctx.lineTo(X((this.x+style.botsize/2*size)*scale+15), Y(this.y*scale+15));
    ctx.lineTo(X(this.x*scale+15), Y((this.y+style.botsize/2*size)*scale+15));
    ctx.lineTo(X((this.x-style.botsize/2*size)*scale+15), Y(this.y*scale+15));
    ctx.closePath();
    ctx.fill();
  }
  render() { //метод отрисовки
    if (this.alive) {
      this.fig();
    } else {
      if (frame < this.frame+15 && style.deadanim) { //отрисовка "смерти"
        let fram = frame-this.frame;
        this.fig(fram/7.5+1, 255-(fram*17));
      }
    }
  }
  first() {} //метод пре-отрисовки (пока не нужен)
  end() {}  //метод конца обработки (пока не нужен)
}

class Cat extends Robot {
  constructor(id, x, y) {
    super(id, x, y);
    this.type = "cat";
    this.home = { minx: style.catsize/2, miny: style.catsize/2, maxx: options.size-(style.catsize/2), maxy: options.size-(style.catsize/2) };
  }
  fig(size, a) {
    size ??= 1;
    ctx.fillStyle = (style.catcolor) + ahex(a ?? 255);
    ctx.beginPath();
    ctx.moveTo(X(this.x*scale+15), Y((this.y-style.catsize/2*size)*scale+15));
    ctx.lineTo(X((this.x+style.catsize/2*size)*scale+15), Y(this.y*scale+15));
    ctx.lineTo(X(this.x*scale+15), Y((this.y+style.catsize/2*size)*scale+15));
    ctx.lineTo(X((this.x-style.catsize/2*size)*scale+15), Y(this.y*scale+15));
    ctx.closePath();
    ctx.fill();
  }
  handler() { //метод обработчика
    if (this.alive) {
      for (let i = 0; i < arr.length; i++) { //проверка других клеток
        let p = arr[i];
        if (p.x <= this.x+options.catzone && p.x >= this.x-options.catzone && p.y <= this.y+options.catzone && p.y >= this.y-options.catzone && p.type == "rat") { //проверка зоны
          if (rnd() < options.catprob && rnd() >= (p.st.protect ?? 0)) p.dead();
        }
      }
    }
  }
}

function frame_() { //метод обработки и отрисовки кадра
  if (options.record) {
    for (let i = 0; i < options.count; i++) {
      record_byte(arr[i].state);
      record_int(arr[i].x);
      record_int(arr[i].y);
      record_byte(Math.min(frame-arr[i].frame, 255));
    }
  }
  if (counter.cells+counter.special > 0 || !options.stop) {
    let FPS = Math.floor(10000/(performance.now()-lastTime))/10;
    let start = performance.now();
    lastTime = performance.now();
    
    if (!pause) { //запись счётчиков в "архив"
      let counts_ = [];
      for (let i = 0; i < states.length; i++) {
        counts_[i] = states[i].count.cells+states[i].count.special;
      }
      counts.sum = counter.cells+counter.special;
      counts.push(counts_);
    }
    
    clear(); //очистка холста
    
    //отрисовка ландшафтов:
    let px = 420/landscape.res;
    for (let x = 0, d = 0; x < landscape.res; x++) {
      for (let y = 0; y < landscape.res; y++) {
        let type = landscape.type[x][y], pow = landscape.pow[x][y];
        if (type == 18 && event.dragoned) { //ландшафт "драконья зона"
          const k = 0.1;
          let f = event.dragonfire[d];
          ctx.fillStyle = "#a08000" + ahex(f.now);
          ctx.fillRect(X(x*px+15), Y(y*px+15), X(px), Y(px));
          if (!pause && style.anim) { //анимация "огня"
            if (frame%5 == 0) f.next = random(192)+63;
            f.now = Math.floor(f.now+(f.next-f.now)*k);
          }
          d++;
        } else {
          ctx.fillStyle = lands[type] + ahex(type ? pow*120:0);
          ctx.fillRect(X(x*px+15), Y(y*px+15), X(px), Y(px));
          let h = frame-event.helloweened;
          if (type == 24 && event.helloweened && h < 50) {
            ctx.fillStyle = "#a08000" + ahex((h <= 25 ? 25:50-h)*10);
            ctx.fillRect(X(x*px+15+px*0.20), Y(y*px+15+px*0.4), X(px/5), Y(px/5));
            ctx.fillRect(X(x*px+15+px*0.60), Y(y*px+15+px*0.4), X(px/5), Y(px/5));
          }
        }
      }
    }
    
    if (!pause) {
      for (let i = 0; i < arr.length; i++) arr[i].handler(); //обработка простых клеток
      for (let i = 0; i < spec.length; i++) spec[i].handler(); //обработка спец-клеток
      
      for (let i = 0; i < events.length; i++) { //обработка событий
        let e = events[i];
        if (e.time < 0) {
          let p = -e.time;
          if (e.done < Math.floor(timeNow()/p)) {
        	event[e.type](e);
            e.done = Math.floor(timeNow()/p);
          }
        } else {
          if (!e.done && timeNow() > e.time && e.time) {
            event[e.type](e);
            e.done = true;
          }
        }
      }
      if (event.quared && event.quared < timeNow()) event.quared = false; //событие "карантин"
      if (event.dragoned && event.dragoned < timeNow()) event.dragoned = false; //событие "гнев драконов"
      if (event.wared && event.wared < timeNow()) event.wared = false; //событие "военные действия"
      if (event.ztime && event.ztime < timeNow()) event.ztime = false; //событие "третье измерение"
      if (event.showed && event.showed < timeNow()) { //событие "показ"
        vib(50);
        event.showed = false;
      }
      
      //свойство "добавка":
      for (let i = 0; i < states.length; i++) {
        let ill = states[i];
        if (ill.addtime && ill.addcount && (ill.countadd == 0 || ill.added < ill.countadd)) {
          if (ill.addtime+ill.lastadd < timeNow()) {
            for (let j = 0; j < ill.addcount; j++) {
              arr[Math.floor(random(arr.length))].toState(i);
            }
            ill.lastadd = timeNow();
            ill.added++;
          }
        }
      }
    }
    
    for (let i = 0; i < arr.length; i++) arr[i].first(); //отрисовка нижнего планапростых клеток
    for (let i = 0; i < spec.length; i++) spec[i].first(); //отрисовка нижнего плана спец-клеток
    for (let i = 0; i < arr.length; i++) arr[i].render(); //отрисовка крыс и простых клеток
    for (let i = 0; i < spec.length; i++) spec[i].render(); //отрисовка спец-клеток
    
    if (!pause) {
      for (let i = 0; i < arr.length; i++) arr[i].move(); //движение простых клеток
      for (let i = 0; i < spec.length; i++) spec[i].move(); //движение спец-клеток
      for (let i = 0; i < arr.length; i++) arr[i].end(); //конец обработки простых клеток
      for (let i = 0; i < spec.length; i++) spec[i].end(); //конец обработки спец-клеток
    }
    
    ctx.fillStyle = colors.elements;
    ctx.fillRect(0, 0, X(450), Y(15));
    ctx.fillRect(0, Y(435), X(450), Y(15));
    ctx.fillRect(0, 0, X(15), Y(450));
    ctx.fillRect(X(435), 0, X(15), Y(450));
    ctx.fillStyle = colors.back;
    ctx.fillRect(X(450), 0, X(450), Y(450));
    
    if (!style.onlygame) { //отрисовка статистики
      ctx.shadowBlur = colors.blur ?? 0;
      ctx.font = `${X(18)}px Monospace`;
      ctx.fillStyle = colors.text;
      ctx.fillText(`Время: ${flr(timeNow()/1000)}с`, X(490), Y(style.biggraph ? 260:30));
      ctx.fillText(`FPS: ${flr(FPS) + " x" + (options.showspeed ?? 1)}`, X(490), Y(style.biggraph ? 290:60));
      if (!style.biggraph) ctx.fillText("Статистика:", X(490), Y(120));
      ctx.fillText(`${counter.cells+counter.special}${counter.special > 0 ? ` (${counter.cells})`:""} | сумма`, X(490), Y(style.biggraph ? 350:150));
      sort();
      ctx.shadowBlur = 0;
      
      ctx.font = `${X(Math.min(Math.floor(9/states.length*18), 18))}px Monospace`;
      
      //отрисовка графиков и статистики
      if (style.biggraph) biggraph();
      else {
        ctx.shadowBlur = colors.blur ?? 0;
        for (let i = 0; i < sorted.length; i++) { //отрисовка статистики
          let st = sorted[i];
          ctx.fillStyle = st.color + (st.transparent ? "80":"ff");
          ctx.fillText(`${st.count.cells+st.count.special}${st.count.special ? ` (${st.count.cells})`:""} | ${st.name} ${st.invisible? "(невидим)":""}`, X(490), Y(180+(i*Math.min(Math.floor(9/states.length*30), 30))));
        }
        ctx.shadowBlur = 0;
        
        graph();
      }
    }
    
    if (event.splash && event.splash+10 > frame && style.anim) { //"всплеск событий"
      let fram = (frame-event.splash)/10;
      ctx.fillStyle = event.splashcolor + ahex(255-(fram*255));
      ctx.fillRect(X(15), Y(15), X(420), Y(420));
    }
    
    ctx.fillStyle = colors.elements;
    if (pause) { //отрисовка "паузы"
      //кнопка "продолжить":
      ctx.beginPath();
      ctx.moveTo(X(850), Y(400));
      ctx.lineTo(X(870), Y(415));
      ctx.lineTo(X(850), Y(430));
      ctx.closePath();
      ctx.fill();
      
      //кнопка "заново":
      ctx.fillRect(X(800), Y(400), X(30), Y(30));
      ctx.fillStyle = colors.back;
      ctx.fillRect(X(807), Y(407), X(16), Y(16));
      ctx.fillRect(X(820), Y(415), X(16), Y(20));
      ctx.fillStyle = colors.elements;
      ctx.beginPath();
      ctx.moveTo(X(834), Y(410));
      ctx.lineTo(X(826), Y(420));
      ctx.lineTo(X(818), Y(410));
      ctx.closePath();
      ctx.fill();
      
      //кнопка "полный экран":
      ctx.beginPath();
      ctx.moveTo(X(760), Y(400));
      ctx.lineTo(X(770), Y(400));
      ctx.lineTo(X(760), Y(410));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(790), Y(400));
      ctx.lineTo(X(780), Y(400));
      ctx.lineTo(X(790), Y(410));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(760), Y(430));
      ctx.lineTo(X(770), Y(430));
      ctx.lineTo(X(760), Y(420));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(790), Y(430));
      ctx.lineTo(X(780), Y(430));
      ctx.lineTo(X(790), Y(420));
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(X(770), Y(410), X(10), Y(10));
      
      //кнопка "логи":
      for (let i = 0; i < 4; i++) ctx.fillRect(X(725), Y(400+(i*5)), X(25), Y(2));
      for (let i = 0; i < 2; i++) ctx.fillRect(X(730), Y(420+(i*5)), X(20), Y(2));
      ctx.strokeStyle = colors.elements;
      ctx.lineWidth = X(2);
      ctx.beginPath();
      ctx.moveTo(X(720), Y(420));
      ctx.lineTo(X(725), Y(425));
      ctx.lineTo(X(720), Y(430));
      ctx.stroke();
      
      //кнопка "скриншот":
      ctx.fillRect(X(680), Y(405), X(30), Y(20));
      ctx.fillRect(X(700), Y(400), X(5), Y(5));
      ctx.fillStyle = colors.back;
      ctx.fillRect(X(690), Y(410), X(10), Y(10));
      ctx.fillStyle = colors.elements;
      ctx.fillRect(X(693), Y(413), X(4), Y(4));
    } else {
      ctx.fillRect(X(850), Y(400), X(10), Y(30));
      ctx.fillRect(X(870), Y(400), X(10), Y(30));
      frame++;
    }
    
    let perf = performance.now()-start;
    if (!pause) stats.push({ perf: perf, sum: counter.cells+counter.special });
    
    if (!style.onlygame) { //отрисовка статистики
      ctx.shadowBlur = colors.blur ?? 0;
      ctx.fillStyle = colors.text;
      ctx.font = `${X(18)}px Monospace`;
      ctx.fillText(`Расчёт: ${Math.floor(perf)}мс`, X(490), Y(style.biggraph ? 320:90));
    }
    maxFPS = 1000/(performance.now()-start);
  } else {
    clearInterval(interval);
  }
}
function click(e) { //обоаботчик события 'click'
  let c = cw/900;
  
  //получение координат клика
  let x = (e.pageX-cx)/c;
  let y = (e.pageY-cy)/c;
  
  if (x > 850 && y > 400) { //кнопка "пауза/продолжить"
    vib(50);
    pause = !pause;
  }
  
  if (pause && x > 800 && x < 850 && y > 400) { //кнопка "заново"
    vib(100);
    start();
    pause = false;
  }
  
  if (pause && x > 760 && x < 790 && y > 400) { //кнопка "полный экран"
    vib(100);
    fullScreen(document.documentElement);
  }
  if (pause && x > 720 && x < 750 && y > 400) { //кнопка "логи"
    //генерация логов:
    let fast = { num: Number.POSITIVE_INFINITY };
    let slow = { num: 0 };
    let frames = "";
    for (let j = 0; j < frame; j++) {
      frames += `\nFRAME ${j} (${flr(j/fps)}s):\n${stats[j].sum} | сумма\n`;
      for (let i = 0; i < counts[j].length; i++) {
        frames += `${counts[j][i]} | ${states[i].name}\n`;
      }
      frames += `done in ${flr(stats[j].perf)}ms (maxFPS: ${flr(1000/stats[j].perf)})\n`;
      if (stats[j].perf > slow.num) slow = { num: stats[j].perf, frame: j };
      if (stats[j].perf < fast.num) fast = { num: stats[j].perf, frame: j };
    }
    let logs = `EPIDEMIC_SIMULATOR_4_LOGS:
version = ${version}
name    = ${strnn(obj.name)}
json    = ${strnn(json)}
date    = ${date}
frames  = ${frame} (${flr(frame/fps)}s)
fastest = ${flr(fast.num)}ms (frame: ${fast.frame})
slowest = ${flr(slow.num)}ms (frame: ${slow.frame})
random  = ${randomed}
heals   = ${heals}
${frames}`;
    sessionStorage.setItem("epidemic_simulator_logs", logs);
    open('logs.html');
  }
  if (pause && x > 680 && x < 720 && y > 400) { //кнопка "скриншот"
    let s = document.createElement('canvas');
    let scr = s.getContext('2d');
    s.width = canvas.width;
    s.height = canvas.height;
    scr.putImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), 0, 0);
    scr.fillStyle = colors.back;
    scr.fillRect(X(590), Y(400), X(310), Y(50));
    scr.font = `${X(24)}px Monospace`;
    scr.fillStyle = colors.text;
    scr.fillText("Epidemic Simulator 4", X(590), Y(430));
    let url = s.toDataURL('image/png');
    let a = document.createElement('a');
    a.download = `epidemic_simulator_screenshot_${obj.name}.png`;
    a.href = url;
    a.click();
  } 
  if (!pause && options.healzone && y >= 15 && y <= 435 && x >= 15 && x <= 435) { //"излечение кликом"
    vib(30);
    let x_ = (x-15)/420*options.size;
    let y_ = (y-15)/420*options.size;
    let zone = options.healzone;
    for (let i = 0; i < arr.length; i++) {
      let p = arr[i];
      if (p.y >= y_-zone && p.y <= y_+zone && p.x >= x_-zone && p.x <= x_+zone) {
        if (p.alive) {
          if (options.healto == -2) p.teleporto(x_-zone, y_-zone, x_+zone, y_+zone);
          else { 
            if (options.healto == -1) p.dead();
            else p.toState(options.healto ?? 0);
          }
        }
      }
    }
    heals++;
  }
  if (x > 890 && y < 10) {
    vib(50);
    setTimeout(() => cheat(prompt('', '')), 50);
  }
}
function start() { //метод инициализации
  recorded = [ 0x4d, 0x45, 0x53, 0x52 ];
  if (states.length > 255) options.record = false;
  if (options.record) {
    record_int(options.size);
    record_int(options.count);
    record_byte(states.length);
    for (let i = 0; i < states.length; i++) {
      const c = HEXtoRGB(states[i].color);
      record_byte(c[0]);
      record_byte(c[1]);
      record_byte(c[2]);
      record_byte(states[i].transparent ? 128:255);
    }
  }
  
  let rats = 0, cells = 0, balls = 0;
  
  //установка переменным изначальные значения:
  arr = [];
  counts = [];
  spec = [];
  stats = [];
  events = [];
  frame = 0;
  randomed = 0;
  heals = 0;
  counter = { cells: 0, special: 0 };
  states[0].count = { cells: 0, special: 0 };
  scale = 420/options.size; 
  for (let i = 0; i < obj.events.length; i++) {
    events[i] = Object.assign({}, obj.events[i]);
    if (events[i].time < 0) events[i].done = 0;
    else events[i].done = false;
  }
  Object.assign(gravitation, options.grav ?? { x: 0, y: 3 });
  event.splash = false;
  event.quared = false;
  event.dragoned = false;
  event.ztime = false;
  event.helloweened = false;
  event.showed = false;
  
  //заполнение массивов:
  for (let i = 1, j = 0; i < states.length; i++) {
    let ill = states[i];
    ill.count = { cells: 0, special: 0 };
    ill.lastadd = 0;
    ill.added = 0;
    for (let k = 0; k < ill.initial; k++, j++) {
      let x = null, y = null;
      if (ill.position && ill.position.length > k) x = ill.position[k].x, y = ill.position[k].y;
      arr.push(new Cell(j, x, y, i));
      cells++;
    }
    for (let k = 0; k < ill.ratinit; k++, j++, rats++) arr.push(new Rat(j, null, null, i));
    for (let k = 0; k < ill.ballinit; k++, j++, balls++) arr.push(new Ball(j, null, null, i));
  }
  for (let i = arr.length; cells < options.count; i++, cells++) arr.push(new Cell(i));
  for (let i = arr.length; rats < options.ratcount; i++, rats++) arr.push(new Rat(i));
  for (let i = arr.length; balls < options.ballcount; i++, balls++) arr.push(new Ball(i));
  for (let i = 0; i < options.catcount; i++) spec.push(new Cat(spec.length));
  
  sort();
}

start(); //инициализация

document.addEventListener('click', () => { //стартовый клик
  vib(100);
  date = Date.now();
  music.loop = true;
  if (options.music) music.play();
  interval = setInterval(() => { if (performance.now() >= lastTime+fpsTime) frame_(); }, 1);
  started = true;
  document.addEventListener('click', click);
}, { once: true });
