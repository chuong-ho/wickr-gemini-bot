const { GeminiChatbot } = require('./GeminiChatbot');
const { WickrLogger } = require('./logger');

async function main() {
  const bot = new GeminiChatbot();

  process.on('SIGINT', () => exitHandler(bot, { exit: true }));
  process.on('SIGUSR1', () => exitHandler(bot, { pid: true }));
  process.on('SIGUSR2', () => exitHandler(bot, { pid: true }));
  process.on('uncaughtException', (err) =>
    exitHandler(bot, { exit: true }, err)
  );

  await bot.start();
}

async function exitHandler(bot, options, err) {
  try {
    if (err) {
      WickrLogger.error(`Exit error: ${err}`);
      process.exit();
    }
    await bot.close();
    if (options.exit) {
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    WickrLogger.error(err);
  }
}

main();