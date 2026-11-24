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
    let isSequenceRunning = false; 

    // --- Channel-Specific Trackers ---
    let commandTracker = {}; 
    let commandCooldowns = {}; 

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusDiv = document.getElementById('status');
    const logDiv = document.getElementById('log');

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- 5-Minute Reset Timer ---
    setInterval(() => {
        commandTracker = {};
        commandCooldowns = {};
        log(`🔄 Command memory tracker reset (5m interval).`);
    }, 5 * 60 * 1000);

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

        try {
            const minDelay = 7;
            const maxDelay = 15;
            const initialDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            
            log(`▶️ Sequence triggered by ${sender} in #${channel}. First message in ${initialDelay}s...`);
            await sleep(initialDelay * 1000);

            if (canSendMessage()) {
                chatSocket.send(`PRIVMSG #${channel} :${botConfig.msg1}`);
                replyTimestamps.push(Date.now());
                log(`[1/3] Sent in #${channel}: "${botConfig.msg1}"`);
            } else {
                log(`⚠️ Rate limit hit. Skipped Message 1.`);
                isSequenceRunning = false;
                return;
            }

            if (botConfig.hasMsg2) {
                await sleep(botConfig.delay2 * 1000);
                if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) return;

                if (canSendMessage()) {
                    chatSocket.send(`PRIVMSG #${channel} :${botConfig.msg2}`);
                    replyTimestamps.push(Date.now());
                    log(`[2/3] Sent in #${channel} after ${botConfig.delay2}s: "${botConfig.msg2}"`);
                } else {
                    log(`⚠️ Rate limit hit. Skipped Message 2.`);
                }
            }

            if (botConfig.hasMsg3) {
                await sleep(botConfig.delay3 * 1000);
                if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) return;

                if (canSendMessage()) {
                    chatSocket.send(`PRIVMSG #${channel} :${botConfig.msg3}`);
                    replyTimestamps.push(Date.now());
                    log(`[3/3] Sent in #${channel} after ${botConfig.delay3}s: "${botConfig.msg3}"`);
                } else {
                    log(`⚠️ Rate limit hit. Skipped Message 3.`);
                }
            }

            if (botConfig.cooldown > 0) {
                log(`⏳ Sequence complete. Cooling down for ${botConfig.cooldown}s...`);
                await sleep(botConfig.cooldown * 1000);
            }
            
            log(`✅ Ready for next trigger.`);

        } catch (error) {
            console.error(error);
            log(`❌ Error during sequence.`);
        } finally {
            isSequenceRunning = false;
        }
    }

    document.getElementById('botForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (chatSocket) chatSocket.close();

        const msgCount = parseInt(msgSlider.value);

        botConfig = {
            username: document.getElementById('username').value.trim().toLowerCase(),
            token: document.getElementById('token').value.trim(),
            trigger: document.getElementById('trigger').value.trim(),
            msg1: document.getElementById('reply1').value.trim(),
            hasMsg2: msgCount >= 2,
            msg2: document.getElementById('reply2').value.trim(),
            delay2: parseInt(document.getElementById('delay2').value) || 0,
            hasMsg3: msgCount >= 3,
            msg3: document.getElementById('reply3').value.trim(),
            delay3: parseInt(document.getElementById('delay3').value) || 0,
            cooldown: parseInt(document.getElementById('cooldown').value) || 0,
            channels: document.getElementById('channels').value.split(',').map(c => c.trim().replace('#', '').toLowerCase()).filter(c => c),
            rateLimit: parseInt(document.getElementById('rateLimit').value, 10) || 10
        };

        if (!botConfig.token.startsWith('oauth:')) {
            botConfig.token = 'oauth:' + botConfig.token;
        }

        // Reset trackers on startup
        commandTracker = {};
        commandCooldowns = {};

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

            // ==========================================
            // --- PARSE IRC TAGS FOR BADGES ---
            // ==========================================
            let tags = {};
            let actualMessagePart = rawMessage;

            if (rawMessage.startsWith('@')) {
                const tagsEndIndex = rawMessage.indexOf(' ');
                const rawTags = rawMessage.substring(1, tagsEndIndex);
                actualMessagePart = rawMessage.substring(tagsEndIndex + 1);
                
                rawTags.split(';').forEach(tag => {
                    const [key, value] = tag.split('=');
                    tags[key] = value;
                });
            }

            // Parse PRIVMSG (normal) or USERNOTICE (announcement)
            const match = actualMessagePart.match(/(?:PRIVMSG|USERNOTICE) #([^ ]+) :(.*)/);
            
            if (match) {
                const channel = match[1].toLowerCase();
                const text = match[2];
                
                const senderMatch = actualMessagePart.match(/^:([^!]+)!/);
                const sender = senderMatch ? senderMatch[1].toLowerCase() : 'system';

                // Ignore messages from the bot itself
                if (sender === botConfig.username) return;

                // Check Auth Status
                const isAnnouncement = actualMessagePart.includes('USERNOTICE') && tags['msg-id'] === 'announcement';
                const badges = tags['badges'] || '';
                const isBroadcaster = badges.includes('broadcaster/1');
                const isModerator = badges.includes('moderator/1');
                const isAuthorizedUser = isBroadcaster || isModerator || isAnnouncement;

                // ==========================================
                // --- CHANNEL-SPECIFIC SPAM TRACKER (Anyone) ---
                // ==========================================
                const cleanText = text.trim();
                if (cleanText.startsWith('!')) {
                    const command = cleanText.split(' ')[0].toLowerCase();
                    const now = Date.now();
                    
                    if (!commandTracker[channel]) commandTracker[channel] = {};
                    if (!commandCooldowns[channel]) commandCooldowns[channel] = {};
                    
                    if (!commandCooldowns[channel][command] || now > commandCooldowns[channel][command]) {
                        if (!commandTracker[channel][command]) commandTracker[channel][command] = [];
                        
                        commandTracker[channel][command] = commandTracker[channel][command].filter(ts => now - ts < 60000);
                        commandTracker[channel][command].push(now);
                        
                        if (commandTracker[channel][command].length >= 5) {
                            if (canSendMessage()) {
                                chatSocket.send(`PRIVMSG #${channel} :${command}`);
                                replyTimestamps.push(now);
                                
                                commandCooldowns[channel][command] = now + 60000; 
                                commandTracker[channel][command] = []; 
                                
                                log(`🚀 Echoed "${command}" in #${channel} (Spam detected)`);
                            } else {
                                log(`⚠️ Rate limit hit. Could not echo "${command}" in #${channel}`);
                            }
                        }
                    }
                }

                // ==========================================
                // --- SEQUENCE TRIGGER (Authorized ONLY) ---
                // ==========================================
                if (isAuthorizedUser) {
                    if (text.toLowerCase().includes(botConfig.trigger.toLowerCase()) && !isSequenceRunning) {
                        runMessageSequence(channel, sender);
                    }
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
