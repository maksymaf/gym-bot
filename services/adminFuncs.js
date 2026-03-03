const Config = require('../models/Config');

async function getConfig() {
  let config = await Config.findOne();
  if (!config) {
    config = await Config.create({
      adminIds: [process.env.ADMIN_ID],
      coachIds: [],
      admins: [{ id: process.env.ADMIN_ID, name: 'Головний адмін' }]
    });
  }
  return config;
}

async function isAdmin(id) {
  const config = await getConfig();
  return config.adminIds.includes(String(id));
}

async function isCoach(id) {
  const config = await getConfig();
  return config.coachIds.includes(String(id));
}

async function isStudent(id) {
    const student = await Student.findOne({ studentChatId: String(id) });
    return !!student;
}

module.exports = {
    getConfig,
    isAdmin,
    isCoach,
    isStudent,
}
