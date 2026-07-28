# BadgeFlow Architecture

## 목표

BadgeFlow는 계정이나 서버 데이터베이스 없이 명찰 디자인부터 인쇄까지 완료하는 local-first 웹 애플리케이션입니다. 핵심 품질 기준은 실제 크기 인쇄 정확도, 사용자 파일의 로컬 처리, 복구 가능한 편집 상태입니다.

## 데이터 흐름

```text
사용자 파일
  ├─ 이미지/SVG ─ 검증·SVG 정리 ─┐
  ├─ CSV ─ 행·열·문자열 정규화 ──┼─ 편집기 상태
  └─ 프로젝트 JSON ─ 스키마 정규화┘
                                   ├─ IndexedDB 자동 저장
                                   ├─ 프로젝트 JSON 백업
                                   └─ Canvas 렌더링 → jsPDF → 로컬 다운로드
```

파일 내용은 애플리케이션 서버로 업로드되지 않습니다.

## 주요 모듈

- `components/BadgeStudio.tsx`: 편집 상태, 캔버스 상호작용, import/export, PDF 생성
- `lib/badgeflow/storage.ts`: IndexedDB 저장과 localStorage 폴백
- `worker/index.ts`: vinext 요청 처리, 이미지 최적화, 공통 보안 헤더
- `lib/site.ts`: 기본 배포와 GitHub Pages 하위 경로를 정규화하는 URL 도우미
- `app/layout.tsx`: 배포 대상별 canonical 및 공유 메타데이터

## 단위 체계

편집기 모델은 위치와 크기를 mm로 보관합니다. 화면은 명찰 크기에 대한 백분율로 투영하고, PDF는 jsPDF의 `mm` 단위를 사용합니다. 래스터 렌더링은 선택한 DPI를 `dpi / 25.4` 배율로 변환합니다.

## 신뢰 경계

- CSV, 프로젝트 JSON, 이미지, SVG는 모두 신뢰하지 않는 입력입니다.
- SVG의 스크립트·외부 참조·위험한 CSS를 제거합니다.
- 프로젝트는 알려진 필드만 읽고 수치 범위와 데이터 URL을 제한합니다.
- 브라우저 저장 실패는 편집을 막지 않고 UI에 상태로 표시합니다.
- Worker는 CSP, frame 차단, MIME sniffing 차단 등 공통 헤더를 추가합니다.
- GitHub Pages 미러는 정적 호스팅이므로 Worker 응답 헤더 대신 저장소의 정적 export 계약을 사용합니다.

## 향후 분리 후보

편집기 기능이 커질 경우 `BadgeStudio.tsx`의 프로젝트 스키마, PDF 렌더러, 캔버스 상호작용을 독립 모듈로 분리하는 것을 우선합니다. 분리 시 mm 기반 도메인 모델을 단일 진실 공급원으로 유지해야 합니다.
