import React, { useRef, useEffect } from 'react'
import laserSound from '../sounds/laser.m4a'
import explodeSound from '../sounds/explode.m4a'
import hitSound from '../sounds/hit.m4a'
import musicHigh from '../sounds/music-high.m4a'
import musicLow from '../sounds/music-low.m4a'
import thrustSound from '../sounds/thrust.m4a'

const GameBoard = (props) => {
  const canvasRef = useRef(null)
  //Game variables
  let level, lives, Asteroids, score, highScore, ship, text, textAlpha;
  let TextFadeTime = 2.5; // text fade time in seconds
  let TextSize = 60; // text font height in pixels
  let GameLives = 3; // starting number of lives
  let LgeRoidPts = 20; // points scored for a large asteroid
  let MedRoidPts = 50; // points scored for a medium asteroid
  let SmlRoidPts = 100; // points scored for a small asteroid
  let SaveKeyScore = 'highscore'; //save key for local storage of high score
  const SoundOn = true;
  const MusicOn = true;

  //Ship variables
  let ShipSize = 40;
  let Friction = 0.7;
  let ShipRot = 0;
  let TurnSpeed = 360;// converts rad // turn speed in degrees per second
  let ShipAngle = 90 / 180 * Math.PI;
  let ThrustingSpeed = 5; // acceleration of ship in pixels per second per second
  let Thrusting = false;
  let ShowBounding = false; // show or hide collision bounding
  let ShowCenterDot = false; // show or hide the ships center dot
  let ShipExplodeDur = 0.5; //duration of ships explosion
  let ShipBlinkDur = 0.1; //duration of ships explosion
  let ShipInvDur = 3; //duration of ships explosion
  let ShipBlinkTime = Math.ceil(ShipBlinkDur * 30); //duration of ships explosion
  let ShipBlinkNum = Math.ceil(ShipInvDur / ShipBlinkDur); //duration of ships explosion
  let ShipX=0;
  let ShipY=0;
  let thrust = {
    x:0,
    y:0,
  }
  //Asteroid Variables
  let AsteroidSpeed = 50; //max starting speed of asteroids in pixels/second
  let AsteroidSize = 100; // starting size of asteroids in pixels
  let AsteroidVert = 10; // average number of verticies on each asteroid
  const AsteroidJag = 0.3; // jaggedness of asteroids from (0 = none and 1 = lots)
  const StartingRoids = 3;
  
   //laser variables
  let LaserMax = 10 // max number of lasers on screen at once
  let LaserDist = 0.5 // max distance lasers can travel as fraction of screen width
  let LaserSpeed = 500; // speed of lasers in pixels/sec
  let ShipCanShoot = true;
  let LaserExplodeDur = 0.15; //duration of the lasers explosion

   let Lasers = [];

  // set up the sound effects
  let fxExplode = new Sound(explodeSound, 1, 0.3);
  let fxLaser = new Sound(laserSound, 5, 0.3);
  let fxHit = new Sound(hitSound, 5, 0.3);
  let fxThrust = new Sound(thrustSound, 1, 0.2);
 
  function Sound(src, maxStreams = 1, vol = 1.0){
    this.streamNum = 0;
    this.streams = [];

    for (let i = 0; i < maxStreams; i++){
      this.streams.push(new Audio(src));
      this.streams[i].volume = vol
    }
    this.play = function (){
      if (SoundOn) {
        this.streamNum = (this.streamNum + 1) % maxStreams;
        this.streams[this.streamNum].play();
      }
    }
    this.stop = function () {
      this.streams[this.streamNum].pause();
      this.streams[this.streamNum].currentTime = 0;
    }
  }

  //set up the music
  const music = new Music(musicLow, musicHigh);
  let asteroidsLeft, asteroidsTotal;

  function Music(srcLow, srcHigh) {
    this.soundLow = new Audio(srcLow);
    this.soundHigh = new Audio(srcHigh);
    this.low = true;
    this.tempo = 1.0; // seconds per beat
    this.beatTime = 0; // frames left until next beat
    this.play = function (){
      if(MusicOn){
        if (this.low){
          this.soundLow.play();
        } else {
          this.soundHigh.play();
        }
        this.low = !this.low;
      }
    }
    this.setAsteroidRatio = function(ratio){
      this.tempo = 1.0 - 0.75 * (1.0 - ratio);
    }
    this.tick = function(){
      if (this.beatTime === 0){
        this.play();
        this.beatTime = Math.ceil(this.tempo * 30);
      } else {
        this.beatTime--;
      }
    }
  } 

  const shootLaser = (Lasers) => {
    if(ShipCanShoot && Lasers.length < LaserMax){
      Lasers.push({
        x: ShipX + 4/3 * ShipSize * Math.cos(ShipAngle),
        y: ShipY - 4/3 * ShipSize * Math.sin(ShipAngle),
        xv: LaserSpeed * Math.cos(ShipAngle) / 30,
        yv: -LaserSpeed * Math.sin(ShipAngle) / 30,
        dist: 0,
        explodeTime: 0
      })
      fxLaser.play();
    }
    ShipCanShoot = false;
  }
 
  const update = (ctx, ship, Asteroids, canvas, distBetweenPoints, destroyAsteroid, newGame) => {
    let blinkOn = ShipBlinkNum % 2 === 0;
    let exploding = ship.explodeTime > 0
    ShipX = ship.x;
    ShipY= ship.y
    
    //tick the music
    music.tick();

    //draw space
    ctx.fillStyle ='black';
    ctx.fillRect(0,0, ctx.canvas.width, ctx.canvas.height)
    
    //thrust the ship
    if(Thrusting && !ship.dead){
      thrust.x += ThrustingSpeed * Math.cos(ShipAngle);
      thrust.y += ThrustingSpeed * Math.sin(ShipAngle);
      fxThrust.play();
  
    //draw the thruster
      if(!exploding && blinkOn){
        ctx.fillStyle = 'blue'
        ctx.strokeStyle = 'darkRed'
        ctx.lineWidth = ShipSize / 10;
        ctx.beginPath();
        ctx.moveTo( // rear left
          ship.x - ship.r * (2/3 * Math.cos(ShipAngle) + 0.5 * Math.sin(ShipAngle)),
          ship.y + ship.r * (2/3 * Math.sin(ShipAngle) - 0.5 * Math.cos(ShipAngle))
        );
        ctx.lineTo( // rear center
          ship.x - ship.r * 8/3 * Math.cos(ShipAngle),
          ship.y + ship.r * 8/3 * Math.sin(ShipAngle)
        )
        ctx.lineTo( // rear right
          ship.x - ship.r * (2/3 * Math.cos(ShipAngle) - 0.5 * Math.sin(ShipAngle)),
          ship.y + ship.r * (2/3 * Math.sin(ShipAngle) + 0.5 * Math.cos(ShipAngle))
        )
        ctx.closePath();
        ctx.fill()
        ctx.stroke();
      }
    }else {
      thrust.x -= Friction * thrust.x / 30;
      thrust.y -= Friction * thrust.y / 30;
      fxThrust.stop();
    }

    //Handle edge of screen
    if (ship.x < 0 - ship.r/6){
      ship.x = ctx.canvas.width + ship.r/6;
    }else if(ship.x > ctx.canvas.width + ship.r/6){
      ship.x = 0 - ship.r/6;
    }
    if (ship.y < 0 - ship.r/6){
      ship.y = ctx.canvas.height + ship.r/6;
    }else if(ship.y > ctx.canvas.height + ship.r/6){
      ship.y = 0 - ship.r/6;
    }

    const explodeShip = () => {
      ship.explodeTime = Math.ceil(ShipExplodeDur * 30)
      fxExplode.play();
    }

    const gameOver = () => {
      ship.dead = true;
      text = 'Game Over';
      textAlpha = 1.0;
    }

    const drawShip = (x, y, a, color = 'white') => {
      ctx.strokeStyle = color
        ctx.lineWidth = ShipSize / 20;
        ctx.beginPath();
        ctx.moveTo( // nose of the ship
          x + 4/3 * ship.r * Math.cos(a),
          y - 4/3 * ship.r * Math.sin(a)
        );
        ctx.lineTo( // rear left
          x - ship.r * (2/3 * Math.cos(a) + Math.sin(a)),
          y + ship.r * (2/3 * Math.sin(a) - Math.cos(a))
        )
        ctx.lineTo( // rear right
          x - ship.r * (2/3 * Math.cos(a) - Math.sin(a)),
          y + ship.r * (2/3 * Math.sin(a) + Math.cos(a))
        )
        ctx.closePath();
        ctx.stroke();
    }

    //draw ship
    if(!exploding){
      if(blinkOn && !ship.dead){
        drawShip(ship.x, ship.y, ShipAngle);
      }

      //handle blinking
      if(ShipBlinkNum > 0){
        //reduce the blink time
        ShipBlinkTime--;
        //reduce the blink num
        if (ShipBlinkTime === 0){
          ShipBlinkTime = Math.ceil(ShipBlinkDur * 30);
          ShipBlinkNum--;
        }
      }
    } else {
      //draw explosion
      ctx.fillStyle = 'darkRed';
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI *2, false);
      ctx.fill();
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r * 1.3, 0, Math.PI *2, false);
      ctx.fill();
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r * 1.0, 0, Math.PI *2, false);
      ctx.fill();
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r * 0.7, 0, Math.PI *2, false);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI *2, false);
      ctx.fill();
    }

    if (ShowBounding){
      ctx.strokeStyle = 'lime';
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI *2, false);
      ctx.stroke();
    }

    //center the ship
    if(ShowCenterDot){
      ctx.fillStyle = 'red'
      ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2)
    }

    //check distance travelled
    for (let laser of Lasers){
      //check distance travelled
      if(laser.dist > LaserDist *  canvas.width){
        Lasers.splice(laser, 1)
        continue;
      }

      // handle the explosion
      if (laser.explodeTime > 0){
        laser.explodeTime--;
        //destroy the laser after the duration is up
        if(laser.explodeTime === 0){
          Lasers.splice(laser, 1);
          continue;
        }
      } else {
        //move the laser
        laser.x += laser.xv;
        laser.y += laser.yv;
        //calculate the distance travelled
        laser.dist += Math.sqrt(Math.pow(laser.xv, 2) + Math.pow(laser.yv,2));
      }
        
      //Handle edge of screen
      if(laser.x < 0) {
        laser.x = canvas.width;
      } else if (laser.x > canvas.width){
        laser.x = 0
      }
      if(laser.y < 0) {
        laser.y = canvas.height;
      } else if (laser.y > canvas.height){
        laser.y = 0
      }
    }

    //draw the lasers
    for(let i = 0; i < Lasers.length; i++){
      if (Lasers[i].explodeTime === 0){
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(Lasers[i].x, Lasers[i].y, ShipSize / 15, 0, Math.PI * 2, false);
      ctx.fill();
      } else {
        //draw the explosion
      ctx.fillStyle = 'darkBlue';
      ctx.beginPath();
      ctx.arc(Lasers[i].x, Lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(Lasers[i].x, Lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(Lasers[i].x, Lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
      ctx.fill();
      }
    }

    //draw the game text
    if (textAlpha >= 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(255,255,255, ${textAlpha})`;
      ctx.font = `small-caps ${TextSize}px dejavu sans mono`;
      ctx.fillText(text, canvas.width / 2, canvas.height * 0.75);
      textAlpha -= (1.0 / TextFadeTime / 30);
    } else if(ship.dead) {
      newGame();
      ship.x = 700;
      ship.y = 500;
      thrust.x = 0
      thrust.y = 0
      ShipAngle = 90 / 180 * Math.PI;
    }

    // draw the lives
    let lifeColor;
    for(let i = 0; i < lives; i++) {
      lifeColor = exploding && i === lives - 1 ? 'red' : 'white'
      drawShip(ShipSize + i * ShipSize * 1.2, ShipSize, 0.5* Math.PI, lifeColor);
    }

    //draw the score
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle'
    ctx.fillStyle = `white`;
    ctx.font = `${TextSize}px dejavu sans mono`;
    ctx.fillText(score, canvas.width - ShipSize / 2, ShipSize);

    //draw the high score
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'
    ctx.fillStyle = `white`;
    ctx.font = `${TextSize * 0.75}px dejavu sans mono`;
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, ShipSize);

    //detect laser hits on asteroids
    let ax, ay, ar, lx, ly;
    for (let i = Asteroids.length - 1; i >= 0; i--){
      //grab the asteroid properties
      ax = Asteroids[i].x;
      ay = Asteroids[i].y;
      ar = Asteroids[i].r;
      
      //loop over the lasers
      for(let j = Lasers.length - 1; j >= 0; j--){
        //grab the laser properties
        lx = Lasers[j].x;
        ly = Lasers[j].y;

        // detect hits
        if (Lasers[j].explodeTime === 0 && distBetweenPoints(ax, ay, lx, ly) < ar){
          //destroy the asteroid and activate laser explosion
          destroyAsteroid(i);
          Lasers[j].explodeTime = Math.ceil(LaserExplodeDur * 30)
          break;
        }
      }
    }
    

    //check for asteroid colisions
    if(!exploding){
      if(ShipBlinkNum === 0 && !ship.dead){
        for(let i = 0; i < Asteroids.length; i++){
          if (distBetweenPoints(ship.x, ship.y, Asteroids[i].x, Asteroids[i].y) < ship.r + Asteroids[i].r){
            explodeShip();
            destroyAsteroid(i);
            break;
          }
        }
      }

      //rotate ship
      ShipAngle += ShipRot

      //move the ship
      ship.x += thrust.x / 30;
      ship.y -= thrust.y / 30;
    } else {
      ship.explodeTime--;
      if(ship.explodeTime === 0){
        lives--;
        if(lives === 0){
          gameOver();
        } else {
          ShipBlinkNum = Math.ceil(ShipInvDur / ShipBlinkDur)
          if(blinkOn){
            ship.x = 700;
            ship.y = 500;
            thrust.x = 0
            thrust.y = 0
            ShipAngle = 90 / 180 * Math.PI;
          }
        }

        if(ShipBlinkNum > 0){
          //reduce the blink time
          ShipBlinkTime--;
          //reduce the blink num
          if (ShipBlinkTime === 0){
            ShipBlinkTime = Math.ceil(ShipBlinkDur * 30);
            ShipBlinkNum--;
          }
        }
      }
    }

    // DrawAsteroids
    let x, y, r, a, vert, offs;
    for(let i = 0; i < Asteroids.length; i++){
      ctx.strokeStyle = 'slategrey';
      ctx.lineWidth = ShipSize / 15;
      //asteroid properties
      x = Asteroids[i].x;
      y = Asteroids[i].y;
      r = Asteroids[i].r;
      a = Asteroids[i].a;
      vert = Asteroids[i].vert;
      offs = Asteroids[i].offs

      //draw a path
      ctx.beginPath();
      ctx.moveTo(
        x + r * offs[0] * Math.cos(a),
        y + r * offs[0] * Math.sin(a)
      )
      //draw a polygon
      for (let j = 1; j < vert; j++){
        ctx.lineTo(
          x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
          y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
        )
      }
      ctx.closePath();
      ctx.stroke();

      if (ShowBounding){
        ctx.strokeStyle = 'lime';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI *2, false);
        ctx.stroke();
      }
    }
    //move the asteroid
    for(let i = 0; i < Asteroids.length; i++){
      Asteroids[i].x += Asteroids[i].xv;
      Asteroids[i].y += Asteroids[i].yv;

      //handle edge of screen for asteroids
      if(Asteroids[i].x < 0 - Asteroids[i].r / 1.2){
        Asteroids[i].x = canvas.width + Asteroids[i].r / 1.2;
      }else if(Asteroids[i].x > canvas.width + Asteroids[i].r / 1.2){
        Asteroids[i].x = 0 - Asteroids[i].r/ 1.2
      }
      if(Asteroids[i].y < 0 - Asteroids[i].r/ 1.2){
        Asteroids[i].y = canvas.height + Asteroids[i].r / 1.2;
      }else if(Asteroids[i].y > canvas.height + Asteroids[i].r / 1.2){
        Asteroids[i].y = 0 - Asteroids[i].r / 1.2
      }
    }
  
    const onKeyDown = (e)=> {
      if (ship.dead) {
        return;
      }
      switch(e.keyCode){
        //Shoot laser (space bar)
        case 32:
          shootLaser(Lasers);
          break;
        //rotate ship left (a)
        case 65:
          ShipRot = TurnSpeed / 180 * Math.PI / 30
        break;
        case 37:
          ShipRot = TurnSpeed / 180 * Math.PI / 30
        break;
        //rotate ship right (d)
        case 68:
          ShipRot = -TurnSpeed / 180 * Math.PI / 30
        break;
        case 39:
          ShipRot = -TurnSpeed / 180 * Math.PI / 30
        break;
        //Thrust (w)
        case 87:
          Thrusting = true;
        break;
        case 38:
          Thrusting = true;
        break;
        //default case?
        default:
          console.log('hey, This didnt work')
      }
    }
    
    const onKeyUp = (e) => {
      if(ship.dead){
        return;
      }
      switch(e.keyCode){
        // allow shooting again(space bar)
        case 32:
          ShipCanShoot = true;
        //rotate ship left
        break;
        case 65:
          ShipRot = 0
        break;
        case 37:
          ShipRot = 0
        break;
        //rotate ship right
        case 68:
          ShipRot = 0
        break;
        case 39:
          ShipRot = 0
        break;
        //Thrust
        case 87:
          Thrusting = false
        break;
        case 38:
          Thrusting = false
        break;
        //default case
        default:
          console.log('What are you doing to me!?! I dont work still')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
  }

 

  useEffect(() => {
    
    const canvas = canvasRef.current
    const context = canvas.getContext('2d');

   
    // let Asteroids = [];
    const newShip = () => {
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: ShipSize/2,
        explodeTime: 0,
        dead: false
      }
    }
    

    //code to make image less blurry
    let rect = canvas.getBoundingClientRect();
    // console.log(rect, 'line 456')
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    // console.log(devicePixelRatio, 'line 459')
    // context.scale(devicePixelRatio, devicePixelRatio);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    // console.log(canvas.style.width, canvas.style.height, 'line 463')
   
    let newAsteroid = (x, y, r) => {
      let lvlMult = 1 + 0.1 * level;
      let newRoid = {
          x: x,
          y: y,
          xv: Math.random() * AsteroidSpeed * lvlMult / 30 * (Math.random() < 0.5 ? 1 : -1), //x velocity
          yv: Math.random() * AsteroidSpeed * lvlMult / 30 * (Math.random() < 0.5 ? 1 : -1), //y velocity
          r: r, //radius
          a: Math.random() * Math.PI * 2, // random angle in radians (this is same as 360 degrees)
          vert: Math.floor(Math.random() * (AsteroidVert + 1) + AsteroidVert / 2),
          offs: []
        }

        // create vertex offsets arrays
        for (let i = 0; i < newRoid.vert; i++){
          newRoid.offs.push(Math.random() * AsteroidJag * 2 + 1 - AsteroidJag)
        }

      return newRoid
    }

    const distBetweenPoints = (x1, y1, x2, y2) => {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    let createBelt = () => {
      Asteroids = [];
      asteroidsTotal = (StartingRoids + level) * 7;
      asteroidsLeft = asteroidsTotal;
      let x, y;
      for(let i = 0; i < StartingRoids + level; i++) {
        do {
          x = Math.floor(Math.random() * canvas.width);
          y = Math.floor(Math.random() * canvas.height);
        }while (distBetweenPoints(ship.x, ship.y, x, y) < AsteroidSize * 2 + ship.r){
          Asteroids.push(newAsteroid(x, y, Math.ceil(AsteroidSize / 2)));
        }
      }
    }

    const destroyAsteroid = (index) => {
      let x = Asteroids[index].x;
      let y = Asteroids[index].y;
      let r = Asteroids[index].r;

      //split the asteroid in two
      if (r === Math.ceil(AsteroidSize / 2)){
        Asteroids.push(newAsteroid(x, y, Math.ceil(AsteroidSize / 4)));
        Asteroids.push(newAsteroid(x, y, Math.ceil(AsteroidSize / 4)));
        score += LgeRoidPts;
      } else if (r === Math.ceil(AsteroidSize / 4)) {
        Asteroids.push(newAsteroid(x, y, Math.ceil(AsteroidSize / 8)));
        Asteroids.push(newAsteroid(x, y, Math.ceil(AsteroidSize / 8)));
        score += MedRoidPts;
      } else {
        score += SmlRoidPts;
      }

      //check high score
      if (score > highScore){
        highScore = score;
        localStorage.setItem(SaveKeyScore, highScore)
      }

      
      //destroy the asteroid
      Asteroids.splice(index, 1);
      fxHit.play();

      //calculate the ratio of remaining asteroids to determine the music tempo
      asteroidsLeft--;
      music.setAsteroidRatio(asteroidsLeft === 0 ? 1 : asteroidsLeft / asteroidsTotal)

      //new level when no asteroids
      if(Asteroids.length === 0){
        level++;
        newLevel();
      }
    }

    //creates newLevel function and calls the create belt funciton
    let newLevel = () => {
      text = "Level " + (level + 1);
      textAlpha = 1.0;
      createBelt();
    }

    //creates newGame function and defines ship and calls the new level function
    let newGame = () => {
      level = 0;
      score = 0;
      Thrusting = false;
      lives = GameLives;
      ship = newShip();

      //get the high score from local storage
      let scoreStr = localStorage.getItem(SaveKeyScore);
      if (scoreStr === null) {
        highScore = 0;
      } else {
        highScore = parseInt(scoreStr)
      }
      newLevel();
    }

    //runs the newGame funciton
    newGame()

    let animationFrameId;

    const render= () => {
      update(context, ship, Asteroids, canvas, distBetweenPoints, destroyAsteroid, newGame)
      animationFrameId= window.requestAnimationFrame(render)
    }
    render()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  },
  [update])

  return (
    <canvas id='GameBoard' ref={canvasRef} {...props}></canvas>
  )
}

export default GameBoard