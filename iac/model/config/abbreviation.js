const mongoose = require('mongoose')


const abbreviationSchema = new mongoose.Schema({
    elementLabel: {
        type: String,
        trim: true,
        minlength: 2, 
        maxlength: 5, 
        uppercase: true,
        required: true,
        unique: true
    },
    keyLabel: {
        type: String,
        trim: true,
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 64, 
        default: 'NULL'
    },
    systemDefined: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})


abbreviationSchema.methods.toJSON = function(){
    const abbreviation = this.toObject()
    return abbreviation
}

abbreviationSchema.statics.seedArray = async function (obj = []) {
    try {
        const verifyThenAdd = async (object = []) => {
            for (i = 0; i < object.length; i++){
                const abbreviation = await Abbreviations.findOne({
                    elementLabel: object[i].elementLabel
                })
                if(abbreviation){
                    return 1
                } 
                const add = await new Abbreviations({
                    elementLabel: object[i].elementLabel,
                    keyLabel: object[i].keyLabel,
                    description: object[i].description,
                    systemDefined: object[i].systemDefined
                })
                await add.save()
            }
        }
        try {
            const add = await verifyThenAdd(obj)
            if(add === 1){
                return add
            }
            return 0
        } catch (e) {
            // console.log(e)
            throw new Error(e)
        }
        
    } catch (e) {
        // console.error(e)
        throw new Error(e)
    }
}

// abbreviationSchema.pre('save', async function(next) {
//     next()
// })

const Abbreviations = mongoose.model('Abbreviations', abbreviationSchema)

module.exports = Abbreviations
