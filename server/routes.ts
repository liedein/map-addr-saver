import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { coordinateToAddressSchema } from "@shared/schema";
import axios from "axios";

// IP 추출 함수
function getClientIp(req: Request): string {
  return (
    req.ip ||
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    "127.0.0.1"
  );
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

async function checkUsageLimit(ipAddress: string): Promise<{ allowed: boolean; currentCount: number }> {
  const today = getTodayDateString();
  const existingUsage = await storage.getUsageByIpAndDate(ipAddress, today);

  if (!existingUsage) {
    await storage.createUsageRecord({ ipAddress, usageCount: 0, date: today });
    return { allowed: true, currentCount: 0 };
  }

  if (existingUsage.usageCount >= 100) {
    return { allowed: false, currentCount: existingUsage.usageCount };
  }

  return { allowed: true, currentCount: existingUsage.usageCount };
}

async function incrementUsageCount(ipAddress: string): Promise<number> {
  const today = getTodayDateString();
  const existingUsage = await storage.getUsageByIpAndDate(ipAddress, today);

  if (!existingUsage) {
    await storage.createUsageRecord({ ipAddress, usageCount: 1, date: today });
    return 1;
  }

  const newCount = existingUsage.usageCount + 1;
  await storage.updateUsageCount(existingUsage.id, newCount);
  return newCount;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API 사용량 조회
  app.get("/api/usage", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const today = getTodayDateString();
      const usage = await storage.getUsageByIpAndDate(ipAddress, today);

      res.json({
        count: usage?.usageCount || 0,
        limit: 100,
        date: today,
      });
    } catch (error) {
      console.error("Error getting usage:", error);
      res.status(500).json({ message: "Failed to get usage information" });
    }
  });

  // 정적 지도 이미지 생성
  app.post("/api/static-map", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const { allowed } = await checkUsageLimit(ipAddress);

      if (!allowed) {
        return res.status(429).json({
          message: "Daily usage limit exceeded (100 requests per day)",
        });
      }

      const parseResult = coordinateToAddressSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.errors,
        });
      }

      const { lat, lng } = parseResult.data;

      const width = 800;
      const height = 600;
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1F2937"/>
  <rect x="20" y="20" width="${width - 40}" height="${height - 80}" fill="#374151" stroke="#4B5563" stroke-width="2"/>
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#4B5563" stroke-width="1" opacity="0.3"/>
    </pattern>
  </defs>
  <rect x="20" y="20" width="${width - 40}" height="${height - 80}" fill="url(#grid)"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="8" fill="#10B981"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="4" fill="#065F46"/>
  <text x="${width / 2}" y="${height / 2 + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#F9FAFB">
    위도: ${lat.toFixed(6)}
  </text>
  <text x="${width / 2}" y="${height / 2 + 65}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#F9FAFB">
    경도: ${lng.toFixed(6)}
  </text>
  <rect x="10" y="${height - 80}" width="${width - 20}" height="70" fill="rgba(0,0,0,0.7)" rx="8"/>
  <text x="20" y="${height - 50}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#10B981">
    지도 위치: ${lat.toFixed(4)}, ${lng.toFixed(4)}
  </text>
  <text x="20" y="${height - 25}" font-family="Arial, sans-serif" font-size="14" fill="#F9FAFB">
    좌표 기반 지도 이미지
  </text>
</svg>`;

      await incrementUsageCount(ipAddress);

      const buffer = Buffer.from(svgContent, "utf8");
      res.set({
        "Content-Type": "image/svg+xml",
        "Content-Length": buffer.length,
        "Cache-Control": "no-cache",
      });
      res.send(buffer);
    } catch (error) {
      console.error("Error creating map image:", error);
      res.status(500).json({ message: "Failed to create map image" });
    }
  });

  // 좌표 → 주소 변환
  app.post("/api/coordinate-to-address", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const { allowed } = await checkUsageLimit(ipAddress);

      if (!allowed) {
        return res.status(429).json({
          message: "Daily usage limit exceeded (100 requests per day)",
        });
      }

      const parseResult = coordinateToAddressSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.errors,
        });
      }

      const { lat, lng } = parseResult.data;
      const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY || "";

      if (!kakaoRestApiKey) {
        console.warn("KAKAO_REST_API_KEY is not set.");
        return res.status(500).json({ message: "Missing Kakao API key" });
      }

      const response = await axios.get(
        "https://dapi.kakao.com/v2/local/geo/coord2address.json",
        {
          headers: {
            Authorization: `KakaoAK ${kakaoRestApiKey}`,
          },
          params: {
            x: lng,
            y: lat,
            input_coord: "WGS84",
          },
        }
      );

      if (!response.data?.documents || response.data.documents.length === 0) {
        return res.status(404).json({ message: "Address not found for the given coordinates" });
      }

      const document = response.data.documents[0];
      const address =
        document.address?.address_name ||
        document.road_address?.address_name ||
        "주소를 찾을 수 없습니다";

      const usageCount = await incrementUsageCount(ipAddress);

      res.json({
        address,
        lat,
        lng,
        usageCount,
      });
    } catch (error) {
      console.error("Error converting coordinates to address:", error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;

        if (status === 401) {
          return res.status(500).json({ message: "Kakao API 인증 실패" });
        } else if (status === 429) {
          return res.status(429).json({ message: "Kakao API 요청 한도 초과" });
        } else {
          return res.status(500).json({ message: "Kakao API 오류" });
        }
      }

      res.status(500).json({ message: "Failed to convert coordinates to address" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
