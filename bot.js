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

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ===
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

// === ОБЩАЯ ФУНКЦИЯ ПОКАЗА ПРОФИЛЯ ===
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
        console.error('Ошибка в showProfile:', err);
        await ctx.reply('⚠️ Ошибка при загрузке профиля.');
    }
}

// === КОМАНДА /start ===
bot.command('start', async (ctx) => {
    const payload = ctx.match; // текст после /start
    if (payload === 'profile') {
        return showProfile(ctx);
    }

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

// === КОМАНДА /profile ===
bot.command('profile', async (ctx) => {
    await showProfile(ctx);
});

// === КОМАНДА /help ===
bot.command('help', async (ctx) => {
    await ctx.reply(
        `📋 Доступные команды:\n\n` +
        `/start — начало\n` +
        `/profile — профиль\n` +
        `/help — помощь\n\n` +
        `🎮 Игровые режимы скоро: Дуэль, Разборка, комнаты, ставки TON, NFT.`
    );
});

// === КОМАНДА /ping ===
bot.command('ping', async (ctx) => {
    await ctx.reply('🏓 Pong! Бот работает.');
});

// === ВЕБ-СЕРВЕР ДЛЯ RENDER ===
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🦔 Бот Ехидны Наклз работает');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Веб-сервер на порту ${port}`);
});

// === ЗАПУСК ===
console.log('🦔 Бот Ехидны Наклз запускается...');
bot.start()
    .then(() => console.log('✅ Бот успешно запущен!'))
    .catch(err => console.error('❌ Ошибка запуска:', err));