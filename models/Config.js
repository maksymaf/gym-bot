const mongoose = require('mongoose');
const ConfigSchema = new mongoose.Schema({
  adminIds: [{ type: String }],
  coachIds: [{ type: String }],
  admins: [{
    id: { type: String },
    name: { type: String },
  }],
});
module.exports = mongoose.model('Config', ConfigSchema);