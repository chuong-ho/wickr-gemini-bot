const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { WickrLogger } = require('./logger');

class MessageProcessor {
  constructor(bot) {
    this.bot = bot;
    this.geminiClient = null;
  }

  async initialize() {
    if (!this.geminiClient) {
      const apiKey = await this.getGeminiApiKey();
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiClient = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  async getGeminiApiKey() {
    const client = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'us-gov-west-1'
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

  static async canHandle(message) {
    return message.message && message.message.trim() !== '';
  }

  async createResponse(msg, userId, groupId) {
    await this.initialize();

    try {
      WickrLogger.info('Processing message from user');
      const result = await this.geminiClient.generateContent(msg);
      return result.response.text();
    } catch (error) {
      WickrLogger.error('Gemini API error:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  async process(message) {
    try {
      const userId = message.userEmail;
      const groupId = message.vgroupid;
      const geminiResponse = await this.createResponse(message.message, userId, groupId);
      
      return this.bot.send(groupId, geminiResponse);
    } catch (error) {
      WickrLogger.error('Error processing message:', error);
      return this.bot.send(
        message.vgroupid, 
        'Sorry, I encountered an error processing your request.'
      );
    }
  }
}

module.exports = { MessageProcessor };