const isApplied = (array, chatId) => {
    return array.some(item => item.studentChatId === chatId)
}


module.exports = {
    isApplied
}