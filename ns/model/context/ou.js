const mongoose = require('mongoose')
const MiscConfig = require('../misc')

// TODO if cluster and businessEntity are not equal during resource build this would result in a shared Infrastructure component
// TODO ensure document clean up as un-unique 
const organizationalUnitSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'MainConnector'
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'Tenant'
    },
    account: {
        type: String,
        minlength: 3,
        maxlength: 32,
        default: 'null',
        unique: true
    },
    remoteStateDeploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    remoteStateReadyEnabled: {
        type: Boolean,
        default: false
    }
}, {
    // timestamps: true
})

// organizationalUnitSchema.index({owner: 1, author: 1,  account: 1}, {unique: true})

// index provider & logicalName
// tenantSchema.index({cluster: 1, businessEntity: 1}, {unique: true})


organizationalUnitSchema.methods.toJSON = function(){
    const organizationalUnit = this.toObject()
    return organizationalUnit
}

organizationalUnitSchema.statics.accountName = (tenant = null, delimiter = '-', provider = null, label = null) => {
    return `${tenant}${delimiter}${provider}${delimiter}${label}`
}

organizationalUnitSchema.statics.projectName = async (tenant = null, delimiter = '-', provider = null, label = null) => {
    var name = `${tenant}${delimiter}${provider}${delimiter}${label}`.split(delimiter).filter( (filter) => filter !== 'null').join(delimiter)
    // REGEX MONGOOSE WITH PROJECT ACCOUNT PATTERN IF NOTHING FOUND START 00x, 001s
    var padding = name.match(/\d{1,6}$/)[0]
    if (padding){
        padding = padding.split('')
    }
    var prefix = name.replace(/\d{1,6}$/, '')
    const re = RegExp(prefix)
    var count = await OrganizationalUnit.countDocuments({'account': {$regex: re}})
    // debugging
    // console.log(padding, prefix, re, count)
    if (count >= 0) {
        count++
        count = count.toString().split('')
        if(count.length <= padding.length){
            for (let i = 0; i < count.length; i++){
                padding.pop()
            }
            padding = Array.isArray(padding) === true ? padding.join('') : padding
            count = Array.isArray(count) === true ? count.join('') : count
            return [prefix, padding, count]
        }
    }
    throw new Error('Bad name')
}

organizationalUnitSchema.methods.seedEnvironmentAccount = async function(owner, author, businessEntity, cluster, delimiter, array = []){
    // console.log(array)
    // for (i = 0; i < array.length; i++) {
    //     console.log(array[i])
    // }   
    array.forEach ((ar) => {
        // console.log(`${businessEntity}${delimiter}${cluster}${delimiter}${ar}`)
        const ou = new OrganizationalUnit({
            owner,
            author,
            account: `${businessEntity}${delimiter}${cluster}${delimiter}${ar}`
        })
        ou.save()
    })
}

organizationalUnitSchema.pre('save', async function(next){
    try {
        const ou = this
        const misc = await MiscConfig.findOne({
            author:  ou.author
        })
        if(ou.isNew){
            const set = new Set(ou.account.split(misc.stringDelimiter))
            const array = Array.from(set)
            ou.account = array.join(misc.stringDelimiter)
        }
    } catch (e) {
        console.log(e)
    }
    next()
})

const OrganizationalUnit = mongoose.model('OrganizationalUnit', organizationalUnitSchema)

module.exports = OrganizationalUnit