import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/database';

/**
 * @swagger
 * /api/health/db:
 *   get:
 *     summary: Database health check endpoint
 *     description: 데이터베이스 연결 상태만 확인합니다
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [OK, ERROR]
 *                 database:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 details:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     totalConnections:
 *                       type: number
 *                     idleConnections:
 *                       type: number
 *       500:
 *         description: Database error
 */
export async function GET() {
  try {
    const dbHealth = await healthCheck();
    const isHealthy = dbHealth.status === 'healthy';
    
    return NextResponse.json({
      status: isHealthy ? 'OK' : 'ERROR',
      database: isHealthy,
      timestamp: new Date().toISOString(),
      details: dbHealth
    }, { 
      status: isHealthy ? 200 : 500 
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      database: false,
      timestamp: new Date().toISOString(),
      details: {
        status: 'unhealthy',
        connected: false,
        error: 'Connection failed'
      }
    }, { 
      status: 500 
    });
  }
}