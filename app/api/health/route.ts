import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/database';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: 서버와 데이터베이스 상태를 확인합니다
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [OK, ERROR]
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     connected:
 *                       type: boolean
 *                     totalConnections:
 *                       type: number
 *                     idleConnections:
 *                       type: number
 *       500:
 *         description: Server or database error
 */
export async function GET() {
  try {
    // 데이터베이스 상태 확인
    const dbHealth = await healthCheck();
    
    const isHealthy = dbHealth.status === 'healthy';
    
    return NextResponse.json({
      status: isHealthy ? 'OK' : 'ERROR',
      message: isHealthy ? 'API Server and Database are running' : 'Database connection issue',
      timestamp: new Date().toISOString(),
      database: dbHealth
    }, { 
      status: isHealthy ? 200 : 500 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      database: {
        status: 'unhealthy',
        details: { connected: false }
      }
    }, { 
      status: 500 
    });
  }
}