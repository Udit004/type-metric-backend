import pino from 'pino';
import dotenv from 'dotenv';
dotenv.config();
const __dirname = import.meta.dirname;


const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: `${__dirname}/server.log` },
    },
    {
      target: '@logtail/pino',
      options: { 
        sourceToken: process.env.BETTER_STACK_SOURCETOKEN,
        options: { endpoint: process.env.BETTER_STACK_INGESTION_HOST }
      },
    },
    {
      target: 'pino-pretty',
    },
  ],
});

const logger = pino(
  {
    level: process.env.PINO_LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export default logger;
