const rsa = require('node-rsa')
const fs = require('fs')


var createKey = async () => {
    return await new rsa({b: 512})
}

var writeKey = async (key) => {
    await fs.writeFileSync('../tmp/key', key)
}

var readKey = async () => {
    return await fs.readFileSync('../tmp/key')
}

var encrypted = async (key, text) => {
    return await key.encrypt(text, 'utf8')
}

var decrypted = async (key, text) => {
    return await key.decrypt(text, 'utf8')
}


module.exports = {
    createKey, 
    writeKey,
    readKey,
    encrypted, 
    decrypted
}
