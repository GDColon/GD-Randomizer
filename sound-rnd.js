var fs = require("fs")
const path = require('path');

const gdPath = fs.readFileSync('directory.txt', 'utf8')

Array.prototype.shuffle = function() {
    let length = this.length; let unshuffled = this; let shuffled = [];
    while (shuffled.length !== length) {
        let index = Math.floor(Math.random() * unshuffled.length);
        shuffled.push(unshuffled[index]);
        unshuffled = unshuffled.filter((x, y) => y !== (index))}
    return shuffled;
}  // I definitely didn't copy that from your code, Craig

var gdFiles = fs.readdirSync(gdPath);
var mp3s = gdFiles.filter((file) => file.endsWith(".mp3"));
var oggs = gdFiles.filter((file) => file.endsWith(".ogg"));
var sounds = mp3s.concat(oggs)

// Prefix every file with #, to avoid errors with existing files
sounds.forEach(sound => {  
    fs.renameSync(path.join(gdPath,sound),path.join(gdPath,"#" + sound))
});

var mp3dest = [...mp3s].shuffle() 

mp3s.forEach((sound,i) => {  
    fs.renameSync(path.join(gdPath,"#" + mp3s[i]),path.join(gdPath,mp3dest[i]))
});

var oggDest = [...oggs].shuffle()
oggs.forEach((sound,i) => {  
    fs.renameSync(path.join(gdPath,"#" + oggs[i]),path.join(gdPath,oggDest[i]))
});

console.log("dunsparce.")