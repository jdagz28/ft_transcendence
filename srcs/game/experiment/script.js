var canvas = document.querySelector("canvas")

var ctx = canvas.getContext('2d')

var DocHeight,DocWidth
function canvasSetup() {
    DocHeight = window.innerHeight * 0.75
    DocWidth = window.innerWidth
    canvas.height = DocHeight
    canvas.width = DocWidth
    canvas.style.backgroundColor = "black"
}


function DrawPads(Pad1YPos, Pad2YPos) {
  var Pad1 = new Obj(50, Pad1YPos, 25, 200)
  var Pad2 = new Obj(DocWidth - 50 - 25, Pad2YPos, 25, 200)
  Pad1.drawPad()
  Pad2.drawPad()
}

class Obj {
  constructor(x, y, width, height) {
    this.color = "white"
    this.x = x
    this.y = y - (height / 2)
    this.width = width
    this.height = height
    this.speed = 8

  }

  drawPad() {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y, this.width, this.height)  
  }
}


function drawCenterLine() {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.setLineDash([10, 10]);
  
  ctx.beginPath();
  ctx.moveTo(DocWidth / 2, 0);
  ctx.lineTo(DocWidth / 2, DocHeight);
  ctx.stroke();
  
  ctx.setLineDash([]);
}




canvasSetup()

Pad1YPos = DocHeight / 2
Pad2YPos = DocHeight / 2
DrawPads(Pad1YPos, Pad2YPos)

drawCenterLine()