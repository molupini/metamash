const mongoose = require('mongoose')
const validator = require('validator')

// TODO ensure document clean up as un-unique 
const securityRuleSchema = new mongoose.Schema({
    // RESOURCE ID
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null
    },
    // DEPLOYMENT ID
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null
    },
    // ruleName:{
    //     type: String,
    //     trim: true,
    //     required: true,
    //     unique: true,
    //     index: true
    // },
    port:{
        type: String,
        trim: true,
        required: true,
        validate(value){
            if(!validator.isPort(value)){
                throw new Error('Please provide valid port Number')
            }
        }
    },
    source:{
        type: String,
        trim: true,
        required: true,
        validate(value){
            if ((!value.match(/^(sg-)/) & !value.match(/\//)) !== 0){
                throw new Error('Please provide source')
            }
            if(value.match(/\//) && !validator.isIP(value.split('/')[0])){
                throw new Error('Please valid source')
            }
        }
    },
    direction:{
        type: String,
        trim: true,
        required: true,
        validate(value){
            if (!value.match(/(ingress|egress)/)){
                throw new Error('Please provide valid direction')
            }
        }
    },
    forResource:{
        type: String,
        trim: true,
        required: true,
        validate(value){
            const re = new RegExp('(SELF|ESX|VM|DC|TMP|HPV|CLS|NETW|PHY|NOSQL|SQL|CON|FUNC|BLOB|VPC|API|SMS|MAIL|GRP|USR|NLB|DNS|APP|WEB|WEBVM|DBVM|EC2|DYN|S3|ECS|BEAN|STATE|EBS|RDS)')
            if(!value.match(re)){
                throw new Error('Please provide Resource')
            }
        }
    },
    toResource:{
        type: String,
        trim: true,
        required: true,
        validate(value){
            const re = new RegExp('(SELF|ESX|VM|DC|TMP|HPV|CLS|NETW|PHY|NOSQL|SQL|CON|FUNC|BLOB|VPC|API|SMS|MAIL|GRP|USR|NLB|DNS|APP|WEB|WEBVM|DBVM|EC2|DYN|S3|ECS|BEAN|STATE|EBS|RDS)')
            if(!value.match(re)){
                throw new Error('Please provide Resource')
            }
        }
    },
}, {
    // timestamps: true
})

securityRuleSchema.methods.toJSON = function(){
    const securityRule = this.toObject()
    return securityRule
}

// securityRuleSchema.pre('save', async function(next){
//     try {
//         const securityRule = this
//         console.log(securityRule)
//         next()
//     } catch (e) {
        
//     }
// })

const SecurityRules = mongoose.model('SecurityRules', securityRuleSchema)

module.exports = SecurityRules