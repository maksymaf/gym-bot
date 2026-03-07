const { InlineKeyboard } = require('grammy');

const renderers = {
    applications: (items, idx) => {
        const item = items[idx];
        return `Ім'я учня: ${item.studentName}\nПрізвище учня: ${item.studentSurname}`;
    },
    students: (items, idx) => {
        const item = items[idx];
        const gender = item.studentGender === 'male' ? '👨' : '👩';
        return (
            `${gender} ${item.studentName} ${item.studentSurname}\n` +
            `━━━━━━━━━━━━━━━\n` +
            `⚖️ Вага: ${item.studentWeight ?? 'не вказано'} кг\n` +
            `📏 Ріст: ${item.studentHeight ?? 'не вказано'} см\n`
        );
    },
    trainings: (items, idx) => {
        const training = items[idx];
        const date = new Date(training.createdAt).toLocaleDateString('uk-UA');

        const exercises = training.exercises.map(ex => {
            const sets = ex.sets.map((s, i) =>
            `  ${i + 1}. ${s.weight > 0 ? s.weight + ' кг' : 'без ваги'} — ${s.reps} повт.`
            ).join('\n');
            return `• ${ex.name}\n${sets}`;
        }).join('\n\n');

        return `📅 ${date}\n\n${exercises}`;
    },
};

const getActionButtons = (type, idx, total, options = {}) => {
    const keyboard = new InlineKeyboard();
    if (total > 1) {
    keyboard
        .text('⬅️', `page_${type}_prev_${idx}`)
        .text('➡️', `page_${type}_next_${idx}`)
        .row();
    }
    if (type === 'applications') {
    keyboard
        .text('✅ Прийняти', `accept_${idx}`)
        .text('❌ Відхилити', `decline_${idx}`);
    }

    if (type === 'students'){
        const selfLogLabel = options.selfLog
            ? '📝 Самозапис: ✅ увімкнено'
            : '📝 Самозапис: ❌ вимкнено';
        keyboard
            .text('🗑 Видалити клієнта', `delete_student_${idx}`)
            .row()
            .text('➕ Додати тренування', `add_training_${idx}`)
            .row()
            .text('📋 Попередні тренування', `view_trainings_${idx}`)
            .row()
            .text('✏️ Редагувати вагу', `edit_weight_${idx}`)
            .row()
            .text(selfLogLabel, `toggle_selflog_${idx}`)
            .row()
    }

    if (type === 'trainings') {
    keyboard.text('🗑 Видалити тренування', `delete_training_${idx}`);
    }

    return keyboard;
};

const getMessage = (type, items, idx) => {
    const render = renderers[type];
    const total = items.length;
    return `[${idx + 1}/${total}]\n\n${render(items, idx)}`;
};

module.exports = { getMessage, getActionButtons };