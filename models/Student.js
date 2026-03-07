const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    studentName: {
        type: String, 
        trim: true,
        required: true,
    },

    studentSurname: {
        type: String,
        trim: true,
        required: true
    },

    studentGender: {
        type: String,
        trim: true,
        required: true,
    },

    studentWeight: {
        type: Number,
        default: null,
    },
    studentHeight: {
        type: Number,
        default: null,
    },

    studentChatId: {
        type: String,
        trim: true,
        unique: true,
        required: true,
    },

    studentCoach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: true,
    },
    studentTrainings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Training'
    }],
    studentCanSelfLog: {
        type: Boolean,
        default: false,
    }
},

{timestamps: true})

const Student = mongoose.model('Student', StudentSchema);

module.exports = Student;