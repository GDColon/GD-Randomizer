const fs = require('fs')
const plist = require('plist');
const assets = require('./assets.json')

try {   // god-tier crash prevention system

Array.prototype.shuffle = function() {
    let length = this.length; let unshuffled = this; let shuffled = [];
    while (shuffled.length !== length) {
        let index = Math.floor(Math.random() * unshuffled.length);
        shuffled.push(unshuffled[index]);
        unshuffled = unshuffled.filter((x, y) => y !== (index))}
    return shuffled;
}  

function plistToJson(file) {
    let data = plist.parse(file)
    for (let key in data.frames) {
        let fileData = data.frames[key];
        for (let innerKey in fileData) {
            if (typeof fileData[innerKey] == 'string') {
                if (!fileData[innerKey].length) delete fileData[innerKey]
                else fileData[innerKey] = JSON.parse(fileData[innerKey].replace(/{/g, '[').replace(/}/g, ']'));
            }
    }}
    return data.frames
}

if (!fs.existsSync('./pack')) fs.mkdirSync('./pack');

function glow(name) { return name.replace("_001.png", "_glow_001.png") }
function undupe (arr) { return arr.filter((x, y) => arr.indexOf(x) == y) }
//function spriteRegex(name) { return new RegExp(`(<key>${name.replace(".", "\\.")}<\/key>\\s*)(<dict>(.|\\n)+?<\\/dict>)`) }
let iconRegex = /^.+?_(\d+?)_.+/

let forms = assets.forms
let sheetList = Object.keys(assets.sheets)
let glowName = sheetList.filter(x => x.startsWith('GJ_GameSheetGlow'))
let gdPath = fs.readFileSync('directory.txt', 'utf8')
if (!fs.existsSync(gdPath)) throw "Couldn't find your GD directory! Make sure to enter the correct file path in directory.txt"  
let glowPlist = fs.readFileSync(`${gdPath}/${glowName[0]}.plist`, 'utf8')
let sheetNames = sheetList.filter(x => !glowName.includes(x))
let resources = fs.readdirSync(gdPath)

let plists = []
let sheets = []
let glowBackups = []
let glowSheet = plistToJson(glowPlist)

resources.forEach(x => {
    if (x.startsWith('PlayerExplosion_') && x.endsWith('-uhd.plist')) sheetNames.push(x.slice(0, -6))
})

sheetNames.forEach(x => {
    let file = fs.readFileSync(`${gdPath}/${x}.plist`, 'utf8')
    plists.push(file)
    sheets.push(plistToJson(file))
})

sheets.forEach((gameSheet, sheetNum) => {
    let plist = plists[sheetNum]
    let name = sheetNames[sheetNum]
    if (!name.startsWith('PlayerExplosion_')) console.log("Shuffling " + name)
    else if (name == "PlayerExplosion_01-uhd") console.log("Shuffling death effects")

    let sizes = {}
    Object.keys(gameSheet).forEach(x => {
        let obj = gameSheet[x]
        obj.name = x
        if (sheetNum == sheetNames.findIndex(y => y.startsWith('GJ_GameSheet02')) && forms.some(y => x.startsWith(y))) {
            let form = forms.find(y => x.startsWith(y))
            if (!sizes[form]) sizes[form] = [obj]
            else sizes[form].push(obj)
        }
        else {   
            let sizeDiff = assets.sheets[name] || 30
            let size = obj.textureRect[1].map(x => Math.round(x / sizeDiff) * sizeDiff).join()
            if (name.startsWith('PlayerExplosion')) size = "deatheffect"
            if (!sizes[size]) sizes[size] = [obj]
            else sizes[size].push(obj)
        }
    })
    
    Object.keys(sizes).forEach(obj => {
        let objects = sizes[obj]
        if (objects.length == 1) return delete sizes[obj]
        let iconMode = forms.includes(obj)
        let oldNames = objects.map(x => x.name)
        if (iconMode) oldNames = undupe(oldNames.map(x => x.replace(iconRegex, "$1")))
        let newNames = oldNames.shuffle()
        if (iconMode) {
            let iconList = {}
            oldNames.forEach((x, y) => iconList[x] = newNames[y])
            newNames = iconList
        }

        oldNames.forEach((x, y) => {
            let newName = newNames[iconMode ? x : y]
            if (iconMode) {
                plist = plist.replace(new RegExp(`<key>${obj}_${x}_`, "g"), `<key>###${obj}_${newName}_`)
                glowPlist = glowPlist.replace(`<key>${obj}_${x}_`, `<key>###${obj}_${newName}_`)
            }
            else {
                plist = plist.replace(`<key>${x}</key>`, `<key>###${newName}</key>`)
                if (glowSheet[glow(x)]) {
                    glowBackups.push(glow(x))
                    glowPlist = glowPlist.replace(`<key>${glow(x)}</key>`, `<key>###${glow(newName)}</key>`)
                }
            }
        })
    })
    plist = plist.replace(/###/g, "")
    fs.writeFileSync('./pack/' + sheetNames[sheetNum] + '.plist', plist, 'utf8')
})

console.log("Shuffling misc textures")
let specialGrounds = []
assets.sprites.forEach(img => {
    let spriteMatch = img.split("|")
    let foundTextures = resources.filter(x => x.match(new RegExp(`^${spriteMatch[0].replace("#", "\\d+?")}-uhd\\.${spriteMatch[1] || "png"}`)))

    if (spriteMatch[2] == "*") specialGrounds = specialGrounds.concat(foundTextures.map(x => x.slice(0, 15)))
    if (spriteMatch[2] == "g1") foundTextures = foundTextures.filter(x => !specialGrounds.some(y => x.startsWith(y)))
    if (spriteMatch[2] == "g2") foundTextures = foundTextures.filter(x => specialGrounds.some(y => x.startsWith(y)))

    let shuffledTextures = foundTextures.shuffle()
    foundTextures.forEach((x, y) => fs.copyFileSync(`${gdPath}/${x}`, `./pack/${shuffledTextures[y]}`))
})

let emptyDict = glowPlist.match(/<dict>\s*<key>aliases<\/key>(.|\n)+?<\/dict>/)[0].replace(/{\d+,\d+}/g, "{0, 0}")
let mappedBackups = glowBackups.reverse().map(x => `<key>${x}</key>${emptyDict}`).join("")
glowPlist = fs.writeFileSync('./pack/GJ_GameSheetGlow-uhd.plist', glowPlist.replace(/###/g, "").replace(/<dict>\s*<key>frames<\/key>\s*<dict>/g, "$&" + mappedBackups), 'utf8')
console.log("Randomization complete!")

}

catch(e) { console.log(e); fs.writeFileSync('crash_log.txt', e.stack ? `Something went wrong! Send this error to Colon and he'll get around to fixing it at some point.\n\n${e.stack}` : e, 'utf8') }