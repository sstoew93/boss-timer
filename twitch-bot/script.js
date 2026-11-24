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
    let isSequenceRunning = false; // Prevents overlapping sequences

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusDiv = document.getElementById('status');
    const logDiv = document.getElementById('log');

    // Helper function for delays
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- SLIDER LOGIC ---
    const msgSlider = document.getElementById('msgCount');
    const msgCountVal = document.getElementById('msgCountVal');
    const msg2Row = document.getElementById('msg2-row');
    const msg3Row = document.getElementById('msg3-row');

    msgSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        msgCountVal.textContent = `${val} Message${val > 1 ? 's' : ''}`;
        
        if (val >= 2) msg2Row.classList.remove('collapsed');
        else msg2Row.classList.add('collapsed');
        
        if (val >= 3) msg3Row.classList.remove('collapsed');
        else msg3Row.classList.add('collapsed');

        document.getElementById('reply2').required = (val >= 2);
        document.getElementById('reply3').required = (val >= 3);
    });

    function log(message) {
        const time = new Date().toLocaleTimeString();
        logDiv.innerHTML += `<br>[${time}] ${message}`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    function canSendMessage() {
        const now = Date.now();
        const windowMs = 60 * 1000; 
        replyTimestamps = replyTimestamps.filter(ts => now - ts < windowMs);
        return replyTimestamps.length < botConfig.rateLimit;
    }

    // --- THE SEQUENCE RUNNER ---
    async function runMessageSequence(channel, sender) {
        if (isSequenceRunning) return;
        isSequenceRunning = true;

        log(`▶️ Starting sequence for ${sender} in #${channel}...`);

        for (let i = 0; i < botConfig.messages.length; i++) {
            const msg = botConfig.messages[i];
            
            // Wait for the delay
            await sleep(msg.delay * 1000);

            // Check if bot is still connected
            if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
                log(`⚠️ Cancelled sequence (bot disconnected).`);
                isSequenceRunning = false;
                return;
            }

            // Check rate limit before sending
            if (canSendMessage()) {
                chatSocket.send(`PRIVMSG #${channel} :${msg.text}`);
                replyTimestamps.push(Date.now());
                log(`[${i+1}/${botConfig.messages.length}] Sent: "${msg.text}"`);
            } else {
                log(`⚠️ Rate limit hit. Skipped: "${msg.text}"`);
            }
        }

        // Apply cooldown after sequence finishes
        if (botConfig.cooldown > 0) {
            log(`⏳ Sequence complete. Cooling down for ${botConfig.cooldown}s...`);
            await sleep(botConfig.cooldown * 1000);
        }
        
        log(`✅ Ready for next trigger.`);
        isSequenceRunning = false;
    }

    document.getElementById('botForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (chatSocket) chatSocket.close();

        const msgCount = parseInt(msgSlider.value);
        const messages = [];

        // Gather messages and their specific delays
        if (msgCount >= 1) {
            messages.push({
                text: document.getElementById('reply1').value.trim(),
                delay: parseInt(document.getElementById('delay1').value) || 0
            });
        }
        if (msgCount >= 2) {
            messages.push({
                text: document.getElementById('reply2').value.trim(),
                delay: parseInt(document.getElementById('delay2').value) || 0
            });
        }
        if (msgCount >= 3) {
            messages.push({
                text: document.getElementById('reply3').value.trim(),
                delay: parseInt(document.getElementById('delay3').value) || 0
            });
        }

        botConfig = {
            username: document.getElementById('username').value.trim().toLowerCase(),
            token: document.getElementById('token').value.trim(),
            trigger: document.getElementById('trigger').value.trim(),
            messages: messages.filter(m => m.text.length > 0),
            cooldown: parseInt(document.getElementById('cooldown').value) || 0,
            channels: document.getElementById('channels').value.split(',').map(c => c.trim().replace('#', '').toLowerCase()).filter(c => c),
            rateLimit: parseInt(document.getElementById('rateLimit').value, 10) || 10
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

                // Trigger matches and we aren't currently running a sequence
                if (text.toLowerCase().includes(botConfig.trigger.toLowerCase()) && !isSequenceRunning) {
                    runMessageSequence(channel, sender);
                }
            }
        };

        chatSocket.onclose = () => {
            log(`Disconnected from Twitch.`);
            statusDiv.textContent = 'Status: Offline';
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            chatSocket = null;
            isSequenceRunning = false;
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
