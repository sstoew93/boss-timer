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

    let commandTracker = {}; 
    let commandCooldowns = {}; 

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusDiv = document.getElementById('status');
    const logDiv = document.getElementById('log');

    // --- CLEAR LOG BUTTON LOGIC ---
    const clearLogBtn = document.getElementById('clearLogBtn');
    clearLogBtn.addEventListener('click', () => {
        logDiv.innerHTML = '[System] Log cleared.';
    });

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    setInterval(() => {
        commandTracker = {};
        commandCooldowns = {};
        log(`🔄 Command memory tracker reset (10m interval).`);
    }, 10 * 60 * 1000);

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

    async function runMessageSequence(channel, sender, matchedTrigger) {
        if (isSequenceRunning) return;
        isSequenceRunning = true;

        try {
            const minDelay = 7;
            const maxDelay = 15;
            const initialDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            
            log(`▶️ Sequence triggered by "${matchedTrigger}" from ${sender} in #${channel}. First message in ${initialDelay}s...`);
            await sleep(initialDelay * 1000);

            // SEND MESSAGE 1
            if (canSendMessage()) {
                let msgToSend = botConfig.msg1;
                if (botConfig.prefixMap[channel]) {
                    msgToSend = `${botConfig.prefixMap[channel]}${msgToSend}`;
                }
                
                chatSocket.send(`PRIVMSG #${channel} :${msgToSend}`);
                replyTimestamps.push(Date.now());
                log(`[1/3] Sent in #${channel}: "${msgToSend}"`);
            } else {
                log(`⚠️ Rate limit hit. Skipped Message 1.`);
                isSequenceRunning = false;
                return;
            }

            // SEND MESSAGE 2
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

            // SEND MESSAGE 3
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
        
        // --- PARSE CHANNELS AND PREFIXES ---
        const rawChannels = document.getElementById('channels').value;
        let parsedChannels = [];
        let prefixMap = {}; 

        rawChannels.split(',').forEach(c => {
            let clean = c.trim().toLowerCase();
            if (!clean) return;

            let prefix = "";
            while (clean.startsWith('!') || clean.startsWith('#')) {
                prefix += clean[0];
                clean = clean.substring(1);
            }
            
            clean = clean.replace(/#/g, '');

            if (clean) {
                parsedChannels.push(clean);
                if (prefix) {
                    prefixMap[clean] = prefix;
                }
            }
        });

        // --- PARSE IGNORED CHANNELS ---
        const rawIgnored = document.getElementById('ignoredChannels').value;
        let ignoredChannels = rawIgnored.split(',').map(c => c.trim().replace('#', '').toLowerCase()).filter(c => c);
        // ------------------------------

        const rawTriggerInput = document.getElementById('trigger').value;
        let parsedTriggers = [];

        if (rawTriggerInput.includes('"') || rawTriggerInput.includes("'")) {
            const matches = rawTriggerInput.match(/(["'])(.*?)\1/g);
            if (matches) {
                parsedTriggers = matches.map(m => m.slice(1, -1).trim().toLowerCase());
            }
        } else {
            parsedTriggers = rawTriggerInput.split(',')
                .map(t => t.trim().toLowerCase())
                .filter(t => t.length > 0);
        }

        botConfig = {
            username: document.getElementById('username').value.trim().toLowerCase(),
            token: document.getElementById('token').value.trim(),
            triggers: parsedTriggers, 
            msg1: document.getElementById('reply1').value.trim(),
            hasMsg2: msgCount >= 2,
            msg2: document.getElementById('reply2').value.trim(),
            delay2: parseInt(document.getElementById('delay2').value) || 0,
            hasMsg3: msgCount >= 3,
            msg3: document.getElementById('reply3').value.trim(),
            delay3: parseInt(document.getElementById('delay3').value) || 0,
            cooldown: parseInt(document.getElementById('cooldown').value) || 0,
            channels: parsedChannels,          
            prefixMap: prefixMap,
            ignoredChannels: ignoredChannels, // Add to config
            rateLimit: parseInt(document.getElementById('rateLimit').value, 10) || 10
        };

        if (!botConfig.token.startsWith('oauth:')) {
            botConfig.token = 'oauth:' + botConfig.token;
        }

        commandTracker = {};
        commandCooldowns = {};

        log(`Connecting to Twitch as ${botConfig.username}...`);
        log(`Listening for triggers: [${botConfig.triggers.join('] [')}]`);
        
        const prefixedChannels = Object.keys(prefixMap);
        if (prefixedChannels.length > 0) {
            prefixedChannels.forEach(ch => {
                log(`Channel #${ch} requires prefix: "${prefixMap[ch]}"`);
            });
        }
        
        if (ignoredChannels.length > 0) {
            log(`Ignoring channels: [${ignoredChannels.join('] [')}]`);
        }
        
        statusDiv.textContent = 'Status: Connecting...';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';

        chatSocket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

        chatSocket.onopen = () => {
            log(`Connected. Authenticating...`);
            
            chatSocket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
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

            if (rawMessage.includes('CAP * ACK')) return;

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

            // --- SHARED CHAT BLOCKER ---
            if (tags['source-room-id'] && tags['source-room-id'] !== tags['room-id']) {
                return; 
            }

            const match = actualMessagePart.match(/(?:PRIVMSG|USERNOTICE) #([^ ]+) :(.*)/);
            
            if (match) {
                const channel = match[1].toLowerCase();
                const text = match[2];
                const lowerText = text.toLowerCase();
                
                // --- NEW: IGNORED CHANNEL BLOCKER ---
                if (botConfig.ignoredChannels.includes(channel)) {
                    return; // Completely ignore any message from this channel
                }
                // ------------------------------------

                const senderMatch = actualMessagePart.match(/^:([^!]+)!/);
                const sender = senderMatch ? senderMatch[1].toLowerCase() : 'system';

                if (sender === botConfig.username) return;

                const isAnnouncement = actualMessagePart.includes('USERNOTICE') && tags['msg-id'] === 'announcement';
                const badges = tags['badges'] || '';
                
                const isBroadcasterByBadge = badges.includes('broadcaster/1');
                const isBroadcasterById = tags['user-id'] && tags['room-id'] && (tags['user-id'] === tags['room-id']);
                
                const isBroadcaster = isBroadcasterByBadge || isBroadcasterById;
                const isModerator = badges.includes('moderator/1');
                
                const isAuthorizedUser = isBroadcaster || isModerator || isAnnouncement;

                // --- SPAM TRACKER ---
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

                // --- SEQUENCE TRIGGER ---
                if (isAuthorizedUser && !isSequenceRunning) {
                    const matchedTrigger = botConfig.triggers.find(t => lowerText.includes(t));
                    
                    if (matchedTrigger) {
                        runMessageSequence(channel, sender, matchedTrigger);
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
