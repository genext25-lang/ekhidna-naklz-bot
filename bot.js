const { Bot } = require('grammy');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
require('dotenv').config();

// === ПРОВЕРКА НАСТРОЕК ===
const token = process.env.BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!token) {
    console.error('❌ Ошибка: BOT_TOKEN не найден в .env');
    process.exit(1);
}
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: SUPABASE_URL или SUPABASE_ANON_KEY не найдены в .env');
    process.exit(1);
}

// === ПОДКЛЮЧЕНИЯ ===
const bot = new Bot(token);
const supabase = createClient(supabaseUrl, supabaseKey);

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getRankName(level) {
    const ranks = { 1: 'Бродяга', 2: 'Шестёрка', 3: 'Боец', 4: 'Капо', 5: 'Консильери', 6: 'Дон' };
    return ranks[level] || 'Неизвестно';
}

async function showProfile(ctx) {
    const userId = ctx.from.id.toString();
    const username = ctx.from.username || 'без_имени';

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            await ctx.reply('❌ Профиль не найден. Напишите /start.');
            return;
        }

        await ctx.reply(
            `🎩 **ПРОФИЛЬ ЕХИДНЫ НАКЛЗ**\n\n` +
            `👤 Имя: @${user.username || username}\n` +
            `🆔 ID: \`${user.id}\`\n` +
            `⭐ Ранг: ${user.rank_level} (${getRankName(user.rank_level)})\n` +
            `📊 Опыт (XP): ${user.xp}\n` +
            `🏆 Победы: ${user.wins || 0} | 😵 Поражения: ${user.losses || 0}\n` +
            `🎭 Скин: ${user.current_skin || 'Обычная Ехидна'}\n\n` +
            `💎 NFT коллекция: ${user.rank_level >= 2 ? 'Доступна' : 'Достигните ранга 2'}`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        console.error('Ошибка в showProfile:', err);
        await ctx.reply('⚠️ Ошибка при загрузке профиля.');
    }
}

// === КОМАНДА /create_room ===
bot.command('create_room', async (ctx) => {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    let bet = 0.1;
    if (args[1] && !isNaN(parseFloat(args[1]))) {
        bet = parseFloat(args[1]);
        if (bet < 0.1) bet = 0.1;
        if (bet > 5) bet = 5;
    }

    const roomId = `room_${Date.now()}_${userId}`;

    const { error } = await supabase
        .from('rooms')
        .insert([{
            id: roomId,
            creator_id: userId,
            bet_amount: bet,
            status: 'waiting'
        }]);

    if (error) {
        console.error(error);
        await ctx.reply('❌ Не удалось создать комнату.');
        return;
    }

    await ctx.reply(
        `✅ **Комната создана!**\n\n` +
        `🎲 Ставка: ${bet} TON\n` +
        `🔗 Отправь эту ссылку сопернику:\n` +
        `https://t.me/EkhidnaNaklzBot?start=room_${roomId}\n\n` +
        `Как только соперник перейдёт по ссылке, начнётся игра.`
    );
});

// === КОМАНДА /start (с поддержкой комнат) ===
bot.command('start', async (ctx) => {
    const payload = ctx.match; // текст после /start

    // --- ПРИСОЕДИНЕНИЕ К КОМНАТЕ ---
    if (payload && payload.startsWith('room_')) {
        const roomId = payload;
        const userId = ctx.from.id.toString();

        const { data: room, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error || !room || room.status !== 'waiting') {
            await ctx.reply('❌ Комната не найдена или уже занята.');
            return;
        }

        if (room.creator_id === userId) {
            await ctx.reply('❌ Нельзя присоединиться к своей комнате.');
            return;
        }

        // Обновляем комнату
        await supabase
            .from('rooms')
            .update({
                opponent_id: userId,
                status: 'playing'
            })
            .eq('id', roomId);

        await ctx.reply(
            `🎮 **Игрок присоединился!**\n\n` +
            `Ставка: ${room.bet_amount} TON\n` +
            `Игра началась! Выберите жест в мини-приложении: /rock, /paper, /scissors\n\n` +
            `(Временно используйте команды, скоро добавим кнопки в игру)`
        );

        await bot.api.sendMessage(
            room.creator_id,
            `🎮 **Соперник присоединился!**\n\nСделайте свой выбор: /rock, /paper, /scissors`
        );
        return;
    }

    // --- ОБЫЧНАЯ РЕГИСТРАЦИЯ /start ---
    const user = ctx.from;
    const userId = user.id.toString();
    const username = user.username || 'без_имени';
    const firstName = user.first_name || '';

    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (!existingUser) {
            await supabase.from('users').insert([{
                id: userId,
                username: username,
                xp: 0,
                rank_level: 1,
                wins: 0,
                losses: 0,
                current_skin: 'Обычная Ехидна'
            }]);
            await ctx.reply(
                `🦔 **Привет, ${firstName}!**\n\nДобро пожаловать в мир Ехидны Наклз.\n\n✅ Твой аккаунт создан.\n\nНажми на кнопку, чтобы войти в игру.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎮 ИГРАТЬ', web_app: { url: 'https://reliable-kringle-83dc61.netlify.app/' } }]
                        ]
                    }
                }
            );
        } else {
            await ctx.reply(
                `🦔 **С возвращением, ${firstName}!**\n\nТвой профиль уже в базе.\n\nНажми на кнопку, чтобы продолжить.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎮 ИГРАТЬ', web_app: { url: 'https://reliable-kringle-83dc61.netlify.app/' } }]
                        ]
                    }
                }
            );
        }
    } catch (err) {
        console.error('Ошибка в /start:', err);
        await ctx.reply('⚠️ Техническая ошибка. Повторите позже.');
    }
});

// === ВЫБОР ЖЕСТОВ (ВРЕМЕННО ЧЕРЕЗ КОМАНДЫ) ===
bot.command(['rock', 'paper', 'scissors'], async (ctx) => {
    const userId = ctx.from.id.toString();
    const choice = ctx.message.text.slice(1); // rock, paper или scissors

    // Ищем активную комнату, где этот игрок — создатель или соперник
    const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'playing')
        .single();

    if (error || !room) {
        await ctx.reply('❌ Нет активной игры. Создайте комнату через /create_room или присоединитесь к существующей.');
        return;
    }

    const isCreator = (room.creator_id === userId);
    const updateField = isCreator ? 'creator_choice' : 'opponent_choice';
    const opponentId = isCreator ? room.opponent_id : room.creator_id;

    // Сохраняем выбор
    await supabase
        .from('rooms')
        .update({ [updateField]: choice })
        .eq('id', room.id);

    // Проверяем, оба ли сделали выбор
    const { data: updatedRoom } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', room.id)
        .single();

    if (updatedRoom.creator_choice && updatedRoom.opponent_choice) {
        // Определяем победителя
        const p1 = updatedRoom.creator_choice;
        const p2 = updatedRoom.opponent_choice;
        let result = '';
        let winnerId = '';

        if (p1 === p2) {
            result = 'Ничья!';
        } else if (
            (p1 === 'rock' && p2 === 'scissors') ||
            (p1 === 'scissors' && p2 === 'paper') ||
            (p1 === 'paper' && p2 === 'rock')
        ) {
            result = `Победил создатель комнаты! (${p1} vs ${p2})`;
            winnerId = updatedRoom.creator_id;
        } else {
            result = `Победил соперник! (${p2} vs ${p1})`;
            winnerId = updatedRoom.opponent_id;
        }

        // Обновляем комнату
        await supabase
            .from('rooms')
            .update({
                status: 'finished',
                winner_id: winnerId
            })
            .eq('id', room.id);

        // Обновляем статистику игроков (wins/losses) и опыт
        if (winnerId) {
            const loserId = winnerId === updatedRoom.creator_id ? updatedRoom.opponent_id : updatedRoom.creator_id;
            await supabase.rpc('update_player_stats', { p_winner_id: winnerId, p_loser_id: loserId });
        }

        // Уведомляем обоих
        await bot.api.sendMessage(updatedRoom.creator_id, `🏆 Игра завершена! ${result}`);
        await bot.api.sendMessage(updatedRoom.opponent_id, `🏆 Игра завершена! ${result}`);
    } else {
        await ctx.reply(`✅ Ваш выбор (${choice}) принят. Ожидаем выбора соперника...`);
    }
});

// === КОМАНДА /profile ===
bot.command('profile', async (ctx) => {
    await showProfile(ctx);
});

// === КОМАНДА /help ===
bot.command('help', async (ctx) => {
    await ctx.reply(
        `📋 **Доступные команды:**\n\n` +
        `/start — начать\n` +
        `/profile — профиль\n` +
        `/create_room [ставка] — создать комнату (ставка 0.1–5 TON)\n` +
        `/rock, /paper, /scissors — выбрать жест в игре\n` +
        `/help — помощь\n\n` +
        `🎮 Игра: создайте комнату, передайте ссылку другу, оба выберите жест.`
    );
});

// === ВЕБ-СЕРВЕР ДЛЯ RENDER ===
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('🦔 Бот Ехидны Наклз работает'));
app.listen(port, '0.0.0.0', () => console.log(`✅ Веб-сервер на порту ${port}`));

// === ЗАПУСК ===
console.log('🦔 Бот Ехидны Наклз запускается...');
bot.start()
    .then(() => console.log('✅ Бот успешно запущен!'))
    .catch(err => console.error('❌ Ошибка запуска:', err));