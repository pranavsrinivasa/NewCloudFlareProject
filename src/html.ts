export const HTML = <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research & Decision Agent</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; display: flex; justify-content: center; height: 100vh; box-sizing: border-box; }
        .chat-container { width: 100%; max-width: 800px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; overflow: hidden; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; font-size: 1.2rem; font-weight: bold; }
        .messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .message { padding: 12px 16px; border-radius: 8px; max-width: 80%; line-height: 1.5; white-space: pre-wrap; }
        .user { background: #2563eb; color: white; align-self: flex-end; border-bottom-right-radius: 0; }
        .bot { background: #f3f4f6; color: #1f2937; align-self: flex-start; border-bottom-left-radius: 0; border: 1px solid #e5e7eb; }
        .input-area { padding: 20px; background: white; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; }
        input { flex: 1; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; outline: none; }
        input:focus { border-color: #2563eb; }
        button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #1d4ed8; }
        button:disabled { background: #9ca3af; cursor: not-allowed; }
        .thinking { color: #6b7280; font-style: italic; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">AI Research & Decision Agent</div>
        <div class="messages" id="messages">
            <div class="message bot">Hello! I am your AI Decision Agent. Ask me to research a topic, like "Should I invest in NVIDIA?"</div>
        </div>
        <form class="input-area" id="chat-form">
            <input type="text" id="input" placeholder="Type your request here..." autocomplete="off" required>
            <button type="submit" id="send-btn">Send</button>
        </form>
    </div>

    <script>
        const form = document.getElementById('chat-form');
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');
        const btn = document.getElementById('send-btn');
        let conversationId = 'user-' + Date.now();

        function addMessage(text, type) {
            const div = document.createElement('div');
            div.className = 'message ' + type;
            div.textContent = text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            return div;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';
            btn.disabled = true;

            const botDiv = addMessage('', 'bot');
            botDiv.innerHTML = '<span class="thinking">Starting Workflow...</span>';

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, conversationId })
                });

                botDiv.innerHTML = ''; 

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    
                    let lines = buffer.split('\\n');
                    buffer = lines.pop(); // keep the last incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.startsWith('data: ')) {
                            try {
                                const payload = line.slice(6).trim();
                                if (payload === '[DONE]') break;
                                const data = JSON.parse(payload);
                                
                                if (typeof data === 'string') {
                                    botDiv.textContent += data + '\\n';
                                } else if (data && data.response) {
                                    botDiv.textContent += data.response;
                                }
                                messages.scrollTop = messages.scrollHeight;
                            } catch(e) {
                                // Raw string output
                                const raw = line.slice(6);
                                if (!raw.startsWith('{') && raw !== '[DONE]') {
                                   botDiv.textContent += raw + '\\n';
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                botDiv.textContent = 'An error occurred while researching.';
            } finally {
                btn.disabled = false;
                input.focus();
            }
        });
    </script>
</body>
</html>;
