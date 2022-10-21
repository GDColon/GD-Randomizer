//@ts-check
'use strict';
const fs = require('fs')
const plist = require('plist');
const assets = require('./assets.json')

/**
 * returns a pseudo-random 32bit unsigned integer
 * in the interval [0, `n`)
 */
const randU32 = (n = 2**32) => Math.random() * n >>> 0;

/**
 * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
 * @param {any[]} inp
 */
const shuffle = inp => {
    const {length} = inp, out = [];
    while (out.length !== length) {
        let index = randU32(inp.length);
        out.push(inp[index]);
        inp = inp.filter((_, y) => y !== index)
    }
    return out;
};

/**
 * get unique/distinct elements (same order)
 * @param {any[]} arr
 */
const undupe = arr => arr.filter((x, y) => arr.indexOf(x) == y);

/**
 * convert plist string to JSON, then JSON to `Object`
 * @param {string} file
 * @return {import('plist').PlistObject}
 */
const plistToJson = file => {
    const {frames: datFrames} = plist.parse(file);
    // not using `Object.values`, because we want to mutate in-place
    for (const out_k in datFrames) {
        const fileData = datFrames[out_k];
        for (const in_k in fileData) {
            const fdik = fileData[in_k];
            if (typeof fdik == 'string') {
                if (fdik.length == 0) delete fileData[in_k]
                else fileData[in_k] = JSON.parse(fdik.replace(/{/g, '[').replace(/}/g, ']'));
            }
    }}
    return datFrames
}

/** working directory */
const wd = './pack/';

try { // god-tier crash prevention system

    fs.mkdirSync(wd, { recursive: true, mode: 0o766 });

    const glow = (/**@type {string}*/ name) => name.replace("_001.png", "_glow_001.png");
    //const spriteRegex = name => new RegExp(`(<key>${name.replace(".", "\\.")}<\/key>\\s*)(<dict>(.|\\n)+?<\\/dict>)`);
    const iconRegex = /^.+?_(\d+?)_.+/

    const
        {forms} = assets,
        sheetList = Object.keys(assets.sheets),
        glowName = sheetList.filter(x => x.startsWith('GJ_GameSheetGlow'));

    // newlines/CRs are usually present in text files, strip them out so they aren't part of the pathname
    const gdPath = process.argv[2] ?? fs.readFileSync('directory.txt', 'utf8').replace(/[\n\r]/g, '')

    if (!fs.existsSync(gdPath))
        throw "Couldn't find your GD directory! Make sure to enter the correct file path in directory.txt"
    let glowPlist = fs.readFileSync(`${gdPath}/${glowName[0]}.plist`, 'utf8')
    const sheetNames = sheetList.filter(x => !glowName.includes(x))
    const resources = fs.readdirSync(gdPath)

    /**@type {string[]}*/
    const plists = []
    const sheets = []
    const glowBackups = []
    const glowSheet = plistToJson(glowPlist)

    resources.forEach(x => {
        if (x.startsWith('PlayerExplosion_') && x.endsWith('-uhd.plist'))
            sheetNames.push(x.slice(0, -6)) // -6 removes ".plist", efficiently
    })

    sheetNames.forEach(x => {
        const file = fs.readFileSync(`${gdPath}/${x}.plist`, 'utf8')
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
                /**@type {number}*/
                let sizeDiff = assets.sheets[name] || 30
                let size = obj.textureRect[1].map(x => Math.round(x / sizeDiff) * sizeDiff).join()
                if (name.startsWith('PlayerExplosion')) size = "deatheffect"
                if (!sizes[size]) sizes[size] = [obj]
                else sizes[size].push(obj)
            }
        })

        Object.keys(sizes).forEach(k => {
            /**@type {{name: string}[]}*/
            const objects = sizes[k]
            if (objects.length == 1) return delete sizes[k]
            const iconMode = forms.includes(k)
            let oldNames = objects.map(x => x.name)
            if (iconMode) oldNames = undupe(oldNames.map(x => x.replace(iconRegex, "$1")))
            let newNames = shuffle(oldNames)
            if (iconMode) {
                let iconList = {}
                oldNames.forEach((x, y) => iconList[x] = newNames[y])
                newNames = iconList
            }

            oldNames.forEach((x, y) => {
                let newName = newNames[iconMode ? x : y]
                if (iconMode) {
                    plist = plist.replace(new RegExp(`<key>${k}_${x}_`, "g"), `<key>###${k}_${newName}_`)
                    glowPlist = glowPlist.replace(`<key>${k}_${x}_`, `<key>###${k}_${newName}_`)
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
        plist = plist.replace(/###/g, '')
        fs.writeFileSync(wd + sheetNames[sheetNum] + '.plist', plist, 'utf8')
    })

    console.log("Shuffling misc textures")
    /**@type {string[]}*/
    const specialGrounds = []
    assets.sprites.forEach(img => {
        const spriteMatch = img.split("|")
        let foundTextures = resources.filter(x => x.match(new RegExp(`^${spriteMatch[0].replace("#", "\\d+?")}-uhd\\.${spriteMatch[1] || "png"}`)))

        if (spriteMatch[2] == "*") specialGrounds.push(...foundTextures.map(x => x.slice(0, 15))) // in-place `concat`
        if (spriteMatch[2] == "g1") foundTextures = foundTextures.filter(x => !specialGrounds.some(y => x.startsWith(y)))
        if (spriteMatch[2] == "g2") foundTextures = foundTextures.filter(x => specialGrounds.some(y => x.startsWith(y)))

        let shuffledTextures = shuffle(foundTextures)
        foundTextures.forEach((x, y) => fs.copyFileSync(`${gdPath}/${x}`, wd + shuffledTextures[y]))
    })

    let emptyDict = glowPlist.match(/<dict>\s*<key>aliases<\/key>(.|\n)+?<\/dict>/)[0].replace(/{\d+,\d+}/g, "{0, 0}")
    let mappedBackups = glowBackups.reverse().map(x => `<key>${x}</key>${emptyDict}`).join('')
    glowPlist = fs.writeFileSync(wd + 'GJ_GameSheetGlow-uhd.plist', glowPlist.replace(/###/g, "").replace(/<dict>\s*<key>frames<\/key>\s*<dict>/g, "$&" + mappedBackups), 'utf8')
    console.log("Randomization complete!")

}

catch(e) {
    console.error(e);
    fs.writeFileSync(
        'crash_log.txt',
        e.stack ? `Something went wrong! Send this error to Colon and he'll get around to fixing it at some point.\n\n${e.stack}` : e,
        'utf8'
    )
}
