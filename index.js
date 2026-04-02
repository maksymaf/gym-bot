require('dotenv').config();

const { Bot, Keyboard, session, GrammyError, HttpError, InlineKeyboard } = require('grammy');
const mongoose = require('mongoose');
const Coach = require('./models/Coach');
const Student = require('./models/Student');
const Training = require('./models/Training');
const {isApplied} = require('./services/isApplied');
const { getMessage, getActionButtons } = require('./services/pagination');
const { seedCoachExercises } = require('./services/seedDefaultExercises');
const Config = require('./models/Config');
const { getConfig, isAdmin, isCoach, isStudent } = require('./services/adminFuncs');

const bot = new Bot(process.env.TOKEN)

bot.use(session({
    initial: () => ({})
}));

bot.api.setMyCommands([
    {command: 'start', description: 'запускає бота'}
]);

bot.command('start', async (ctx) => {
    if (await isAdmin(ctx.from.id)) {
        const keyboard = new Keyboard()
            .text('👨‍🏫 Тренери').row()
            .text('👥 Клієнти').row()
            .text('👑 Адміни').row()
            .text('🔑 Зайти як тренер').text('📈 Зайти як клієнт').row()
            .resized();
        return await ctx.reply('👑 Ласкаво просимо, адміне!', { reply_markup: keyboard });
    }

    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
    if (student) {
        const keyboard = new Keyboard()
            .text('💪 Записати тренування').row()
            .text('📋 Мої тренування').row()
            .resized();
        return ctx.reply(`Вітаю, ${student.studentName}! Оберіть дію:`, { reply_markup: keyboard });
    }

    if (await isCoach(ctx.from.id)) {
        const keyboard = new Keyboard().text('Клієнти').row().text('Заявки').row().text('Мої вправи');
        if (await isAdmin(ctx.from.id)) keyboard.row().text('👑 Адмін-панель');
        keyboard.resized();
        return await ctx.reply(`Вітаю у Gym Bot. Ви тренер, це ваш код ${ctx.from.id}. Оберіть наступну дію`, { reply_markup: keyboard });
    }

    const roleKeyboard = new Keyboard().text('📈 Клієнт').row().text('👤 Гість').row().resized().oneTime();
    await ctx.reply(`Вітаю у Gym Bot - оберіть свою роль та почнемо тренуватись 💪`, { reply_markup: roleKeyboard });
});

bot.command('admin', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;

    const keyboard = new Keyboard()
        .text('👨‍🏫 Тренери').row()
        .text('👥 Клієнти').row()
        .text('👑 Адміни').row()
        .text('🔑 Зайти як тренер').text('📈 Зайти як клієнт').row()
        .resized();

    await ctx.reply('👑 Адмін-панель', { reply_markup: keyboard });
});

bot.hears('👥 Клієнти', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;

    const students = await Student.find();
    const keyboard = new InlineKeyboard();
    students.forEach(s => {
    keyboard.text(`❌ ${s.studentName} ${s.studentSurname}`, `admin_remove_student_${s._id}`).row();
    });

    const list = students.length
    ? students.map(s => `• ${s.studentName} ${s.studentSurname} (${s.studentChatId})`).join('\n')
    : 'Клієнтів поки немає';

    await ctx.reply(`👥 Клієнти:\n\n${list}`, { reply_markup: keyboard });
});

bot.hears('👨‍🏫 Тренери', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;

    const config = await getConfig();
    const coaches = await Coach.find({ coachChatId: { $in: config.coachIds } });

    const keyboard = new InlineKeyboard();
    coaches.forEach(c => {
    keyboard.text(`❌ ${c.coachName} ${c.coachSurname}`, `admin_remove_coach_${c.coachChatId}`).row();
    });
    keyboard.text('➕ Додати тренера', 'admin_add_coach');

    const list = coaches.length
    ? coaches.map(c => `• ${c.coachName} ${c.coachSurname} (${c.coachChatId})`).join('\n')
    : 'Тренерів поки немає';

    await ctx.reply(`👨‍🏫 Тренери:\n\n${list}`, { reply_markup: keyboard });
});

bot.hears('📈 Зайти як клієнт', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;

    const existing = await Student.findOne({ studentChatId: String(ctx.from.id) });
    if (existing) {
        const keyboard = new Keyboard()
            .text('💪 Записати тренування').row()
            .text('📋 Мої тренування').row()
            .text('👑 Адмін-панель').row()
            .resized();
        return ctx.reply(`Ви вже зареєстровані як ${existing.studentName}`, { reply_markup: keyboard });
    }

    ctx.session.step = 'coachCode';
    await ctx.reply('Введіть код тренера:');
});


bot.hears('🔑 Зайти як тренер', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;

    const config = await getConfig();
    if (!config.coachIds.includes(String(ctx.from.id))) {
    config.coachIds.push(String(ctx.from.id));
    await config.save();
    }

    const keyboard = new Keyboard().text('Клієнти').row().text('Заявки').row().text('Мої вправи').row().text('👑 Адмін-панель').resized();
    await ctx.reply('Тепер ви тренер 👨‍🏫', { reply_markup: keyboard });
});

bot.hears('👑 Адмін-панель', async (ctx) => {
  if (!await isAdmin(ctx.from.id)) return;

    const keyboard = new Keyboard()
        .text('👨‍🏫 Тренери').row()
        .text('👥 Клієнти').row()
        .text('👑 Адміни').row()
        .text('🔑 Зайти як тренер').text('📈 Зайти як клієнт').row()
        .resized();

  await ctx.reply('👑 Адмін-панель', { reply_markup: keyboard });
});

bot.hears('👑 Адміни', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;

    const config = await getConfig();
    const keyboard = new InlineKeyboard();
    config.admins.forEach(admin => {
    keyboard.text(`❌ ${admin.name} (${admin.id})`, `admin_remove_admin_${admin.id}`).row();
    });
    keyboard.text('➕ Додати адміна', 'admin_add_admin');

    const list = config.admins.length
    ? config.admins.map(a => `• ${a.name} (${a.id})`).join('\n')
    : 'Адмінів поки немає';

    await ctx.reply(`👑 Адміни:\n\n${list}`, { reply_markup: keyboard });
});

bot.callbackQuery('admin_add_admin', async (ctx) => {
    ctx.session.step = 'adminAddAdmin';
    await ctx.answerCallbackQuery();
    await ctx.reply('Введіть Telegram ID нового адміна:');
});

bot.callbackQuery(/admin_remove_admin_(.+)/, async (ctx) => {
    const adminId = ctx.match[1];
    if (adminId === String(ctx.from.id)) {
        return ctx.answerCallbackQuery('Не можна видалити себе!');
    }
    const config = await getConfig();
    config.adminIds = config.adminIds.filter(id => id !== adminId);
    config.admins = config.admins.filter(a => a.id !== adminId);
    await config.save();
    await ctx.answerCallbackQuery('Адміна видалено ✅');
    await ctx.editMessageText('Адміна видалено');
});

bot.callbackQuery('admin_add_coach', async (ctx) => {
    ctx.session.step = 'adminAddCoach';
    await ctx.answerCallbackQuery();
    await ctx.reply('Введіть Telegram ID нового тренера:');
});

bot.callbackQuery(/admin_remove_coach_(.+)/, async (ctx) => {
    const coachChatId = ctx.match[1];
    const config = await getConfig();
    config.coachIds = config.coachIds.filter(id => id !== coachChatId);
    await config.save();
    await ctx.answerCallbackQuery('Тренера видалено ✅');
    await ctx.editMessageText('Тренера видалено');
});

bot.callbackQuery(/admin_remove_student_(.+)/, async (ctx) => {
    const studentId = ctx.match[1];
    await Student.findByIdAndDelete(studentId);
    await ctx.answerCallbackQuery('Клієнта видалено ✅');
    await ctx.editMessageText('Клієнта видалено');
});


bot.hears('👤 Гість', async (ctx) => {

});

bot.hears('Клієнти', async (ctx) => {
    if (!await isCoach(ctx.from.id)) return;

    const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
    if (!coach.coachStudents.length) {
        return ctx.reply('У вас на разі немає клієнтів');
    }

    await ctx.reply(getMessage('students', coach.coachStudents, 0), {
        reply_markup: getActionButtons('students', 0, coach.coachStudents.length, { selfLog: coach.coachStudents[0].studentCanSelfLog })
    });
});

bot.hears('Мої вправи', async (ctx) => {
    if (!await isCoach(ctx.from.id)) return;

    const coach = await Coach.findOne({ coachChatId: ctx.from.id });

    const keyboard = new InlineKeyboard().text('➕ Додати вправу', 'add_exercise').row();

    if (!coach.coachExercises.length) {
        return ctx.reply('У вас ще немає вправ', { reply_markup: keyboard });
    }

    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const list = categories.map(cat => {
        const exs = coach.coachExercises
            .filter(ex => ex.category === cat)
            .map(ex => `  • ${ex.name}`)
            .join('\n');
        return `${cat}\n${exs}`;
    }).join('\n\n');

    categories.forEach((cat, catIdx) => {
        keyboard.text(`🗑 ${cat}`, `del_ex_cat_${catIdx}`).row();
    });

    await ctx.reply(`📋 Ваші вправи:\n\n${list}`, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
    });
});

bot.hears('💪 Записати тренування', async (ctx) => {
    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
    if (!student) return;

    if (!student.studentCanSelfLog) {
        return ctx.reply('❌ Тренер ще не дав вам доступ до самостійного запису тренувань');
    }

    ctx.session.studentTrainingExercises = [];
    ctx.session.step = 'studentPickExercise';

    await showExercisePickerForStudent(ctx, student);
});

bot.hears('📋 Мої тренування', async (ctx) => {
    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
    if (!student) return;

    const trainings = await Training.find({ student: student._id }).sort({ createdAt: -1 });

    if (!trainings.length) {
        return ctx.reply('У вас ще немає тренувань');
    }

    await ctx.reply(getMessage('trainings', trainings, 0), {
        reply_markup: getActionButtons('trainings', 0, trainings.length),
        parse_mode: 'HTML'
    });

    ctx.session.currentTrainings = trainings.map(t => t.toObject());
});

bot.callbackQuery(/^del_ex_cat_(\d+)$/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const selectedCategory = categories[catIdx];

    const exercises = coach.coachExercises
        .map((ex, i) => ({ ...ex.toObject(), globalIdx: i }))
        .filter(ex => ex.category === selectedCategory);

    const keyboard = new InlineKeyboard();
    exercises.forEach(ex => {
        keyboard.text(`❌ ${ex.name}`, `del_ex_${ex.globalIdx}`).row();
    });
    keyboard.text('◀️ Скасувати', 'cancel_del_ex');

    await ctx.answerCallbackQuery();
    await ctx.reply(`Виберіть вправу для видалення з категорії "${selectedCategory}":`, { reply_markup: keyboard });
});

bot.callbackQuery(/^del_ex_(\d+)$/, async (ctx) => {
    const globalIdx = parseInt(ctx.match[1]);
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    const removed = coach.coachExercises[globalIdx];
    if (!removed) return ctx.answerCallbackQuery('Вправу не знайдено');

    coach.coachExercises.splice(globalIdx, 1);
    await coach.save();

    await ctx.answerCallbackQuery(`✅ "${removed.name}" видалено`);
    await ctx.editMessageText(`✅ Вправу "${removed.name}" видалено зі списку`);
});

bot.callbackQuery('cancel_del_ex', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Скасовано');
});

bot.callbackQuery('add_exercise', async (ctx) => {
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];

    const keyboard = new InlineKeyboard();
    categories.forEach((cat, i) => keyboard.text(cat, `custom_ex_cat_${i}`).row());
    keyboard.text('➕ Нова категорія', 'custom_ex_new_cat');

    await ctx.answerCallbackQuery();
    await ctx.reply('Виберіть категорію для нової вправи:', { reply_markup: keyboard });
});

bot.callbackQuery(/custom_ex_cat_(\d+)/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];

    ctx.session.newExerciseCategory = categories[catIdx];
    ctx.session.step = 'addExercise';

    await ctx.answerCallbackQuery();
    await ctx.reply(`Категорія: ${ctx.session.newExerciseCategory}\n\nВведіть назву вправи:`, { parse_mode: 'HTML' });
});

bot.callbackQuery('custom_ex_new_cat', async (ctx) => {
    ctx.session.step = 'addExerciseCategory';
    await ctx.answerCallbackQuery();
    await ctx.reply('Введіть назву нової категорії:');
});

bot.callbackQuery(/add_training_(\d+)/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });

    if (!coach.coachExercises.length) {
        await ctx.answerCallbackQuery('У вас ще немає вправ!');
        return ctx.reply('Спочатку додайте вправи в розділі "Мої вправи"');
    }

    ctx.session.trainingStudentIdx = idx;
    ctx.session.trainingExercises = [];
    ctx.session.step = 'pickExercise';

    await ctx.answerCallbackQuery();
    await showExercisePicker(ctx, coach);
});

async function showExercisePicker(ctx, coach) {
    if (!coach) coach = await Coach.findOne({ coachChatId: ctx.from.id });

    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];

    const keyboard = new InlineKeyboard();
    categories.forEach((cat, i) => {
    keyboard.text(cat, `pick_cat_${i}`).row();
    });
    keyboard.text('✅ Завершити запис тренування', 'finish_training');

    await ctx.reply('Додайте вправу. Для цього оберіть категорію вправи:', { reply_markup: keyboard });
}

async function showExercisePickerForStudent(ctx, student) {
    console.log('=== showExercisePickerForStudent ===');
    console.log('student:', JSON.stringify(student));
    
    if (!student) {
        console.log('STUDENT IS NULL!');
        return ctx.reply('❌ Студента не знайдено');
    }
    
    console.log('studentCoach:', student.studentCoach);
    const coach = await Coach.findById(student.studentCoach);
    console.log('coach:', JSON.stringify(coach?._id));
    
    if (!coach) {
        return ctx.reply('❌ Тренера не знайдено');
    }

    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const keyboard = new InlineKeyboard();
    categories.forEach((cat, i) => {
        keyboard.text(cat, `spick_cat_${i}`).row();
    });
    keyboard.text('✅ Завершити запис тренування', 'student_finish_training');

    await ctx.reply('Оберіть категорію вправи:', { reply_markup: keyboard });
}

bot.callbackQuery(/^pick_cat_(\d+)$/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });

    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const selectedCategory = categories[catIdx];

    const exercises = coach.coachExercises.filter(ex => ex.category === selectedCategory);

    const keyboard = new InlineKeyboard();
    exercises.forEach((ex, i) => {
    keyboard.text(ex.name, `pick_ex_${catIdx}_${i}`).row();
    });
    keyboard.text('◀️ Назад', 'back_to_categories');

    await ctx.editMessageText(`Категорія: ${selectedCategory}\n\nВиберіть вправу:`, {
    reply_markup: keyboard,
    parse_mode: 'HTML'
    });

    await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^pick_ex_(\d+)_(\d+)$/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const exIdx = parseInt(ctx.match[2]);

    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const selectedCategory = categories[catIdx];
    const exercises = coach.coachExercises.filter(ex => ex.category === selectedCategory);

    ctx.session.currentExercise = {
    name: exercises[exIdx].name,
    category: selectedCategory,
    sets: []
    };
    ctx.session.currentSet = 1;
    ctx.session.step = 'setWeight';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
        `Вправа: ${ctx.session.currentExercise.name}\n\nПідхід 1\nВведіть вагу (кг) або "без ваги":`,
        { parse_mode: 'HTML' }
    );
});

bot.callbackQuery('back_to_categories', async (ctx) => {
    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];

    const keyboard = new InlineKeyboard();
    categories.forEach((cat, i) => {
    keyboard.text(cat, `pick_cat_${i}`).row();
    });
    keyboard.text('✅ Завершити запис тренування', 'finish_training');

    await ctx.editMessageText('Додайте вправу. Для цього оберіть категорію вправи:', { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
});

bot.hears('Заявки', async (ctx) => {
        if (!await isCoach(ctx.from.id)) return;

    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
    if (!coach.coachApplications.length) {
        return ctx.reply('На разі немає вхідних заявок від клієнтів');
    }

    await ctx.reply(getMessage('applications', coach.coachApplications, 0), {
        reply_markup: getActionButtons('applications', 0, coach.coachApplications.length),
        parse_mode: 'HTML'
    });
});

bot.callbackQuery(/view_trainings_(\d+)/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);

    const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
    const student = coach.coachStudents[idx];

    const trainings = await Training.find({ student: student._id }).sort({ createdAt: -1 });

    if (!trainings.length) {
    await ctx.answerCallbackQuery();
    return ctx.reply(`У ${student.studentName} ще немає тренувань`);
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(getMessage('trainings', trainings, 0), {
    reply_markup: getActionButtons('trainings', 0, trainings.length),
    parse_mode: 'HTML'
    });

    ctx.session.currentTrainings = trainings.map(t => t.toObject());
});

bot.callbackQuery(/^page_(\w+)_(prev|next)_(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const direction = ctx.match[2];
    let index = parseInt(ctx.match[3]);

    let items;

    if (type === 'trainings') {
        items = ctx.session.currentTrainings;
    } else {
        const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
        if (!coach) return ctx.answerCallbackQuery();
        items = {
            applications: coach.coachApplications,
            students: coach.coachStudents,
        }[type];
    }

    if (!items) return ctx.answerCallbackQuery();

    if (direction === 'next') {
        index = index >= items.length - 1 ? 0 : index + 1;
    } else {
        index = index <= 0 ? items.length - 1 : index - 1;
    }

    const options = type === 'students' ? { selfLog: items[index].studentCanSelfLog } : {};
    await ctx.editMessageText(getMessage(type, items, index), {
        reply_markup: getActionButtons(type, index, items.length, options),
        parse_mode: 'HTML'
    });

    await ctx.answerCallbackQuery();
});

bot.callbackQuery(/delete_training_(\d+)/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    const training = ctx.session.currentTrainings[idx];

    await Training.findByIdAndDelete(training._id);
    ctx.session.currentTrainings.splice(idx, 1);

    if (!ctx.session.currentTrainings.length) {
    await ctx.editMessageText('Тренувань більше немає');
    return ctx.answerCallbackQuery();
    }

    const newIdx = idx >= ctx.session.currentTrainings.length ? 0 : idx;

    await ctx.editMessageText(getMessage('trainings', ctx.session.currentTrainings, newIdx), {
    reply_markup: getActionButtons('trainings', newIdx, ctx.session.currentTrainings.length),
    parse_mode: 'HTML'
    });

    await ctx.answerCallbackQuery('Тренування видалено ✅');
});

bot.callbackQuery(/accept_(\d+)/, async (ctx) => {
    const studentIdx = ctx.match[1];
    const coach = (await Coach.findOne({coachChatId: ctx.from.id}));
    const studentApplication = coach.coachApplications[studentIdx];

    await bot.api.sendMessage(studentApplication.studentChatId, "✅ Вашу заявку прийнято! Тепер ви можете тренуватись 💪", {
    reply_markup: new Keyboard()
        .text('💪 Записати тренування').row()
        .text('📋 Мої тренування').row()
        .resized()
    });

    coach.coachApplications.splice(studentIdx, 1);

    const student = new Student({
        studentName: studentApplication.studentName,
        studentSurname: studentApplication.studentSurname,
        studentWeight: studentApplication.studentWeight,
        studentHeight: studentApplication.studentHeight,
        studentChatId: String(studentApplication.studentChatId),
        studentGender: studentApplication.studentGender,
        studentCoach: coach._id,
    });


    await student.save();

    coach.coachStudents.push(student._id);

    await coach.save();

    await ctx.answerCallbackQuery("Студента прийнято").catch(() => {});
});

bot.callbackQuery(/decline_(\d+)/, async (ctx) => {
    const studentIdx = ctx.match[1];

    const coach = (await Coach.findOne({coachChatId: ctx.from.id}));
    const studentApplication = coach.coachApplications[studentIdx];

    await bot.api.sendMessage(studentApplication.studentChatId, "❌ Вашу заявку відхилено!");

    coach.coachApplications.splice(studentIdx, 1);
    await coach.save();
    await ctx.answerCallbackQuery();
});

bot.callbackQuery(/delete_student_(\d+)/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);

    const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
    const student = coach.coachStudents[idx];

    if (!student) return ctx.answerCallbackQuery('Клієнта не знайдено');

    await Student.findByIdAndDelete(student._id);

    coach.coachStudents.splice(idx, 1);
    await coach.save();

    if (!coach.coachStudents.length) {
    await ctx.editMessageText('У вас більше немає клієнтів');
    return ctx.answerCallbackQuery();
    }

    const newIdx = idx >= coach.coachStudents.length ? 0 : idx;

    await ctx.editMessageText(getMessage('students', coach.coachStudents, newIdx), {
        reply_markup: getActionButtons('students', newIdx, coach.coachStudents.length, { selfLog: coach.coachStudents[newIdx].studentCanSelfLog }),
        parse_mode: 'HTML'
    });

    await ctx.answerCallbackQuery('Клієнта видалено ✅');
});

bot.callbackQuery(/edit_weight_(\d+)/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    ctx.session.editWeightStudentIdx = idx;
    ctx.session.step = 'editWeight';
    await ctx.answerCallbackQuery();
    await ctx.reply('Введіть нову вагу клієнта (кг):');
});

bot.callbackQuery(/^spick_cat_(\d+)$/, async (ctx) => {
    console.log('=== spick_cat ===');
    console.log('ctx.from.id:', ctx.from.id);
    
    const catIdx = parseInt(ctx.match[1]);
    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
    console.log('student:', JSON.stringify(student));
    
    if (!student) return ctx.answerCallbackQuery('❌ Студента не знайдено');

    const coach = await Coach.findById(student.studentCoach);
    console.log('coach:', JSON.stringify(coach?._id));
    
    if (!coach) return ctx.answerCallbackQuery('❌ Тренера не знайдено');

    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const selectedCategory = categories[catIdx];
    const exercises = coach.coachExercises.filter(ex => ex.category === selectedCategory);

    const keyboard = new InlineKeyboard();
    exercises.forEach((ex, i) => {
        keyboard.text(ex.name, `spick_ex_${catIdx}_${i}`).row();
    });
    keyboard.text('◀️ Назад', 'sback_to_categories');

    await ctx.editMessageText(`Категорія: ${selectedCategory}\n\nВиберіть вправу:`, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
    });
    console.log('clicked');
    await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^spick_ex_(\d+)_(\d+)$/, async (ctx) => {
    const catIdx = parseInt(ctx.match[1]);
    const exIdx = parseInt(ctx.match[2]);

    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
    const coach = await Coach.findById(student.studentCoach);

    const categories = [...new Set(coach.coachExercises.map(ex => ex.category))];
    const selectedCategory = categories[catIdx];
    const exercises = coach.coachExercises.filter(ex => ex.category === selectedCategory);

    ctx.session.currentExercise = {
        name: exercises[exIdx].name,
        category: selectedCategory,
        sets: []
    };
    ctx.session.currentSet = 1;
    ctx.session.step = 'setWeight';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Вправа: ${ctx.session.currentExercise.name}\n\nПідхід 1\nВведіть вагу (кг) або "без ваги":`,
        { parse_mode: 'HTML' }
    );
});

bot.callbackQuery('finish_exercise', async (ctx) => {
    if (!ctx.session.currentExercise?.sets?.length) {
        await ctx.answerCallbackQuery('Додайте хоча б один підхід!');
        return;
    }

    const isStudentFlow = !!ctx.session.studentTrainingExercises;

    if (isStudentFlow) {
        ctx.session.studentTrainingExercises.push({ ...ctx.session.currentExercise });
    } else {
        ctx.session.trainingExercises.push({ ...ctx.session.currentExercise });
    }

    const exercises = isStudentFlow
        ? ctx.session.studentTrainingExercises
        : ctx.session.trainingExercises;
    const exIdx = exercises.length - 1;

    const done = exercises.map(ex => {
        const sets = ex.sets.map((s, i) =>
            `  ${i + 1}. ${s.weight > 0 ? s.weight + ' кг' : 'без ваги'} — ${s.reps} повт.`
        ).join('\n'); 
        return `• ${ex.name}\n${sets}`;
    }).join('\n\n');

    const keyboard = new InlineKeyboard();
    exercises[exIdx].sets.forEach((s, i) => {
        keyboard.text(`✏️ Підхід ${i + 1}`, `edit_set_${exIdx}_${i}`).row()
    });

    ctx.session.currentExercise = null;
    ctx.session.currentSet = 1;
    ctx.session.step = isStudentFlow ? 'studentPickExercise' : 'pickExercise';

    await ctx.answerCallbackQuery();
    await ctx.reply(`✅ Вправу завершено!\n\nЗаписано:\n${done}`, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
    });

    if (isStudentFlow) {
        const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
        await showExercisePickerForStudent(ctx, student);
    } else {
        const coach = await Coach.findOne({ coachChatId: ctx.from.id });
        await showExercisePicker(ctx, coach);
    }
});

bot.callbackQuery(/^edit_set_(\d+)_(\d+)$/, async (ctx) => {
    const exIdx = parseInt(ctx.match[1]);
    const setIdx = parseInt(ctx.match[2]);

    ctx.session.editSetExIdx = exIdx;
    ctx.session.editSetIdx = setIdx;
    ctx.session.step = 'editSetWeight';

    await ctx.answerCallbackQuery();
    await ctx.reply(`✏️ Підхід ${setIdx + 1}\nВведіть нову вагу (кг) або "без ваги":`);
});

bot.callbackQuery('sback_to_categories', async (ctx) => {
    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
    await showExercisePickerForStudent(ctx, student);
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('student_finish_training', async (ctx) => {
    if (!ctx.session.studentTrainingExercises?.length) {
        await ctx.answerCallbackQuery('Додайте хоча б одну вправу!');
        return;
    }

    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });

    const training = new Training({
        coach: student.studentCoach,
        student: student._id,
        exercises: ctx.session.studentTrainingExercises,
        addedBy: 'student'
    });

    await training.save();

    ctx.session.step = null;
    ctx.session.studentTrainingExercises = null;

    await ctx.answerCallbackQuery();
    await ctx.reply('🎉 Тренування записано!');
});

bot.callbackQuery(/^toggle_selflog_(\d+)$/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
    const student = coach.coachStudents[idx];

    student.studentCanSelfLog = !student.studentCanSelfLog;
    await student.save();

    const selfLogBtn = student.studentCanSelfLog
        ? '📝 Самозапис: ✅ увімкнено'
        : '📝 Самозапис: ❌ вимкнено';

    await ctx.answerCallbackQuery(
        student.studentCanSelfLog ? '✅ Самозапис увімкнено' : '❌ Самозапис вимкнено'
    );

    const keyboard = getActionButtons('students', idx, coach.coachStudents.length, { selfLog: student.studentCanSelfLog });
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
});

bot.hears('📈 Клієнт', async (ctx) => {
    ctx.session.step = 'coachCode';
    await ctx.reply('Введіть код тренера:');
});

bot.on('message', async (ctx) => {
    if (ctx.session.step){
        const text = ctx.message.text;

        switch (ctx.session.step) {
            case 'coachCode':
                const coach = await Coach.findOne({ coachChatId: text });
                if (!coach) {
                    await ctx.reply('Неправильний код тренера. Спробуйте ще раз.');
                    return;
                }

                // if (isApplied(coach.coachApplications, ctx.from.id)){
                //     return await ctx.reply('Ваша заявка зараз розглядається. Очікуйте коли її прийме тренер');
                // }
                // console.log(isApplied(coach.coachApplications, ctx.from.id));
                ctx.session.coachCode = text;
                ctx.session.step = 'firstName';
                await ctx.reply('Введіть своє ім’я:');
                break;

            case 'firstName':
                ctx.session.firstName = text;
                ctx.session.step = 'lastName';
                await ctx.reply('Введіть своє прізвище:');
                break;

            case 'lastName':
                ctx.session.lastName = text;
                ctx.session.step = 'gender';
                const keyboard = new Keyboard().text('Чоловік').row().text('Жінка').row().resized().oneTime();
                await ctx.reply('Виберіть стать (Чоловік/Жінка):', { reply_markup: keyboard });
                break;

            case 'gender':
                ctx.session.gender = text;
                ctx.session.step = 'weight';
                await ctx.reply('Введіть вашу вагу (кг):', { reply_markup: { remove_keyboard: true } });
                break;


            case 'weight': {
                const w = parseFloat(text);
                if (isNaN(w)) {
                    await ctx.reply('Введіть вагу числом:');
                    return;
                }
                ctx.session.weight = w;
                ctx.session.step = 'height';
                await ctx.reply('Введіть ваш ріст (см):');
                break;
            }
            case 'height': {
                const h = parseFloat(text);
                if (isNaN(h)) {
                    await ctx.reply('Введіть ріст числом:');
                    return;
                }
                ctx.session.height = h;
                ctx.session.step = null;

                await ctx.reply(
                    `Отримав всі дані:\nКод тренера: ${ctx.session.coachCode}\nІм'я: ${ctx.session.firstName}\nПрізвище: ${ctx.session.lastName}\nСтать: ${ctx.session.gender}\nВага: ${ctx.session.weight} кг\nРіст: ${ctx.session.height} см\n\nОчікуйте коли тренер прийме вашу заявку`
                );

                const applicationGetterCoach = await Coach.findOne({ coachChatId: ctx.session.coachCode });
                const studentGender = ctx.session.gender === 'Чоловік' ? 'male' : 'female';

                applicationGetterCoach.coachApplications.push({
                    coachChatId: ctx.session.coachCode,
                    studentChatId: ctx.from.id,
                    studentName: ctx.session.firstName,
                    studentSurname: ctx.session.lastName,
                    studentGender,
                    studentWeight: ctx.session.weight,
                    studentHeight: ctx.session.height,
                });

                await applicationGetterCoach.save();
                break;
            }
            case 'addExercise': {
                const exerciseCoach = await Coach.findOne({ coachChatId: ctx.from.id });
                exerciseCoach.coachExercises.push({
                    name: text,
                    category: ctx.session.newExerciseCategory
                });
                await exerciseCoach.save();
                
                const categoryName = ctx.session.newExerciseCategory;
                ctx.session.step = null;
                ctx.session.newExerciseCategory = null;
                
                await ctx.reply(`✅ Вправу "${text}" додано в категорію ${categoryName}!`);
                break;
            }

            case 'addExerciseCategory':
                ctx.session.newExerciseCategory = text;
                ctx.session.step = 'addExercise';
                await ctx.reply(`Категорія: ${text}\n\nВведіть назву вправи:`, { parse_mode: 'HTML' });
                break;

            case 'setWeight': {
                if (text.toLowerCase() === 'без ваги') {
                    ctx.session.currentWeight = 0;
                } else {
                    const w = parseFloat(text);
                    if (isNaN(w)) {
                        await ctx.reply('Введіть вагу числом або "без ваги":');
                        return;
                    }
                    ctx.session.currentWeight = w;
                }
                ctx.session.step = 'setReps';
                await ctx.reply(`Підхід ${ctx.session.currentSet}\nКількість повторів:`);
                break;
            }

            case 'setReps': {
                const reps = parseInt(text);
                if (isNaN(reps) || reps < 1) {
                    await ctx.reply('Введіть коректну кількість повторів:');
                    return;
                }

                ctx.session.currentExercise.sets.push({
                    weight: ctx.session.currentWeight,
                    reps
                });

                ctx.session.currentSet++;
                ctx.session.step = 'setWeight';

                const finishBtn = new InlineKeyboard().text('🏁 Завершити вправу', 'finish_exercise');
                await ctx.reply(
                    `✅ Підхід збережено!\n\nПідхід ${ctx.session.currentSet}\nВведіть вагу (кг) або "без ваги":`,
                    { reply_markup: finishBtn }
                );
                break;
            }

            case 'adminAddCoach': {
                const config = await getConfig();
                if (config.coachIds.includes(text)) {
                    await ctx.reply('Цей тренер вже є в списку');
                    ctx.session.step = null;
                } else {
                    ctx.session.newCoachId = text;
                    ctx.session.step = 'adminAddCoachName';
                    await ctx.reply('Введіть ім\'я тренера:');
                }
                break;
            }
            case 'adminAddCoachName': {
                ctx.session.newCoachName = text;
                ctx.session.step = 'adminAddCoachSurname';
                await ctx.reply('Введіть прізвище тренера:');
                break;
            }

            case 'adminAddCoachSurname': {
                ctx.session.newCoachSurname = text;
                ctx.session.step = 'adminAddCoachGender';
                const keyboard = new Keyboard().text('Чоловік').row().text('Жінка').row().resized().oneTime();
                await ctx.reply('Виберіть стать тренера:', { reply_markup: keyboard });
                break;
            }

            case 'adminAddCoachGender': {
                const config = await getConfig();
                config.coachIds.push(ctx.session.newCoachId);
                await config.save();

                const coach = new Coach({
                    coachChatId: ctx.session.newCoachId,
                    coachName: ctx.session.newCoachName,
                    coachSurname: ctx.session.newCoachSurname,
                    coachGender: text === 'Чоловік' ? 'male' : 'female',
                });
                await coach.save();

                await ctx.reply(
                    `✅ Тренера додано!\n\n👤 ${ctx.session.newCoachName} ${ctx.session.newCoachSurname}\nID: ${ctx.session.newCoachId}`,
                    { reply_markup: { remove_keyboard: true } }
                );

                ctx.session.newCoachId = null;
                ctx.session.newCoachName = null;
                ctx.session.newCoachSurname = null;
                ctx.session.step = null;
                break;
            }

            case 'adminAddAdmin': {
                const config = await getConfig();
                if (config.adminIds.includes(text)) {
                    await ctx.reply('Цей адмін вже є в списку');
                    ctx.session.step = null;
                } else {
                    ctx.session.newAdminId = text;
                    ctx.session.step = 'adminAddAdminName';
                    await ctx.reply('Введіть ім\'я для цього адміна:');
                }
                break;
            }

            case 'adminAddAdminName': {
                const config = await getConfig();
                config.adminIds.push(ctx.session.newAdminId);
                config.admins.push({ id: ctx.session.newAdminId, name: text });
                await config.save();
                await ctx.reply(`✅ Адміна ${text} (${ctx.session.newAdminId}) додано!`);
                ctx.session.newAdminId = null;
                ctx.session.step = null;
                break;
            }

            case 'editWeight': {
                const w = parseFloat(text);
                if (isNaN(w)) {
                    await ctx.reply('Введіть вагу числом:');
                    return;
                }
                const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
                const student = coach.coachStudents[ctx.session.editWeightStudentIdx];
                await Student.findByIdAndUpdate(student._id, { studentWeight: w });
                ctx.session.step = null;
                ctx.session.editWeightStudentIdx = null;
                await ctx.reply(`✅ Вагу оновлено: ${w} кг`);
                break;
            }

            case 'editSetWeight': {
                if (text.toLowerCase() === 'без ваги') {
                    ctx.session.editSetNewWeight = 0;
                } else {
                    const w = parseFloat(text);
                    if (isNaN(w)) {
                        await ctx.reply('Введіть вагу числом або "без ваги":');
                        return;
                    }
                    ctx.session.editSetNewWeight = w;
                }
                ctx.session.step = 'editSetReps';
                await ctx.reply(`Введіть нову кількість повторів:`);
                break;
            }

            case 'editSetReps': {
                const reps = parseInt(text);
                if (isNaN(reps) || reps < 1) {
                    await ctx.reply('Введіть коректну кількість повторів:');
                    return;
                }

                const isStudentFlow = !!ctx.session.studentTrainingExercises;
                const exercises = isStudentFlow
                    ? ctx.session.studentTrainingExercises
                    : ctx.session.trainingExercises;

                const exIdx = ctx.session.editSetExIdx;
                const setIdx = ctx.session.editSetIdx;

                exercises[exIdx].sets[setIdx] = {
                    weight: ctx.session.editSetNewWeight,
                    reps
                };

                ctx.session.step = isStudentFlow ? 'studentPickExercise' : 'pickExercise';
                ctx.session.editSetExIdx = null;
                ctx.session.editSetIdx = null;
                ctx.session.editSetNewWeight = null;

                // показуємо оновлений підсумок
                const done = exercises.map(ex => {
                    const sets = ex.sets.map((s, i) =>
                        `  ${i + 1}. ${s.reps} повт. — ${s.weight > 0 ? s.weight + ' кг' : 'без ваги'}`
                    ).join('\n');
                    return `• ${ex.name}\n${sets}`;
                }).join('\n\n');

                await ctx.reply(`✅ Підхід оновлено!\n\nЗаписано:\n${done}`, { parse_mode: 'HTML' });
                if (isStudentFlow) {
                    const student = await Student.findOne({ studentChatId: String(ctx.from.id) });
                    await showExercisePickerForStudent(ctx, student);
                } else {
                    const coach = await Coach.findOne({ coachChatId: ctx.from.id });
                    await showExercisePicker(ctx, coach);
                }

                break;
            }

            default:
                await ctx.reply('Натисніть "📈 Клієнт", щоб почати заповнення форми.');
        }
    }
    
});

bot.callbackQuery('finish_training', async (ctx) => {
    if (!ctx.session.trainingExercises?.length) {
    await ctx.answerCallbackQuery('Додайте хоча б одну вправу!');
    return;
    }

    const coach = await Coach.findOne({ coachChatId: ctx.from.id }).populate('coachStudents');
    const student = coach.coachStudents[ctx.session.trainingStudentIdx];

    const training = new Training({
    coach: coach._id,
    student: student._id,
    exercises: ctx.session.trainingExercises
    });

    await training.save();

    ctx.session.step = null;
    ctx.session.trainingExercises = null;
    ctx.session.trainingStudentIdx = null;

    await ctx.answerCallbackQuery();
    await ctx.reply('🎉 Тренування записано!');
});


bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;

    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});
async function main() {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        // await Coach.updateMany(
        //     { coachApplications: { $exists: false } },
        //     { $set: { coachApplications: [] } }
            // );
        // await Coach.updateMany(
        //     { coachExercises: null },
        //     { $set: { coachExercises: [] } }
        // );
        // await Student.updateMany(
        //     { studentBirthDate: { $exists: true } },
        //     { $unset: { studentBirthDate: 1 }, $set: { studentWeight: null, studentHeight: null } }
        // );
        // await Training.updateMany(
        //     { addedBy: { $exists: false } },
        //     { $set: { addedBy: 'coach' } }
        // );
        await Student.updateMany(
            { studentCanSelfLog: { $exists: false } },
            { $set: { studentCanSelfLog: false } }
        );
        await seedCoachExercises();
        bot.start();
    }catch(error){
        console.error(error);
    }
}

main();