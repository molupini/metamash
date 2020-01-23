const mongoose = require('mongoose')
const Abbr = require('../svc/abbr')

const connectorSchema = new mongoose.Schema({
    provider:{
        type: String,
        required: true
    },
    rootOrganization: {
        type: String,
        required: true
    }
    // TODO FUTURE USE, EVAL IF NECESSARY 
    // ,
    // location: {
    //     type: String,
    //     trim: true,
    //     // required: true, 
    //     default: 'null'
    // },
    // TODO FUTURE USE 
    // keywordRegex: {
    //     type: Array,
    //     trim: true,
    //     default: []
    // }, 
     // TODO FUTURE USE 
    // disableDiscovery: {
    //     type: Boolean,
    //     default: true
    // }
}, {
    // timestamps: true
})

// index provider & instance
connectorSchema.index({provider: 1, rootOrganization: 1}, {unique: true})

connectorSchema.virtual('relationship', {
    ref: 'Relationship',
    localField: '_id',
    foreignField: 'owner'
})
// connectorSchema.virtual('account', {
//     ref: 'Account',
//     localField: '_id',
//     foreignField: 'owner'
// })

// schema methods 
connectorSchema.methods.toJSON = function(){
    const connector = this.toObject()
    return connector
}

// connectorSchema.statics.seedVPC = async function (list = [], connect=null){
//     try {
//         if (connect !== null && list.length > 0){
//             await list.forEach(element => {
//                 var addVPC = async (element) => {
//                     var vpc = null
//                     // TODO VERIFY IF INSTEAD OF FIND, USE findOneAndDelete
//                     const find = await Resource.findOneAndDelete({
//                         logicalName: element.name
//                     }, null)
//                     // debugging
//                     // console.log('element =')
//                     // console.log(element)
//                     // console.log('find =')
//                     // console.log(find)
//                     if(!find){
//                         vpc = await new Resource({
//                             author: connect._id, 
//                             owner: connect._id, 
//                             resourceType: 'VPC',
//                             logicalName: element.name, 
//                             logicalId: element.id
//                         })
//                         const setting = await new ResourceSetting({
//                             author: vpc.id,
//                             owner: connect._id, 
//                             cidr: element.cidr
//                         })
//                         await vpc.save()
//                         await setting.save()
//                         // debugging
//                         // console.log('vpc =')
//                         // console.log(vpc)
//                         // console.log('setting =')
//                         // console.log(setting)
//                     }
//                     return vpc
//                 }
//                 addVPC(element)
//             })
//         }
//     } catch (e) {
//         throw new Error(e)
//     }
// }

connectorSchema.pre('save', async function (next) {
    try {
        const connector = this

        // console.log(connector)
        const keys = Object.keys(connector.schema.obj)
        delete keys._id
        // debugging
        // console.log('keys =')
        // console.log(keys)
        for (i = 0; i < keys.length; i++){
            // debugging
            const key = keys[i]
            const value = connector[key]
            // debugging
            // console.log(key)
            // console.log(value)
            const elements = await Abbr
                .find({
                    keyLabel: key
                })
                .distinct('elementLabel')
            // debugging
            // console.log(elements)
            const idx = elements.indexOf(value)
            // NOT FOUND IN ARRAY
            if(idx < 0){
                throw {'error': `missing element`}
            }
        }
        next()
    } 
    catch (e) {
        throw (e)
    }
})

connectorSchema.pre('remove', async function (next) {
    try {
        const connector = this
        // await ?.deleteMany({
        //     author: connector._id
        // })
        next()
    } 
    catch (e) {
        throw new Error(e)
    }
})


const Connector = mongoose.model('Connector', connectorSchema)

module.exports = Connector