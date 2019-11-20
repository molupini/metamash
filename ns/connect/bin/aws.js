const AWS = require('aws-sdk')
const uuid = require('uuid')
const { logger } = require('../../src/util/log')
const MainConnector = require('../../model/connector')
var connectorId = null

var discover = async (key, secret, connector) => {
    connect = connector
    const cred = await loadCred(key, secret)
    // debugging
    // console.log('cred =')
    // console.log(cred)
    await getEC2VPC(cred, connector.location, connector.VPCKeywordRegex)
}

var loadCred = async function(key, secret, session = null) {
    try {
        const options = {
            accessKeyId: key,
            secretAccessKey: secret,
            sessionToken: session,
            expired: true, 
            expiryWindow: 15
        }
        const cred = await new AWS.Credentials(options)
        logger.log('info', `aws loadCred, expired=${cred.expired}`)
        return cred
    } catch (e) {
        console.Error(e)
        throw new Error(e)
    }
}

// TODO, issue with result unable to await for nested async function
var getEC2VPC = async function(cred, location, regex) {
    try {
        var ec2 = null
        var result = null
        re = new RegExp(regex)
        ec2 = await new AWS.EC2({apiVersion: '2016-11-15', region: location, credentials: cred})
        // debugging
        // console.log('getEC2VPC ec2=')
        // console.log(ec2)
        if(!ec2){
            throw new Error('Please verify connector') 
        }

        result = await describeEC2VPC(ec2, regex)
        
        return result
    } catch (e) {
        console.Error(e)
        throw new Error(e)
    }
}

var describeEC2VPC = async function(ec2, regex) {
    try {
        re = new RegExp(regex)
        await ec2.describeVpcs({}, async function (err, data) {
            if(err){
                throw new Error(err)
            }
            const dat = await data.Vpcs
            await listVPC(dat, regex)
        }, [])
    } catch (e) {
        // console.Error(e)
        throw new Error(e)
    }
}

var listVPC = async function (arr = [], regex) {
    try {
        var result = []
        const verifyThenAdd = async (array = [], regex = '') => {
            
            for (x = 0; x < array.length; x++){
                const vpc = array[x]
                const id = vpc.VpcId
                const cidr = vpc.CidrBlock
                const owner = vpc.OwnerId
                const state = vpc.State
                const tags = vpc.Tags
                var name = null
                for (i = 0; i < tags.length; i++){
                    if(tags[i]['Key'] === 'Name'){
                        name = tags[i].Value
                    }
                }
                // debugging
                // console.log('regex =')
                // console.log(regex)
                // && name.match(regex)
                if(state === 'available' && name !== null){
                    
                    const regexObject = await trueFalse(regex)
                    // debugging
                    // console.log('regexObject =')
                    // console.log(regexObject)
                    // console.log('name =')
                    // console.log(name)
                    const trueName = await verifyPattern(name, regexObject)
                    if(trueName){
                        await result.push({id, cidr, owner, state, name})
                    }
                    
                }
            }
        }
        await verifyThenAdd(arr, regex)
        // debugging
        // console.log('listVPC result =')
        // console.log(result)
        // console.log('connect =')
        // console.log(connect)
        await MainConnector.seedVPC(result, connect)
    } catch (e) {
        throw new Error(e)
    }
}

// ALLOW AND NOT ALLOW OBJECT RETURNED 
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
    logger.log('info', `aws verifyPattern ${string}, keyword=${objArray.trueArray.length}, trueCount=${trueCount}`)
    if(trueCount === objArray.trueArray.length){
        return true
    } else {
        return false
    }
}

module.exports = {
    discover
}

