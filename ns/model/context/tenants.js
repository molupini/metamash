const mongoose = require('mongoose')
const MiscConfig = require('../misc')

// TODO if cluster and businessEntity are not equal during resource build this would result in a shared Infrastructure component
// TODO ensure document clean up as un-unique 
const tenantsSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'MainConnector'
    },
    cluster: {
        type: String,
        uppercase: true, 
        trim: true,
        minlength: 3,
        maxlength: 6,
        default: 'CLU',
        // unique: true
    },
    businessEntity: {
        type: String,
        uppercase: true, 
        trim: true,
        minlength: 3,
        maxlength: 6,
        default: 'BUEN',
        // unique: true
    }
    // ,
    // businessEntity: {
    //     type: String,
    //     default: ['BUEN'],
    //     validate(value){
    //         // console.log(value)
    //         value.forEach(element => {
    //             if(element.match(/\s/)){
    //                 throw new Error('No whitespace accepted')
    //             }
    //             if(!element.match(/^[A-Z]{3,6}$/)){
    //                 throw new Error('No lowercase characters accepted')
    //             }
                
    //         })
    //     }
    // }    
}, {
    // timestamps: true
})

// TODO INDEX ON ALL LISTED KEYS 
tenantsSchema.index({cluster: 1, businessEntity: 1}, {unique: true})

// index provider & logicalName
// tenantSchema.index({cluster: 1, businessEntity: 1}, {unique: true})


tenantsSchema.methods.toJSON = function(){
    const tenants = this.toObject()
    return tenants
}

tenantsSchema.pre('save', async function(next){
    try {
        const tenant = this
        if(tenant.isNew){
            // console.log(tenant)
            const misc = await new MiscConfig({
                owner: tenant.author, 
                author: tenant.id
            })
            await misc.save()
            // console.log(misc)
        }
    } catch (e) {
        console.log(e)
    }
    next()
})


const Tenants = mongoose.model('Tenants', tenantsSchema)

module.exports = Tenants