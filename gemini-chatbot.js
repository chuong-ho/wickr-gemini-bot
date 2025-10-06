const fetch = require('node-fetch');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { WickrLogger } = require('./logger');

const WickrIOAPI = require('wickrio_addon');
const WickrIOBotAPI = require('wickrio-bot-api');
const bot = new WickrIOBotAPI.WickrIOBot();

var bot_username;
var gemini_api_key;

// Get Gemini API key from AWS Secrets Manager
async function getGeminiApiKey() {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  try {
    const command = new GetSecretValueCommand({ SecretId: 'gemini_pro_api_key' });
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString);
    return secret.api_key;
  } catch (error) {
    WickrLogger.error('Error retrieving Gemini API key:', error);
    throw error;
  }
}

// Call Google Gemini Pro API
async function callGeminiAPI(prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${gemini_api_key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function exitHandler(options, err) {
  try {
    await bot.close();
    if (err || options.exit) {
      WickrLogger.error("Exit reason:", err);
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    WickrLogger.error(err);
  }
}

process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { pid: true }));
process.on('SIGUSR2', exitHandler.bind(null, { pid: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

async function main() {
  try {
    gemini_api_key = await getGeminiApiKey();
    
    bot.processesJsonToProcessEnv();
    var tokens = JSON.parse(process.env.tokens);
    
    if (tokens.BOT_USERNAME !== undefined) {
      bot_username = tokens.BOT_USERNAME.value;
    } else if (tokens.WICKRIO_BOT_NAME !== undefined) {
      bot_username = tokens.WICKRIO_BOT_NAME.value;
    } else {
      WickrLogger.error("Client username not found!");
      process.exit();
    }

    const status = await bot.start(bot_username);
    if (!status) {
      WickrLogger.error("Bot failed to start");
      process.exit();
    }

    WickrLogger.info("Bot started, listening for messages...");
    await bot.startListening(listen);

  } catch (err) {
    WickrLogger.error(err);
  }
}

async function listen(message) {
  try {
    var parsedMessage = bot.parseMessage(message);
    if (!parsedMessage) return;

    var userMessage = parsedMessage.message;
    var vGroupID = parsedMessage.vgroupid;

    // Turn user questions into prompts and send to Gemini
    if (userMessage && userMessage.trim() !== '') {
      try {
        WickrLogger.info('Processing message from user');
        
        // Send prompt to Google Gemini Pro
        const geminiResponse = await callGeminiAPI(userMessage);
        
        // Send response back to user in chat window
        await WickrIOAPI.cmdSendRoomMessage(vGroupID, geminiResponse);
        
      } catch (error) {
        WickrLogger.error('Gemini API error:', error);
        await WickrIOAPI.cmdSendRoomMessage(vGroupID, 'Sorry, I encountered an error processing your request.');
      }
    }
  } catch (err) {
    WickrLogger.error(err);
  }
}

main();
