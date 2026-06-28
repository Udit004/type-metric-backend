import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;


export async function sendTelegramMessage(message: String) {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown"
            }
        );
        // console.log(response); // Removed to prevent terminal clutter
    } catch (err: any) {
        console.error("Telegram Error:");
        console.error(err.response?.data);
    }
}