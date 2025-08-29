import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'GuardianX API',
        version: '1.0.0',
        description: 'GuardianX Next.js Integrated API Documentation',
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production' 
            ? 'https://your-vercel-domain.vercel.app'
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' 
            ? 'Production server'
            : 'Development server',
        },
      ],
      components: {
        responses: {
          Unauthorized: {
            description: 'Unauthorized - Authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Unauthorized',
                    },
                  },
                },
              },
            },
          },
          InternalServerError: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Internal server error',
                    },
                  },
                },
              },
            },
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT 토큰을 사용한 인증',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API 키를 사용한 인증',
          },
          apiKeyAuthAlt: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'ApiKey',
            description: 'Authorization: ApiKey {your-api-key} 형식',
          },
        },
        schemas: {
          User: {
            type: 'object',
            required: ['name', 'email'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'User ID',
              },
              name: {
                type: 'string',
                description: 'User name',
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'User email',
              },
              role: {
                type: 'string',
                enum: ['user', 'admin', 'moderator'],
                description: 'User role',
              },
              isActive: {
                type: 'boolean',
                description: 'User active status',
              },
              emailVerified: {
                type: 'boolean',
                description: 'Email verification status',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
              },
            },
          },
          Tenant: {
            type: 'object',
            required: ['name'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Tenant ID',
              },
              name: {
                type: 'string',
                description: 'Tenant name',
              },
              description: {
                type: 'string',
                description: 'Tenant description',
              },
              slug: {
                type: 'string',
                description: 'Tenant URL slug',
              },
              role: {
                type: 'string',
                enum: ['owner', 'admin', 'member'],
                description: 'User role in tenant',
              },
              memberCount: {
                type: 'number',
                description: 'Number of members',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp',
              },
            },
          },
          LoginRequest: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: {
                type: 'string',
                format: 'email',
                description: 'User email',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
            },
          },
          RegisterRequest: {
            type: 'object',
            required: ['name', 'email', 'password', 'confirmPassword'],
            properties: {
              name: {
                type: 'string',
                description: 'User name',
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'User email',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
              confirmPassword: {
                type: 'string',
                description: 'Password confirmation',
              },
            },
          },
          TenantCreateRequest: {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                type: 'string',
                description: 'Tenant name',
              },
              description: {
                type: 'string',
                description: 'Tenant description',
              },
            },
          },
          ApiKey: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'API 키 ID',
              },
              name: {
                type: 'string',
                description: 'API 키 이름',
              },
              keyPreview: {
                type: 'string',
                description: 'API 키 미리보기 (처음과 끝 4자리만)',
              },
              permissions: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'API 키 권한',
              },
              lastUsed: {
                type: 'string',
                format: 'date-time',
                description: '마지막 사용 시간',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '생성 시간',
              },
            },
          },
          ApiKeyCreateRequest: {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                type: 'string',
                description: 'API 키 이름',
              },
              permissions: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['read', 'write', 'admin'],
                },
                description: 'API 키 권한',
                default: ['read'],
              },
            },
          },
          Health: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['OK', 'ERROR'],
                description: 'Health status',
              },
              message: {
                type: 'string',
                description: 'Status message',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Check timestamp',
              },
              database: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['connected', 'disconnected'],
                  },
                  latency: {
                    type: 'string',
                  },
                },
              },
            },
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error message',
              },
            },
          },
          Contact: {
            type: 'object',
            required: ['name', 'email', 'role'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '담당자 ID',
              },
              name: {
                type: 'string',
                description: '담당자 이름',
              },
              email: {
                type: 'string',
                format: 'email',
                description: '이메일 주소',
              },
              phone: {
                type: 'string',
                description: '전화번호',
              },
              role: {
                type: 'string',
                enum: ['primary', 'backup', 'viewer'],
                description: '역할 (primary: 주 담당자, backup: 백업 담당자, viewer: 조회자)',
              },
              status: {
                type: 'string',
                enum: ['active', 'inactive'],
                description: '상태 (active: 활성, inactive: 비활성)',
                default: 'active',
              },
              notes: {
                type: 'string',
                description: '메모',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                description: '현재 페이지',
              },
              limit: {
                type: 'integer',
                description: '페이지당 항목 수',
              },
              total: {
                type: 'integer',
                description: '전체 항목 수',
              },
              pages: {
                type: 'integer',
                description: '전체 페이지 수',
              },
            },
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Success status',
              },
              message: {
                type: 'string',
                description: 'Success message',
              },
            },
          },
          // IPAM Schemas
          Device: {
            type: 'object',
            required: ['name', 'device_type'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '디바이스 ID',
              },
              name: {
                type: 'string',
                description: '디바이스 이름',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              device_type: {
                type: 'string',
                enum: ['server', 'switch', 'router', 'firewall', 'storage', 'loadbalancer', 'other'],
                description: '디바이스 유형',
              },
              manufacturer: {
                type: 'string',
                description: '제조사',
              },
              model: {
                type: 'string',
                description: '모델명',
              },
              serial_number: {
                type: 'string',
                description: '시리얼 번호',
              },
              rack_id: {
                type: 'string',
                format: 'uuid',
                description: '랙 ID',
              },
              rack_position: {
                type: 'integer',
                description: '랙 위치 (U)',
              },
              rack_size: {
                type: 'integer',
                description: '장비 크기 (U)',
              },
              status: {
                type: 'string',
                enum: ['active', 'inactive', 'maintenance', 'decommissioned'],
                description: '상태',
              },
              notes: {
                type: 'string',
                description: '메모',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          IPAddress: {
            type: 'object',
            required: ['ip_range_id', 'ip_address', 'status'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'IP 주소 ID',
              },
              ip_range_id: {
                type: 'string',
                format: 'uuid',
                description: 'IP 대역 ID',
              },
              ip_address: {
                type: 'string',
                format: 'ipv4',
                description: 'IP 주소',
              },
              status: {
                type: 'string',
                enum: ['available', 'assigned', 'reserved', 'deprecated'],
                description: '상태',
              },
              hostname: {
                type: 'string',
                description: '호스트명',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              mac_address: {
                type: 'string',
                description: 'MAC 주소',
              },
              lease_start: {
                type: 'string',
                format: 'date-time',
                description: '임대 시작일',
              },
              lease_end: {
                type: 'string',
                format: 'date-time',
                description: '임대 종료일',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          IPRange: {
            type: 'object',
            required: ['name', 'network_address', 'subnet_mask'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'IP 대역 ID',
              },
              name: {
                type: 'string',
                description: 'IP 대역 이름',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              network_address: {
                type: 'string',
                format: 'ipv4',
                description: '네트워크 주소',
              },
              subnet_mask: {
                type: 'string',
                format: 'ipv4',
                description: '서브넷 마스크',
              },
              gateway: {
                type: 'string',
                format: 'ipv4',
                description: '게이트웨이',
              },
              dns_servers: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'ipv4',
                },
                description: 'DNS 서버 목록',
              },
              vlan_id: {
                type: 'integer',
                description: 'VLAN ID',
              },
              ip_version: {
                type: 'integer',
                enum: [4, 6],
                description: 'IP 버전',
                default: 4,
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          Office: {
            type: 'object',
            required: ['name', 'address'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '사무실 ID',
              },
              name: {
                type: 'string',
                description: '사무실 이름',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              address: {
                type: 'string',
                description: '주소',
              },
              contact_person: {
                type: 'string',
                description: '담당자',
              },
              phone: {
                type: 'string',
                description: '전화번호',
              },
              email: {
                type: 'string',
                format: 'email',
                description: '이메일',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          ServerRoom: {
            type: 'object',
            required: ['name', 'office_id'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '서버실 ID',
              },
              name: {
                type: 'string',
                description: '서버실 이름',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              office_id: {
                type: 'string',
                format: 'uuid',
                description: '사무실 ID',
              },
              floor: {
                type: 'string',
                description: '층',
              },
              temperature: {
                type: 'number',
                description: '온도 (°C)',
              },
              humidity: {
                type: 'number',
                description: '습도 (%)',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          Rack: {
            type: 'object',
            required: ['name', 'server_room_id', 'size_u'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '랙 ID',
              },
              name: {
                type: 'string',
                description: '랙 이름',
              },
              rack_number: {
                type: 'string',
                description: '랙 번호',
              },
              server_room_id: {
                type: 'string',
                format: 'uuid',
                description: '서버실 ID',
              },
              size_u: {
                type: 'integer',
                description: '랙 크기 (U)',
              },
              used_u: {
                type: 'integer',
                description: '사용중인 U',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
          Library: {
            type: 'object',
            required: ['name'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: '라이브러리 ID',
              },
              name: {
                type: 'string',
                description: '라이브러리/소프트웨어 이름',
              },
              version: {
                type: 'string',
                description: '버전',
              },
              vendor: {
                type: 'string',
                description: '제조사/공급업체',
              },
              product_type: {
                type: 'string',
                enum: ['os', 'database', 'middleware', 'application', 'security', 'monitoring', 'backup', 'other'],
                description: '제품 유형',
              },
              device_id: {
                type: 'string',
                format: 'uuid',
                description: '설치된 디바이스 ID',
              },
              process_name: {
                type: 'string',
                description: '프로세스명',
              },
              install_path: {
                type: 'string',
                description: '설치 경로',
              },
              license_type: {
                type: 'string',
                enum: ['perpetual', 'subscription', 'trial', 'open_source', 'other'],
                description: '라이선스 유형',
              },
              license_key: {
                type: 'string',
                description: '라이선스 키',
              },
              license_expiry: {
                type: 'string',
                format: 'date',
                description: '라이선스 만료일',
              },
              api_endpoint: {
                type: 'string',
                description: 'API 엔드포인트',
              },
              api_key: {
                type: 'string',
                description: 'API 키',
              },
              status: {
                type: 'string',
                enum: ['active', 'inactive', 'expired', 'deprecated'],
                description: '상태',
                default: 'active',
              },
              description: {
                type: 'string',
                description: '설명',
              },
              notes: {
                type: 'string',
                description: '메모',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: '생성일시',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: '수정일시',
              },
            },
          },
        },
      },
      tags: [
        {
          name: 'Health',
          description: 'Health check endpoints',
        },
        {
          name: 'Auth',
          description: 'Authentication endpoints',
        },
        {
          name: 'Users',
          description: 'User management endpoints',
        },
        {
          name: 'Tenants',
          description: 'Tenant management endpoints',
        },
        {
          name: 'User',
          description: 'Current user related endpoints',
        },
        {
          name: 'Contacts',
          description: '담당자 관리 endpoints',
        },
        {
          name: 'IPAM',
          description: 'IP Address Management endpoints',
        },
        {
          name: 'IPAM-Devices',
          description: 'IPAM 디바이스 관리',
        },
        {
          name: 'IPAM-IP',
          description: 'IP 주소 및 대역 관리',
        },
        {
          name: 'IPAM-Location',
          description: '위치 관리 (사무실, 서버실, 랙)',
        },
        {
          name: 'IPAM-Libraries',
          description: '라이브러리 및 소프트웨어 관리',
        },
        {
          name: 'Asset Assessments',
          description: '자산 평가 및 점검 관리',
        },
        {
          name: 'Assessment Checklists',
          description: '평가 체크리스트 관리',
        },
        {
          name: 'Assessment Items',
          description: '평가 항목 관리',
        },
        {
          name: 'Sync',
          description: '외부 데이터 동기화 API',
        },
        {
          name: 'API Connections',
          description: 'API 연결 관리',
        },
        {
          name: 'Google Sheets',
          description: 'Google Sheets 통합',
        },
        {
          name: 'SOAR',
          description: 'SOAR (Security Orchestration, Automation and Response)',
        },
        {
          name: 'Libraries',
          description: '라이브러리 관리 (비-IPAM)',
        },
      ],
    },
  });
  return spec;
};