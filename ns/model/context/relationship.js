// RELATIONSHIP 
// BETWEEN TAGS AKA ELEMENT LABELS "SEE ABBR" THEN HONOR AND ENFORCE
// AKA RULE 

const mongoose = require('mongoose')
const Abbr = require('../svc/abbr')


const relationshipSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'Connector'
    },
    // USE CASE: ARRAY CHILD 1 - PARENT MANY OTHERWISE IF STRING ONLY 1 - 1 RELATIONSHIP, PARENT SINGULAR
    parent: {
        type: Array,
        required: true,
        default: []
    },
    child: {
        type: String,
        required: true
        // unique: true
    },
    //  USER CASE: IF RELATIONSHIP EXITS ALLOWED TRUE CONTINUE "VERIFY OTHER OPTIONS WITHIN DOC",
    // ... OR ALLOWED FALSE THROW ERROR RELATIONSHIP BLOCKED REGARDLESS OF OPTIONS
    // IF A RELATIONSHIP IS NOT FOUND CONTINUE 
    allow: {
        type: Boolean, 
        required: true, 
        default: true
    },
    // USE CASE: ALLOW VALUE PROMOTION WHEN BUILDING LABEL 
    // IF YOU ARE TO PROMOTE THE CHILD, FALSE BY DEFAULT
    // IF ENABLED AND KEY LABEL IS ALIKE THEN ABLE TO PROMOTE IF ENABLED OTHERWISE IGNORE PROMOTING STRING
    // TODO EXAMPLE ...? 
    promote: {
        type: Boolean, 
        required: true,
        default: false
    },
    // USE CASE: CREATE A BI DIRECTIONAL RELATIONSHIP, DEFAULT ENABLED 
    // WILL NOT PROMOTE PARENT 
    // WILL CREATE A REVERSE CHILD AND PARENT RELATIONSHIP OF THE ORIGIN 
    // reverse:{
    //     type: Boolean, 
    //     required: true,
    //     default: true
    // },
    // IF KEY MATCH UPDATE 
    keyMatch: {
        type: Boolean, 
        required: true,
        default: false
    },
    // IF MORE THEN ONE ELEMENT ENSURE THAT ALL VALUES ARE CHECKED, DEFAULT FALSE
    arrayMatch: {
        type: Boolean, 
        default: false
    }
}, {
    // timestamps: true
})

// INDEX BASED ON CONNECTOR ID, PARENT AND CHILD
// REMEMBER ORDER YOUR INDEX FOR UNIQUENESS
relationshipSchema.index({child: 1, parent: 1, allow: 1, owner: 1}, {unique: true})

relationshipSchema.methods.toJSON = function(){
    const relationship = this.toObject()
    return relationship
}

relationshipSchema.statics.seedArray = async function (arr = [], owner) {
    try {
        // var array = []
        // TEMP, HELPFUL IF BULK ENTRY 
        await Relationship.deleteMany({})

        for (let i = 0; i < arr.length; i++){
            const relationship = await new Relationship({
                owner,
                ...arr[i]
            })
            await relationship.save()
            // array.push(relationship)
        }
        return true
    } catch (e) {
        // console.error(e)
        return false
    }
}

relationshipSchema.pre('save', async function (next) {
    const relationship = this
    const object = relationship.toObject()
    
    try {
        // KEEP BOOL FALSE AND SET KEY MATCH WITHIN DOCUMENT TO FALSE IF KEY LABEL NOT EQUAL 
        delete object.owner
        delete object.promote
        delete object._id
        delete object.allow
        delete object.keyMatch
        delete object.arrayMatch
        // delete object.reverse

        if(object){
            const keys = Object.keys(object)
            var set = new Set()
            var element = null
            const count = keys.length
            // debugging
            // console.log('key count =')
            // console.log(count)
            for (let i = 0; i < keys.length; i++){
                // debugging
                const key = keys[i]
                const value = object[key]
                if (Array.isArray(value)){
                    for (let x = 0; x < value.length; x++){
                        element = await Abbr.findOne({
                            elementLabel: value[x]
                        })
                        if(!element){
                            throw {'error': `${value[x]} missing element`}
                        }
                    }
                } else {
                    element = await Abbr.findOne({
                        elementLabel: value
                    })
                    if(!element){
                        throw {'error': `${value} missing element`}
                    }
                }
                set.add(element.keyLabel)
            }
            // debugging
            // console.log('set =')
            // console.log(set)

            // ARRAY MATCH DEFAULT TO FALSE IF ONLY 1 PARENT STRING
            relationship.arrayMatch = relationship.arrayMatch && relationship.parent.length > 1 ? true : false

            // DO CHILD AND PARENT KEYS MATCH 
            relationship.keyMatch = set.size === count ? false : true

            // TRUE IF PROMOTE TRUE AND KEY MATCH TRUE, OTHERWISE FALSE
            // PROMOTION WILL NOT BE ALLOWED IF MULTI PARENT STRING IN ARRAY
            relationship.promote = relationship.promote && relationship.keyMatch && relationship.parent.length === 1 ? true : false
            
            // TODO VERIFY IF REQUIRED, REMOVING FOR THE INTERIM 
            // if(relationship.reverse){
            //     const parent = await new Relationship({
            //         owner: relationship.owner,
            //         parent: relationship.child,
            //         child: relationship.parent,
            //         allow: relationship.allow,
            //         keyMatch: relationship.keyMatch,
            //         promote: relationship.promote === true ? false : true,
            //         reverse: false
            //     })
            //     await parent.save()
            // }
        }
        next()
    } catch (e) {
        console.error(e)
        throw new Error(e)
    }
})

const Relationship = mongoose.model('Relationship', relationshipSchema)

module.exports = Relationship