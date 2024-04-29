const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Directory where server-specific message data will be stored
const serverDataDirectory = 'Servers';

// Directory where user-specific message data will be stored
const userDataDirectory = 'Users';

// Tracking variables
let totalMessagesLogged = 0;
const uniqueUsers = new Set();
const uniqueServers = new Set();

app.post('/log-messages', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).send('Discord token is required');
    }

    const client = new Client({
        checkupdate: false
    });

    client.on('ready', () => {
        console.log('Client is ready!');
    });

    client.on("messageCreate", async (msg) => {
        if (msg.guild == null || msg.channel.type !== "GUILD_TEXT") return;

        const serverId = msg.guildId;
        const serverName = msg.guild.name.replace(/[\\/:*?"<>|]/g, '-');
        const authorId = msg.author.id;
        const authorUsername = msg.author.username;

        // Update tracking variables
        totalMessagesLogged++;
        uniqueUsers.add(authorId);
        uniqueServers.add(serverId);

        const messageData = {
            authorId: authorId,
            authorUsername: authorUsername,
            messageId: msg.id,
            messageCreated: new Date(msg.createdTimestamp),
            messageContent: msg.content,
            messageDeleted: false,
            serverId: serverId,
            serverName: serverName,
            channelId: msg.channelId,
            channelName: msg.channel.name
        };

        // Store message data by server
        const serverDirectory = path.join(serverDataDirectory, serverName);
        const serverDataPath = path.join(serverDirectory, `${serverId}.json`);

        ensureDirectoryExists(serverDirectory);
        await saveMessageDataWithRetry(serverDataPath, messageData);

        // Store message data by user
        const userDirectory = path.join(userDataDirectory, sanitizeFilename(authorUsername));
        const userDataPath = path.join(userDirectory, `${authorId}.json`);

        ensureDirectoryExists(userDirectory);
        await saveMessageDataWithRetry(userDataPath, messageData);

        console.log(`Message data for server ${serverName} (${serverId}) and user ${authorUsername} (${authorId}) stored locally`);
    });

    client.login(token);

    return res.send('Logging messages with provided Discord token.');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

// Function to sanitize a string to make it safe for use as a filename or directory name
function sanitizeFilename(filename) {
    return filename.replace(/[\\/:"*?<>|]/g, '-'); // Replace invalid characters with hyphens
}

// Function to save message data with retry logic
async function saveMessageDataWithRetry(filePath, messageData, retries = 3) {
    while (retries > 0) {
        try {
            saveMessageData(filePath, messageData);
            return; // Exit loop if successful
        } catch (error) {
            console.error(`Error saving message data to ${filePath}: ${error.message}`);
            retries--;
            if (retries === 0) {
                console.error(`Failed to save message data to ${filePath} after multiple retries.`);
                return;
            }
            console.log(`Retrying... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
        }
    }
}

function saveMessageData(filePath, messageData) {
    let existingData = [];
    if (fs.existsSync(filePath)) {
        existingData = JSON.parse(fs.readFileSync(filePath));
    }

    existingData.push(messageData);

    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
}
