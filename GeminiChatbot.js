const { WickrIOBot } = require('wickrio-bot-api');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { WickrLogger } = require('./logger');

class GeminiChatbot {
  constructor() {
    this.bot = new WickrIOBot();
    this.geminiClient = null;
  }

  async getGeminiApiKey() {
    const client = new SecretsManagerClient({
      region: 'us-gov-west-1',
      credentials: {
        accessKeyId: '',
        secretAccessKey: ''
      }
    });

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

  async initializeGemini() {
    if (!this.geminiClient) {
      const apiKey = await this.getGeminiApiKey();
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiClient = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  async start() {
    this.bot.processesJsonToProcessEnv();

    try {
      const tokens = JSON.parse(process.env.tokens);
      const botName = tokens.BOT_USERNAME?.value || tokens.WICKRIO_BOT_NAME?.value;

      if (!botName) {
        throw new Error("Client username not found!");
      }

      WickrLogger.info(`Starting bot ${botName}`);
      const status = await this.bot.start(botName);
      if (!status) {
        throw new Error("Client not able to start");
      }

      WickrLogger.info("Bot started. Listening for messages.");
      await this.bot.startListening(this.handleMessage.bind(this));
    } catch (err) {
      WickrLogger.error(err);
      throw err;
    }
  }

  async handleMessage(message) {
    const parsedMessage = this.bot.parseMessage(message);
    if (!parsedMessage) {
      WickrLogger.error('Failed to parse message');
      return;
    }

    if (parsedMessage.message && parsedMessage.message.trim() !== '') {
      try {
        await this.processMessage(parsedMessage);
      } catch (err) {
        WickrLogger.error(err);
      }
    }
  }

  async processMessage(message) {
    try {
      await this.initializeGemini();

      WickrLogger.info(`Processing message: ${message.message.length} chars`);
      
      // Add timeout for long requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30s')), 30000)
      );
      
      const result = await Promise.race([
        this.geminiClient.generateContent(message.message),
        timeoutPromise
      ]);
      
      const geminiResponse = result.response.text();
      WickrLogger.info(`Response generated: ${geminiResponse.length} chars`);
      
      return this.bot.apiService().WickrIOAPI.cmdSendRoomMessage(message.vgroupid, geminiResponse);
    } catch (error) {
      WickrLogger.error('Error processing message:');
      WickrLogger.error('Error type:', error.constructor.name);
      WickrLogger.error('Error message:', error.message);
      WickrLogger.error('Error stack:', error.stack);
      if (error.response) {
        WickrLogger.error('API response status:', error.response.status);
        WickrLogger.error('API response data:', error.response.data);
      }
      return this.bot.apiService().WickrIOAPI.cmdSendRoomMessage(
        message.vgroupid,
        'Sorry, I encountered an error processing your request.'
      );
    }
  }

  async exitHandler(options, err) {
    try {
      var closed = await this.bot.close();
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
}

module.exports = { GeminiChatbot };
