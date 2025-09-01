// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  usageRecords;
  constructor() {
    this.usageRecords = /* @__PURE__ */ new Map();
  }
  async getUsageByIpAndDate(ipAddress, date) {
    return Array.from(this.usageRecords.values()).find(
      (record) => record.ipAddress === ipAddress && record.date === date
    );
  }
  async createUsageRecord(insertUsage) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const usage = {
      ...insertUsage,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.usageRecords.set(id, usage);
    return usage;
  }
  async updateUsageCount(id, count) {
    const existing = this.usageRecords.get(id);
    if (!existing) {
      throw new Error("Usage record not found");
    }
    const updated = {
      ...existing,
      usageCount: count,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.usageRecords.set(id, updated);
    return updated;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  date: text("date").notNull(),
  // Store as YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var coordinateToAddressSchema = z.object({
  lat: z.number(),
  lng: z.number()
});
var addressResponseSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number()
});

// server/routes.ts
import axios from "axios";
function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null) || "127.0.0.1";
}
function getTodayDateString() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
async function checkUsageLimit(ipAddress) {
  const today = getTodayDateString();
  const existingUsage = await storage.getUsageByIpAndDate(ipAddress, today);
  if (!existingUsage) {
    const newUsage = await storage.createUsageRecord({
      ipAddress,
      usageCount: 0,
      date: today
    });
    return { allowed: true, currentCount: 0 };
  }
  if (existingUsage.usageCount >= 100) {
    return { allowed: false, currentCount: existingUsage.usageCount };
  }
  return { allowed: true, currentCount: existingUsage.usageCount };
}
async function incrementUsageCount(ipAddress) {
  const today = getTodayDateString();
  const existingUsage = await storage.getUsageByIpAndDate(ipAddress, today);
  if (!existingUsage) {
    const newUsage = await storage.createUsageRecord({
      ipAddress,
      usageCount: 1,
      date: today
    });
    return 1;
  }
  const newCount = existingUsage.usageCount + 1;
  await storage.updateUsageCount(existingUsage.id, newCount);
  return newCount;
}
async function registerRoutes(app2) {
  app2.get("/api/usage", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const today = getTodayDateString();
      const usage = await storage.getUsageByIpAndDate(ipAddress, today);
      res.json({
        count: usage?.usageCount || 0,
        limit: 100,
        date: today
      });
    } catch (error) {
      console.error("Error getting usage:", error);
      res.status(500).json({ message: "Failed to get usage information" });
    }
  });
  app2.post("/api/static-map", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const { allowed, currentCount } = await checkUsageLimit(ipAddress);
      if (!allowed) {
        return res.status(429).json({
          message: "Daily usage limit exceeded (100 requests per day)",
          currentCount
        });
      }
      const result = coordinateToAddressSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: result.error.errors
        });
      }
      const { lat, lng } = result.data;
      const width = 800;
      const height = 600;
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background -->
  <rect width="100%" height="100%" fill="#1F2937"/>
  
  <!-- Map area -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 80}" fill="#374151" stroke="#4B5563" stroke-width="2"/>
  
  <!-- Grid pattern to simulate map -->
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#4B5563" stroke-width="1" opacity="0.3"/>
    </pattern>
  </defs>
  <rect x="20" y="20" width="${width - 40}" height="${height - 80}" fill="url(#grid)"/>
  
  <!-- Location marker -->
  <circle cx="${width / 2}" cy="${height / 2}" r="8" fill="#10B981"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="4" fill="#065F46"/>
  
  <!-- Coordinates text -->
  <text x="${width / 2}" y="${height / 2 + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#F9FAFB">
    \uC704\uB3C4: ${lat.toFixed(6)}
  </text>
  <text x="${width / 2}" y="${height / 2 + 65}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#F9FAFB">
    \uACBD\uB3C4: ${lng.toFixed(6)}
  </text>
  
  <!-- Address background -->
  <rect x="10" y="${height - 80}" width="${width - 20}" height="70" fill="rgba(0,0,0,0.7)" rx="8"/>
  
  <!-- Address text -->
  <text x="20" y="${height - 50}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#10B981">
    \uC9C0\uB3C4 \uC704\uCE58: ${lat.toFixed(4)}, ${lng.toFixed(4)}
  </text>
  <text x="20" y="${height - 25}" font-family="Arial, sans-serif" font-size="14" fill="#F9FAFB">
    \uC88C\uD45C \uAE30\uBC18 \uC9C0\uB3C4 \uC774\uBBF8\uC9C0
  </text>
</svg>`;
      await incrementUsageCount(ipAddress);
      const buffer = Buffer.from(svgContent, "utf8");
      res.set({
        "Content-Type": "image/svg+xml",
        "Content-Length": buffer.length,
        "Cache-Control": "no-cache"
      });
      res.send(buffer);
    } catch (error) {
      console.error("Error creating map image:", error);
      res.status(500).json({ message: "Failed to create map image" });
    }
  });
  app2.post("/api/coordinate-to-address", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const { allowed, currentCount } = await checkUsageLimit(ipAddress);
      if (!allowed) {
        return res.status(429).json({
          message: "Daily usage limit exceeded (100 requests per day)",
          currentCount
        });
      }
      const result = coordinateToAddressSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: result.error.errors
        });
      }
      const { lat, lng } = result.data;
      const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY || "185cdbc2e0798e3a4f3344d977e334de";
      const response = await axios.get("https://dapi.kakao.com/v2/local/geo/coord2address.json", {
        headers: {
          Authorization: `KakaoAK ${kakaoRestApiKey}`
        },
        params: {
          x: lng,
          y: lat,
          input_coord: "WGS84"
        }
      });
      if (!response.data || !response.data.documents || response.data.documents.length === 0) {
        return res.status(404).json({ message: "Address not found for the given coordinates" });
      }
      const document = response.data.documents[0];
      const address = document.address ? document.address.address_name : document.road_address ? document.road_address.address_name : "\uC8FC\uC18C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4";
      const newCount = await incrementUsageCount(ipAddress);
      res.json({
        address,
        lat,
        lng,
        usageCount: newCount
      });
    } catch (error) {
      console.error("Error converting coordinates to address:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          res.status(500).json({ message: "API authentication failed" });
        } else if (error.response?.status === 429) {
          res.status(429).json({ message: "API rate limit exceeded" });
        } else {
          res.status(500).json({ message: "External API error" });
        }
      } else {
        res.status(500).json({ message: "Failed to convert coordinates to address" });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
