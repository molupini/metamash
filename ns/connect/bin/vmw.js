const { httpFetch } = require('./fetch')


// if Hostname getaddrinfo ENOTFOUND use IP
// STEP 1
var login = async function(vCenter, user, password){
    try {
        const session = await httpFetch(443, vCenter, '/rest/com/vmware/cis/session', true, '', 'POST', user, password)    
        // debugging
        // console.log(session.body.value)
        const cookie = `vmware-api-session-id=${session.body.value}`
        return cookie
    } catch (e) {
        // console.Error(e)
        throw new Error(e)
    }
}

// GET PATH FOR A FULL RETURN 
var getPath = async function (vCenter, path, query, user, password, cookie){
    try {
        const list = await httpFetch(443, vCenter, `/rest/vcenter/${path}`, true, query, 'GET', user, password, cookie)
        return list.body.value
    } catch (e) {
        throw new Error(e)
    }
}

// GET PATH REGEX WILL INCLUDE A MATCH 
// NEED FULL PATH UNLIKE ABOVE 
var getPathRegEx = async function (vCenter, path, query, regex, user, password, cookie){
    try {
        const upper = regex.toUpperCase()
        const re = new RegExp(upper)
        // console.log(re)
        // console.log(query)
        const list = await httpFetch(443, vCenter, path, true, query, 'GET', user, password, cookie)
        // debugging
        // console.log(list.body.value)
        array = []
        list.body.value.forEach(element => {
            if(element.name.toUpperCase().match(re)){
                const object = {
                    ...element
                }
                array.push(object)
            }
        })
        // debugging
        // console.log(array)
        return array
    } catch (e) {
        throw new Error(e)
    }
}

// CLUSTER SPECIFIC REQUEST WITH REGEX 
var clusterRegEx = async function (vCenter, query, regex, user, password, cookie){
    try {
        const upper = regex.toUpperCase()
        const re = new RegExp(upper)
        console.log(re)
        const list = await httpFetch(443, vCenter, '/rest/vcenter/cluster', true, query, 'GET', user, password, cookie)
        // console.log(list.body.value)
        array = []
        list.body.value.forEach(cls => {         
            if(cls.drs_enabled === true && cls.ha_enabled === true && cls.name.toUpperCase().match(re)){
                const object = {
                    ...cls
                }
                array.push(object)
            }
        })
        // debugging
        // console.log(array)
        return array
    } catch (e) {
        throw new Error(e)
    }
}

// CLUSTER SPECIFIC REQUEST WITH CAPACITY CHECK OF GREATER THEN 10 %, 
// REGEX EXAMPLE (esx\d{0,3}|local|\-stage|-temp)
var dataStore = async function (vCenter, user, password, cookie, regex='null'){
    try {
        const list = await httpFetch(443, vCenter, '/rest/vcenter/datastore', true, '?filter.types.1=VMFS', 'GET', user, password, cookie)
        array = []
        list.body.value.forEach(ds => {
            if(!ds.name.toLowerCase().match(regex) && (ds.free_space/ds.capacity) > .10){
                const object = {
                    name: ds.name,
                    id: ds.datastore,
                    bytesUsed: ds.capacity,
                    bytesFree: ds.free_space,
                    percentFree: (ds.free_space/ds.capacity)
                }
                array.push(object)
            }
        })
        // debugging
        // console.log(array)
        return array
    } catch (e) {
        throw new Error(e)
    }
}

// LASTLY, LOGOFF 
var logoff = async function(vCenter, user, password, cookie){
    try {
        const session = await httpFetch(443, vCenter, '/rest/com/vmware/cis/session', true, '', 'DELETE', user, password, cookie)
        // console.log(`session deleted ${session.statusCode}`)
        return session.statusCode
    } catch (e) {
        throw new Error(e)
    }
}


module.exports = {
    login,
    getPath,
    getPathRegEx,
    clusterRegEx,
    dataStore,
    logoff
}

