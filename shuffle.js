const fs = require('fs')
const plist = require('plist');
const assets = require('./assets.json')

/**
 * returns a pseudo-random 32bit unsigned integer
 * in the interval [0, `n`)
 */
const randU32 = (n = 2**32) => Math.random() * n >>> 0;

Array.prototype.shuffle = function() {
    const {length} = this; let unshuffled = this; let shuffled = [];
    while (shuffled.length !== length) {
        let index = randU32(unshuffled.length);
        shuffled.push(unshuffled[index]);
        unshuffled = unshuffled.filter((_, y) => y !== index)
    }
    return shuffled;
}

/**
 * get unique/distinct elements (same order)
 * @param {any[]} arr
 */
let undupe = arr => arr.filter((x, y) => arr.indexOf(x) == y);

let plistToJson = file => {
    let data = plist.parse(file)
    for (let key in data.frames) {
        let fileData = data.frames[key];
        for (let innerKey in fileData) {
            let fdik = fileData[innerKey];
            if (typeof  == 'string') {
                if (!fdik.length) delete fileData[innerKey]
                else fileData[innerKey] = JSON.parse(fdik.replace(/{/g, '[').replace(/}/g, ']'));
            }
    }}
    return data.frames
}

try {   // god-tier crash prevention system

fs.mkdirSync('./pack', { recursive: true, mode: 0o766 });

let glow = name => name.replace("_001.png", "_glow_001.png");
//const spriteRegex = name => new RegExp(`(<key>${name.replace(".", "\\.")}<\/key>\\s*)(<dict>(.|\\n)+?<\\/dict>)`);
let iconRegex = /^.+?_(\d+?)_.+/

let {forms} = assets
let sheetList = Object.keys(assets.sheets)
let glowName = sheetList.filter(x => x.startsWith('GJ_GameSheetGlow'))

// newlines/CRs are usually present in text files, strip them out so they aren't part of the pathname
let gdPath = process.argv[2] ?? fs.readFileSync('directory.txt', 'utf8').replace(/[\n\r]/g, '')

if (!fs.existsSync(gdPath)) throw "Couldn't find your GD directory! Make sure to enter the correct file path in directory.txt"  
let glowPlist = fs.readFileSync(`${gdPath}/${glowName[0]}.plist`, 'utf8')
let sheetNames = sheetList.filter(x => !glowName.includes(x))
let resources = fs.readdirSync(gdPath)

let plists = []
let sheets = []
let glowBackups = []
let glowSheet = plistToJson(glowPlist)

resources.forEach(x => {
    if (x.startsWith('PlayerExplosion_') && x.endsWith('-uhd.plist'))
        sheetNames.push(x.slice(0, -6)) // -6 removes ".plist", efficiently
})

sheetNames.forEach(x => {
    let file = fs.readFileSync(`${gdPath}/${x}.plist`, 'utf8')
    plists.push(file)
    try { sheets.push(plistToJson(file)) }
    catch(e) { throw `Error parsing ${x}.plist - ${e.message}` }
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
