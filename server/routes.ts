import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { coordinateToAddressSchema } from "@shared/schema";
import axios from "axios";

// Rate limiting per IP
const ipUsageMap = new Map<string, { count: number; date: string }>();

function getClientIp(req: any): string {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) || '127.0.0.1';
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function checkUsageLimit(ipAddress: string): Promise<{ allowed: boolean; currentCount: number }> {
  const today = getTodayDateString();
  const existingUsage = await storage.getUsageByIpAndDate(ipAddress, today);
  
  if (!existingUsage) {
    // Create new usage record
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

async function incrementUsageCount(ipAddress: string): Promise<number> {
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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get usage count for current IP
  app.get("/api/usage", async (req, res) => {
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

  // Get static map image
  app.post("/api/static-map", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      
      // Check usage limit
      const { allowed, currentCount } = await checkUsageLimit(ipAddress);
      if (!allowed) {
        return res.status(429).json({ 
          message: "Daily usage limit exceeded (100 requests per day)",
          currentCount 
        });
      }

      // Validate request body
      const result = coordinateToAddressSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: result.error.errors 
        });
      }

      const { lat, lng } = result.data;

      // Create a simple SVG-based map image that browsers can handle better
      const width = 800;
      const height = 600;
      
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background -->
  <rect width="100%" height="100%" fill="#1F2937"/>
  
  <!-- Map area -->
  <rect x="20" y="20" width="${width-40}" height="${height-80}" fill="#374151" stroke="#4B5563" stroke-width="2"/>
  
  <!-- Grid pattern to simulate map -->
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#4B5563" stroke-width="1" opacity="0.3"/>
    </pattern>
  </defs>
  <rect x="20" y="20" width="${width-40}" height="${height-80}" fill="url(#grid)"/>
  
  <!-- Location marker -->
  <circle cx="${width/2}" cy="${height/2}" r="8" fill="#10B981"/>
  <circle cx="${width/2}" cy="${height/2}" r="4" fill="#065F46"/>
  
  <!-- Coordinates text -->
  <text x="${width/2}" y="${height/2 + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#F9FAFB">
    위도: ${lat.toFixed(6)}
  </text>
  <text x="${width/2}" y="${height/2 + 65}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#F9FAFB">
    경도: ${lng.toFixed(6)}
  </text>
  
  <!-- Address background -->
  <rect x="10" y="${height-80}" width="${width-20}" height="70" fill="rgba(0,0,0,0.7)" rx="8"/>
  
  <!-- Address text -->
  <text x="20" y="${height-50}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#10B981">
    지도 위치: ${lat.toFixed(4)}, ${lng.toFixed(4)}
  </text>
  <text x="20" y="${height-25}" font-family="Arial, sans-serif" font-size="14" fill="#F9FAFB">
    좌표 기반 지도 이미지
  </text>
</svg>`;

      // Increment usage count
      await incrementUsageCount(ipAddress);

      // Return the SVG image
      const buffer = Buffer.from(svgContent, 'utf8');
      res.set({
        'Content-Type': 'image/svg+xml',
        'Content-Length': buffer.length,
        'Cache-Control': 'no-cache'
      });
      res.send(buffer);

    } catch (error) {
      console.error("Error creating map image:", error);
      res.status(500).json({ message: "Failed to create map image" });
    }
  });

  // Convert coordinates to address using Kakao REST API
  app.post("/api/coordinate-to-address", async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      
      // Check usage limit
      const { allowed, currentCount } = await checkUsageLimit(ipAddress);
      if (!allowed) {
        return res.status(429).json({ 
          message: "Daily usage limit exceeded (100 requests per day)",
          currentCount 
        });
      }

      // Validate request body
      const result = coordinateToAddressSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: result.error.errors 
        });
      }

      const { lat, lng } = result.data;

      // Call Kakao REST API
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

      // Extract address from response
      const document = response.data.documents[0];
      const address = document.address ? document.address.address_name : 
                    (document.road_address ? document.road_address.address_name : "주소를 찾을 수 없습니다");

      // Increment usage count
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

  const httpServer = createServer(app);
  return httpServer;
}
