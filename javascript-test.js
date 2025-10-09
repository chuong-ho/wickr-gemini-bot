#!/usr/bin/env node
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function getGeminiApiKey() {
    const client = new SecretsManagerClient({ region: 'us-gov-west-1' });
    const command = new GetSecretValueCommand({ SecretId: 'gemini_pro_api_key' });
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString);
    return secret.api_key;
}

async function sendToGemini(prompt) {
    const apiKey = await getGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function main() {
    if (process.argv.length !== 3) {
        console.log("Usage: node javascript-test.js 'your prompt here'");
        process.exit(1);
    }
    
    const prompt = process.argv[2];
    try {
        const result = await sendToGemini(prompt);
        console.log(result);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
