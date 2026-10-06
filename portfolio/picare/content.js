// Public evidence is pinned to the repository state used for this portfolio.
// Historical validation counts are records, not results from a new test run.
(() => {
  const github = 'https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN33-4th-5Team';
  const revision = '55535b53852d90b416ce04854ed12d1b2520178e';
  const retrospective = 'https://velog.io/@ajjarago/17%EC%A3%BC%EC%B0%A8-4%EC%B0%A8-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8';
  const blob = (path, line) => `${github}/blob/${revision}/${path}${line ? `#L${line}` : ''}`;
  const commit = (hash) => `${github}/commit/${hash}`;

  window.PICARE_PORTFOLIO = {
    title: 'PiCare',
    author: '최지흠',
    canvas: { width: 1600, height: 900 },
    links: { github, retrospective },
    slides: [
      {
        id: 'cover',
        layout: 'cover',
        title: 'AI 데모를 사용자 서비스로',
        eyebrow: '최지흠 · AI 서비스 / 백엔드',
        summary: 'Django 서비스 전환, 사용자 기록, 원격 AI 연동과 AWS 배포를 담당했습니다.',
        contribution: '개인 구현 · 팀 AI 기능 연동',
        items: [
          { title: 'PiCare', text: '공식 문서 기반 라즈베리파이 AI 도우미' },
          { title: '담당 역할', text: 'AI 서비스·백엔드 중심, 풀스택 통합' },
          { title: '핵심 경험', text: '기능을 화면·DB·운영 환경까지 연결' },
        ],
        media: [
          { src: 'assets/home.jpg', alt: 'PiCare 메인 화면', caption: '회고에 기록한 PiCare 메인 화면' },
        ],
        sources: [
          { label: '프로젝트 저장소', url: github, detail: 'README.md · 팀 프로젝트 소개와 역할' },
          { label: '개인 회고', url: retrospective, detail: 'Velog 17주차 4차 프로젝트 회고 · 화면과 작업 내역' },
          { label: '기여 범위', url: blob('docs/retrospectives/choejiheum.md', 18), detail: 'docs/retrospectives/choejiheum.md:18 · 개인·협업 범위 구분' },
        ],
        notes: [
          '포트폴리오의 중심은 모델 학습 자체가 아니라 AI 기능을 사용자 서비스로 제공하는 Django와 운영 연결부입니다.',
          'Qwen 사전학습, QLoRA 학습 결과 전체, 문서 수집·제품·미디어 파이프라인 전체를 개인 구현으로 주장하지 않습니다.',
          '메인 화면은 회고에 남긴 당시 화면입니다. 현재 운영 접속이나 실제 추론 성공을 입증하는 새 캡처가 아닙니다.',
        ],
      },
      {
        id: 'journey',
        layout: 'journey',
        title: '답변 다음의 흐름까지 연결',
        eyebrow: '서비스 경험',
        summary: '질문과 추천 결과를 학습·저장·재조회로 이어지는 하나의 웹 흐름으로 연결했습니다.',
        contribution: '개인: 웹 흐름 / 팀: AI 생성·추천 기능',
        items: [
          { title: '질문·추천', text: '목적과 조건을 입력하고 공식 근거 확인' },
          { title: '이해 확인', text: 'Q&A에서 동적 미니 챌린지로 연결' },
          { title: '기록 재조회', text: '추천·질문·오답을 사용자 기록으로 보존' },
        ],
        media: [
          { src: 'assets/recommend.jpg', alt: 'PiCare 제품 추천 입력 화면', caption: '제품 추천 · 목적과 조건을 받는 입력 전 화면' },
          { src: 'assets/qa.jpg', alt: 'PiCare 공식 문서 기반 Q&A 입력 화면', caption: '공식 문서 기반 Q&A · 입력 전 화면' },
        ],
        sources: [
          { label: 'Django 화면 확장', url: commit('7ec7c75'), detail: '7ec7c75 · 회원가입과 웹 프론트 확장·통합' },
          { label: '미니 챌린지 웹 연동', url: commit('6b2eba2'), detail: '6b2eba2 · Q&A 기반 취소 가능한 동적 미니 챌린지 연동' },
          { label: '사용자 기록', url: blob('docs/retrospectives/choejiheum.md', 94), detail: 'docs/retrospectives/choejiheum.md:94 · 추천 입력·응답 보존' },
        ],
        notes: [
          '제품 추천, Q&A, 퀴즈 생성 코어는 팀이 함께 만든 기능이며, 개인 기여는 웹·회원·기록과의 연결 범위를 설명합니다.',
          '이미지는 입력 전 화면입니다. 생성된 답변이나 추천 결과가 보이는 화면인 것처럼 설명하지 않습니다.',
          '오답 저장 후 문제 화면을 유지하는 UX는 a2677d9에서 개선했고, 스피너 표시 충돌은 f58c803에서 수정했습니다.',
        ],
      },
      {
        id: 'architecture',
        layout: 'architecture',
        title: '웹·DB·GPU의 책임을 분리',
        eyebrow: '시스템과 담당 경계',
        summary: 'AWS는 사용자 화면과 기록을, RunPod는 GPU 추론을 담당하도록 운영 흐름을 구성했습니다.',
        contribution: '개인: 웹·배포 / 공동: 원격 연동 / 팀: 모델·데이터',
        items: [
          { title: 'AWS Django', text: '화면·회원·세션·작업 상태 관리' },
          { title: 'RDS MySQL', text: '사용자와 서비스 기록 영속화' },
          { title: 'RunPod GPU', text: 'HTTP API를 통해 팀 AI 기능 실행' },
        ],
        media: [
          { src: 'assets/architecture.png', alt: 'PiCare 전체 시스템 아키텍처', caption: '팀 전체 아키텍처 · 담당 경계와 함께 설명' },
        ],
        sources: [
          { label: '서버별 책임', url: blob('docs/choejiheum-contributions.md', 1), detail: 'docs/choejiheum-contributions.md · Django와 AI 기능의 연결 범위' },
          { label: 'AWS 운영 구성', url: commit('fb7a170'), detail: 'fb7a170 · AWS Compose와 릴리스 스크립트 구성' },
          { label: '원격 연동 공동 변경', url: commit('5e5490f'), detail: '5e5490f · 김나은이 명시된 RunPod 비동기 서빙·AWS Django 연동 커밋' },
        ],
        notes: [
          '아키텍처 이미지는 전체 팀 시스템을 보여 주며 모든 구성 요소가 개인 작업이라는 뜻이 아닙니다.',
          '원격 AiJob과 RunPod 작업 큐 최초 추가는 5e5490f입니다. 작성자는 JiHeum이지만 커밋 제목에 김나은이 명시되어 있어 공동 구현·통합으로 구분합니다.',
          '웹은 GPU 모델을 직접 적재하지 않습니다. 다만 현재 배포 성공 검사에는 RunPod 준비 상태가 포함되어 있습니다.',
          '인프라 사양과 실제 리소스 설정은 당시 운영 문서 기준이며, 이번 시안 작성에서 운영 콘솔 상태를 재확인하지 않았습니다.',
        ],
      },
      {
        id: 'django',
        layout: 'django',
        title: '기존 AI를 재사용한 Django 전환',
        eyebrow: '개인 기여 01 · 서비스 구조',
        summary: '입력 검증과 요청 처리를 Django로 옮기고, 기존 AI 서비스는 연결 계층에서 재사용했습니다.',
        contribution: '개인: Django 골격·웹 통합 / 팀: 기존 AI 서비스',
        items: [
          { title: '요청 분리', text: 'URL·Form·View·Template으로 책임 구분' },
          { title: '서비스 재사용', text: '연결 계층에서 기존 AI 서비스 호출' },
          { title: '사용자 기능', text: '회원가입·로그인·세션 기반 화면 연결' },
        ],
        code: {
          filename: 'web_app/portal/services.py · 발췌',
          text: '@lru_cache(maxsize=1)\ndef get_qa_service() -> Any:\n    from streamlit_app.runtime import build_qa_service\n\n    return build_qa_service(PROJECT_ROOT)',
        },
        media: [],
        sources: [
          { label: 'Django 전환', url: commit('055cdaa'), detail: '055cdaa · 프로젝트 골격·폼·뷰·템플릿·서비스 어댑터 추가' },
          { label: '회원·웹 화면 확장', url: commit('7ec7c75'), detail: '7ec7c75 · 회원가입과 전체 프론트 확장·통합' },
          { label: '실제 서비스 호출', url: blob('web_app/portal/services.py', 47), detail: 'web_app/portal/services.py:47 · 기존 build_qa_service 호출' },
          { label: '회원 인증 처리', url: blob('web_app/accounts/views.py', 13), detail: 'web_app/accounts/views.py:13 · 안전한 next URL과 회원·로그인·로그아웃' },
        ],
        notes: [
          'Streamlit은 초기 AI 기능 확인에 사용했습니다. 사용자별 기록과 독립 URL·회원 흐름을 연결하기 위해 Django를 추가했습니다.',
          '표시한 코드는 현재 get_qa_service의 발췌로 설명용 docstring을 생략했습니다. AI 로직 전체를 새로 구현한 코드는 아닙니다.',
          '최초 개인 구현 이후 인증·웹 코드는 팀원 후속 수정도 포함합니다. 현재 코드 전체의 단독 소유를 주장하지 않습니다.',
          'Django 전환 전후 개발 시간이나 성능 개선율은 측정하지 않았습니다.',
        ],
      },
      {
        id: 'records',
        layout: 'records',
        title: '추천 결과를 사용자 기록으로',
        eyebrow: '개인 기여 02 · 데이터 소유권',
        summary: '입력 조건과 응답을 함께 저장하고, 소유자 검사를 거쳐 마이페이지에서 다시 확인하게 했습니다.',
        contribution: '개인: 추천 기록 모델·저장·조회 / 팀: 추천 생성',
        items: [
          { title: 'owner', text: '조회·삭제에 현재 사용자를 함께 조건으로 적용' },
          { title: 'JSON 스냅샷', text: '검증한 input_payload와 response_payload 보존' },
          { title: '중복 저장 억제', text: '트랜잭션·사용자 행 잠금·요청 ID 확인' },
        ],
        media: [
          { src: 'assets/erd.png', alt: 'PiCare 데이터 모델 관계도', caption: '팀 전체 데이터 모델 · 추천 기록 기여를 구분' },
          { src: 'assets/mypage.jpg', alt: 'PiCare 마이페이지의 사용자 활동 영역', caption: '마이페이지 · 저장 기록이 없는 빈 상태 화면' },
        ],
        sources: [
          { label: '추천 기록 모델', url: commit('9bfe48a'), detail: '9bfe48a · RecommendationRecord 모델·마이그레이션·검증 추가' },
          { label: '저장·상세 흐름', url: commit('11f1eaf'), detail: '11f1eaf · 추천 저장과 사용자별 조회 흐름 확장' },
          { label: '서버 저장 원칙', url: blob('web_app/portal/views.py', 251), detail: 'web_app/portal/views.py:251 · 응답 검증·행 잠금·중복 저장 검사' },
          { label: '소유자 한정 상세', url: blob('web_app/portal/views.py', 1414), detail: 'web_app/portal/views.py:1414 · pk와 owner를 함께 검사' },
        ],
        notes: [
          'RecommendationRecord 모델은 9bfe48a, 저장 트랜잭션·행 잠금·중복 확인 로직은 11f1eaf에 개인 구현 근거가 있습니다.',
          'JSON 입력·응답의 계약 복원과 사용자 삭제 시 동작은 web_app/portal/test_recommendation_models.py:13에서 검사합니다.',
          '마이페이지 캡처는 저장된 기록이 없는 당시 계정의 빈 상태 화면입니다. 새 기록 저장에 성공한 증적으로 설명하지 않습니다.',
          '전체 ERD에는 팀원이 구현한 데이터 모델도 포함됩니다. 개인 구현은 추천 기록 모델과 관련 웹 흐름입니다.',
          'SQLite·모의 테스트와 실제 RDS MySQL의 잠금·동시성 검증은 구분해야 합니다.',
        ],
      },
      {
        id: 'remote',
        layout: 'remote',
        title: 'AI 작업 상태 조회와 취소',
        eyebrow: '개인·공동 기여 · 원격 AI 경계',
        summary: '비동기 퀴즈 웹 흐름을 연결하고, GPU API의 HTTP 경계를 FastAPI에서 Django로 전환했습니다.',
        contribution: '개인: 웹 흐름·HTTP 전환 / 공동: AiJob·큐',
        items: [
          { title: '개인 · 웹 흐름', text: '퀴즈 생성 요청·상태 조회·취소·채점 연결' },
          { title: '개인 · HTTP 전환', text: 'Django View·URL·Gunicorn 진입점 적용' },
          { title: '공동 · 원격 작업', text: 'AiJob 상태·소유권·취소·결과 검증 관리' },
        ],
        media: [
          { src: 'assets/swagger.jpg', alt: 'PiCare API 문서 화면', caption: '상태 조회·취소 API와 요청·응답 스키마' },
        ],
        sources: [
          { label: '미니 챌린지 웹 흐름', url: commit('6b2eba2'), detail: '6b2eba2 · Celery 기반 퀴즈 웹 작업·상태·취소 흐름' },
          { label: 'RunPod Django 전환', url: commit('51447bf'), detail: '51447bf · GPU API의 Django HTTP 경계·URL·WSGI 진입점 전환' },
          { label: '원격 작업 공동 추가', url: commit('5e5490f'), detail: '5e5490f · 원격 AiJob·클라이언트·RunPod 큐 최초 추가, 공동 귀속' },
          { label: '현재 HTTP 핸들러', url: blob('src/runpod_api/app.py', 162), detail: 'src/runpod_api/app.py:162 · 작업 제출과 HTTP 계약 검증' },
        ],
        notes: [
          '6b2eba2는 기존 Celery 기반 퀴즈 웹 흐름의 개인 구현 근거입니다. 현재 원격 AiJob 흐름의 최초 추가는 5e5490f 공동 변경입니다.',
          'AiJob의 소유권·행 잠금·취소 이후 늦은 성공 차단·submission_unknown·만료 로직 전체를 단독 설계했다고 말하지 않습니다.',
          '51447bf에서 명확한 개인 후속 구현은 FastAPI 핸들러를 Django HttpRequest·JsonResponse·데코레이터로 바꾸고 URL과 Gunicorn 진입점을 추가한 부분입니다.',
          '51447bf의 remote_ai.py와 jobs.py 변경은 대부분 docstring입니다. 이를 새로운 계약 검증·큐 알고리즘 구현으로 표현하지 않습니다.',
          'Celery 작업 경로와 RunPod 원격 작업 큐는 서로 다른 실행 경로입니다. 운영 원격 모드에서 동일 작업이 두 큐를 연속 통과하는 것으로 그리지 않습니다.',
          '퀴즈 정답 키는 서버 세션에 보관하고, 공개 문제와 선택지만 브라우저에 전달합니다. 관련 회귀 검사는 web_app/portal/tests.py:814·890·904에 있습니다.',
        ],
      },
      {
        id: 'deploy',
        layout: 'deploy',
        title: '테스트부터 EC2 배포까지',
        eyebrow: '개인 기여 03 · AWS CI/CD',
        summary: '테스트 이후 SHA 태그 이미지를 ECR에 올리고 SSM으로 EC2에 배포하는 흐름을 구성했습니다.',
        contribution: '개인: AWS 배포·GitHub Actions CI/CD',
        items: [
          { title: '검증', text: 'Django 설정·마이그레이션·모의 HTTP 계약' },
          { title: '버전 식별', text: '커밋 SHA 이미지 태그로 배포 코드 구분' },
          { title: '원격 배포', text: 'SSM 릴리스 실행·동시 배포 직렬화' },
        ],
        media: [
          { src: 'assets/iam-policy.jpg', alt: 'PiCare AWS 배포를 위한 IAM 정책 기록', caption: 'SSM 관리형 정책과 ECR 이미지 Pull 정책' },
        ],
        sources: [
          { label: 'AWS 릴리스 구성', url: commit('fb7a170'), detail: 'fb7a170 · Nginx·Django Compose와 EC2 릴리스 스크립트' },
          { label: 'Actions 워크플로', url: commit('45fb318'), detail: '45fb318 · 테스트·ECR 업로드·SSM 배포 워크플로 추가' },
          { label: '배포 조건·SHA 태그', url: blob('.github/workflows/aws-cicd.yml', 67), detail: '.github/workflows/aws-cicd.yml:67 · test 이후 main 또는 수동 release' },
          { label: '실제 배포 검사', url: blob('deploy/aws-release.sh', 45), detail: 'deploy/aws-release.sh:45 · 화면과 AI 준비 상태 검사·수동 롤백 안내' },
        ],
        notes: [
          'PR에서는 테스트·이미지 빌드를 확인하고, main push 또는 수동 실행에서만 릴리스합니다. 테스트 이미지와 릴리스 이미지 빌드는 별도 단계입니다.',
          'ECR에 커밋 SHA 태그로 이미지를 올리고 SSM Run Command로 EC2의 기존 릴리스 스크립트를 호출합니다.',
          '현재 인증은 GitHub Secrets 접근 키입니다. OIDC 적용, 무중단 배포, 자동 롤백을 완료한 성과로 표현하지 않습니다.',
          '릴리스 스크립트는 이전 설정과 수동 태그 롤백을 안내합니다. 이미지 롤백과 DB 마이그레이션 복구는 별도 문제입니다.',
          '컨테이너 healthcheck는 HTTP 200을 검사하지만 릴리스는 status=ok와 ready=true까지 검사합니다. RunPod 중지 시 배포가 실패할 수 있습니다.',
          'IAM 화면은 회고의 당시 기록이며 현재 운영 권한을 재조회한 증적은 아닙니다.',
        ],
      },
      {
        id: 'incident',
        layout: 'incident',
        title: '배포 자산 누락과 명령 100개 복구',
        eyebrow: '문제 해결 · Command Lab',
        summary: 'Git 미추적 manifest를 웹 이미지에 포함해 승인된 명령어 라이브러리를 복구했습니다.',
        contribution: '개인: 배포 누락 대응 / 팀: 명령 카탈로그',
        items: [
          { title: '증상', text: '웹에서 명령어 데이터를 준비하지 못함' },
          { title: '원인', text: '로컬·RunPod 파일이 웹 배포 입력에 누락' },
          { title: '조치', text: '운영 manifest만 Git 추적해 이미지에 포함' },
        ],
        media: [
          { src: 'assets/command-lab.jpg', alt: 'manifest 복구 후 PiCare Command Lab 화면', caption: '복구 후 승인된 명령 100개를 표시한 화면' },
        ],
        sources: [
          { label: '운영 manifest 추적', url: commit('d9f3967'), detail: 'd9f3967 · .gitignore 예외와 manifest_v3.json 추가' },
          { label: '실제 추적 예외', url: blob('.gitignore', 192), detail: '.gitignore:192 · 현재 운영 manifest를 배포 자산으로 추적' },
          { label: '원인과 복구 기록', url: blob('docs/retrospectives/choejiheum.md', 709), detail: 'docs/retrospectives/choejiheum.md:709 · manifest 누락 원인·수정·복구 화면' },
          { label: '이미지 입력', url: blob('Dockerfile.aws', 14), detail: 'Dockerfile.aws:14 · 저장소 내용을 웹 이미지로 복사' },
        ],
        notes: [
          '로컬이나 RunPod에 파일이 존재하는 것과 Git checkout·AWS 웹 이미지에 포함되는 것은 다른 조건입니다.',
          'Command Lab은 웹에서도 승인 근거 청크를 확인하기 위해 manifest를 사용합니다. 운영 버전을 예외 추적한 것이 수정의 핵심입니다.',
          '회고는 복구 후 승인된 명령 100개가 표시됐다고 기록합니다. 100개는 팀 카탈로그의 규모이며 개인이 모두 작성한 명령 수가 아닙니다.',
          '이전 장애 화면은 제공 자료에 없어 원인·조치 설명으로만 전달합니다. 실패 캡처나 before 화면을 새로 만들어 증거처럼 사용하지 않습니다.',
          '6018e3a에서는 CI의 전체 배포 자산 검사 일부를 제외했습니다. 이 대응을 웹 필수 자산 자동 검증까지 완성한 것으로 표현하지 않습니다.',
        ],
      },
      {
        id: 'results',
        layout: 'results',
        title: '확인 가능한 결과를 남겼습니다',
        eyebrow: '구현 결과와 검증 범위',
        summary: '2026년 9월 18일 로컬·모의 서버에서 확인한 팀 서비스의 기능별 회귀 테스트 기록입니다.',
        contribution: '팀 서비스의 당시 로컬 검증 · 실제 GPU·AWS 인수 검증은 별도',
        metrics: [
          { value: '80', label: 'Django 회귀 테스트', detail: '인증·화면 회귀 테스트 통과' },
          { value: '58', label: 'AI 서비스·배포 자산 회귀', detail: 'RunPod 작업·기존 서비스 회귀 통과' },
          { value: '8', label: '모의 원격 HTTP 계약', detail: 'AWS 클라이언트와 모의 RunPod 계약 통과' },
        ],
        items: [
          { title: '개인 구현', text: 'Django 전환·추천 기록·배포 자동화' },
          { title: '공동 연동', text: '팀 AI 기능을 화면·DB·원격 API로 연결' },
          { title: '다음 검증', text: 'MySQL 잠금·실서버 통합·복구 절차' },
        ],
        media: [],
        sources: [
          { label: '당시 검증 기록', url: blob('docs/validation/2026-09-18-aws-runpod-integration.md', 31), detail: 'docs/validation/2026-09-18-aws-runpod-integration.md:31 · 80·58·8 통과와 실서버 미검증 범위' },
          { label: '개인·협업 근거', url: blob('docs/retrospectives/choejiheum.md', 18), detail: 'docs/retrospectives/choejiheum.md:18 · 담당 범위와 공동 커밋 구분' },
          { label: '코드와 실행 기록', url: github, detail: '공개 저장소 · 구현·테스트·배포 문서' },
          { label: '화면과 회고', url: retrospective, detail: 'Velog 회고 · 당시 사용자 화면과 구현 경험' },
        ],
        notes: [
          '80·58·8은 2026-09-18 문서에 기록된 개별 검증 결과입니다. 이번 HTML 작성에서 다시 실행한 수치가 아니며 합산한 고유 테스트 수로 주장하지 않습니다.',
          '해당 기록은 실제 GPU 모델 로딩·LoRA weight·AWS EC2·MySQL·브라우저 검수를 별도 인수 범위로 남겨 두었습니다.',
          '로컬·모의 계약 검사와 이후 회고의 배포 성공 기록은 서로 다른 시점과 검증 범위를 가진 증거입니다.',
          '응답 시간·배포 시간·비용·사용자 이탈률의 전후 개선율은 측정 근거가 없어 넣지 않았습니다.',
          'MySQL 동시성 검증, 웹 필수 자산 검사, 배포 복구 검증, OIDC 전환은 완료 성과가 아니라 다음 개선·검증 과제입니다.',
          '강점은 여러 팀 AI 기능을 사용자 요청·기록·작업 상태·배포에 연결하고, 기능이 실패하는 경계를 코드와 운영 관점에서 찾은 경험입니다.',
        ],
      },
    ],
  };
})();
