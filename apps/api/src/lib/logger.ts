import pino from "pino";
import { config } from "../config";

export const logger = pino({
  level: config.isDev ? "debug" : "info",
  ...(config.isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, ignore: "pid,hostname" },
        },
      }
    : {}),
  base: { service: "carevault-api" },
});
