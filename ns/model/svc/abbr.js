const mongoose = require('mongoose')
// APP
const Config = require('../app/config')
const Tag = require('../app/tag')


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
    },
    useAsTag:{
        type: Boolean,
        default: true
    },
    inTagModel: {
        type: Boolean,
        default: false
    },
    inConfigModel: {
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
        // SEED ARRAY WITHIN OTHER DOCUMENTS REMOVES ALL, CAN UNCOMMENT BELOW IF NOT TO KEEP CONSISTENT 
        await Abbr.deleteMany({})

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

// VERIFY THAT KEY IS IN EITHER TAG OR CONFIG MODEL WITHIN APP FOLDER
// TODO ... will need to perform same process for label for example to verify if array has valid values 
abbrSchema.pre('save', async function(next){
    try {
        const abbr = this

        const tag = Object.keys(Tag.schema.obj)
        const config = Object.keys(Config.schema.obj)
        config.splice(config.indexOf('resourceType'), 1)

        // debugging
        // console.log('model abbr pre save =')
        // console.log('config =')
        // console.log(config)

        // TAG
        if(tag.indexOf(abbr.keyLabel) !== -1){
            abbr.inTagModel = true
        }
        // CONFIG 
        if(config.indexOf(abbr.keyLabel) !== -1){
            abbr.inConfigModel = true
        } 
        // NEITHER FALSE, DEFAULT 
        // WARNING TO CONSOLE IF KEY NOT PRESENT WITHIN SPECIFIC MODEL
        if(abbr.useAsTag && !abbr.inTagModel){
            console.warn({'warn': `element ${abbr.keyLabel} not in tag model`})
        }

        if(!abbr.useAsTag && !abbr.inConfigModel){
            console.warn({'warn': `element ${abbr.keyLabel} not in config model`})
        }

    } catch (e) {
        console.error(e)
        throw {error: e}
    }
    next()
})

const Abbr = mongoose.model('Abbr', abbrSchema)

module.exports = Abbr
