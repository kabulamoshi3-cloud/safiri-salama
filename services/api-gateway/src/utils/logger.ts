import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

export const createLogger = (service: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { service },
    transports: [
      // Console output
      new winston.transports.Console({
        format: combine(
          colorize(),
          logFormat
        )
      }),
      
      // File output for errors
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      
      // File output for all logs
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880,
        maxFiles: 5
      })
    ]
  });
};
