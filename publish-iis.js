const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const destDir = path.join(__dirname, 'IIS');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const srcPath = path.join(from, element);
    const destPath = path.join(to, element);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

try {
  console.log('🧹 Cleaning IIS folder...');
  if (fs.existsSync(destDir)) {
    deleteFolderRecursive(destDir);
  }
  
  console.log('🚀 Copying build files to IIS folder...');
  copyFolderSync(srcDir, destDir);
  
  console.log('✅ Successfully published to IIS folder!');
} catch (error) {
  console.error('❌ Failed to publish:', error.message);
  process.exit(1);
}
