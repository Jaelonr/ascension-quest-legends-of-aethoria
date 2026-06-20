import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";

const app: Express = express();
const devAuthBypass =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function findWebDistDir(): string | null {
  const configured = process.env.WEB_DIST_DIR?.trim();
  const candidates = [
    configured,
    path.resolve(process.cwd(), "artifacts/fitness-rpg/dist/public"),
    path.resolve(process.cwd(), "../fitness-rpg/dist/public"),
    path.resolve(moduleDir, "../../fitness-rpg/dist/public"),
    path.resolve(moduleDir, "../../../artifacts/fitness-rpg/dist/public"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

function mountWebApp(appInstance: Express): void {
  const shouldServeWeb =
    process.env.NODE_ENV === "production" || process.env.SERVE_WEB_APP === "true";

  if (!shouldServeWeb) {
    return;
  }

  const webDistDir = findWebDistDir();

  if (!webDistDir) {
    logger.warn(
      {
        cwd: process.cwd(),
        configuredWebDistDir: process.env.WEB_DIST_DIR,
      },
      "Web app build not found; API-only mode active",
    );
    return;
  }

  appInstance.use(
    express.static(webDistDir, {
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    }),
  );

  appInstance.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(webDistDir, "index.html"));
  });

  logger.info({ webDistDir }, "Serving built web app");
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRouter);

if (!devAuthBypass) {
  app.use(
    "/api",
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}

app.use("/api", router);

mountWebApp(app);

export default app;
