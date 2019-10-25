const valid = (des = {}, ref = {}, excl = []) => {
    // VALID ONLY 'EXCL' PATCH/UPDATES WITHIN DES AND REF OBJECTS
    const updates = Object.keys(des)
    const allowedUpdates = Object.keys(ref)
   
    if (excl) {
        for (i = 0; i < excl.length; i++) {
            const e = excl[i]
            const index = allowedUpdates.indexOf(e)
            delete allowedUpdates[index]
        }
    }
    const isValid = updates.every((update) => {
        return allowedUpdates.includes(update)
    })
    // console.log(isValid)
    return isValid
}


const whitelist = (ref = [], excl = []) => {
    // RETURN FALSE IF MATCH FOUND
    if(excl){
        for (i = 0; i < excl.length; i++) {
            const e = excl[i]
            const index = ref.indexOf(e)
            if(index > 0){
                return false
            }
        }
    }
    return true
}

const rightKey = (key, ref = {}, appendString = '') => {
    // RETURN ONLY THE RIGHT KEYS WITHIN OBJECT 
    const keys = Object.keys(ref)
    const mesh = keys.filter((f) => {
        const re = new RegExp(`^${key}${appendString}$`)
        return f.match(re)
    })
    return mesh
}

const setValues = async (ref = {}, obj = {}, excl = []) => {
    // UNIQUE SET OUTPUT
    try {
        const array = Object.keys(ref)
        var set = []
        array.filter(ar => {
            const i = excl.indexOf(ar)
            if(i === -1){
                // FILTER NULL/null strings, null, undefined
                if(obj[ar] !== 'NULL' && obj[ar] !== 'null' && obj[ar] !== null && obj[ar] !== undefined){
                    set.push(obj[ar])
                }
            }
        }) 
        const unique = new Set(set)
        // debugging
        // console.log(unique)
        return Array.from(unique)
    } catch (e) {
        console.error(e)
        throw new Error(e)      
    }
}

const compareArray = (ref = [], des = [], delimiter = '-') => {
    var destination = null
    if (Array.isArray(des) && des.length === 1){
        destination = des.toString().split(delimiter)
    }
    else {
        destination = des.toString().split(delimiter)
    }
    var match = false
    var count = 0
    ref.forEach((ar) => {
        const i = destination.indexOf(ar)
        if(i > 0){
            match = i 
            count++
        }
    })
    return count === 1 ? destination[match] : ref
}

const resizeArray = (array) => {
    // RETURN ARRAY REGARDLESS OF SIZE
    if(!Array.isArray(array)){
        return [array]
    }
    if (array.length === 0){
        return array = undefined
    }
    return array
}

const lengthObjects = (key, array) => {
    const obj = {}
    if(Array.isArray(array) && array.length > 1){
        obj[array.length] = key
        // console.log(obj)
        return obj
    }
    return null
}

const arrayClone = (array = [], obj = {}) => {
    // CLONE OBJECTS BASED ON ARRAY 
    var result = []
    for (i = 0; i < array.length; i++){
        // ARRAY ENTRY 
        // console.log(array[i])
        // VALUE/VALUES
        if (array[i] !== null){
            // VALID ENTRY
            // console.log(array[i])
            const key = parseInt(Object.keys(array[i]))
            const string = Object.values(array[i]).toString()
            // console.log(key, string)
            if(!Array.isArray(obj)){
                for (let i = 0; i < key; i++) {
                    var dolly = Object.assign({}, obj)
                    // console.log(dolly)
                    dolly[string] = [dolly[string][i]]
                    // console.log(dolly)
                    result.push(dolly)
                }
            }
            if(Array.isArray(obj)){
                for (let j = 0; j < obj.length; j++){
                    // console.log('iteration j =',j)
                    // console.log(obj[j])
                    for (let x = 0; x < key; x++) {
                        var dolly = Object.assign({}, obj[j])
                        // console.log(dolly)
                        dolly[string] = [dolly[string][x]]
                        // console.log(dolly)
                        result.push(dolly)
                    }
                }
            }
        }
    }
    return result
}

const buildArray = (array = [], obj = {}, keys = [], delimiter = '-', union = true) => {
    // BUILD OBJECTS BASED ON ARRAY IN ORDER DEFINED BY KEYS, CREATE PREFIX USING DEFINED DELIMITER WITH OPTION TO UNION 
    var result = null
    var keyMap = []
    filtered = array.filter((fil) => {
        return fil !== null
    })
    keyMap = keys.filter((fil) => {
        // console.log(fil)
        return fil !== undefined
    })
    const set = new Set(keyMap)
    keyMap = Array.from(set)
    // debugging
    // console.log('buildArray keyMap =')
    // console.log(keyMap)
    if(filtered.length > 0){
        for (let i = 0; i < filtered.length; i++) {
            const iterator = filtered[i] !== Array.isArray(filtered[i]) ? [filtered[i]]: filtered[i]
            if(i === 0){
                result = arrayClone(iterator, obj)
            } else {
                result = arrayClone(iterator, result)
            }
        }
    }
    else{
        result = [obj]
    }
    // debugging
    // console.log(result)
    for (let x = 0; x < result.length; x++) {
        var prefix = []
        for(let j = 0; j < keyMap.length; j++){
            // LEFT RESULT OBJECT DICTIONARY / RIGHT KEYS ARRAY IN ORDER BASED ON MODEL
            // console.log(result[x][keys[j]])
            if (result[x][keyMap[j]] !== undefined){
                prefix.push(result[x][keyMap[j]])
            }
        }
        // CONVERT INTO A SET TO UNION VALUES, BACK INTO A DELIMITER STRING VALUE, W/DELIMITER
        if (delimiter === ''){
            const re = new RegExp(/\-/gi)
            const string = prefix.join('~').replace(re, '~')
            const set = new Set(string.split('~'))
            const array = Array.from(set)
            result[x]['prefix'] = union ? array.join(delimiter) : string.replace(/\~/gi, delimiter)
        }else {
            const string = prefix.join(delimiter)
            const set = new Set(string.split(delimiter))
            const array = Array.from(set)
            result[x]['prefix'] = union ? array.join(delimiter) : string
        }
    }
    return result
}

const addSuffix = (max = 10, padding = '', array = [], delimiter = '-') => {
    // USED TO FILTER BASED ON ARRAY WILL NOT USE WHEN SAVING MODEL AS CAN PERFORM WITHIN MONGOOSE
    for (let i = 0; i < array.length; i++) {
        var result = []
        // LABEL PREFIX
        const prefix = array[i].prefix
        // CREATE PADDING ARRAY
        var padArray = padding.split('')
        var len = (padding.split('').length + 1)
        var by = 10
        for (let x = 1;x <= max; x++){
            // X % DIVISION "BY" STARTING AT 10 EQUAL ZERO REMAINING, THEN POP ARRAY 
            if (x%by === 0) {
                padArray.pop()
                // MULTI BY 10, RECURRING 
                by = by*10
            }
            // NO MORE PADDING REMAINING, END LOOP
            if(padding !== '' && (len === x.toString().split('').length - 1)){
                x = max 
            }else{
                // BUILD SUFFIX
                const suffix = `${padArray.join('')}${x}`
                // debugging
                console.log({prefix, suffix})
                result.push(`${prefix}${delimiter}${suffix}`)
            }
        }
        // ADD ANOTHER OBJECT TO RETURNING ARRAY
        array[i]['fullNames'] = result
    }
    return array
}


module.exports = { 
    valid, 
    whitelist, 
    rightKey, 
    setValues,
    compareArray,
    resizeArray, 
    lengthObjects,
    arrayClone,
    buildArray,
    addSuffix
}