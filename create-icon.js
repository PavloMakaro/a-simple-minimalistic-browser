const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

// Создаем папку assets, если её нет
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

// Создаем канвас
const canvas = createCanvas(512, 512);
const ctx = canvas.getContext('2d');

// Функция для создания скругленного прямоугольника
function roundRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

// Рисуем фон с закруглёнными углами
roundRect(0, 0, 512, 512, 100);
const gradient = ctx.createLinearGradient(0, 0, 512, 512);
gradient.addColorStop(0, '#0080ff');
gradient.addColorStop(1, '#00c6ff');
ctx.fillStyle = gradient;
ctx.fill();

// Рисуем букву S
ctx.fillStyle = 'white';
ctx.font = 'bold 300px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('S', 256, 256);

// Добавляем блик
const shine = ctx.createRadialGradient(200, 200, 0, 200, 200, 400);
shine.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
shine.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
ctx.fillStyle = shine;
roundRect(0, 0, 512, 512, 100);
ctx.fill();

// Сохраняем в разных форматах
const pngBuffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);

// Создаем маленькую версию для favicon
const smallCanvas = createCanvas(32, 32);
const smallCtx = smallCanvas.getContext('2d');
smallCtx.drawImage(canvas, 0, 0, 32, 32);
const faviconBuffer = smallCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), faviconBuffer);

console.log('Icons created successfully!'); 