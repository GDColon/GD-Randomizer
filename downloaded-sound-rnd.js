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

var gdFiles = fs.readdirSync(path.join(process.env.LOCALAPPDATA,"GeometryDash"));
var mp3s = gdFiles.filter((file) => file.endsWith(".mp3"));

// Prefix every file with #, to avoid errors with existing files
mp3s.forEach(sound => {  
    fs.renameSync(path.join(process.env.LOCALAPPDATA,"GeometryDash",sound),path.join(process.env.LOCALAPPDATA,"GeometryDash","#" + sound))
});

var mp3dest = [...mp3s].shuffle() 
for (i=0; i < mp3s.length; i++) {
    fs.renameSync(path.join(process.env.LOCALAPPDATA,"GeometryDash","#" + mp3s[i]),path.join(process.env.LOCALAPPDATA,"GeometryDash",mp3dest[i]))
}

console.log("dunsparce.")