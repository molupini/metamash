const mongoose = require('mongoose')
const Abbr = require('../svc/abbr')


const tagSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'Deployment'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'Resource'
    },
    rootOrganization: {
        type: String,
        trim: true,
        required: false
    },
    branchOrganization: {
        type: String,
        trim: true,
        required: false
    },
    leafOrganization: {
        type: String,
        trim: true,
        required: false
    },
    environment: {
        type: String,
        trim: true,
        required: false
    },
    provider: {
        type: String,
        trim: true,
        required: false
    },
    location: {
        type: String,
        trim: true,
        required: false
    },
    resourceType: {
        type: String,
        trim: true,
        required: false
    },
    perimeter: {
        type: String,
        trim: true,
        required: false
    },
    application: {
        type: String,
        trim: true,
        required: false
    },
    costCenter: {
        type: String,
        trim: true,
        required: false
    },
    deploymentId: {
        type: String,
        trim: true,
        required: false
    },
    resourceId: {
        type: String,
        trim: true,
        required: false
    },
    Name: {
        type: String,
        trim: true,
        required: false
    }
    // #1 TODO REMOVING AS NOT ALLOWING FOR STRUCTURE WITH SPECIFIC REQUESTS, RATHER HAVE OBJECTS SPECIFIED AND GROW ORGANICALLY  
    // entry: {
    // }
})

tagSchema.methods.toJSON = function(){
    const tag = this.toObject()
    delete tag.__v
    // REDUCE CLUTTER 
    delete tag.author
    delete tag.owner
    // delete tag._id
    return tag
}


// // TODO VERIFY THAT VALUE WITHIN ABBR MODEL SVC FOLDER, REMOVE TO REMOVE COMPLEXITY WITHIN UTIL NAMES IF NECESSARY SEE ALSO RELATIONSHIP LOGIC 
tagSchema.pre('save', async function (next){
    try {
        const tag = this
        // const object = {}

        // // TODO SEE ABOVE EXPLANATION #1 
        // if(tag.isNew){
        //     const key = Object.keys(tag.entry)
        //     for(let i = 0; i < key.length; i++){
        //         const value = tag.entry[key[i]]
        //         if(value){
        //             object[key[i]] = value
        //         }
        //     }
        //     tag.entry = object
        // }

        // // #2, ANY SAVE ACTION  
        // console.log('check, tag model =')
        // const check = Object.assign(tag.toObject())
        // // NOT VALID FOR VERIFICATION
        // delete check.__v
        // delete check._id
        // delete check.author
        // delete check.owner
        // delete check.Name
        // delete check.deploymentId
        // delete check.resourceId

        // const key = Object.keys(check)
        // // delete tag._id
        // for (let i = 0; i < key.length; i++){
        //     console.log('i =')
        //     console.log(i)
        //     console.log(key[i])
        //     const element = check[key[i]]
        //     console.log(element)
        //     const abbr = await Abbr.findOne({
        //         elementLabel: element
        //     })
        //     if(!abbr){
        //         throw `missing element ${element}`
        //     }
        // }

        
    } catch (e) {
        console.error(e)
        throw ({error: e})
    }
    next()
})

const Tag = mongoose.model('Tag', tagSchema)

module.exports = Tag