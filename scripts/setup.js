const fs = require('fs');
const path = require('path');

// Ensure the images directory exists
const imageDir = path.join(process.cwd(), 'public', 'api', 'imagenes');

if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
  console.log('Created image directory:', imageDir);
}
