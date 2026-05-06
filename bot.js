const { Bot } = require('grammy');
const { createClient } = require('@supabase/supabase-js');
const express = require('express'); // Добавлено для веб-сервера Render
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

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ НАЗВАНИЙ РАНГОВ ===
function getRankName(level) {
    const ranks = {
        1: 'Бродяга',
        2: 'Шестёрка',
        3: 'Боец',
        4: 'Капо',
        5: 'Консильери',
        6: 'Дон'
    };
    return ranks[level] || 'Неизвестно';
}

// === КОМАНДА /start ===
bot.command('start', async (ctx) => {
    const user = ctx.from;
    const userId = user.id.toString();
    const username = user.username || 'без_имени';
    const firstName = user.first_name || '';

    try {
        // Проверяем, есть ли пользователь в базе
        const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (findError && findError.code !== 'PGRST116') {
            console.error('Ошибка поиска пользователя:', findError);
        }

        // Если пользователя нет — создаём нового
        if (!existingUser) {
            const { error: insertError } = await supabase
                .from('users')
                .insert([{
                    id: userId,
                    username: username,
                    xp: 0,
                    rank_level: 1,
                    wins: 0,
                    losses: 0,
                    current_skin: 'Обычная Ехидна'
                }]);

            if (insertError) {
                console.error('Ошибка вставки пользователя:', insertError);
                await ctx.reply('⚠️ Ошибка при сохранении данных. Попробуйте позже.');
                return;
            }

            await ctx.reply(
                `🦔 **Привет, ${firstName}!**\n\n` +
                `Добро пожаловать в криминальный мир **Ехидны Наклз**.\n\n` +
                `✅ Твой аккаунт создан и сохранён в базе данных.\n\n` +
                `Используй команду /profile, чтобы посмотреть свой профиль.\n` +
                `Используй /help для списка команд.`
            );
        } else {
            await ctx.reply(
                `🦔 **С возвращением, ${firstName}!**\n\n` +
                `Рады снова тебя видеть.\n\n` +
                `Твой профиль уже в базе данных. Напиши /profile, чтобы посмотреть свой прогресс.`
            );
        }
    } catch (err) {
        console.error('Необработанная ошибка в /start:', err);
        await ctx.reply('⚠️ Произошла техническая ошибка. Повторите позже.');
    }
});

// === КОМАНДА /profile ===
bot.command('profile', async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.username || 'без_имени';

    try {
        // Ищем пользователя в Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            await ctx.reply('❌ Профиль не найден. Напишите /start, чтобы зарегистрироваться.');
            return;
        }

        await ctx.reply(
            `🎩 **ПРОФИЛЬ ЕХИДНЫ НАКЛЗ**\n\n` +
            `👤 Имя: @${user.username || username}\n` +
            `🆔 ID: \`${user.id}\`\n` +
            `⭐ Ранг: ${user.rank_level} (${getRankName(user.rank_level)})\n` +
            `📊 Опыт (XP): ${user.xp}\n` +
            `🏆 Победы: ${user.wins || 0} | 😵 Поражения: ${user.losses || 0}\n` +
            `🎭 Текущий скин: ${user.current_skin || 'Обычная Ехидна'}\n\n` +
            `💎 **NFT коллекция:** ${user.rank_level >= 2 ? 'Доступна' : 'Достигните ранга 2, чтобы получить первый NFT'}`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        console.error('Ошибка в /profile:', err);
        await ctx.reply('⚠️ Ошибка при загрузке профиля. Попробуйте позже.');
    }
});

// === КОМАНДА /help ===
bot.command('help', async (ctx) => {
    await ctx.reply(
        `📋 **Доступные команды бота:**\n\n` +
        `/start — Зарегистрироваться или начать игру\n` +
        `/profile — Посмотреть свой профиль (опыт, ранг, победы)\n` +
        `/help — Показать это сообщение\n\n` +
        `🎮 **Скоро появится:**\n` +
        `• Игровое мини-приложение с режимами "Дуэль" и "Разборка"\n` +
        `• Система комнат и ставок в TON\n` +
        `• NFT-награды за достижения\n\n` +
        `Следите за обновлениями! 🦔`
    );
});

// === КОМАНДА /ping (диагностика) ===
bot.command('ping', async (ctx) => {
    await ctx.reply('🏓 Pong! Бот работает и подключён к Supabase.');
});

// === ПРОСТОЙ ВЕБ-СЕРВЕР ДЛЯ RENDER ===
// Это нужно, чтобы Render не ругался на отсутствие открытого порта
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🦔 Бот Ехидны Наклз работает!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Веб-сервер для health checks запущен на порту ${port}`);
});

// === ЗАПУСК БОТА ===
console.log('🦔 Бот Ехидны Наклз запускается...');
bot.start()
    .then(() => {
        console.log('✅ Бот успешно запущен! Получение обновлений...');
    })
    .catch((err) => {
        console.error('❌ Ошибка при запуске бота:');
        console.error(err);
        console.error('\n💡 Возможные причины:');
        console.error('1. Нет интернета или заблокирован Telegram API');
        console.error('2. Неверный BOT_TOKEN в файле .env');
        console.error('3. На боте висит webhook (нужен сброс)');
    });