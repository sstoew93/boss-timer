// --- PASSWORD LOGIC ---
const SECRET_PASSWORD = "alohomora"; 

function checkPassword() {
    const input = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('error-msg');

    if (input === SECRET_PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        sessionStorage.setItem('isLoggedIn', 'true');
        initBot();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('password-input').value = ''; 
    }
}

document.getElementById('password-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkPassword();
});

if (sessionStorage.getItem('isLoggedIn') === 'true') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    initBot();
}

// --- TWITCH BOT LOGIC ---
function initBot() {
    let chatSocket = null;
    let replyTimestamps = [];
    let botConfig = {};

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusDiv = document.getElementById('status');
    const logDiv = document.getElementById('log');

    // --- SLIDER LOGIC ---
    const msgSlider = document.getElementById('msgCount');
    const msgCountVal = document.getElementById('msgCountVal');
    const msg2Row = document.getElementById('msg2-row');
    const msg3Row = document.getElementById('msg3-row');

    msgSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        msgCountVal.textContent = `${val} Message${val > 1 ? 's' : ''}`;
        
        // Toggle visibility of inputs based on slider
        msg2Row.style.display = val >= 2 ? 'block' : 'none';
        msg3Row.style.display = val >= 3 ? 'block' : 'none';

        // If a row is hidden, make sure its input isn't required
        document.getElementById('reply2').required = (val >= 2);
        document.getElementById('reply3').required = (val >= 3);
    });

    function log(message) {
        const time = new Date().toLocaleTimeString();
        logDiv.innerHTML += `<br>[${time}] ${message}`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    function canSendReply() {
        const now = Date.now();
        const windowMs = 60 * 1000; 
        replyTimestamps = replyTimestamps.filter(ts => now - ts < windowMs);
        return replyTimestamps.length < botConfig.rateLimit;
    }

    document.getElementById('botForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (chatSocket) {
            chatSocket.close();
        }

        // Gather messages based on slider count
        const msgCount = parseInt(msgSlider.value);
        const messages = [];
        if (msgCount >= 1) messages.push(document.getElementById('reply1').value.trim());
        if (msgCount >= 2) messages.push(document.getElementById('reply2').value.trim());
        if (msgCount >= 3) messages.push(document.getElementById('reply3').value.trim());

        // Filter out any empty ones just in case
        botConfig = {
            username: document.getElementById('username').value.trim().toLowerCase(),
            token: document.getElementById('token').value.trim(),
            trigger: document.getElementById('trigger').value.trim(),
            messages: messages.filter(m => m.length > 0), // Array of messages!
            channels: document.getElementById('channels').value.split(',').map(c => c.trim().replace('#', '').toLowerCase()).filter(c => c),
            rateLimit: parseInt(document.getElementById('rateLimit').value, 10) || 3
        };

        if (!botConfig.token.startsWith('oauth:')) {
            botConfig.token = 'oauth:' + botConfig.token;
        }

        log(`Connecting to Twitch as ${botConfig.username}...`);
        statusDiv.textContent = 'Status: Connecting...';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';

        chatSocket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

        chatSocket.onopen = () => {
            log(`Connected. Authenticating...`);
            chatSocket.send(`PASS ${botConfig.token}`);
            chatSocket.send(`NICK ${botConfig.username}`);
            
            botConfig.channels.forEach(channel => {
                chatSocket.send(`JOIN #${channel}`);
                log(`Joined channel: #${channel}`);
            });
            
            statusDiv.textContent = 'Status: Online & Listening';
        };

        chatSocket.onmessage = (event) => {
            const rawMessage = event.data;
            
            if (rawMessage.startsWith('PING')) {
                chatSocket.send('PONG :tmi.twitch.tv');
                return;
            }

            const match = rawMessage.match(/^:([^!]+)![^@]+@[^ ]+ PRIVMSG #([^ ]+) :(.*)/);
            
            if (match) {
                const sender = match[1].toLowerCase();
                const channel = match[2].toLowerCase();
                const text = match[3];

                if (sender === botConfig.username) return;

                if (text.toLowerCase().includes(botConfig.trigger.toLowerCase())) {
                    
                    const minDelay = 7;
                    const maxDelay = 15;
                    const delaySeconds = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                    const delayMs = delaySeconds * 1000;

                    log(`Trigger found in #${channel}. Replying in ${delaySeconds}s...`);

                    setTimeout(() => {
                        if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
                            log(`⚠️ Cancelled delayed reply in #${channel} (bot disconnected).`);
                            return;
                        }

                        if (canSendReply()) {
                            // --- PICK RANDOM MESSAGE ---
                            const randomIndex = Math.floor(Math.random() * botConfig.messages.length);
                            const chosenMessage = botConfig.messages[randomIndex];

                            chatSocket.send(`PRIVMSG #${channel} :${chosenMessage}`);
                            replyTimestamps.push(Date.now());
                            log(`Replied in #${channel} to ${sender}: "${chosenMessage}"`);
                        } else {
                            log(`⚠️ Rate limit hit. Ignored delayed reply in #${channel}.`);
                        }
                    }, delayMs);
                }
            }
        };

        chatSocket.onclose = () => {
            log(`Disconnected from Twitch.`);
            statusDiv.textContent = 'Status: Offline';
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            chatSocket = null;
        };

        chatSocket.onerror = (error) => {
            log(`❌ WebSocket Error. Check your token and internet connection.`);
            console.error(error);
        };
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
        if (chatSocket) {
            log(`Manually stopping bot...`);
            chatSocket.close();
        }
    });
}
