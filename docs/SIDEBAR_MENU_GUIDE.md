# 사이드바 메뉴 구성 가이드

CloudGuard IPAM 시스템의 사이드바 메뉴 구성 규칙과 구현 방법을 정의합니다.

## 📋 메뉴 타입별 규칙

### 1. 단일 메뉴 (Single Menu)
**특징**: 하위 메뉴가 없는 독립적인 페이지
**화살표**: 없음
**예시**: 대시보드

```tsx
// 단일 메뉴 구현 예시
const mainMenuItems = [
  {
    id: 'dashboard',
    name: '대시보드',
    icon: BarChart3,
    href: '/dashboard'
  }
];

// 렌더링
<button onClick={() => router.push(item.href)}>
  <Icon />
  <span>{item.name}</span>
  {/* 화살표 없음 */}
</button>
```

### 2. 드롭다운 메뉴 (Dropdown Menu)
**특징**: 하위 메뉴를 포함하는 상위 메뉴
**화살표**: 상태에 따라 `>` 또는 `∨`
**예시**: IPAM 관리

```tsx
// 드롭다운 메뉴 구현 예시
const [menuOpen, setMenuOpen] = useState(false);

<button onClick={() => setMenuOpen(!menuOpen)}>
  <Icon />
  <span>메뉴명</span>
  {menuOpen ? (
    <ChevronDown className="w-4 h-4 text-gray-400" />
  ) : (
    <ChevronRight className="w-4 h-4 text-gray-400" />
  )}
</button>

{menuOpen && (
  <div className="ml-6 space-y-1">
    {/* 하위 메뉴들 */}
  </div>
)}
```

### 3. 하위 메뉴 (Sub Menu)
**특징**: 드롭다운 메뉴의 하위 항목
**화살표**: 없음 (단일 페이지)
**들여쓰기**: `ml-6` (24px)
**아이콘**: 작은 크기 (`w-4 h-4`)

```tsx
// 하위 메뉴 구현 예시
const subMenuItems = [
  {
    id: 'offices',
    name: '사무실',
    icon: Building2,
    href: '/ipam/offices'
  }
];

// 렌더링 (드롭다운 내부)
<div className="ml-6 space-y-1">
  {subMenuItems.map((item) => (
    <button onClick={() => router.push(item.href)}>
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{item.name}</span>
      {/* 화살표 없음 */}
    </button>
  ))}
</div>
```

## 🎨 스타일링 규칙

### 색상 및 상태
```tsx
// 활성 상태 스타일
const getMenuStyle = (isActive: boolean, isSubMenu: boolean = false) => {
  if (isActive) {
    return isSubMenu 
      ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-500'  // 하위 메뉴: 좌측 보더
      : 'bg-orange-100 text-orange-700 border-r-2 border-orange-500' // 상위 메뉴: 우측 보더
  }
  return isSubMenu
    ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'     // 하위 메뉴 호버
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'    // 상위 메뉴 호버
};

// 아이콘 색상
const getIconColor = (isActive: boolean) => 
  isActive ? 'text-orange-600' : 'text-gray-400';
```

### 크기 및 간격
```tsx
// 상위 메뉴
className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg"
icon="w-5 h-5"
arrow="w-4 h-4"

// 하위 메뉴  
className="ml-6 space-y-1" // 들여쓰기
icon="w-4 h-4"             // 작은 아이콘
```

## 🔧 구현 패턴

### 1. 레이아웃 컴포넌트 구조
```tsx
export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 메뉴 데이터
  const mainMenuItems = [...];
  const subMenuItems = [...];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <aside className="fixed lg:static ...">
        {/* 헤더 */}
        <div className="flex items-center h-16 px-4 border-b">
          {/* 로고 */}
        </div>

        {/* 테넌트 정보 */}
        <div className="px-4 py-3 border-b bg-orange-50">
          {/* 테넌트 표시 */}
        </div>

        {/* 메뉴 네비게이션 */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {/* 단일 메뉴들 */}
          {/* 드롭다운 메뉴들 */}
        </nav>

        {/* 로그아웃 버튼 */}
        <div className="mt-auto p-4 border-t">
          {/* 로그아웃 */}
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 상단 헤더 */}
        {/* 메인 콘텐츠 */}
      </div>
    </div>
  );
}
```

### 2. 상태 관리
```tsx
// 각 드롭다운별 상태 관리
const [ipamMenuOpen, setIpamMenuOpen] = useState(false);
const [adminMenuOpen, setAdminMenuOpen] = useState(false);

// 활성 메뉴 감지
const isActive = pathname === item.href;
const isParentActive = pathname.startsWith('/ipam');
```

### 3. 모바일 대응
```tsx
// 모바일 오버레이
{sidebarOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
       onClick={() => setSidebarOpen(false)} />
)}

// 메뉴 선택시 사이드바 닫기
onClick={() => {
  router.push(item.href);
  setSidebarOpen(false); // 모바일에서 자동 닫힘
}}

// 햄버거 메뉴 버튼
<button onClick={() => setSidebarOpen(true)} className="lg:hidden">
  <Menu className="w-6 h-6" />
</button>
```

## 📱 반응형 규칙

### 데스크톱 (lg 이상)
- 사이드바 항상 표시 (`lg:static`)
- 드롭다운 기본적으로 열린 상태 유지 가능
- 호버 효과 적용

### 모바일 (lg 미만)
- 사이드바 오버레이로 표시 (`fixed`)
- 햄버거 메뉴로 토글
- 메뉴 선택시 자동 닫힘
- 터치 친화적 크기 유지

## 🎯 접근성 고려사항

### 키보드 네비게이션
```tsx
// 포커스 가능한 버튼
<button 
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
```

### 스크린 리더
```tsx
// aria-label 추가
<button aria-label={`${item.name} 메뉴 ${isOpen ? '닫기' : '열기'}`}>
  
// aria-expanded 상태
<button aria-expanded={dropdownOpen}>
```

## 💡 Best Practices

### 1. 메뉴 구조 설계
- 최대 2단계 깊이 (상위 > 하위)
- 하위 메뉴는 7±2 개 이하로 제한
- 관련 기능끼리 그룹핑

### 2. 상태 관리
- 드롭다운 상태를 localStorage에 저장하여 새로고침시에도 유지
- URL 기반 활성 메뉴 자동 감지
- 모바일에서는 메뉴 선택시 자동 닫힘

### 3. 성능 최적화
- 아이콘 컴포넌트 지연 로딩
- 메뉴 데이터 메모이제이션
- 불필요한 리렌더링 방지

## 📝 체크리스트

새로운 메뉴 추가시 확인사항:

- [ ] 메뉴 타입 결정 (단일/드롭다운/하위)
- [ ] 적절한 아이콘 선택
- [ ] 화살표 표시 규칙 적용
- [ ] 활성 상태 스타일링
- [ ] 모바일 반응형 확인
- [ ] 접근성 속성 추가
- [ ] 키보드 네비게이션 테스트

## 🔄 향후 확장 가능성

### 3단계 메뉴 (필요시)
```tsx
// 깊이 3단계까지 확장 가능한 구조
const menuStructure = {
  level1: {
    level2: {
      level3: [...] // 최대 3단계까지
    }
  }
};
```

### 테마 지원
```tsx
// 다크모드/라이트모드 대응
const themeColors = {
  light: {
    active: 'bg-orange-100 text-orange-700',
    inactive: 'text-gray-600'
  },
  dark: {
    active: 'bg-orange-900 text-orange-300',
    inactive: 'text-gray-300'
  }
};
```

---

**업데이트**: 2025-01-08  
**적용 프로젝트**: CloudGuard IPAM  
**다음 리뷰**: 새로운 메뉴 추가시