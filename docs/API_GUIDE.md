# API 개발 가이드

이 문서는 GuardianX 프로젝트에서 새로운 API를 추가하고 문서화하는 방법을 안내합니다.

## 📋 목차

1. [API Route 생성](#api-route-생성)
2. [Swagger 문서화](#swagger-문서화)
3. [프론트엔드 연동](#프론트엔드-연동)
4. [테스트 방법](#테스트-방법)
5. [예시: 완전한 API 추가](#예시-완전한-api-추가)

## API Route 생성

### 1. 폴더 구조

Next.js App Router에서는 `app/api/` 디렉토리 하위에 API Routes를 생성합니다.

```
app/api/
├── health/
│   └── route.ts      # GET /api/health
├── users/
│   └── route.ts      # GET, POST /api/users
└── products/         # 새 API 예시
    ├── route.ts      # GET, POST /api/products
    └── [id]/
        └── route.ts  # GET, PUT, DELETE /api/products/[id]
```

### 2. API Route 파일 구조

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET 요청 처리
export async function GET(request: NextRequest) {
  try {
    // 비즈니스 로직
    const data = { message: 'Hello World' };
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST 요청 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 데이터 검증
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // 비즈니스 로직
    const newItem = {
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString()
    };
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 3. 동적 라우트 (URL 파라미터)

```typescript
// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id;
  
  // userId를 사용한 비즈니스 로직
  const user = findUserById(userId);
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(user);
}
```

## Swagger 문서화

### 1. 기본 Swagger 주석

각 API 함수 위에 JSDoc 형태로 Swagger 주석을 추가합니다:

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 모든 사용자 조회
 *     description: 시스템에 등록된 모든 사용자를 조회합니다.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: 성공적으로 조회됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: 서버 오류
 */
export async function GET() {
  // 구현...
}
```

### 2. POST 요청 문서화

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
 *                 example: "홍길동"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "hong@example.com"
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 잘못된 요청 데이터
 */
```

### 3. 동적 라우트 문서화

```typescript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 특정 사용자 조회
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
```

### 4. 스키마 정의

복잡한 데이터 구조는 `lib/swagger.ts`의 `components.schemas`에 정의합니다:

```typescript
// lib/swagger.ts
export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    // ... 기존 설정
    definition: {
      // ... 기존 설정
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '사용자 ID' },
              name: { type: 'string', description: '사용자 이름' },
              email: { type: 'string', format: 'email', description: '이메일 주소' },
              createdAt: { type: 'string', format: 'date-time', description: '생성일시' }
            }
          },
          Product: {  // 새 스키마 추가
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              price: { type: 'number', minimum: 0 },
              category: { type: 'string' }
            }
          }
        }
      }
    }
  });
};
```

## 프론트엔드 연동

### 1. API 호출 함수 추가

`lib/api.ts`에 새로운 API 호출 함수를 추가합니다:

```typescript
// lib/api.ts
export const api = {
  // ... 기존 함수들
  
  products: {
    getAll: () => fetchAPI('/products'),
    
    getById: (id: string) => fetchAPI(`/products/${id}`),
    
    create: (data: { name: string; price: number; category: string }) =>
      fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<Product>) =>
      fetchAPI(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      fetchAPI(`/products/${id}`, {
        method: 'DELETE',
      }),
  }
};
```

### 2. TypeScript 타입 정의

```typescript
// lib/types.ts (새 파일)
export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
```

### 3. 컴포넌트에서 사용

```typescript
// app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.products.getAll();
        setProducts(response.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Products</h1>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>Price: ${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

## 테스트 방법

### 1. API 문서에서 직접 테스트
- http://localhost:3000/api-docs 에서 Swagger UI 사용

### 2. curl 명령어로 테스트

```bash
# GET 요청
curl http://localhost:3000/api/products

# POST 요청
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "샘플 상품", "price": 10000, "category": "전자제품"}'

# PUT 요청
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "수정된 상품명"}'

# DELETE 요청
curl -X DELETE http://localhost:3000/api/products/1
```

### 3. Postman 컬렉션 생성
API 문서의 OpenAPI 스펙을 Postman으로 import하여 테스트 가능합니다.

## 예시: 완전한 API 추가

새로운 "Products" API를 추가하는 전체 과정을 보여드리겠습니다.

### 1단계: API Route 생성

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  createdAt: string;
}

// 임시 데이터 저장소
let products: Product[] = [
  { id: 1, name: '노트북', price: 1200000, category: '전자제품', createdAt: new Date().toISOString() }
];

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 모든 상품 조회
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: 상품 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
export async function GET() {
  return NextResponse.json({ products });
}

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: 새 상품 생성
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "스마트폰"
 *               price:
 *                 type: number
 *                 example: 800000
 *               category:
 *                 type: string
 *                 example: "전자제품"
 *     responses:
 *       201:
 *         description: 상품 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, price, category } = body;

  if (!name || !price || !category) {
    return NextResponse.json(
      { error: 'name, price, category are required' },
      { status: 400 }
    );
  }

  const newProduct: Product = {
    id: Date.now(),
    name,
    price: Number(price),
    category,
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);

  return NextResponse.json(newProduct, { status: 201 });
}
```

### 2단계: Swagger 스키마 추가

```typescript
// lib/swagger.ts 수정
components: {
  schemas: {
    // ... 기존 스키마들
    Product: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '상품 ID' },
        name: { type: 'string', description: '상품명' },
        price: { type: 'number', description: '가격', minimum: 0 },
        category: { type: 'string', description: '카테고리' },
        createdAt: { type: 'string', format: 'date-time', description: '생성일시' }
      }
    }
  }
}
```

### 3단계: API 클라이언트 함수 추가

```typescript
// lib/api.ts 수정
export const api = {
  // ... 기존 함수들
  products: {
    getAll: () => fetchAPI('/products'),
    create: (data: { name: string; price: number; category: string }) =>
      fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  }
};
```

### 4단계: 프론트엔드 페이지 생성

```typescript
// app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', category: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProduct = await api.products.create({
        name: formData.name,
        price: Number(formData.price),
        category: formData.category
      });
      setProducts([...products, newProduct]);
      setFormData({ name: '', price: '', category: '' });
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">상품 관리</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="상품명"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="가격"
          value={formData.price}
          onChange={(e) => setFormData({...formData, price: e.target.value})}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="카테고리"
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          상품 추가
        </button>
      </form>

      <div>
        {products.map((product: any) => (
          <div key={product.id} className="border p-4 mb-2">
            <h3>{product.name}</h3>
            <p>가격: {product.price.toLocaleString()}원</p>
            <p>카테고리: {product.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

이제 새로운 API가 완전히 구현되고 문서화되었습니다!

## 🔥 중요한 팁

1. **일관성**: 기존 API와 동일한 패턴을 따라주세요
2. **에러 처리**: 항상 적절한 HTTP 상태 코드와 에러 메시지를 반환하세요
3. **검증**: 입력 데이터를 반드시 검증하세요
4. **문서화**: Swagger 주석을 빠트리지 마세요
5. **타입 안전성**: TypeScript 타입을 정의하고 활용하세요

API 추가 후 http://localhost:3000/api-docs에서 문서가 자동으로 업데이트되는 것을 확인할 수 있습니다!