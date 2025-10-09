const { WickrIOBot } = require('wickrio-bot-api');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { WickrLogger } = require('./logger');

class GeminiChatbot {
  constructor() {
    try {
      this.bot = new WickrIOBot();
      if (!this.bot) {
        throw new Error('Failed to create WickrIOBot instance');
      }
      this.geminiClient = null;
      this.wickrAPI = null;
    } catch (error) {
      WickrLogger.error('Error initializing GeminiChatbot:', error);
      throw new Error(`GeminiChatbot initialization failed: ${error.message}`);
    }
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
      this.wickrAPI = this.bot.apiService().WickrIOAPI;
      if (!this.wickrAPI) {
        throw new Error("Failed to initialize WickrIO API");
      }
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
        setTimeout(() => reject(new Error('Request timeout after 120s')), 120000)
      );
      
      const result = await Promise.race([
        this.geminiClient.generateContent(message.message),
        timeoutPromise
      ]);
      
      const geminiResponse = result.response.text();
      WickrLogger.info(`Response generated: ${geminiResponse.length} chars`);
      
      if (!this.wickrAPI) {
        throw new Error('WickrAPI not initialized');
      }

      WickrLogger.info(`Attempting to send message to vgroupid: ${message.vgroupid}`);
      
      // Chunk long responses to prevent timeouts
      if (geminiResponse.length > 1000) {
        const chunks = [];
        let start = 0;
        while (start < geminiResponse.length) {
          let end = start + 1000;
          if (end < geminiResponse.length) {
            // Find the last space within the chunk to avoid splitting words
            const lastSpace = geminiResponse.lastIndexOf(' ', end);
            if (lastSpace > start) {
              end = lastSpace;
            }
          }
          chunks.push(geminiResponse.slice(start, end));
          start = end;
        }
        
        WickrLogger.info(`Sending ${chunks.length} chunks`);
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        for (const chunk of chunks) {
          await this.wickrAPI.cmdSendRoomMessage(message.vgroupid, chunk);
          // Small delay between chunks to prevent overwhelming
          await delay(100);
        }
        WickrLogger.info('All chunks sent successfully');
        return;
      }
      
      const sendResult = await this.wickrAPI.cmdSendRoomMessage(message.vgroupid, geminiResponse);
      WickrLogger.info(`Message send result: ${JSON.stringify(sendResult)}`);
      return sendResult;
    } catch (error) {
      WickrLogger.error('Error processing message:');
      WickrLogger.error(`Error type: ${error.constructor?.name || 'Unknown'}`);
      WickrLogger.error(`Error message: ${error.message || 'No message'}`);
      WickrLogger.error(`Error stack: ${error.stack || 'No stack trace'}`);
      if (error.response) {
        WickrLogger.error(`API response status: ${error.response.status}`);
        WickrLogger.error(`API response data: ${JSON.stringify(error.response.data)}`);
      }
      if (this.wickrAPI) {
        return this.wickrAPI.cmdSendRoomMessage(
          message.vgroupid,
          'Sorry, I encountered an error processing your request.'
        );
      } else {
        WickrLogger.error('WickrAPI not initialized, cannot send error message');
      }
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
