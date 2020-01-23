const mongoose = require('mongoose')


const abbrSchema = new mongoose.Schema({
    elementLabel: {
        type: String,
        trim: true,
        minlength: 2, 
        maxlength: 12, 
        required: true,
        lowercase: true,
        uppercase: false,
        unique: true,
        index: true,
        validate(value){
            if (value.match(/\s/)){
                throw new Error('Remove whitespace')
            }
        }
    },
    keyLabel: {
        type: String,
        trim: true,
        minlength: 2, 
        maxlength: 32, 
        required: true,
        validate(value){
            if (value.match(/\s/)){
                throw new Error('Remove whitespace')
            }
        }
    },
    description: {
        type: String,
        trim: true,
        minlength: 2, 
        maxlength: 128, 
        required: true,
        lowercase: true,
        uppercase: false,
        default: 'null'
    },
    systemDefined: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})


abbrSchema.methods.toJSON = function(){
    const abbr = this.toObject()
    return abbr
}

abbrSchema.statics.seedArray = async function (obj = []) {
    try {
        for (i = 0; i < obj.length; i++){
            const abbr = await Abbr.findOne({
                elementLabel: obj[i].elementLabel
            })
            if(!abbr){
                const add = await new Abbr({
                    ...obj[i]
                })
                await add.save()
            } else {
                console.warn({'warn': `element ${abbr.elementLabel}, key ${abbr.keyLabel} exists`})    
            }
        }
    } catch (e) {
        console.error({'error': e.message})
        // throw new Error(e)
    }
}

// abbrSchema.pre('save', async function(next){
//     try {
//         const abbr = this
//     } catch (e) {
//         console.error({'error': e})
//         throw new Error(e)
//     }
//     next()
// })

const Abbr = mongoose.model('Abbr', abbrSchema)

module.exports = Abbr
