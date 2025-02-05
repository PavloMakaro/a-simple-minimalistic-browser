class AIManager {
    constructor(browser) {
        this.browser = browser;
        this.apiEndpoint = 'https://api.together.xyz/v1/chat/completions';
        this.chatHistory = [];
        this.model = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
    }

    async analyzePage(text) {
        try {
            if (!this.browser.aiConfig.apiKey) {
                throw new Error('API ключ не настроен');
            }

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.browser.aiConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            "role": "system",
                            "content": "Ты - полезный ассистент, который анализирует тексты и предоставляет краткое содержание."
                        },
                        {
                            "role": "user",
                            "content": `Проанализируй следующий текст и предоставь краткое содержание:\n\n${text}`
                        }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при запросе к AI API');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Ошибка при анализе страницы:', error);
            return 'Произошла ошибка при анализе страницы. Пожалуйста, проверьте API ключ и попробуйте снова.';
        }
    }

    async sendMessage(message) {
        try {
            if (!this.browser.aiConfig.apiKey) {
                throw new Error('API ключ не настроен');
            }

            // Добавляем сообщение пользователя в историю
            this.chatHistory.push({ role: 'user', content: message });

            // Формируем сообщения для API
            const messages = [
                {
                    "role": "system",
                    "content": "Ты - полезный и дружелюбный ассистент, который помогает пользователям."
                },
                ...this.chatHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.browser.aiConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при запросе к AI API');
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // Добавляем ответ AI в историю
            this.chatHistory.push({ role: 'assistant', content: aiResponse });

            return aiResponse;
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
            return 'Произошла ошибка при общении с AI. Пожалуйста, проверьте API ключ и попробуйте снова.';
        }
    }

    clearHistory() {
        this.chatHistory = [];
    }
} 