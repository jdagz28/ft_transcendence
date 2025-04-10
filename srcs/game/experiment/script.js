var canvas = document.querySelector("canvas")
var ctx = canvas.getContext('2d')

var Player1Score = 0
var Player2Score = 0
var paddleHeight = 200
var RequestFrame = false
var WKeyState = false
var SKeyState = false
var ArrowUpKeyState = false
var ArrowDownKeyState = false
var dirX = false
var dirY = false

document.addEventListener('keydown', (e) => {
  if (e.key == "w")
    WKeyState = true
  if (e.key == "s")
    SKeyState = true
  if (e.key == "ArrowUp")
    ArrowUpKeyState = true
  if (e.key == "ArrowDown")
    ArrowDownKeyState = true
  if (e.key == "Enter") {
    if (!RequestFrame) {
      var ball = new Obj(DocWidth / 2, DocHeight / 2, 15)
      ball.drawBall()
      RequestFrame = true
      MoveBallLoop(ball)
    }
  }
})

document.addEventListener('keyup', (e) => {
  if (e.key == "w")
    WKeyState = false
  if (e.key == "s")
    SKeyState = false
  if (e.key == "ArrowUp")
    ArrowUpKeyState = false
  if (e.key == "ArrowDown")
    ArrowDownKeyState = false
})

var DocHeight,DocWidth
function canvasSetup() {
  DocHeight = window.innerHeight 
  DocWidth = window.innerWidth
  canvas.height = DocHeight
  canvas.width = DocWidth
  canvas.style.backgroundColor = "black"
  drawCenterLine()

  Pad1YPos = DocHeight / 2
  Pad2YPos = DocHeight / 2
  DrawPads(Pad1YPos, Pad2YPos)

  var ball = new Obj(DocWidth / 2, DocHeight / 2, 15)
  ball.drawBall()
}


function DrawPads(Pad1YPos, Pad2YPos) {
  var Pad1 = new Obj(50, Pad1YPos, 25, paddleHeight)
  var Pad2 = new Obj(DocWidth - 50 - 25, Pad2YPos, 25, paddleHeight)
  Pad1.drawPad()
  Pad2.drawPad()
}

class Obj {
  constructor(x, y, width, height) {
    this.color = "white"
    this.x = x
    this.y = height !== undefined ? y - (height / 2) : y;
    this.width = width
    this.height = height
    this.speed = 8
  }

  drawBall() {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2, false)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.closePath()
  }

  drawPad() {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y, this.width, this.height)  
  }

  moveBall() {
    DrawPads(Pad1YPos, Pad2YPos)
    if (dirY) this.y += this.speed
    if (dirX) this.x += this.speed
    if (!dirY) this.y -= this.speed
    if (!dirX) this.x -= this.speed
    if (this.y < 0) dirY = true
    if (this.y > DocHeight) dirY = false
    if (this.x > DocWidth) {
      dirX = GenerateRandomDir();
      dirY = GenerateRandomDir();
      this.y = DocHeight / 2
      this.x = DocWidth / 2
      Player1Score++;
      RequestFrame = false
      ctx.clearRect(0, 0, DocWidth, DocHeight)
      DrawPads(Pad1YPos, Pad2YPos)
      drawCenterLine()
      this.drawBall()
    }
    if (this.x < 0) {
      dirX = GenerateRandomDir();
      dirY = GenerateRandomDir();
      this.y = DocHeight / 2
      this.x = DocWidth / 2
      Player2Score++;
      RequestFrame = false
      ctx.clearRect(0, 0, DocWidth, DocHeight)
      DrawPads(Pad1YPos, Pad2YPos)
      drawCenterLine()
      this.drawBall()
    }
    checkCollision(this.y, this.x)
    drawCenterLine()
    this.drawBall()
  }
}

function GenerateRandomDir() {

  return Boolean(Math.floor(Math.random() * 2))
}

function drawCenterLine() {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  
  ctx.beginPath();
  ctx.moveTo(DocWidth / 2, 0);
  ctx.lineTo(DocWidth / 2, DocHeight);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

function checkCollision(ballY, ballX) {
  const leftPaddleCenterX = 50 + 12.5;
  const rightPaddleCenterX = DocWidth - 50 - 12.5;
  
  const distanceLeft = Math.abs(ballX - leftPaddleCenterX);
  const distanceRight = Math.abs(ballX - rightPaddleCenterX);
  
  const collisionThreshold = 15;
  
  if (distanceLeft < collisionThreshold &&
      ballY > (Pad1YPos - paddleHeight / 2) &&
      ballY < (Pad1YPos + paddleHeight / 2)) {
    dirX = true; 
  }
  
  if (distanceRight < collisionThreshold &&
      ballY > (Pad2YPos - paddleHeight / 2) &&
      ballY < (Pad2YPos + paddleHeight / 2)) {
    dirX = false;
  }
}


function MoveBallLoop(ball) {
  if (WKeyState && Pad1YPos > paddleHeight / 2) Pad1YPos -= 10
  if (SKeyState && Pad1YPos < DocHeight - paddleHeight / 2) Pad1YPos += 10
  if (ArrowUpKeyState && Pad2YPos > paddleHeight / 2) Pad2YPos -= 10
  if (ArrowDownKeyState && Pad2YPos < DocHeight - paddleHeight / 2) Pad2YPos += 10

  ctx.clearRect(0, 0, DocWidth, DocHeight)

  drawCenterLine()
  DrawPads(Pad1YPos, Pad2YPos)

  ball.moveBall()
  if (RequestFrame) requestAnimationFrame(() => { MoveBallLoop(ball) })
}


canvasSetup()




