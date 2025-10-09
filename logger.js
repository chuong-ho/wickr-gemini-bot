const { logger } = require('wickrio-bot-api');
const winston = require('winston');

const existingFormats = logger.format;

const newFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.prettyPrint({ depth: 4 }),
  existingFormats,
);

logger.format = newFormat;

module.exports = { WickrLogger: logger };