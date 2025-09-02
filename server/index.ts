import dotenv from "dotenv";
dotenv.config();  // 1. .env 파일에서 환경 변수 로드

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 요청 로깅 미들웨어 (특히 /api 요청만)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any;

  // 원래 res.json 함수 저장 및 바인딩
  const originalResJson = res.json.bind(res);

  // 타입 캐스팅: res.json 시그니처 맞추기
  res.json = ((bodyJson: any, ...args: any[]) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  }) as typeof res.json;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// 비동기 진입점 try/catch 적용
(async () => {
  try {
    // API 라우트 등록 (비동기)
    const server = await registerRoutes(app);

    // 에러 핸들러 미들웨어 (항상 마지막에!)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      // throw err; => 프로덕션 서버 다운 방지 위해 주석 권장
    });

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => {
        log(`serving on port ${port}`);
      }
    );
  } catch (err) {
    log("Server initialization error:", err);
    process.exit(1);
  }
})();
