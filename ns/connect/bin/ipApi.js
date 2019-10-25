const { httpFetch } = require('./fetch')


var getIp = async function(port, hostname, path, query, jwt){
    try {
        const ip = await httpFetch(port, hostname, path, true, query, 'GET', null, null, null, jwt)
        return ip.body
    } catch (e) {
        // console.Error(e)
        throw new Error(e)
    }
}


module.exports = {
    getIp
}

