const { httpFetch } = require('./fetch')


// if srv006383.mud.internal.co.za getaddrinfo ENOTFOUND use IP 
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

var getPath = async function (vCenter, path, query, user, password, cookie){
    try {
        const list = await httpFetch(443, vCenter, `/rest/vcenter/${path}`, true, query, 'GET', user, password, cookie)
        return list.body.value
    } catch (e) {
        throw new Error(e)
    }
}

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

var datastore = async function (vCenter, user, password, cookie){
    try {
        const list = await httpFetch(443, vCenter, '/rest/vcenter/datastore', true, '?filter.types.1=VMFS', 'GET', user, password, cookie)
        array = []
        list.body.value.forEach(ds => {
            if(!ds.name.toLowerCase().match(/(esx\d{0,3}|local|\-drt\d{0,3}|\-stage)|datastore|-gbt$|-temp$|-scratch$/) && (ds.free_space/ds.capacity) > .10){
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
    datastore,
    logoff
}

