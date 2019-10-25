const mongoose = require('mongoose')

// custom models
// const Resource = require('./resource')
const Environments = require('./context/environments')
const Locations = require('./context/locations')
const Networks = require('./context/networks')
const Resources = require('./context/resources')
const Tenants = require('./context/tenants')
// const Tiers = require('./context/tiers')
const OrganizationalUnit = require('./context/ou')
const Perimeters = require('./context/perimeter')
// const Perimeters = require('./context/perimeter')

const MiscConfig = require('./misc')
const Labels = require('./config/labels')

// custom modules 
// const aws = require('../connect/bin/aws')
const { logger } = require('../src/util/log')
const { trueFalse, verifyPattern } = require('../src/util/plot')

// 3rd party 
const AWS = require('aws-sdk')
const uuid = require('uuid')

// design schema
const mainConnectorSchema = new mongoose.Schema({
    provider:{
        type: String,
        uppercase: true,
        trim: true,
        required: true,
        default: 'AWS',
        validate(value){
            if(!value.match(/(AWS|AZ|VMW|VMM|GCP)/)){
                throw new Error('Please provide valid provider')
            }
        }
    },
    // TODO Might not require
    groupOrganization: {
        type: String,
        // required: true,
        trim: true,
        uppercase: true,
        default: 'SG'
    },
    // // TODO need to encrypt
    // accessKey: {
    //     type: String,
    //     trim: true,
    //     default: null
    // }
    // ,
    // // TODO need to encrypt
    // secretKey: {
    //     type: String,
    //     trim: true,
    //     default: null
    // },
    // field used with vcenter 
    // instance: {
    //     type: String,
    //     trim: true,
    //     // required: true, 
    //     default: null
    // },
    // field used with aws 
    location: {
        type: String,
        trim: true,
        // required: true, 
        default: 'null'
    },
    // sessionId: {
    //     type: String,
    //     trim: true,
    //     default: null
    // }, 
    VPCKeywordRegex: {
        type: Array,
        trim: true,
        default: []
    }, 
    // VPCString: {
    //     type: String,
    //     trim: true,
    //     default: ''
    // }, 
    // clusterRegex: {
    //     type: String,
    //     trim: true,
    //     default: '//'
    // }, 
    // clusterQueryString: {
    //     type: String,
    //     trim: true,
    //     default: ''
    // }, 
    // networkQueryString: {
    //     type: String,
    //     trim: true,
    //     default: ''
    // }, 
    // datastoreRegex: {
    //     type: String,
    //     trim: true,
    //     default: '//'
    // }, 
    // datastoreQueryString: {
    //     type: String,
    //     trim: true,
    //     default: ''
    // },
    // folderRegex: {
    //     type: String,
    //     trim: true,
    //     default: '//'
    // }, 
    // folderQueryString: {
    //     type: String,
    //     trim: true,
    //     default: ''
    // }
    // , 
    // templates: {
    //     type: Array,
    //     trim: true,
    //     default: ['WIN2016', 'RHEL7'],
    //     validate(value){
    //         value.forEach((tmp) => {
    //             if(!tmp.length <= 32 && !tmp.length >= 3){
    //                 throw new Error('Please provide valid template array')
    //             }
    //         })
    //     }
    // }
    disableDiscovery: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

// index provider & instance
mainConnectorSchema.index({provider: 1, groupOrganization: 1, instance: 1}, {unique: true})

// virtual(s)  
mainConnectorSchema.virtual('environments', {
    ref: 'Environments',
    localField: '_id',
    foreignField: 'author'
})
mainConnectorSchema.virtual('locations', {
    ref: 'Locations',
    localField: '_id',
    foreignField: 'author'
})
mainConnectorSchema.virtual('networks', {
    ref: 'Networks',
    localField: '_id',
    foreignField: 'author'
})
mainConnectorSchema.virtual('resources', {
    ref: 'Resources',
    localField: '_id',
    foreignField: 'author'
})
mainConnectorSchema.virtual('tenants', {
    ref: 'Tenants',
    localField: '_id',
    foreignField: 'author'
})
mainConnectorSchema.virtual('misc', {
    ref: 'MiscConfig',
    localField: '_id',
    foreignField: 'owner'
})
mainConnectorSchema.virtual('ou', {
    ref: 'OrganizationalUnit',
    localField: '_id',
    foreignField: 'owner'
})
mainConnectorSchema.virtual('perimeters', {
    ref: 'Perimeters',
    localField: '_id',
    foreignField: 'author'
})
mainConnectorSchema.virtual('labels', {
    ref: 'Labels',
    localField: '_id',
    foreignField: 'author'
})

// schema methods 
mainConnectorSchema.methods.toJSON = function(){
    const connector = this.toObject()
    return connector
}

mainConnectorSchema.methods.seedVPC = async function (list){
    try {
        const connector = this
        // console.log(connector)
        await list.forEach(element => {
            
            var addVPC = async (element) => {
                var vpc = null
                const find = await Resources.findOne({
                    logicalName: element.name
                }, null)
                // debugging
                // console.log('element =')
                // console.log(element)
                // console.log('find =')
                // console.log(find)
                if(!find){
                    vpc = await new Resources({
                        author: connector._id, 
                        owner: connector._id, 
                        resourceType: 'VPC',
                        logicalName: element.name, 
                        logicalId: element.id,
                        misc:
                            {
                                cidr: element.cidr
                            }

                    })
                    await vpc.save()
                }
                return vpc
            }
            addVPC(element)
            // debugging
            // console.log(vpc)
        })
        // console.log(list)
    } catch (e) {
        throw new Error(e)
    }
}

mainConnectorSchema.methods.loadCred = async function(key, secret, session = null) {
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
        if(!cred){
            throw new Error('Please verify connector') 
        }
        return cred
    } catch (e) {
        console.Error(e)
        throw new Error(e)
    }
}

mainConnectorSchema.methods.filterVPC = async function (arr = [], regex) {
    try {
        var array = []
        var name = null

        for (x = 0; x < arr.length; x++){
            const vpc = arr[x]
            const id = vpc.VpcId
            const cidr = vpc.CidrBlock
            const owner = vpc.OwnerId
            const state = vpc.State
            const tags = vpc.Tags
            var name = null
            // console.log(vpc.Tags)
            for (i = 0; i < tags.length; i++){
                if(tags[i]['Key'] === 'Name'){
                    name = tags[i].Value
                }
            }
            if(state === 'available'){
                // console.log(regex)
                const trueName = await verifyPattern(name, regex)
                if(trueName){
                    array.push({id, cidr, owner, state, name})
                }
            }
        }
        return array
    } catch (e) {
        throw new Error(e)
    }
}

// TODO, issue with return data unable to await for nested async function
mainConnectorSchema.methods.getVPC = async function(cred, location, regex) {
    try {
        const connector = this
        const ec2 = await new AWS.EC2({apiVersion: '2016-11-15', region: location, credentials: cred})
        // console.log('getVPC ec2=')
        // console.log(ec2)
        if(!ec2){
            throw new Error('Please verify connector') 
        }
        const vpc = await ec2.describeVpcs({}, async function (err, data) {
            if(err){
                throw new Error(err)
            }
            const list = await connector.filterVPC(data.Vpcs, regex)
            await connector.seedVPC(list)
            // return list
        })
        // return vpc
    } catch (e) {
        // console.Error(e)
        throw new Error(e)
    }
}

mainConnectorSchema.pre('save', async function (next) {
    try {
        const connector = this
        // debugging
        // console.log(connector)
        if(connector.isNew){
            const environments = new Environments({
                author: connector.id
            })
            const locations = new Locations({
                author: connector.id,
                primary: connector.location
            })
            const networks = new Networks({
                author: connector.id
            })
            const resources = new Resources({
                author: connector.id,
                owner: connector.id
            })
            const tenants = new Tenants({
                author: connector.id
            })
            // const compTiers = new Tiers({
            //     author: connector.id,
            //     tier: 'COMPU'
            // })
            // const storageTiers = new Tiers({
            //     author: connector.id,
            //     tier: 'STOR'
            // })
            // const applicationTiers = new Tiers({
            //     author: connector.id,
            //     tier: 'APP'
            // })
            const misc = new MiscConfig({
                owner: connector.id, 
                author: connector.id
            })
            const zones = new Perimeters({
                author: connector.id
            })
            const vpcLabel = new Labels({
                author: connector.id
            })
            const ec2label = new Labels({
                author: connector.id,
                resourceType: 'EC2'
            })
            const dynLabel = new Labels({
                author: connector.id,
                resourceType: 'DYN'
            })
            const s3label = new Labels({
                author: connector.id,
                resourceType: 'S3',
            })
            const userLabel = new Labels({
                author: connector.id,
                resourceType: 'USR'
            })
            const adminUserLabel = new Labels({
                author: connector.id,
                resourceType: 'AUSR'
            })
            const readUserLabel = new Labels({
                author: connector.id,
                resourceType: 'RUSR'
            })
            const groupLabel = new Labels({
                author: connector.id,
                resourceType: 'GRP',
            })
            const adminGroupLabel = new Labels({
                author: connector.id,
                resourceType: 'AGRP',
            })
            const readGroupLabel = new Labels({
                author: connector.id,
                resourceType: 'RGRP',
            })
            const beanLabel = new Labels({
                author: connector.id,
                resourceType: 'BEAN'
            })
            const stateLabel = new Labels({
                author: connector.id,
                resourceType: 'STATE',
                padding: '0'
            })
            await environments.save()
            await locations.save()
            await networks.save()
            await resources.save()
            await tenants.save()
            // await compTiers.save()
            // await storageTiers.save()
            // await applicationTiers.save()
            await misc.save()
            await zones.save()
            await vpcLabel.save()
            await ec2label.save()
            await dynLabel.save()
            await s3label.save()
            await groupLabel.save()
            await adminGroupLabel.save()
            await readGroupLabel.save()
            await userLabel.save()
            await adminUserLabel.save()
            await readUserLabel.save()
            await beanLabel.save()
            await stateLabel.save()
            // label.tags.location[0].primary = connector.region
        }
        if(!connector.disableDiscovery && !connector.isNew && connector.provider === 'AWS') {
            const cred = await connector.loadCred(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_KEY)
            if (!cred){
                throw new Error('Please verify connector') 
            }
            const regex = await trueFalse(connector.VPCKeywordRegex)
            logger.log('info', `connector trueFalse`)
            console.log(regex)
            const vpc = await connector.getVPC(cred, connector.location, regex)
        }
        next()
    } 
    catch (e) {
        throw new Error(e)
    }
})

mainConnectorSchema.methods.refreshData = async function (id) {
    await Resources.deleteMany({
        author: id
    })
}

// mainConnectorSchema.post('save', async function (doc, next) {
//     try {
//         const connector = this
//         next()
//     } 
//     catch (e) {
//         throw new Error(e)
//     }
    
// })

// mainConnectorSchema.post('save', async function (doc, next) {
//     try {
//         const connector = this
//         if(!connector.disableDiscovery && connector.provider === 'vsphere') {
//             // const logoff = await vmwApi.logoff(connector.instance, process.env.VSPHERE_ACCESS_KEY, process.env.VSPHERE_SECRET_KEY, connector.sessionId)
//             // console.log(logoff)
//         }
//         next()
//     } 
//     catch (e) {
//         throw new Error(e)
//     }
// })

mainConnectorSchema.pre('remove', async function (next) {
    try {
        const connector = this
        // await VPC.deleteMany({
        //     author: connector._id
        // })
        await Environments.deleteMany({
            author: connector._id
        })
        await Locations.deleteMany({
            author: connector._id
        })
        await Networks.deleteMany({
            author: connector._id
        })
        await Resources.deleteMany({
            author: connector._id
        })
        await Tenants.deleteMany({
            author: connector._id
        })
        // await Tiers.deleteMany({
        //     author: connector._id
        // })
        await MiscConfig.deleteMany({
            owner: connector._id
        })
        await OrganizationalUnit.deleteMany({
            owner: connector._id
        })
        await Perimeters.deleteMany({
            author: connector._id
        })
        // TODO Labels are company Wide, Comment out below 
        await Labels.deleteMany({
            author: connector._id
        })
        next()
    } 
    catch (e) {
        throw new Error(e)
    }
})


const MainConnector = mongoose.model('MainConnector', mainConnectorSchema)

module.exports = MainConnector