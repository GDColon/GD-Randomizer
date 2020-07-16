var fs = require("fs")
const path = require('path');

Array.prototype.shuffle = function() {
    let length = this.length; let unshuffled = this; let shuffled = [];
    while (shuffled.length !== length) {
        let index = Math.floor(Math.random() * unshuffled.length);
        shuffled.push(unshuffled[index]);
        unshuffled = unshuffled.filter((x, y) => y !== (index))}
    return shuffled;
}  // I definitely didn't copy that from your code, Craig

var gdFiles = fs.readdirSync("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources");
var mp3s = gdFiles.filter((file) => file.endsWith(".mp3"));
var oggs = gdFiles.filter((file) => file.endsWith(".ogg"));
var sounds = mp3s.concat(oggs)

// Prefix every file with #, to avoid errors with existing files
sounds.forEach(sound => {  
    fs.renameSync(path.join("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources",sound),path.join("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources","#" + sound))
});

var mp3dest = [...mp3s].shuffle() 
for (i=0; i < mp3s.length; i++) {
    fs.renameSync(path.join("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources","#" + mp3s[i]),path.join("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources",mp3dest[i]))
}

var oggDest = [...oggs].shuffle()
for (i=0; i < oggs.length; i++) {
    fs.renameSync(path.join("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources","#" + oggs[i]),path.join("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources",oggDest[i]))
}

console.log("dunsparce.")