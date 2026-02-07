const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../assets/app_icon.svg');
const outputPath = path.join(__dirname, '../assets/icon.png');

sharp(inputPath)
  .resize(512, 512) // Standard icon size
  .png()
  .toFile(outputPath)
  .then(() => console.log('Icon converted successfully to icon.png'))
  .catch(err => console.error('Error converting icon:', err));
