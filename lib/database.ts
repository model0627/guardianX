import { Pool, PoolClient, QueryResult } from 'pg';

// 데이터베이스 연결 풀 인스턴스
let pool: Pool | null = null;

/**
 * PostgreSQL 연결 풀 초기화
 */
function initializePool(): Pool {
  if (!pool) {
    // 환경 변수에서 DATABASE_URL이 있으면 사용, 없으면 개별 설정 사용
    const connectionConfig = process.env.DATABASE_URL 
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'guardianx_dev',
          user: process.env.DB_USER || 'username',
          password: process.env.DB_PASSWORD || 'password',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };

    pool = new Pool({
      ...connectionConfig,
      // 연결 풀 설정
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    });

    // 연결 풀 이벤트 핸들링
    pool.on('connect', (client: PoolClient) => {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('새로운 데이터베이스 연결이 설정되었습니다.');
      }
    });

    pool.on('error', (err: Error) => {
      console.error('데이터베이스 연결 풀 오류:', err);
    });

    // 연결 풀 정리는 애플리케이션 레벨에서 처리
  }

  return pool;
}

/**
 * 데이터베이스 연결 풀 가져오기
 */
export function getPool(): Pool {
  return initializePool();
}

/**
 * 데이터베이스 쿼리 실행
 * @param text SQL 쿼리 문자열
 * @param params 쿼리 매개변수
 * @returns QueryResult
 */
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // 개발 모드에서 쿼리 로깅
    if (process.env.DEBUG_MODE === 'true') {
      console.log('실행된 쿼리:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('데이터베이스 쿼리 오류:', { text, duration: `${duration}ms`, error });
    throw error;
  }
}

/**
 * 트랜잭션 실행
 * @param callback 트랜잭션 내에서 실행할 함수
 * @returns 트랜잭션 결과
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 데이터베이스 연결 상태 확인
 * @returns 연결 상태 정보
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connected: boolean;
    totalConnections?: number;
    idleConnections?: number;
    waitingClients?: number;
  };
}> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // 간단한 쿼리로 연결 테스트
      await client.query('SELECT 1');
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingClients: pool.waitingCount,
        },
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('데이터베이스 상태 확인 실패:', error);
    return {
      status: 'unhealthy',
      details: {
        connected: false,
      },
    };
  }
}

/**
 * 페이지네이션을 위한 OFFSET과 LIMIT 계산
 * @param page 페이지 번호 (1부터 시작)
 * @param limit 페이지당 항목 수
 * @returns { offset, limit }
 */
export function getPagination(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;
  return { offset, limit };
}

/**
 * SQL 파라미터 바인딩을 위한 플레이스홀더 생성
 * @param count 파라미터 개수
 * @param startIndex 시작 인덱스 (기본값: 1)
 * @returns 플레이스홀더 문자열 ($1, $2, $3, ...)
 */
export function createPlaceholders(count: number, startIndex: number = 1): string {
  return Array.from(
    { length: count }, 
    (_, i) => `$${startIndex + i}`
  ).join(', ');
}

/**
 * 동적 WHERE 절 생성
 * @param conditions 조건 객체
 * @returns { whereClause, values }
 */
export function buildWhereClause(conditions: Record<string, any>): {
  whereClause: string;
  values: any[];
} {
  const keys = Object.keys(conditions).filter(key => conditions[key] !== undefined);
  
  if (keys.length === 0) {
    return { whereClause: '', values: [] };
  }
  
  const whereParts = keys.map((key, index) => `${key} = $${index + 1}`);
  const values = keys.map(key => conditions[key]);
  
  return {
    whereClause: `WHERE ${whereParts.join(' AND ')}`,
    values,
  };
}

// 타입 정의
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 페이지네이션 결과 생성
 * @param data 데이터 배열
 * @param total 전체 데이터 개수
 * @param page 현재 페이지
 * @param limit 페이지당 항목 수
 * @returns PaginationResult
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// DB 객체 (기존 코드와의 호환성을 위해)
export const db = {
  query,
  transaction,
  getPool,
  healthCheck,
};