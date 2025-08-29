# Swagger 문서화 완벽 가이드

이 문서는 GuardianX 프로젝트에서 Swagger를 사용하여 API 문서를 작성하고 관리하는 방법을 상세히 설명합니다.

## 📋 목차

1. [Swagger 개요](#swagger-개요)
2. [기본 문법](#기본-문법)
3. [고급 기능](#고급-기능)
4. [실제 예시](#실제-예시)
5. [문제 해결](#문제-해결)

## Swagger 개요

### 현재 설정

GuardianX는 `next-swagger-doc` 패키지를 사용하여 Swagger 문서를 자동 생성합니다.

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api/docs
- **설정 파일**: `lib/swagger.ts`

### 작동 원리

1. API Route 파일의 JSDoc 주석을 스캔
2. `lib/swagger.ts`에서 설정과 스키마 정의
3. `/api/docs` 엔드포인트에서 OpenAPI JSON 제공
4. `/api-docs` 페이지에서 사용자 친화적인 문서 표시

## 기본 문법

### 1. 기본 API 문서화

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 사용자 목록 조회
 *     description: 시스템에 등록된 모든 사용자를 조회합니다.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
```

### 2. HTTP 메서드별 문법

#### GET 요청
```typescript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 상품 목록 조회
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 카테고리 필터링
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 결과 개수 제한
 *     responses:
 *       200:
 *         description: 상품 목록
 */
```

#### POST 요청
```typescript
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 새 사용자 생성
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "홍길동"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "hong@example.com"
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 120
 *                 example: 25
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *       400:
 *         description: 잘못된 입력 데이터
 */
```

#### PUT 요청
```typescript
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: 사용자 정보 수정
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
```

#### DELETE 요청
```typescript
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: 사용자 삭제
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 사용자 ID
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       403:
 *         description: 삭제 권한 없음
 */
```

## 고급 기능

### 1. 스키마 정의 및 재사용

`lib/swagger.ts`에서 복잡한 스키마를 정의하고 재사용할 수 있습니다:

```typescript
components: {
  schemas: {
    User: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        id: {
          type: 'integer',
          format: 'int64',
          description: '사용자 고유 ID',
          example: 1
        },
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 50,
          description: '사용자 이름',
          example: '홍길동'
        },
        email: {
          type: 'string',
          format: 'email',
          description: '이메일 주소',
          example: 'hong@example.com'
        },
        role: {
          type: 'string',
          enum: ['user', 'admin', 'moderator'],
          description: '사용자 역할',
          example: 'user'
        },
        profile: {
          $ref: '#/components/schemas/UserProfile'
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: '계정 생성일',
          example: '2024-01-15T09:30:00Z'
        }
      }
    },
    
    UserProfile: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'url',
          description: '프로필 이미지 URL',
          example: 'https://example.com/avatar.jpg'
        },
        bio: {
          type: 'string',
          maxLength: 500,
          description: '자기소개',
          example: '안녕하세요, 개발자입니다.'
        },
        location: {
          type: 'string',
          example: '서울, 대한민국'
        }
      }
    },
    
    ApiError: {
      type: 'object',
      required: ['error'],
      properties: {
        error: {
          type: 'string',
          description: '에러 메시지',
          example: 'Invalid input data'
        },
        code: {
          type: 'string',
          description: '에러 코드',
          example: 'VALIDATION_ERROR'
        },
        details: {
          type: 'object',
          description: '상세 에러 정보',
          additionalProperties: true
        }
      }
    }
  }
}
```

### 2. 인증 및 보안

```typescript
// lib/swagger.ts에 보안 설정 추가
components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT 토큰을 입력하세요'
    },
    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
      description: 'API 키를 입력하세요'
    }
  }
}

// API 함수에 보안 적용
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 관리자 전용 사용자 목록
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 */
```

### 3. 다양한 응답 형태

```typescript
/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: 파일 업로드
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 업로드할 파일
 *               description:
 *                 type: string
 *                 description: 파일 설명
 *     responses:
 *       200:
 *         description: 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileId:
 *                   type: string
 *                 url:
 *                   type: string
 *                   format: url
 *       413:
 *         description: 파일 크기 초과
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
```

### 4. 페이지네이션 문서화

```typescript
/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: 게시글 목록 조회 (페이지네이션)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title]
 *           default: createdAt
 *         description: 정렬 기준
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
 *     responses:
 *       200:
 *         description: 게시글 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
```

## 실제 예시

### 전자상거래 API 예시

```typescript
// app/api/products/[id]/route.ts
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: 상품 상세 정보 조회
 *     description: 특정 상품의 상세 정보를 조회합니다. 재고, 리뷰, 관련 상품 등을 포함합니다.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 상품 ID
 *         example: "prod_123456"
 *       - in: query
 *         name: include
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [reviews, related, inventory]
 *         style: form
 *         explode: false
 *         description: 포함할 추가 정보
 *         example: ["reviews", "related"]
 *     responses:
 *       200:
 *         description: 상품 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Product'
 *                 - type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *                     relatedProducts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     inventory:
 *                       $ref: '#/components/schemas/Inventory'
 *       404:
 *         description: 상품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               error: "Product not found"
 *               code: "PRODUCT_NOT_FOUND"
 *               details:
 *                 productId: "prod_123456"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 구현...
}
```

### 복잡한 스키마 정의

```typescript
// lib/swagger.ts
Product: {
  type: 'object',
  required: ['id', 'name', 'price', 'category'],
  properties: {
    id: {
      type: 'string',
      pattern: '^prod_[a-zA-Z0-9]{6,}$',
      description: '상품 고유 식별자',
      example: 'prod_123456'
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: '상품명',
      example: 'iPhone 15 Pro'
    },
    description: {
      type: 'string',
      maxLength: 2000,
      description: '상품 설명',
      example: '최신 프로세서를 탑재한 프리미엄 스마트폰'
    },
    price: {
      type: 'object',
      required: ['amount', 'currency'],
      properties: {
        amount: {
          type: 'number',
          minimum: 0,
          multipleOf: 0.01,
          description: '가격',
          example: 1299.99
        },
        currency: {
          type: 'string',
          pattern: '^[A-Z]{3}$',
          description: '통화 코드 (ISO 4217)',
          example: 'USD'
        },
        originalAmount: {
          type: 'number',
          minimum: 0,
          description: '할인 전 원가',
          example: 1399.99
        }
      }
    },
    category: {
      $ref: '#/components/schemas/Category'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      uniqueItems: true,
      description: '상품 태그',
      example: ['electronics', 'smartphone', 'apple']
    },
    images: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'url',
            description: '이미지 URL'
          },
          alt: {
            type: 'string',
            description: '대체 텍스트'
          },
          isPrimary: {
            type: 'boolean',
            description: '메인 이미지 여부'
          }
        }
      }
    },
    availability: {
      type: 'string',
      enum: ['in_stock', 'out_of_stock', 'preorder', 'discontinued'],
      description: '재고 상태',
      example: 'in_stock'
    },
    metadata: {
      type: 'object',
      additionalProperties: true,
      description: '추가 메타데이터'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: '생성일시'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: '수정일시'
    }
  }
}
```

## 문제 해결

### 자주 발생하는 문제들

#### 1. 스키마 참조 오류
```yaml
# 잘못된 참조
$ref: '#/components/schemas/user'  # 소문자

# 올바른 참조  
$ref: '#/components/schemas/User'  # 대문자
```

#### 2. 경로 파라미터 누락
```typescript
// 잘못된 방법
/**
 * @swagger
 * /api/users/123:  # 하드코딩된 ID
 */

// 올바른 방법
/**
 * @swagger
 * /api/users/{id}:  # 동적 파라미터
 */
```

#### 3. 필수 속성 누락
```typescript
// requestBody가 있는 POST/PUT 요청에는 반드시 required: true 추가
requestBody:
  required: true
  content:
    application/json:
      schema:
        # ...
```

#### 4. 태그 일관성
```typescript
// 일관된 태그 사용
tags: [Users]  // 모든 사용자 관련 API에서 동일하게 사용
```

### 디버깅 팁

1. **JSON 유효성 검사**: http://localhost:3000/api/docs에서 생성된 OpenAPI JSON 확인
2. **온라인 에디터**: [Swagger Editor](https://editor.swagger.io/)에서 스펙 검증
3. **브라우저 개발자 도구**: 콘솔에서 Swagger 관련 오류 확인

### 성능 최적화

```typescript
// lib/swagger.ts
export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      // 캐시 활용을 위한 설정
      info: {
        version: process.env.API_VERSION || '1.0.0',
      },
    },
    // 프로덕션에서는 캐시 사용
    schemaFolders: process.env.NODE_ENV === 'production' ? [] : ['app/api'],
  });
  return spec;
};
```

## 🎯 베스트 프랙티스

1. **일관성**: 동일한 리소스는 동일한 스키마 사용
2. **예시 제공**: 모든 필드에 realistic한 예시 값 추가
3. **에러 문서화**: 모든 가능한 에러 응답 문서화
4. **버전 관리**: API 버전 변경 시 문서도 함께 업데이트
5. **태그 활용**: 관련 API들을 논리적으로 그룹화
6. **보안 고려**: 민감한 정보는 문서에 노출하지 않기

이제 Swagger를 활용하여 완벽한 API 문서를 작성할 수 있습니다! 🚀