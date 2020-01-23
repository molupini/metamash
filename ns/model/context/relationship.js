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
    parent: {
        type: String,
        required: true
        // unique: true
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
    // IF YOU ARE TO PROMOTE THE CHILD REMEMBER, FALSE BY DEFAULT
    // IF ENABLED AND KEY LABEL IS ALIKE THEN ABLE TO PROMOTE IF ENABLED OTHERWISE IGNORE PROMOTING STRING
    // TODO EXAMPLE ...? 
    promote: {
        type: Boolean, 
        required: true,
        default: false
    },
    // IF KEY MATCH UPDATE 
    keyMatch: {
        type: Boolean, 
        required: true,
        default: false
    }
}, {
    // timestamps: true
})

// INDEX BASED ON CONNECTOR ID, PARENT AND CHILD
// REMEMBER ORDER YOUR INDEX FOR UNIQUENESS
relationshipSchema.index({parent: 1, child: 1, owner: 1}, {unique: true})

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

        if(object){
            const keys = Object.keys(object)
            var set = new Set()
            const count = keys.length
            // debugging
            // console.log('key count =')
            // console.log(count)
            for (let i = 0; i < keys.length; i++){
                // debugging
                const key = keys[i]
                const value = object[key]

                const element = await Abbr.findOne({
                    elementLabel: value
                })
                if(!element){
                    throw {'error': `missing element`}
                }
                set.add(element.keyLabel)
            }
            // debugging
            // console.log('set =')
            // console.log(set)
            relationship.keyMatch = set.size === count ? false : true

            // IF PROMOTE TRUE AND KEY MATCH TRUE THEN ALL TRUE OTHERWISE FALSE
            relationship.promote = relationship.promote && relationship.keyMatch ? true : false
        }
        next()
    } catch (e) {
        console.error(e)
        throw (e)
    }
})

const Relationship = mongoose.model('Relationship', relationshipSchema)

module.exports = Relationship