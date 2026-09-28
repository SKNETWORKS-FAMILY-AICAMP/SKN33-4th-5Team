

> 작성 기준: 2026-09-24, GitHub `main`의 `8b5034d` 커밋까지 확인한 이력과 현재 코드, 배포 문서, 프로젝트 진행 중 남긴 오류 로그를 바탕으로 작성했다. AWS 리소스 사양은 저장소의 인프라 문서 기준이며, 이번 회고 작성 과정에서 운영 콘솔을 다시 조회한 것은 아니다. 본문은 개인 회고 초안으로, 기술적 사실과 개선 계획을 구분했다.

## 1. 이번 프로젝트에서 내가 맡은 일

PiCare에서 내가 맡은 역할은 공식 문서 기반 RAG를 구현하고, 이를 사용자에게 제공하는 Django 웹 서비스와 AWS 배포 환경을 연결하는 일이었다. 초기에는 검색과 답변 생성의 동작에 집중했지만, 프로젝트가 진행될수록 회원 인증, 사용자 기록, 오래 걸리는 AI 작업, 서버 간 통신, 배포 자동화까지 함께 다루게 되었다.

이번 회고에서는 특히 **Django 서비스 전환과 통합, AWS 운영 환경 구성, GitHub Actions CI/CD 구축**을 중심으로 돌아본다. 이 세 영역은 각각 따로 끝낼 수 있는 작업이 아니었다. Django에서 사용하는 파일이 Docker 이미지에 들어가야 했고, 컨테이너가 RDS에 연결되어야 했으며, 웹 화면에서 요청한 AI 작업은 RunPod에서 처리된 뒤 다시 사용자 기록으로 이어져야 했다.

프로젝트를 마치며 가장 크게 달라진 점은 ‘내 컴퓨터에서 기능이 실행된다’는 것과 ‘팀원이 같은 코드를 배포해 사용자에게 제공할 수 있다’는 것을 구분하게 된 것이다. 구현한 기능뿐 아니라 실행 조건, 배포 자산, 계정 권한, 오류 확인 방법까지 정리해야 작업이 끝난다는 것을 배웠다.

![PiCare 메인 화면](https://velog.velcdn.com/images/ajjarago/post/0e0745e9-42e6-4571-b826-e3b3926ae818/image.png)


위 화면은 2026년 9월 24일 로컬 Django 서버에서 직접 확인한 PiCare 메인 화면이다. 제품 추천, 문서 기반 Q&A, 명령어 실험실, 미니 챌린지를 하나의 서비스 안에서 이동할 수 있도록 통합했다. 캡처 당시에는 운영 DB와 연결된 로컬 서버에 `admin` 계정으로 로그인한 상태였다.

### 담당 범위와 협업 범위

| 영역 | 내가 구현하거나 수행한 작업 | 협업 범위와 구분 |
| --- | --- | --- |
| RAG | Chroma 설정·색인, Hybrid 검색 필터와 검증, manifest 계약 대응, Qwen 근거 인용 검증 개선 | 공식 문서 수집·제품 데이터·미디어 등 팀원이 담당한 전체 파이프라인을 모두 개인 작업으로 표현하지 않는다. |
| Django | Streamlit에서 Django로 웹 구조 전환, 폼·뷰·템플릿 구성, 회원 기능, 공통 결과 화면, 추천 기록 저장, 비동기 화면 연결 | Q&A 요약·퀴즈 생성·제품 추천 등 팀원의 도메인 기능을 웹과 DB에 통합했다. |
| AWS | EC2 웹 운영, RDS 연결, ECR 이미지 배포, Nginx·Gunicorn·Compose 구성과 운영 절차 정리 | 실제 서비스 연결과 배포 설정을 담당했다. |
| CI/CD | GitHub Actions 테스트·빌드·ECR 업로드·SSM 배포 흐름 구축 및 오류 수정 | RunPod 코드·모델 자산의 자동 배포까지 구현한 것은 아니다. |
| 운영 문서 | 설치·재시작·배포·Swagger 사용 가이드, README와 이미지·작업물 링크 정리 | 팀원이 재현할 수 있도록 설명과 진입 경로를 정리했다. |

Git 작성자 이름만으로 모든 변경을 개인 구현으로 판단하지 않았다. 예를 들어 `5e5490f`는 작성자가 JiHeum이지만 제목에 김나은의 이름이 들어 있고 원격 AI 서빙·웹 연동이 함께 포함되어 있다. 이 영역은 공동 구현·통합 과정으로 서술한다. 반면 RAG의 Chroma 색인과 Hybrid 검색 관련 직접 변경은 `f49697f`, `a3fae0a` 등의 커밋으로 확인된다.

## 2. Django: AI 데모를 사용자 서비스로 바꾸는 과정

### 2.1 Streamlit에서 Django로 전환한 이유

초기 Streamlit 화면은 AI 기능을 빠르게 확인하는 데 유용했다. 그러나 프로젝트가 회원가입, 로그인, 질문 기록, 추천 기록, 커뮤니티, 개인 저장 기능으로 확장되면서 요청과 데이터의 수명주기를 더 명확하게 관리할 필요가 생겼다.

`055cdaa`에서 Django 프로젝트 골격과 폼, 서비스 연결부, URL, 뷰, 템플릿을 추가했다. 내가 해결해야 했던 문제는 화면을 비슷하게 다시 만드는 것만이 아니었다. 사용자의 입력을 어디에서 검증하고, AI를 어디에서 호출하며, 결과를 어느 사용자에게 저장하고, 다시 접속했을 때 어떻게 보여 줄지 결정해야 했다.

이 과정에서 URL은 요청을 연결하고, Form은 입력을 검증하며, View는 처리 흐름을 조립하고, 서비스 계층은 AI 기능과 연결하며, ORM은 영속 데이터를 관리하는 구조를 익혔다. 템플릿은 그 결과를 사용자가 이해할 수 있는 화면으로 표현했다.

기존 AI 서비스를 웹 프레임워크 안에 무리하게 다시 작성하기보다 `portal/services.py`와 관련 연결 계층을 통해 호출하는 방향으로 구성했다. 이후 원격 GPU 서버를 연결할 때도 웹 화면과 AI 실행 위치를 분리해 생각하는 기반이 되었다.

### 2.2 회원 기능을 붙이면서 알게 된 데이터 소유권

`7ec7c75`와 `11f1eaf`에서는 회원가입·로그인 화면과 인증 흐름을 확장했다. 로그인은 화면 상단에 사용자 이름을 표시하는 기능을 넘어, 기록의 소유자를 판단하는 기준이었다.

추천 결과, 질문 기록, 명령어 서랍, 오답노트를 저장하려면 ‘누가 저장했는가’를 일관되게 관리해야 했다. 목록에서 자기 데이터만 보여 주는 것뿐 아니라, 상세 주소나 삭제 요청을 직접 보냈을 때도 다른 사용자의 데이터에 접근할 수 없어야 했다. 현재 뷰에서 `owner=request.user`를 함께 조건으로 사용하는 이유도 여기에 있다.

이 경험을 통해 UI에서 버튼을 숨기는 것과 서버에서 접근을 통제하는 것은 별개라는 점을 배웠다. 사용자 기능을 설계할 때는 정상적인 클릭 흐름과 함께, 다른 기록 ID를 입력하거나 만료된 상태로 다시 요청하는 경우까지 고려해야 했다.

회원 인증에서는 외부 주소로 이동하는 `next` 값을 그대로 신뢰하지 않고 현재 호스트에서 안전한 주소인지 확인했다. 로그인과 로그아웃도 Django 인증 함수와 HTTP 메서드 제한을 이용했다.

```python
# web_app/accounts/views.py 발췌
def _safe_next(request, candidate: str | None) -> str:
    if candidate and url_has_allowed_host_and_scheme(
        candidate,
        {request.get_host()},
        request.is_secure(),
    ):
        return candidate
    return reverse("about")


@require_http_methods(["GET", "POST"])
def login_view(request):
    if request.user.is_authenticated:
        return redirect("about")

    form = LoginForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        messages.success(request, "로그인했습니다.")
        return redirect(_safe_next(request, request.POST.get("next")))

    return render(
        request,
        "accounts/login.html",
        {"form": form, "active_page": "accounts", "next": request.GET.get("next", "")},
    )


@require_POST
def logout_view(request):
    logout(request)
    messages.success(request, "로그아웃했습니다.")
    return redirect("about")
```

![PiCare 마이페이지](https://velog.velcdn.com/images/ajjarago/post/b29df060-7c44-4753-bb0a-b36837000243/image.png)


마이페이지에서는 계정 정보와 게시글·댓글·좋아요뿐 아니라 명령어 서랍, 오답노트, 질문 기록, 제품 추천 기록을 사용자 단위로 모아 확인하도록 구성했다. 캡처 계정에는 저장된 기록이 없어서 모두 0으로 보이지만, 이는 빈 상태 화면까지 정상적으로 처리하고 있음을 보여 준다.

### 2.3 추천 결과를 다시 볼 수 있는 기록으로 만들기

`9bfe48a`에서는 공통 결과 표현과 `RecommendationRecord` 모델, 마이그레이션, 관련 테스트를 추가했다. 추천 결과가 한 번 출력된 뒤 사라지면 사용자는 나중에 어떤 조건으로 그 제품을 추천받았는지 확인할 수 없었다.

이를 해결하기 위해 입력 조건과 응답 내용을 함께 보관하고, 마이페이지에서 다시 조회하는 흐름을 연결했다. 단순히 제품 이름만 저장하는 것이 아니라 당시 사용자가 요청한 조건과 추천 근거를 함께 보존하는 것이 중요했다. AI 응답 형식은 기능마다 다를 수 있기 때문에 공통 결과 계층에서 화면에 필요한 내용을 정리하고, 구조가 가변적인 응답은 JSON 형태의 스냅샷으로 다루었다.

```python
# web_app/portal/models.py 발췌
class RecommendationRecord(TimestampedModel):
    """사용자가 저장한 제품 추천 입력과 응답 스냅샷을 보관한다."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recommendation_records",
    )
    request_id = models.CharField(max_length=120, db_index=True)
    title = models.CharField(max_length=200)
    question = models.TextField()
    answer = models.TextField()
    status = models.CharField(max_length=32)
    input_payload = models.JSONField()
    response_payload = models.JSONField()

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["owner", "-created_at", "-id"],
                name="portal_rec_owner_recent",
            ),
        ]
```

상세 조회에서도 URL의 기본 키만으로 레코드를 찾지 않고 현재 로그인 사용자를 함께 조건에 넣었다.

```python
@login_required
def mypage_recommendation_detail(request, pk: int):
    record = get_object_or_404(
        RecommendationRecord,
        pk=pk,
        owner=request.user,
    )
    return render(
        request,
        "portal/recommendation_detail.html",
        _recommendation_record_context(record),
    )
```

![PiCare 제품 추천 입력 화면](https://velog.velcdn.com/images/ajjarago/post/f318d070-74f9-4f98-a2ec-080b23f87dcb/image.png)

추천 화면은 자연어 사용 목적과 선택형 조건을 함께 받는다. 캡처에 표시된 `실행 없음`은 아직 AI 작업을 제출하지 않은 초기 상태다. 이번 캡처를 위해 새 GPU 추론이나 데이터 저장을 발생시키지 않았다.

이때 배운 점은 DB 설계가 화면의 다음 행동과 연결되어 있다는 것이다. ‘저장 버튼이 있다’는 요구사항은 실제로는 저장 대상, 중복 요청, 사용자 소유권, 상세 조회, 삭제, 이후 응답 형식 변경까지 함께 고려해야 하는 일이었다.

### 2.4 오래 걸리는 AI 작업을 웹에서 다루기

AI 추론은 일반적인 게시글 조회처럼 바로 끝나지 않는다. 모델 초기화나 생성 대기 중에는 사용자가 서버가 멈춘 것으로 오해할 수 있고, 같은 요청을 여러 번 누르거나 작업을 취소할 수도 있다.

`6b2eba2`의 동적 미니 챌린지 연결과 원격 AI 연동 과정에서는 요청을 제출한 뒤 작업 상태를 조회하는 흐름을 웹 화면에 연결했다. 현재 구조에서는 Django가 `AiJob`에 상태를 보관하고 RunPod에 작업을 제출하며, 브라우저는 Django를 통해 진행 상태와 결과를 확인한다.

이 과정에서 다루어야 할 것은 성공과 실패 두 가지뿐이 아니었다. 대기, 실행 중, 취소 요청 중, 취소 완료, 만료, 결과 반영 완료를 구분해야 했다. 특히 취소한 작업의 응답이 늦게 도착했다고 해서 다시 저장 가능한 결과로 취급하면 안 된다. 현재 코드에는 취소 의도를 기록하고, 취소 이후 도착한 성공 응답을 취소 상태로 처리하는 흐름이 있다.

또한 네트워크 오류가 발생했다고 해서 RunPod가 요청을 전혀 받지 않았다고 단정할 수 없었다. 현재 `submission_unknown` 처리와 같은 작업 ID를 사용하는 재확인 구조는 이런 불확실성을 다루기 위한 장치다. 웹 개발에서 비동기를 처리한다는 것은 로딩 애니메이션을 붙이는 것보다 훨씬 넓은 문제라는 점을 배웠다.

현재 작업 소유권은 사용자 정보와 브라우저 세션 해시를 함께 확인한다. 결과 반영에는 트랜잭션과 완료 처리 여부를 사용한다. 여러 요청이나 폴링이 겹치더라도 다른 사용자의 작업을 보거나 같은 결과를 중복 반영하지 않도록 하는 것이 서비스 통합의 중요한 부분이었다.

아래 코드는 브라우저 세션 키를 그대로 저장하지 않고 해시로 바꾸며, 사용자와 세션을 동시에 만족하는 작업만 조회하는 부분이다. 원격 결과를 반영할 때는 행 잠금과 트랜잭션을 사용하고, 이미 취소를 요청한 작업이 뒤늦게 성공해도 저장 가능한 성공 상태로 되돌리지 않는다.

```python
# web_app/portal/ai_jobs.py 발췌
TERMINAL = {"succeeded", "failed", "cancelled", "expired"}


def session_hash(request):
    if not request.session.session_key:
        request.session.create()
    return hashlib.sha256(request.session.session_key.encode()).hexdigest()


def owned_jobs(request):
    return AiJob.objects.filter(
        session_hash=session_hash(request),
        owner_id=request.user.pk if request.user.is_authenticated else None,
    )


def _apply_remote(job_id, data):
    with transaction.atomic():
        job = AiJob.objects.select_for_update().get(pk=job_id)
        if job.status in TERMINAL:
            return job

        if job.cancel_requested and data["status"] == "succeeded":
            job.status = "cancelled"
            job.result_payload = None
        else:
            job.status = data["status"]
            job.result_payload = (
                data.get("result") if job.status == "succeeded" else None
            )

        job.error_code = "generation_failed" if job.status == "failed" else ""
        if job.status in TERMINAL:
            job.expires_at = timezone.now() + timedelta(minutes=30)
        job.save()
        return job
```

![PiCare 문서 기반 Q&A 입력 화면](https://velog.velcdn.com/images/ajjarago/post/c356fc1b-a791-4286-ac3c-a56dd72fd79f/image.png)


Q&A 입력 화면에는 문서 기반 답변이라는 성격, 질문 유형, 입력 제한과 함께 ‘입력한 내용은 명령으로 실행되지 않는다’는 안내를 표시했다. 실제 질문을 제출하면 Django가 RunPod 작업을 생성하고 브라우저가 상태를 조회하지만, 이 캡처에서는 GPU 호출을 만들지 않고 입력 전 상태만 기록했다.

### 2.5 작은 UX 오류가 전체 기능의 인상을 바꾸었다

`f58c803`에서는 미니 챌린지 로딩 스피너의 숨김 처리를 수정했고, `a2677d9`에서는 오답노트 저장 후 현재 문제 풀이 화면을 유지하도록 개선했다.

기능 내부에서 처리가 끝났더라도 스피너가 계속 보이면 사용자는 완료되지 않았다고 생각한다. 오답노트 저장은 성공했지만 화면이 이동해 풀던 문제를 잃으면 학습 흐름이 끊긴다. 이 문제들은 모델 성능과 별개였지만 사용자가 서비스를 신뢰하고 계속 사용하는 데 직접 영향을 주었다.

`04531dc`에서는 추천 조건 표시, 진행 안내, Q&A 결과 배치를 함께 개선했다. 답변, 미니 챌린지, 출처, 공식 근거 이미지의 순서를 정리하면서 데이터가 존재하는 것과 읽기 쉬운 화면으로 제공하는 것의 차이를 체감했다. 프론트엔드 작업은 결과를 꾸미는 단계가 아니라 사용자가 처리 상태와 근거를 이해하도록 만드는 작업이었다.

### 2.6 개발 환경과 운영 환경의 차이

운영 환경에서는 Django 개발 서버 대신 Gunicorn으로 요청을 처리하고, 정적 파일을 별도로 수집·제공해야 했다. `04531dc`에는 `DEBUG=false` 환경의 정적 파일 제공을 위한 WhiteNoise 설정도 포함되어 있다.

로컬에서 화면이 정상이라고 해서 운영에서도 CSS와 이미지가 자동으로 제공되는 것은 아니었다. `collectstatic`, 정적 파일 제공 설정, Docker 이미지에 포함되는 파일, 실행 시 환경변수가 모두 영향을 주었다. 이후 화면 문제를 확인할 때도 템플릿 코드뿐 아니라 운영 설정과 파일 제공 경로를 함께 보게 되었다.

## 3. AWS를 자세하게 기록한다: EC2·RDS·ECR·SSM 세팅과 배포

이번 프로젝트에서 가장 많은 시행착오를 겪은 부분은 AWS 리소스를 만드는 일 자체보다, 각 리소스의 역할과 권한을 실제 배포 흐름으로 연결하는 일이었다. 아래 내용은 교육 과정의 [AWS 실습 3일차 가이드](https://www.notion.so/ohgiraffers/030649136c118365b794013ccdcfabac?v=c56649136c118287ac5208b60f4ac84a)를 참고하되, PiCare에서 실제로 적용한 EC2·RDS·ECR·SSM 구성을 기준으로 다시 정리한 기록이다.

3일차 가이드에는 React 정적 파일을 S3와 CloudFront로 배포하고, GitHub OIDC와 ACM·ALB까지 연결하는 확장 구조도 포함되어 있었다. PiCare는 Django 템플릿으로 화면을 제공하는 단일 EC2 시연 환경이므로 S3·CloudFront·ALB·ACM은 이번 배포 범위에서 사용하지 않았다. 대신 가이드의 핵심 원칙인 **웹·DB 분리, 비밀값 외부 관리, 불변 이미지 배포, EC2 역할 기반 접근, 수동 배포 검증 후 자동화**를 적용했다.

```text
사용자 브라우저
    ↓ HTTP :80
Elastic IP
    ↓
EC2 t3.small
    ├─ Nginx :80
    └─ Django + Gunicorn :8000 (Docker 내부)
           ├─ RDS MySQL :3306 (VPC 내부)
           └─ RunPod AI API :8000 (HTTPS)

GitHub Actions
    ├─ 테스트·Docker 이미지 빌드
    ├─ ECR에 sha-<commit> 태그로 push
    └─ SSM Run Command로 EC2 배포 스크립트 실행
```

### 3.1 먼저 기록한 값과 나중에 발급된 값

가이드에서 유용했던 부분은 설정값을 ‘직접 정하는 이름’과 ‘AWS가 리소스 생성 후 발급하는 값’으로 나누는 방식이었다. 이 구분을 하지 않으면 ECR 이름, EC2 ID, RDS 엔드포인트, 계정 ID를 서로 다른 화면에서 복사하는 과정에서 오타가 나기 쉽다.

| 값 | 준비 시점 | PiCare에서의 용도 |
| --- | --- | --- |
| `AWS_REGION` | 처음 결정 | 서울 리전 `ap-northeast-2` |
| `AWS_ACCOUNT_ID` | AWS 계정에서 확인 | ECR 레지스트리 주소와 GitHub Actions 변수 |
| `ECR_REPOSITORY` | 직접 정한 뒤 ECR 생성 | `picare-web-kimqq` 웹 이미지 저장소 |
| `EC2_INSTANCE_ID` | EC2 생성 후 확인 | SSM 배포 명령 대상 |
| EC2 보안 그룹 ID | EC2 생성 후 확인 | RDS 3306 인바운드의 소스 |
| Elastic IP | EC2 연결 후 확인 | 웹 접속 주소와 Django 허용 호스트 |
| `DJANGO_DB_HOST` | RDS 생성 후 확인 | 포트와 프로토콜을 제외한 RDS 엔드포인트 |
| `AI_API_URL` | RunPod API 실행 후 확인 | Django가 호출하는 HTTPS Proxy 주소 |

DB 비밀번호, Django Secret Key, RunPod 공유 토큰, IAM Access Key는 이 기록표나 GitHub 코드에 적지 않았다. 실제 비밀값은 EC2의 `/opt/picare/.env`와 GitHub Actions Secrets에서 관리했다.

### 3.2 EC2 만들기와 네트워크 설정

EC2는 서울 리전에서 Ubuntu Server 24.04 LTS x86_64, `t3.small`, gp3 20GiB로 구성했다. GitHub Actions가 `linux/amd64` 이미지를 빌드하는 이유도 이 EC2의 CPU 아키텍처와 맞추기 위해서다. 인스턴스를 중지했다가 시작해도 접속 주소가 바뀌지 않도록 Elastic IP를 연결했다.

보안 그룹은 다음처럼 구성했다.

| 방향 | 포트 | 소스/대상 | 이유 |
| --- | --- | --- | --- |
| 인바운드 | HTTP 80 | `0.0.0.0/0` | 시연용 웹 공개 |
| 인바운드 | SSH 22 | 관리자 PC 공인 IP `/32` | SSH 접근 범위 제한 |
| 아웃바운드 | HTTPS 443 | 외부 | ECR, RunPod, 패키지 저장소 접근 |
| 아웃바운드 | MySQL 3306 | RDS 보안 그룹 | 운영 DB 연결 |

Django/Gunicorn의 8000번 포트는 EC2 보안 그룹에서 공개하지 않았다. Nginx 컨테이너만 외부 80번 포트를 받고, Docker 네트워크 안에서 `web:8000`으로 전달한다.

EC2에 접속한 뒤 Docker와 AWS CLI를 준비하고 운영 폴더를 만들었다. 아래 명령은 새 Ubuntu 인스턴스에서 사용하는 설치 흐름을 정리한 것이다.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl unzip

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu

curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip \
  -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install --update

sudo mkdir -p /opt/picare
sudo chown -R ubuntu:ubuntu /opt/picare
```

그룹 변경은 새 로그인 세션부터 적용된다. 설치 후에는 `docker --version`, `docker compose version`, `aws --version`을 확인했다. `/opt/picare`에는 전체 소스가 아니라도 최소한 `deploy/compose.aws.yaml`, `deploy/aws-release.sh`, `deploy/nginx.aws.conf`와 실제 `.env`가 있어야 한다. 현재 CI/CD는 애플리케이션 이미지는 ECR에서 갱신하지만 EC2에 있는 배포 스크립트와 Compose 파일 자체를 자동 갱신하지 않으므로, 이 파일들이 바뀌면 서버 쪽 사본도 함께 반영해야 한다.

### 3.3 RDS MySQL 만들기와 앱 계정 분리

RDS는 EC2와 같은 VPC에 MySQL 8.4, `db.t4g.micro`, Single-AZ, gp3 20GiB로 생성했다. 퍼블릭 액세스는 비활성화하고, RDS 보안 그룹의 3306번 인바운드는 IP 주소 대신 **EC2 보안 그룹 ID**만 허용했다. 이 설정으로 인터넷에서 DB에 직접 접근하는 경로를 줄였다.

RDS 생성 시 정한 마스터 계정을 애플리케이션에서 계속 사용하지 않고, PiCare DB만 사용할 `picare_app` 계정을 별도로 만들었다. EC2 또는 허용된 관리 경로에서 마스터 계정으로 접속한 뒤 다음과 같이 준비할 수 있다.

```sql
CREATE DATABASE picare
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'picare_app'@'%'
  IDENTIFIED BY '<APP_DB_PASSWORD>';

GRANT ALL PRIVILEGES ON picare.*
  TO 'picare_app'@'%';

FLUSH PRIVILEGES;
```

`<APP_DB_PASSWORD>`는 실제 강한 비밀번호로 바꾸고 문서나 Git에 기록하지 않는다. 생성 후에는 EC2에서 앱 계정으로 접속해 `picare` DB가 보이는지 확인하고, `.env`에는 RDS 콘솔의 엔드포인트만 입력한다. `https://`와 `:3306`을 엔드포인트 값에 붙이지 않는다.

3일차 가이드에서는 RDS TLS 연결과 AWS 공개 CA 검증까지 권장한다. 현재 PiCare의 Django DB 설정은 호스트·포트·계정 연결까지 적용되어 있고 `ssl_ca` 검증 옵션은 아직 포함하지 않았다. 따라서 ‘TLS까지 완료했다’고 표현하지 않고, 운영 확장 시 RDS CA 파일과 Django MySQL `OPTIONS`를 추가할 과제로 남겼다.

### 3.4 ECR 저장소와 EC2 Pull 권한 준비

웹 이미지는 ECR Private Repository `picare-web-kimqq`에 보관했다. 태그 변경 가능성은 Immutable로 설정해 같은 태그가 다른 이미지로 덮어써지는 것을 막았다. 저장소를 처음 만드는 흐름은 다음과 같다.

```bash
aws ecr create-repository \
  --repository-name picare-web-kimqq \
  --image-tag-mutability IMMUTABLE \
  --image-scanning-configuration scanOnPush=true \
  --region ap-northeast-2
```

EC2에는 Access Key를 파일로 저장하지 않고 인스턴스 프로파일 역할 `aws-picare-ec2-ecr-pull-role`을 연결했다. 이 역할에는 두 종류의 권한이 필요했다.

| 정책 | 역할 |
| --- | --- |
| `aws-picare-ecr-pull-policy` | ECR 로그인 토큰 조회와 운영 이미지 Pull |
| `AmazonSSMManagedInstanceCore` | Systems Manager 관리형 노드 등록과 Run Command 수신 |

ECR Pull 최소 권한은 `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchCheckLayerAvailability`를 포함한다. 인스턴스 역할을 연결한 뒤 EC2에서 `aws sts get-caller-identity`로 역할 자격 증명이 잡히는지 확인했다.

### 3.5 SSM 관리형 노드 연결

CI/CD에서 SSH 키를 전달하지 않고 EC2의 배포 명령을 실행하기 위해 Systems Manager Run Command를 사용했다. 여기서 다음 네 가지는 각각 별도로 확인해야 했다.

1. EC2 역할에 `AmazonSSMManagedInstanceCore`가 연결되어 있는가.
2. 그 역할이 실제 대상 EC2의 IAM 역할로 연결되어 있는가.
3. EC2 내부에서 SSM Agent가 실행 중인가.
4. Systems Manager Fleet Manager에서 대상 인스턴스의 Ping 상태가 Online인가.

Ubuntu Snap 기반 Agent 상태는 다음 명령으로 확인했다.

```bash
sudo systemctl is-active snap.amazon-ssm-agent.amazon-ssm-agent.service
sudo snap services amazon-ssm-agent
```

필요하면 Agent를 다시 시작한다.

```bash
sudo snap restart amazon-ssm-agent
```

로컬 AWS CLI에서도 같은 리전과 인스턴스를 조회했다.

```bash
aws ssm describe-instance-information \
  --region ap-northeast-2 \
  --filters "Key=InstanceIds,Values=<EC2_INSTANCE_ID>" \
  --query 'InstanceInformationList[].[InstanceId,PingStatus,AgentVersion,PlatformName]' \
  --output table
```

처음에는 Agent 서비스가 `active`인데도 조회 결과가 비어 있었다. 이후 역할 연결, 리전, 인스턴스 ID를 다시 확인한 뒤 Fleet Manager에서 Online 상태를 확인했다. 이 경험 때문에 ‘정책이 붙어 있다’와 ‘원격 명령을 실제로 받을 수 있다’를 구분하게 되었다.

### 3.6 운영 `.env` 작성

실제 환경 파일은 이미지 안에 넣지 않고 EC2의 `/opt/picare/.env`에만 둔다. 예제 파일을 복사한 뒤 소유자만 읽고 쓸 수 있도록 권한을 제한했다.

```bash
cd /opt/picare
cp deploy/aws.env.example .env
chmod 600 .env
nano .env
```

PiCare에서 필요한 핵심 항목은 다음과 같다. 아래 값은 형식 예시이며 실제 비밀값을 그대로 공개하면 안 된다.

```dotenv
PICARE_AI_BACKEND=remote
AI_API_URL=https://<RUNPOD_POD_ID>-8000.proxy.runpod.net
AI_API_TOKEN=<RUNPOD_SHARED_TOKEN>
AI_HTTP_TIMEOUT=10
AI_JOB_TIMEOUT=300

DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<DJANGO_ONLY_SECRET>
DJANGO_ALLOWED_HOSTS=<ELASTIC_IP>,localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://<ELASTIC_IP>
DJANGO_SESSION_COOKIE_SECURE=false
DJANGO_CSRF_COOKIE_SECURE=false
DJANGO_SECURE_SSL_REDIRECT=false

DJANGO_DB_ENGINE=django.db.backends.mysql
DJANGO_DB_NAME=picare
DJANGO_DB_USER=picare_app
DJANGO_DB_PASSWORD=<APP_DB_PASSWORD>
DJANGO_DB_HOST=<RDS_ENDPOINT>
DJANGO_DB_PORT=3306

GUNICORN_WORKERS=1
GUNICORN_TIMEOUT=30
```

`DJANGO_ALLOWED_HOSTS`에는 프로토콜 없이 호스트나 IP를 넣고, `DJANGO_CSRF_TRUSTED_ORIGINS`에는 `http://` 또는 `https://`를 포함한 출처를 넣는다. 현재 PiCare는 HTTP 시연 환경이므로 Secure Cookie와 SSL Redirect를 `false`로 사용한다. 나중에 ACM·ALB로 HTTPS를 적용할 때는 도메인, 신뢰 출처, 프록시 헤더, Secure Cookie 설정을 함께 바꿔야 한다.

비밀값을 화면에 출력하지 않고 필수 공개 설정만 확인했다.

```bash
grep -E '^(AI_API_URL|DJANGO_DB_HOST|DJANGO_DB_NAME|DJANGO_DB_USER)=' /opt/picare/.env
```

`.env.example`을 Git에서 수정해도 서버의 실제 `.env`는 자동으로 바뀌지 않는다. 새 환경변수가 추가되면 예제 파일, EC2의 실제 파일, 배포 스크립트의 필수값 검사까지 함께 확인해야 한다.

### 3.7 GitHub Actions에서 AWS 배포 권한 연결

저장소의 `Settings → Secrets and variables → Actions`에서 비밀값과 일반 설정값을 분리했다.

| 구분 | 이름 | 내용 |
| --- | --- | --- |
| Secret | `AWS_ACCESS_KEY_ID` | ECR Push와 SSM 명령 권한이 있는 배포 계정의 키 ID |
| Secret | `AWS_SECRET_ACCESS_KEY` | 위 배포 계정의 Secret Access Key |
| Variable | `AWS_REGION` | `ap-northeast-2` |
| Variable | `AWS_ACCOUNT_ID` | 12자리 AWS 계정 ID |
| Variable | `ECR_REPOSITORY` | `picare-web-kimqq` |
| Variable | `EC2_INSTANCE_ID` | 배포 대상 인스턴스의 `i-...` 값 |

GitHub Actions 배포 계정에는 ECR Push와 `ssm:SendCommand`, `ssm:GetCommandInvocation`에 필요한 권한을 부여했다. EC2 쪽 역할은 ECR Pull과 SSM Agent 수신 권한을 가지므로, 이미지를 올리는 주체와 이미지를 내려받는 주체의 권한이 서로 다르다.

3일차 가이드는 GitHub OIDC를 사용해 장기 Access Key를 저장하지 않는 구성을 안내한다. 현재 PiCare 워크플로는 `configure-aws-credentials`에 GitHub Secrets의 Access Key를 전달하는 방식이다. 따라서 회고에는 OIDC를 적용한 것처럼 쓰지 않고, 향후 GitHub 저장소·브랜치 조건을 제한한 IAM 신뢰 정책과 OIDC 역할로 전환할 개선 사항으로 기록했다.

### 3.8 최초 배포와 단계별 확인

3일차 가이드의 원칙처럼 자동화 전에 수동 배포 경로를 먼저 확인했다. ECR에 이미지가 올라간 상태에서 EC2 릴리스 스크립트는 태그·계정 ID·저장소 이름을 받아 이미지 Pull, Compose 갱신, 서비스 준비 상태 검사를 수행한다.

```bash
cd /opt/picare
bash deploy/aws-release.sh \
  sha-<GIT_COMMIT_SHA> \
  <AWS_ACCOUNT_ID> \
  picare-web-kimqq
```

배포 후에는 단일 화면만 여는 대신 아래 순서로 확인했다.

```bash
cd /opt/picare

docker compose \
  --project-name picare-aws \
  -f deploy/compose.aws.yaml ps

docker compose \
  --project-name picare-aws \
  -f deploy/compose.aws.yaml logs --tail 100 web

curl -fsS http://127.0.0.1/
curl -fsS http://127.0.0.1/accounts/login/
curl -fsS http://127.0.0.1/health/
```

확인 기준도 단계별로 달랐다.

| 확인 대상 | 정상 기준 |
| --- | --- |
| Docker | `web`, `nginx` 컨테이너가 실행 중이고 healthcheck 통과 |
| Django | 메인과 로그인 페이지가 HTTP 오류 없이 응답 |
| RDS | 마이그레이션 성공, 회원·기록 데이터 조회 가능 |
| RunPod | `/health/ready`가 `ready: true` 반환 |
| 외부 웹 | Elastic IP로 메인·로그인·주요 기능 접근 가능 |
| SSM | Run Command가 `Success`로 종료 |

웹 컨테이너가 Healthy인 것과 AI까지 준비된 것은 같은 상태가 아니다. Compose healthcheck는 Django `/health/`의 HTTP 200을 확인하고, 릴리스 스크립트는 JSON의 `status: ok`, `ready: true`까지 검사한다. 이 차이 때문에 컨테이너가 정상 실행된 뒤에도 RunPod가 준비되지 않으면 배포 작업이 실패할 수 있었다.

### 3.9 서버를 나눈 이유와 그에 따른 책임

PiCare는 EC2에서 웹과 사용자 요청을 처리하고, RDS에서 사용자 데이터를 보관하며, RunPod에서 GPU 모델을 실행하는 구조로 구성했다. 문서 기준으로 웹 서버는 `t3.small`, 데이터베이스는 `db.t4g.micro`를 사용했다. 제한된 개발·시연 환경에서 GPU 모델을 웹 서버에 직접 올리지 않는 구조가 필요했다.

| 구성 요소 | 프로젝트에서 맡은 역할 | 운영하면서 확인해야 했던 것 |
| --- | --- | --- |
| EC2 | Nginx와 Django/Gunicorn 컨테이너 실행 | 공개 포트, 컨테이너 상태, 환경변수, 로그 |
| RDS MySQL | 회원·질문·추천·커뮤니티·오답·작업 기록 저장 | 연결 설정, 보안 그룹, 마이그레이션 |
| ECR | 배포할 웹 이미지와 버전 보관 | 이미지 업로드·조회 권한, 태그 |
| Systems Manager | EC2에서 원격 배포 명령 실행 | 인스턴스 역할, Agent, 관리형 노드 상태 |
| RunPod | 모델·LoRA·RAG 자산을 사용하는 AI 작업 실행 | 코드 버전, 실제 환경변수, 모델 준비 상태 |

서버를 나누면 역할이 명확해지지만 연결 문제가 생길 수 있다. 웹이 정상이어도 AI 서버가 준비되지 않을 수 있고, AI가 실행 중이어도 웹 컨테이너의 주소나 토큰이 맞지 않으면 사용할 수 없다. 따라서 장애가 발생했을 때 ‘전체 서버가 안 된다’고 표현하기보다 어느 구간에서 문제가 발생했는지 좁혀 보는 습관이 필요했다.

### 3.10 Nginx·Gunicorn·Docker Compose의 연결

`fb7a170`에는 AWS 배포 스크립트, Compose, Nginx 설정, 원격 상태 확인 테스트가 포함되어 있다. 공개 HTTP 요청은 Nginx가 받고, Django는 내부 포트에서 Gunicorn으로 처리하도록 구성했다.

현재 AWS Compose에서는 웹 컨테이너의 8000 포트를 내부에 노출하고 Nginx의 80 포트를 외부에 연결한다. 웹 실행 진입점은 마이그레이션을 적용한 뒤 Gunicorn을 시작한다. 이 과정을 구성하면서 포트를 열었다는 사실과 애플리케이션이 요청을 정상 처리한다는 사실이 서로 다르다는 것을 배웠다.

Docker는 실행 환경을 이미지로 묶는 데 도움이 되었지만 모든 운영 파일을 자동으로 최신화해 주지는 않았다. 현재 배포는 EC2의 `/opt/picare`에 있는 릴리스 스크립트를 실행한다. Compose, Nginx 설정, 실제 `.env` 같은 서버 측 파일은 이미지 갱신과 별도로 관리되는 부분이 있다. 앞으로는 애플리케이션 이미지와 배포 설정 버전이 어긋나지 않도록 관리 범위를 더 명확히 해야 한다.

AWS Compose에서는 웹 컨테이너를 외부에 직접 공개하지 않고 Nginx가 80번 포트를 받도록 했다. Nginx는 웹 컨테이너가 HTTP 상태 검사를 통과한 다음 시작된다.

```yaml
# deploy/compose.aws.yaml 발췌
name: picare-aws

services:
  web:
    image: ${PICARE_WEB_IMAGE:?PICARE_WEB_IMAGE must be set}
    restart: unless-stopped
    env_file:
      - ${PICARE_ENV_FILE:-../.env}
    environment:
      GUNICORN_BIND: 0.0.0.0:8000
    expose:
      - "8000"
    healthcheck:
      test:
        - CMD
        - python
        - -c
        - >-
          from urllib.request import urlopen;
          response = urlopen('http://127.0.0.1:8000/health/', timeout=3);
          assert response.status == 200
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 45s

  nginx:
    image: nginx:1.28-alpine
    restart: unless-stopped
    depends_on:
      web:
        condition: service_healthy
    ports:
      - "80:80"
    volumes:
      - ./nginx.aws.conf:/etc/nginx/conf.d/default.conf:ro
```

웹 컨테이너 진입점에서는 마이그레이션을 먼저 적용하고 Gunicorn을 실행한다.

```sh
#!/bin/sh
set -eu

python web_app/manage.py migrate --noinput
exec gunicorn picare_web.wsgi:application \
  --chdir web_app \
  --bind "${GUNICORN_BIND:-0.0.0.0:8000}" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-30}" \
  --access-logfile - \
  --error-logfile -
```

### 3.11 RDS와 영속 데이터

사용자 기록이 컨테이너 재생성으로 사라지지 않도록 DB를 웹 컨테이너와 분리했다. 인프라 문서에서는 RDS를 비공개로 두고 EC2 보안 그룹에서 오는 MySQL 연결을 허용하도록 구성했다.

여기서 중요한 것은 연결 성공뿐 아니라 컨테이너와 데이터의 수명주기를 분리하는 것이었다. 웹 이미지를 다시 배포하더라도 같은 RDS를 바라보면 계정과 기록을 계속 사용할 수 있다. 반대로 로컬 DB와 운영 DB가 다르면 같은 아이디라도 서로 다른 계정 정보가 존재할 수 있다.

Swagger 관리자 로그인 문제를 확인할 때도 이 구분이 중요했다. 로컬에서 admin으로 로그인된다는 사실만으로 EC2의 DB에도 같은 비밀번호가 설정되어 있다고 볼 수 없었다. 계정 상태와 비밀번호는 실제 서비스가 연결된 DB를 기준으로 확인해야 했다.

### 3.12 IAM 역할과 SSM 연결에서 배운 점

SSM을 준비하면서 IAM 역할에 `AmazonSSMManagedInstanceCore` 정책이 연결되어 있어도 Fleet Manager에서 원하는 인스턴스가 바로 보이지 않는 상황을 겪었다. EC2 안에서는 SSM Agent가 `active`였지만, 그것만으로 관리형 노드 등록과 연결이 완료되었다고 판단할 수는 없었다.

이때 역할에 정책이 있는지, 실제 EC2에 그 역할이 연결되어 있는지, 같은 리전과 인스턴스를 보고 있는지, Agent가 실행되는지, SSM 조회에 인스턴스가 나타나는지를 나누어 확인했다. 대화에 남아 있는 결과에서는 이후 대상 노드가 온라인으로 표시되었다. 다만 최종적으로 어느 한 설정이 원인이었는지는 남은 자료만으로 확정하지 않는다.

이 경험을 통해 권한 정책, 리소스에 연결된 역할, 서버 내부 프로세스, 외부 관리 서비스의 연결 상태가 각각 별도의 확인 대상임을 배웠다. 이후부터는 ‘정책을 추가했으니 완료’가 아니라 실제 작업이 가능한지까지 확인하는 쪽으로 판단 기준이 바뀌었다.

### 3.13 RunPod 운영과 환경변수

AWS 배포가 자동화되어도 RunPod의 코드와 실행 중인 프로세스가 자동으로 갱신되는 것은 아니었다. RunPod에서는 코드를 갱신하고 기존 API 프로세스를 재시작해야 했다. 또한 `.env.example`은 설정 예시이므로, 이를 수정한 커밋을 받아도 서버의 실제 `.env` 값이 자동으로 바뀌지는 않는다.

API 재시작 후에는 Gunicorn이 포트에서 대기하는 로그와 모델 체크포인트를 읽는 로그를 따로 확인했다. 프로세스가 살아 있는 것과 Qwen·LoRA·RAG 런타임이 준비된 것은 다르다. `/health/ready` 응답도 HTTP 코드만 보지 않고 JSON의 `ready` 값을 확인해야 했다.

RunPod를 멈추면 모델 추론을 요구하는 기능은 사용할 수 없지만, 웹과 DB가 계속 실행되는 조건에서 일반 화면·회원·저장 기록 기능은 별도로 동작할 수 있는 구조다. 다만 현재 배포 검증은 AI 준비 상태에도 의존한다. 비용 때문에 GPU 서버를 끄는 운영 방식과 배포 성공 조건을 함께 설계해야 한다는 점이 남은 과제다.

### 3.14 비용과 서비스 선택

S3나 CloudFront를 사용하지 않은 이유를 정리하면서, AWS 서비스를 많이 사용하는 것이 완성도의 기준은 아니라는 점도 배웠다. 현재 범위에서는 사용자 업로드 파일 저장이나 CDN 전송 요구가 크지 않았고, EC2·RDS·ECR·SSM으로 필요한 흐름을 구성했다.

비용을 줄이기 위해 사용하지 않는 시간에 인스턴스와 GPU를 중지하는 것도 고려했다. 그러나 컴퓨팅을 멈추더라도 디스크, 저장 이미지, IP, 별도 DB 같은 리소스의 비용까지 모두 없어지는 것은 아니다. 서비스별로 실행과 저장의 비용을 나누어 파악해야 한다.

또한 브라우저에서 AWS 웹으로 접속하는 구간은 현재 문서상 HTTP이고, AWS에서 RunPod를 호출하는 구간은 HTTPS를 사용한다. 프로젝트 전체에 HTTPS가 적용되었다고 표현해서는 안 된다. 관리자 로그인까지 제공하게 된 만큼 외부 웹 구간의 HTTPS는 다음 운영 개선에서 우선 적용할 과제다.

## 4. CI/CD: 반복 배포를 자동화하면서 발견한 것

### 4.1 GitHub Actions로 연결한 배포 흐름

`45fb318`에서 GitHub Actions 워크플로를 추가했다. 이후 코드 변경을 테스트하고, 운영 이미지를 빌드해 ECR에 올리고, SSM으로 EC2의 릴리스 스크립트를 실행하는 흐름을 구성했다.

```text
PR 또는 main 변경
  → Django 설정·마이그레이션 변경 검사
  → 원격 상태 확인 테스트·API 계약 테스트
  → AWS Docker 이미지 빌드 확인
  → main push 또는 수동 실행이면 릴리스 진행
  → 커밋 SHA 태그로 ECR 이미지 업로드
  → SSM 명령으로 EC2 릴리스 스크립트 실행
  → Compose 이미지 갱신·컨테이너 시작
  → 메인·로그인·AI 준비 상태 확인
```

PR에서 검증을 통과한 것과 운영 배포까지 성공한 것을 구분하도록 구성했다. 릴리스 작업은 테스트 작업이 끝난 뒤 실행되며, 워크플로에는 운영 배포가 겹치지 않도록 동시 실행 제한을 두었다. 마이그레이션이나 컨테이너 재시작 중 다른 배포가 끼어드는 문제를 줄이기 위한 설정이다.

실제 워크플로의 핵심은 다음과 같다. Pull Request에서는 테스트와 이미지 빌드 검증까지만 수행하고, `main` push 또는 수동 실행일 때만 ECR 업로드와 EC2 릴리스를 진행한다.

```yaml
# .github/workflows/aws-cicd.yml 발췌
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: picare-production
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: requirements-web.txt
      - name: Check Django configuration and migrations
        run: |
          python web_app/manage.py check
          python web_app/manage.py makemigrations --check --dry-run
      - name: Run Django production health smoke tests
        run: python web_app/manage.py test portal.test_aws_remote_health --noinput
      - name: Run AWS and RunPod contract tests
        run: |
          python -m pytest -q -p no:cacheprovider \
            tests/test_remote_ai_contract.py
      - name: Verify the production image can be built
        run: docker build -f Dockerfile.aws -t picare-web:ci .

  release:
    needs: test
    if: >-
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'push' && github.ref == 'refs/heads/main')
    env:
      IMAGE_TAG: sha-${{ github.sha }}
```

ECR에 올린 뒤에는 SSM으로 EC2의 릴리스 스크립트를 호출하고, 완료 상태가 될 때까지 주기적으로 확인했다. 실패 시에는 표준 출력과 표준 오류를 함께 반환하도록 해 GitHub Actions 화면에서 원인을 좁힐 수 있게 했다.

```bash
release_command="cd /opt/picare && bash deploy/aws-release.sh \
${IMAGE_TAG} ${AWS_ACCOUNT_ID} ${ECR_REPOSITORY}"

command_id="$(aws ssm send-command \
  --document-name AWS-RunShellScript \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --comment "PiCare GitHub Actions ${GITHUB_SHA}" \
  --timeout-seconds 600 \
  --parameters "commands=${release_command}" \
  --query 'Command.CommandId' \
  --output text)"
```

### 4.2 커밋과 배포 이미지의 연결

이미지 태그는 `sha-${github.sha}` 형태를 사용한다. 이 방식은 어떤 코드로 만들어진 이미지인지 식별하는 데 도움이 된다. 동일한 이름의 이미지가 계속 덮어써지면 장애가 발생했을 때 운영 중인 코드 버전을 확인하기 어렵다.

릴리스 스크립트는 성공한 릴리스 설정과 이전 릴리스 설정을 보관하고, 이전 태그를 지정하는 수동 롤백 명령을 안내한다. 여기서 주의할 점은 **현재 구조가 배포 실패 시 자동으로 이전 컨테이너 상태를 복원하는 것은 아니라는 것**이다. 또한 애플리케이션 이미지를 되돌리는 것과 DB 마이그레이션을 되돌리는 것은 별개의 문제다.

처음에는 롤백 가능한 태그가 있으면 충분하다고 생각하기 쉬웠지만, 실제로는 이전 코드가 변경된 DB 스키마와 호환되는지도 고려해야 한다. 이후에는 버전 식별뿐 아니라 복구 절차와 스키마 호환성까지 배포 설계에 포함해야 한다.

### 4.3 CI 테스트 실패: 내 컴퓨터의 파일은 자동으로 배포되지 않았다

초기 CI에서는 `tests/test_deployment_assets.py`가 `document_pipeline/data/manifest_v3.json`을 찾지 못해 실패했다. 당시 로그에는 8개 테스트 통과와 3개 실패가 표시되었고, 실패한 테스트들은 같은 파일 부재에서 시작했다.

이 사건은 로컬이나 RunPod에 파일이 있다는 사실을 GitHub Actions 실행 환경에도 파일이 있다는 의미로 받아들이면 안 된다는 것을 보여 주었다. Actions는 저장소를 체크아웃해 별도의 환경을 만든다. Git에서 추적하지 않는 파일은 수동으로 준비하거나 생성·다운로드하는 절차가 없는 한 존재하지 않는다.

`6018e3a`에서는 웹 CI에서 배포 자산 테스트와 전체 자산 검증 명령을 제외하고 원격 API 계약 테스트를 남겼다. GPU 자산을 모두 요구하는 검증과 웹 배포 검증을 구분할 필요는 있었다. 그러나 이 변경만으로 웹에서 실제 필요한 자산까지 검증되었다고 볼 수는 없다.

이후 Command Lab이 데이터를 준비하지 못하는 문제를 겪으며, CI 통과를 위해 검사를 줄이는 것과 올바른 검증 범위를 설계하는 것은 다른 일이라는 점을 배웠다. 이 부분은 이번 프로젝트에서 가장 구체적으로 개선해야 할 지점이다.

### 4.4 Command Lab 매니페스트 누락과 수정

웹 화면에서는 명령어 라이브러리가 비어 있고 데이터를 준비하지 못했다는 메시지가 나타났다. RunPod에는 매니페스트가 있었지만, AWS 웹 이미지에 그 파일이 들어 있다는 보장은 없었다. Command Lab은 웹 쪽에서도 승인된 근거 청크를 확인하기 위해 해당 자산을 사용했다.

`d9f3967`에서는 `.gitignore`에 현재 운영 매니페스트를 예외로 추적하는 규칙을 추가하고 실제 `manifest_v3.json`을 커밋했다. 모든 생성 데이터를 무조건 저장소에 넣은 것이 아니라, 현재 웹 실행에 필요한 운영 버전을 배포 입력에 포함한 것이다.

```gitignore
# document_pipeline의 버전별 매니페스트는 기본적으로 제외하되,
# Command Lab이 읽는 현재 운영 버전만 배포 자산으로 추적한다.
document_pipeline/data/manifest_v*.json
# 명령어 실험실은 승인된 근거 청크를 검증할 때 v3 매니페스트를 읽는다.
# EC2 배포 이미지에도 포함돼야 하므로, 현재 운영 버전만 예외로 추적한다.
!document_pipeline/data/manifest_v3.json
```

이후부터 배포에 필요한 파일을 확인할 때 다음 경로를 단계별로 보게 되었다.

1. 개발 PC에 파일이 존재하는가.
2. Git이 그 파일을 추적하는가.
3. CI가 체크아웃한 커밋에 파일이 포함되어 있는가.
4. Docker 빌드 대상과 `.dockerignore`를 통과해 이미지에 들어가는가.
5. 실행 중인 컨테이너가 기대하는 경로에서 파일을 읽는가.

파일이 어느 서버에 ‘있다’는 대답만으로는 충분하지 않았다. 어떤 기능이 어느 환경에서 어떤 경로를 읽는지까지 알아야 정확하게 해결할 수 있었다.

![매니페스트 복구 후 Command Lab](https://velog.velcdn.com/images/ajjarago/post/8ea5af97-49a5-4cc4-abde-660efcbc4e71/image.png)


매니페스트를 이미지에 포함한 뒤 Command Lab에서 승인된 명령어 100개가 다시 표시되는 것을 확인했다. 화면은 명령을 실제로 실행하지 않고 구성 요소, 수정 가능한 값, 예상 효과, 주의사항과 공식 문서 근거를 보여 준다. 이 캡처는 원격 접속 예제 `ssh learner@raspberrypi.local`을 선택한 상태다.

### 4.5 컨테이너가 Healthy인데도 배포가 실패한 이유

실제 배포 로그에서는 이미지 다운로드와 컨테이너 재생성이 끝나고 웹과 Nginx가 Healthy 상태가 되었지만, 마지막 Python 검사에서 `AssertionError`가 발생했다.

현재 Compose의 웹 상태 검사는 `/health/`가 HTTP 200을 반환하는지 확인한다. 반면 릴리스 스크립트는 응답 JSON의 `status`가 `ok`이고 `ready`가 `true`인지까지 검사한다. 웹의 `/health/`는 RunPod가 준비되지 않아도 HTTP 200과 `ready: false`를 반환할 수 있다. 따라서 컨테이너 Healthy와 전체 서비스 준비 완료는 서로 다른 판단이었다.

당시 로그만으로 RunPod의 설정 오류, 연결 문제, 모델 로딩 중 상태 가운데 무엇이 직접 원인이었는지 확정할 수는 없다. 하지만 실패 지점이 이미지 다운로드나 컨테이너 시작 이후의 준비 상태 검증이었다는 점은 확인할 수 있다. 배포 단계별 의미를 파악하니 무엇을 추가로 확인해야 하는지도 더 명확해졌다.

또한 이런 실패에서는 새 컨테이너가 이미 실행되고 있을 수 있다. GitHub Actions에 빨간 X가 표시되었다고 해서 운영 환경이 전혀 바뀌지 않았다고 생각하면 안 된다. 반대로 초록 체크도 그 워크플로에서 검사한 범위를 통과했다는 뜻이며, 모든 기능의 품질을 보장하지는 않는다.

### 4.6 현재 CI/CD에서 남은 한계

현재 CI에서는 SQLite와 모의 원격 응답을 이용해 웹 설정 및 계약을 확인한다. 이는 빠른 검증에 유용하지만 RDS MySQL의 잠금·트랜잭션 동작이나 실제 GPU 생성 결과까지 동일하게 검증하지는 않는다.

또한 웹 테스트와 이미지 빌드가 통과하더라도 Command Lab 자산, 관리자 문서 접근, 사용자별 기록 기능 전체를 검증하는 것은 아니다. 이미지 빌드 확인과 실제 배포 이미지 빌드는 별도 단계이며, 빌드 산출물 승격이나 이미지 digest 중심 배포처럼 더 엄밀한 방식으로 발전시킬 여지가 있다.

현재 AWS 인증은 GitHub Secrets에 저장한 접근 키를 사용한다. 다음 단계에서는 OIDC 기반 단기 자격 증명과 배포 승인 환경을 검토하고 싶다. 이는 이미 구현한 성과가 아니라 운영 수명을 늘릴 때 개선할 항목이다.

## 5. Swagger와 관리자 접근: API를 설명하고 보호하기

### 5.1 명세 파일과 문서 화면의 차이

`58e4b15`, `f8da998`, `7083f70`에서는 Swagger 문서 제공과 관리자 접근 제한, 실행 가이드를 정리했다. 작업 중에는 `$ref`가 가리키는 스키마가 없거나 YAML 계층이 맞지 않아 오류가 발생했고, 명세가 표시된 뒤에도 Django에서 문서를 제공하는 URL과 화면을 별도로 연결해야 했다.

`/api/schema/`는 YAML 원문을 제공하고 `/api/docs/`는 이를 읽어 문서 화면을 보여 준다. YAML이 다운로드되는 것은 문서 UI가 실패한 것과 다르다. 연결 거부는 서버 실행이나 포트를, 404는 경로 연결을, 500은 서버 내부 예외를 확인해야 하는 출발점이다. 같은 ‘안 보인다’는 표현 아래에서도 실제 실패 계층은 달랐다.

이 경험을 통해 문서는 파일을 작성하는 것으로 끝나지 않으며, 팀원이 어느 주소로 접속하고 어떤 권한으로 확인하는지까지 포함해야 한다는 점을 배웠다.

### 5.2 UI와 명세 원문을 함께 보호하기

Swagger를 모든 방문자에게 공개하기보다 Django 관리자 권한이 있는 사용자만 접근하도록 구성했다. `staff_member_required`를 문서 화면과 스키마 응답 양쪽에 적용했다. 특정 이름의 계정만 허용하는 하드코딩보다 활성 상태와 staff 권한을 기준으로 접근을 판단하는 방식이다.

관리자 계정을 만들면서 컨테이너 터미널의 비밀번호 입력에 `UnicodeDecodeError`가 발생하기도 했다. 이 문제는 Git에 코드가 올라갔는지와는 다른 층위의 입력 문제였다. Django의 사용자 모델과 `set_password()`를 사용해 비밀번호를 설정하고 계정 플래그를 확인하는 방법으로 대응했다.

계정의 `is_active`, `is_staff`, `is_superuser` 값이 정상이라는 사실만으로 비밀번호까지 일치한다고 판단할 수 없다는 점도 배웠다. 인증 실패에서는 입력, 계정 상태, 접속 환경, 실제 DB를 구분해 확인해야 했다.

문서 UI와 YAML 원문에 같은 관리자 제한을 적용한 실제 코드는 다음과 같다.

```python
# web_app/portal/views.py 발췌
@staff_member_required
@require_GET
def openapi_schema(request):
    schema_path = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "openapi"
        / "web-api.yaml"
    )

    try:
        schema_text = schema_path.read_text(encoding="utf-8")
    except OSError:
        return JsonResponse(
            {"error": "OpenAPI 명세 파일을 읽을 수 없습니다."},
            status=500,
        )

    return HttpResponse(
        schema_text,
        content_type="application/yaml; charset=utf-8",
    )


@staff_member_required
@require_GET
def swagger_docs(request):
    return render(
        request,
        "portal/swagger_ui.html",
        {"schema_url": reverse("openapi_schema")},
    )
```

![관리자 인증 후 표시되는 Swagger 문서](blob:https://velog.io/02bc8055-b008-497c-a4ea-3757cf06d85d)


캡처에서는 Health, Command Lab, AI Job, Mini Challenge API와 각 요청·응답 스키마가 렌더링된다. 일반 사용자가 `/api/docs/` 또는 `/api/schema/`에 접근하면 관리자 로그인 화면으로 이동하고, `is_staff=True`인 계정만 문서와 원문을 확인할 수 있도록 했다.

### 5.3 문서와 코드의 일치도도 유지보수 대상이다

현재 구조는 작성한 OpenAPI YAML을 Django가 제공하는 방식이다. 화면이 정상적으로 렌더링된다고 해서 모든 필드와 상태 코드가 구현과 자동으로 일치하는 것은 아니다. API 변경 시 명세와 테스트를 함께 갱신하는 절차가 필요하다.

또한 현재 `views.py`에는 같은 이름의 Swagger 관련 함수가 앞쪽과 뒤쪽에 중복 정의되어 있다. 뒤쪽 정의에는 관리자 데코레이터가 적용되어 있지만, 유지보수자가 잘못된 정의를 수정할 가능성이 있다. 회고를 작성하며 현재 코드를 확인한 결과로서, 문서 제공 뷰를 한 곳으로 정리할 필요도 남아 있다.

## 6. README와 실행 가이드도 서비스의 일부였다

배포 절차를 Bash와 PowerShell 기준으로 정리하고, Secrets와 Variables, 서버 환경변수, 실행 위치를 설명하는 문서를 작성했다. `1952333`과 `214199d`의 가이드 작성·문서 아카이브 정리는 팀원이 참고할 기준 문서를 정리하는 과정이었다.

README에서는 문서 경로와 이미지 링크가 GitHub에서 깨지는 문제를 겪었다. 처음에는 파일이 로컬에 있는지 확인했지만, 이후 README의 상대경로 기준과 Git에 기록된 한글 파일명의 정규화 방식까지 확인해야 했다. macOS에서 같은 파일로 열리는 경로도 GitHub에서는 정확히 다른 문자열로 취급될 수 있었다.

ERD 파일명을 `ERD_1.png`, `ERD_2.png`로 바꾸고, 개인 작업물 링크는 Git에 기록된 이름에 맞춰 연결했다. 이 문제 역시 배포 자산 누락과 비슷한 교훈을 주었다. 내가 사용하는 환경에서 열리는 것만 확인해서는 다른 환경의 재현성을 보장할 수 없었다.

좋은 문서는 정보를 많이 담은 문서뿐 아니라, 필요한 문서로 이동할 수 있고 명령어의 실행 위치를 혼동하지 않으며 오류가 발생했을 때 다음 확인 지점을 알려 주는 문서라고 생각하게 되었다.

## 7. 잘한 점과 아쉬운 점

### 잘한 점

가장 의미 있었던 것은 RAG, 웹 화면, DB, GPU 서버, 배포를 하나의 사용자 흐름으로 연결한 것이다. 기능별 코드가 존재하는 상태에서 더 나아가 사용자가 질문하고, 기다리고, 결과를 확인하고, 저장하고, 다시 조회하는 흐름을 구성했다.

두 번째는 오류를 로그와 실행 환경의 차이로 좁혀 본 경험이다. 매니페스트 누락, SSM 등록 상태, 준비 상태 검사, Swagger 접근, 한글 파일명 문제는 서로 다른 원인이었다. 문제를 해결하면서 확인 대상을 구체적으로 나누는 능력이 늘었다.

세 번째는 수정 사항을 커밋과 문서로 남겼다는 점이다. 나중에 무엇을 바꿨는지 확인하고 팀원에게 운영 절차를 전달할 수 있었다. 사용자에게 보이는 작은 상태 표시나 저장 후 화면 유지도 별도 문제로 다룬 점은 서비스 완성도에 도움이 되었다.

### 아쉬운 점

초기에 환경별 필수 자산 목록을 더 명확하게 정리하지 못했다. 어떤 파일은 Git에 포함하고 어떤 파일은 RunPod 볼륨에서 준비해야 하는지 경계가 분명했다면 CI와 운영 화면에서 같은 종류의 문제를 더 일찍 발견했을 것이다.

CI가 실패했을 때 검증을 줄인 뒤 그 빈자리를 웹 전용 자산 검사로 바로 보완하지 못한 점도 아쉽다. 테스트가 통과하게 만드는 것과 배포에 필요한 조건을 확인하는 것은 별개였다. 다음에는 실패한 검증의 의도를 먼저 분리하고, 필요한 검사를 더 좁고 정확하게 유지하고 싶다.

웹과 RunPod의 배포 단위도 완전히 맞추지 못했다. AWS는 자동 배포되지만 RunPod는 수동 갱신과 재시작이 필요하다. 어느 서버에 어느 커밋이 실행되는지 한눈에 확인할 수 있도록 만들면 팀원이 기능 변경을 반영했는지 확인하는 부담이 줄어들 것이다.

마지막으로 일부 코드와 문서는 구현 속도를 따라가며 중복되거나 오래된 설명이 남았다. 서비스가 동작한 뒤 책임을 다시 나누고 정리하는 시간을 확보할 필요가 있었다. 특히 개인 기여 문서도 작성자 이름과 공동 작업 내용을 함께 대조해야 정확하게 설명할 수 있었다.

## 8. 다음 프로젝트에서 적용할 개선 계획

| 우선순위 | 개선할 일 | 완료 여부를 확인할 기준 |
| --- | --- | --- |
| 1 | 웹 필수 배포 자산 목록과 검사 추가 | 깨끗한 체크아웃으로 만든 이미지에서 매니페스트를 읽고 Command Lab 템플릿을 조회할 수 있다. |
| 1 | 웹 생존 상태와 AI 준비 상태 분리 | GPU가 꺼진 경우에도 웹 자체 상태와 AI 미준비 상태를 각각 식별하고, 배포 정책이 이를 명시적으로 판단한다. |
| 1 | 공개 웹 구간 HTTPS 적용 | 관리자 로그인과 사용자 세션을 암호화된 연결로 사용한다. |
| 1 | 운영 복구 절차 검증 | 이전 이미지로 복귀하는 절차, 실패 중간 상태, DB 스키마 호환 조건을 시연 환경에서 확인한다. |
| 2 | AWS·RunPod 배포 버전 표시 | 두 서버가 실행 중인 커밋과 주요 자산 버전을 운영자가 확인할 수 있다. |
| 2 | MySQL 기반 통합 테스트 보완 | 사용자 소유권, 중복 저장, 작업 잠금과 트랜잭션을 운영 DB 계열에서 검증한다. |
| 2 | RunPod 갱신 절차 표준화 | 코드·환경변수·자산 확인, 재시작, readiness 확인을 일관된 절차로 수행한다. |
| 2 | CI 자격 증명 및 배포 설정 관리 개선 | OIDC 적용 가능성을 검토하고, EC2의 스크립트·Compose·설정 버전이 이미지와 함께 관리된다. |
| 3 | Swagger·README 계약 검사 | OpenAPI 참조 오류, URL 연결, 관리자 접근 제어, Git 기준 링크를 변경 시 확인한다. |
| 3 | 운영 로그와 비용 관측 개선 | 웹 장애와 GPU 미준비를 구분해 파악하고, 중지 후에도 남는 리소스 비용을 확인할 수 있다. |

## 9. 이번 경험이 나에게 남긴 것

이번 프로젝트를 통해 기능을 만드는 것에서 운영 가능한 형태로 전달하는 것까지 책임 범위를 넓힐 수 있었다. RAG가 올바른 근거를 찾더라도 웹이 결과를 잘 보여 주지 못하면 사용자가 활용하기 어렵고, 웹이 완성되어도 배포 자산이나 환경변수가 빠지면 실제 서비스에서는 사용할 수 없다.

Django를 다루며 사용자 입력, 세션, 권한, 기록, 비동기 상태가 연결되는 방식을 배웠고, AWS를 구성하며 서버와 데이터의 역할을 나누는 법을 배웠다. CI/CD를 만들면서는 자동화가 사람이 하던 명령을 대신 실행하는 것을 넘어, 무엇을 성공으로 판단할지 정의하는 작업이라는 것을 알게 되었다.

앞으로는 구현 초기에 배포 환경과 필수 자산을 함께 정리하고, 기능 완료 기준에 사용자 흐름 검증과 복구 가능성을 포함하고 싶다. 문제가 생겼을 때 반복해서 설정을 바꾸기보다, 어느 단계의 어떤 조건이 충족되지 않았는지 설명할 수 있는 개발자로 성장하고자 한다.

## 10. 회고의 근거가 된 주요 커밋과 파일

아래 링크는 이 회고에서 설명한 변경의 근거다. 커밋 설명에 기록된 과거 테스트 결과를 이번 작성 시점에 다시 실행한 결과로 해석하지 않는다.

| 시기 | 커밋 | 확인한 변경 |
| --- | --- | --- |
| 08-28 | [f49697f](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/f49697f) · [a3fae0a](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/a3fae0a) | Chroma 설정·색인, Hybrid 검색 필터·검증 |
| 08-31 | [cb44e3c](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/cb44e3c) | Qwen 근거 인용 검증과 형식 수정 재생성 |
| 09-11 | [055cdaa](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/055cdaa) | Django 웹 구조 전환 |
| 09-14 | [7ec7c75](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/7ec7c75) | 회원가입·전체 프론트 구현 |
| 09-17 | [6b2eba2](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/6b2eba2) · [9bfe48a](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/9bfe48a) · [11f1eaf](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/11f1eaf) | 미니 챌린지 웹 연결, 공통 결과·추천 기록, 인증 |
| 09-18 | [5e5490f](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/5e5490f) · [51447bf](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/51447bf) | 원격 AI 공동 구현·통합, RunPod HTTP 경계 Django 전환 |
| 09-18 | [f58c803](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/f58c803) · [a2677d9](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/a2677d9) | 스피너와 오답노트 저장 UX 수정 |
| 09-21 | [04531dc](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/04531dc) | 추천·Q&A 레이아웃, 운영 정적 파일 설정 |
| 09-22 | [fb7a170](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/fb7a170) · [45fb318](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/45fb318) | AWS 운영 설정·CI/CD 구축 |
| 09-22 | [6018e3a](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/6018e3a) · [d9f3967](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/d9f3967) | CI 검사 범위 수정·매니페스트 배포 포함 |
| 09-22 | [1952333](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/1952333) · [214199d](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/214199d) | CI/CD 가이드·배포 문서 정리 |
| 09-23 | [58e4b15](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/58e4b15) · [f8da998](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/f8da998) · [7083f70](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/7083f70) | Swagger 문서·관리자 권한·운영 가이드 |
| 09-24 | [50664a5](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/50664a5) · [8b5034d](https://github.com/skn-33-Raspberry-Pi-Assistant-4th/skn_33_4th_5team/commit/8b5034d) | README 경로·이미지·개인 작업물 링크 정비 |
