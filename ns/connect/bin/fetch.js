const got = require('got')

// httpFetch Func
var httpFetch = async function (port, host, path, json = true, queryStr = '', method = 'GET', user = null, pwd = null, cookie = null, jwt = null){
    var protocol = ''
    if (port === 443){
        protocol = 'https'
    }else {
        protocol = 'http'
    }
    
    const url = `${protocol}://${host}${path}${queryStr}`
    const sso = `${user}:${pwd}`
    var headers = null
    if (cookie){
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            Cookie: cookie
        }
    }
    else if (jwt !== null){
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        }
    }
    else {
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
    // debugging
    // console.log('info', `fetch url ${url}`)
    // console.log('info', `fetch header =`)
    // console.log('info', headers)

    const client = got.extend({
        json, 
        baseUrl: url,
        port,
        // default is no timeout
        timeout: 10000,
        rejectUnauthorized: false,
        agent: false,
        requestCert: true,
        method,
        auth: sso,
        headers
    })

    try {
        var http = await client(url)
        if(!method === 'DELETE' && !http.body){
            throw ('No Body')
        }
        return http
    } catch (e) {
        console.error(e)
        throw (e)
    }
}


module.exports = {
    httpFetch
}