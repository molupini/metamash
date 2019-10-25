const { logger } = require('../util/log')


var privatePlotter = (mapping = [], provider, environment = 'development', tenant, location, network = 'local', template) => {
    try {
        var plot = {}
        mapping.forEach((obj) => {
            if(obj.provider === provider){
                plot.provider = obj.provider
            }
            obj.environmentMap.forEach((en) => {
                if(en[environment] !== undefined){
                    plot.environment = en[environment]
                }
            })
            obj.applicationTierMap.forEach((at) => {
                if(at[plot.environment] !== undefined){
                    plot.applicationTier = at[plot.environment]
                }
            })
            obj.compuTierMap.forEach((ct) => {
                if(ct[plot.environment] !== undefined){
                    plot.compuTier = ct[plot.environment]
                }
            })
            obj.storageTierMap.forEach((st) => {
                if(st[plot.environment] !== undefined){
                    plot.storageTier = st[plot.environment]
                }
            })
            obj.tenantNameMap.forEach((ten) => {
                if(ten[tenant] !== undefined){
                    plot.tenantName = ten[tenant]
                }
            })

            plot.osIsolation = obj.osIsolation
            plot.osIsolationLabel = obj.osIsolationLabel
            
            obj.locationMap.forEach(loc => {
                if(loc[location] !== undefined){
                    plot.location = loc[location]
                }
            })  
            obj.networks.forEach((net) => {
                if(net[network] !== undefined){
                    plot.network = net[network]
                }
            })
            obj.templateMap.forEach((tmp) => {
                if(tmp[template] !== undefined){
                    plot.template = tmp[template]
                }
            })
        })
        // debugging 
        console.log(plot)
        return plot
    } catch (e) {
        throw new Error(e)
    }
} 

var publicPlotter = (mapping = [], provider, environment = 'development', tenant, location, network = 'local', template) => {
    try {
        var plot = {}
        mapping.forEach((obj) => {
            if(obj.provider === provider){
                plot.provider = obj.provider
            }
            obj.environmentMap.forEach((en) => {
                if(en[environment] !== undefined || en[environment] !== null){
                    plot.environment = en[environment]
                }
            })
            obj.applicationTierMap.forEach((at) => {
                if(at[plot.environment] !== undefined || at[plot.environment] !== null){
                    plot.applicationTier = at[plot.environment]
                }
            })
            obj.compuTierMap.forEach((ct) => {
                if(ct[plot.environment] !== undefined || ct[plot.environment] !== null){
                    plot.compuTier = ct[plot.environment]
                }
            })
            obj.storageTierMap.forEach((st) => {
                if(st[plot.environment] !== undefined || st[plot.environment] !== null){
                    plot.storageTier = st[plot.environment]
                }
            })
            obj.tenantNameMap.forEach((ten) => {
                if(ten[tenant] !== undefined || ten[tenant] !== null){
                    plot.tenantName = ten[tenant]
                }
            })
            plot.sharedInfrastructure = obj.sharedInfrastructure
            plot.sharedInfrastructureLabel = obj.sharedInfrastructureLabel
            obj.locationMap.forEach(loc => {
                if(loc[location] !== undefined || loc[location] !== null){
                    plot.location = loc[location]
                }
            })  
            obj.networks.forEach((net) => {
                if(net[network] !== undefined || net[network] !== null){
                    plot.network = net[network]
                }
            })
            obj.templateMap.forEach((tmp) => {
                if(tmp[template] !== undefined || tmp[template] !== null){
                    plot.template = tmp[template]
                }
            })
        })
        // debugging 
        console.log(plot)
        return plot
    } catch (e) {
        throw new Error(e)
    }
} 

var buildRegex = (array = [], spacing = 32) => {
    var re = `^`
    array.forEach((ar) => {
        ar.split(' ').forEach((a) => {
            re += `.{0,${spacing}}(${a})`
        })
    })
    re += `.{0,${spacing}}$`
    // debugging 
    logger.log('info', `plot buildRegex ${re}`)
    return new RegExp(re)
}

var trueFalse = (array = []) => {
    const set = new Set(array)
    const arr = new Set(set)
    var falseArray = []
    var trueArray = []
    
    arr.forEach((a) => {
        if(a[0] === '!'){
            const text = a.replace(/^!/,'')
            falseArray.push(text)
        }
        else{
            trueArray.push(a)
        }
    })
    return {falseArray: falseArray, trueArray: trueArray}
}

var verifyPattern = async (string = '', objArray = []) => {
    // FALSE ARRAY 
    trueCount = 0
    falseCount = 0 
    objArray.trueArray.forEach(element => {
        const re = new RegExp(element)
        if(string.match(re)){
            trueCount++
        }
    })
    objArray.falseArray.forEach(element => {
        const re = new RegExp(element)
        if(string.match(re)){
            trueCount--
        }
    })
    logger.log('info', `plot verifyPattern ${string}, keyword=${objArray.trueArray.length}, trueCount=${trueCount}`)
    if(trueCount === objArray.trueArray.length){
        return true
    } else {
        return false
    }
}


module.exports = {
    privatePlotter, 
    publicPlotter,
    buildRegex,
    trueFalse,
    verifyPattern
}