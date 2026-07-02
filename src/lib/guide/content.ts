import type { UserRole } from "@/lib/rbac";

export type GuideSectionId = "start" | "chat" | "roles" | "upload" | "admin" | "faq";

export interface GuideSection {
  id: GuideSectionId;
  title: string;
  summary: string;
  items: { title: string; body: string }[];
  roles?: UserRole[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "start",
    title: "시작하기",
    summary: "CorpBrain에 처음 접속하셨나요? 3분 안에 시작할 수 있습니다.",
    items: [
      {
        title: "CorpBrain이란?",
        body: "NovaPay 사내 문서(규정, 보고서, 계약서 등)를 AI가 검색해 답변해 주는 사내 지식 챗봇입니다. ChatGPT와 달리 사내 문서만 참고하며, 권한에 맞는 문서만 검색됩니다.",
      },
      {
        title: "첫 로그인 후 할 일",
        body: "1) 관리자라면 상단 Sync Vault로 문서를 인덱싱합니다. 2) 아래 예시 질문을 눌러 바로 체험해 보세요. 3) 답변의 [출처: 파일명] 뱃지를 클릭해 근거 문서를 확인하세요.",
      },
      {
        title: "질문 잘하는 법",
        body: "구체적으로 물어보세요. 예: '휴가 규정' → '연차는 며칠이고, 반차 신청 방법은?'. 문서 제목·부서·기간을 포함하면 검색 정확도가 올라갑니다.",
      },
    ],
  },
  {
    id: "chat",
    title: "채팅 사용법",
    summary: "질문 입력부터 출처 확인까지의 기본 흐름입니다.",
    items: [
      {
        title: "질문하기",
        body: "하단 입력창에 자연어로 질문을 입력하고 전송 버튼을 누르세요. 답변은 실시간으로 스트리밍됩니다.",
      },
      {
        title: "출처 확인",
        body: "AI 답변에 [출처: vacation.md] 형태의 뱃지가 표시됩니다. 클릭하면 어떤 사내 문서를 참고했는지 확인할 수 있습니다.",
      },
      {
        title: "대화 저장",
        body: "대화 내용은 브라우저에 자동 저장됩니다. Clear 버튼으로 초기화할 수 있습니다. (다른 기기와는 공유되지 않습니다)",
      },
      {
        title: "답변이 없을 때",
        body: "관련 문서가 인덱싱되지 않았거나, 본인 권한으로 열람할 수 없는 문서일 수 있습니다. 관리자에게 Sync Vault 실행 또는 문서 업로드를 요청하세요.",
      },
    ],
  },
  {
    id: "roles",
    title: "권한 안내",
    summary: "역할에 따라 볼 수 있는 문서가 다릅니다.",
    items: [
      {
        title: "일반 (General)",
        body: "휴가·재택·출장 등 전사 공통 규정을 열람할 수 있습니다. NDA·계약서 등 기밀 문서는 검색되지 않습니다.",
      },
      {
        title: "팀장 (Manager)",
        body: "일반 문서 + 분기 실적, 경비, 인보이스 등 팀장급 문서를 열람할 수 있습니다. 문서 업로드도 가능합니다.",
      },
      {
        title: "관리자 (Admin)",
        body: "NDA·계약서 등 최고 기밀 문서까지 열람 가능합니다. Sync Vault(전체 재인덱싱), Admin 대시보드 접근이 가능합니다.",
      },
      {
        title: "권한이 맞는지 확인",
        body: "상단 헤더에서 본인 이름 옆 역할 뱃지를 확인하세요. 권한 변경이 필요하면 인사팀 또는 IT 관리자에게 문의하세요.",
      },
    ],
  },
  {
    id: "upload",
    title: "문서 업로드",
    summary: "Manager 이상 사용자를 위한 문서 추가 가이드입니다.",
    roles: ["manager", "admin"],
    items: [
      {
        title: "지원 형식",
        body: "마크다운(.md), PDF(.pdf), Word(.docx) 파일을 업로드할 수 있습니다. 최대 5MB까지 지원됩니다.",
      },
      {
        title: "열람 권한 지정",
        body: "업로드 시 문서 열람 권한(일반/팀장/관리자)을 선택하세요. Manager는 관리자 전용 문서를 지정할 수 없습니다.",
      },
      {
        title: "업로드 후",
        body: "업로드 즉시 자동 인덱싱됩니다. 별도 Sync Vault 없이도 바로 채팅에서 검색할 수 있습니다.",
      },
    ],
  },
  {
    id: "admin",
    title: "관리자 가이드",
    summary: "Admin 전용 운영 기능 안내입니다.",
    roles: ["admin"],
    items: [
      {
        title: "Sync Vault",
        body: "sample-docs 및 uploads 폴더의 모든 문서를 다시 스캔·인덱싱합니다. 신규 문서 대량 반영 시 또는 인덱스 오류 시 실행하세요. (시간이 걸릴 수 있습니다)",
      },
      {
        title: "Admin 대시보드",
        body: "감사 로그, 문서 목록, 검색 품질 메트릭(Hit@3, MRR)을 확인할 수 있습니다. 보안 감사·운영 점검에 활용하세요.",
      },
      {
        title: "감사 로그",
        body: "누가 언제 질의·업로드·로그인했는지 기록됩니다. SIEM 연동 시 외부 보안 시스템으로도 전송됩니다.",
      },
    ],
  },
  {
    id: "faq",
    title: "자주 묻는 질문",
    summary: "이용 중 자주 받는 질문과 답변입니다.",
    items: [
      {
        title: "ChatGPT와 뭐가 다른가요?",
        body: "CorpBrain은 사내 문서만 검색합니다. 외부 API로 데이터가 나가지 않으며, 역할별 문서 접근이 제한됩니다.",
      },
      {
        title: "답변이 틀릴 수 있나요?",
        body: "AI는 검색된 문서를 바탕으로 답변합니다. 중요한 결정은 반드시 [출처] 문서 원문을 확인하세요.",
      },
      {
        title: "Slack에서도 쓸 수 있나요?",
        body: "Slack에서 /corpbrain [질문] 명령으로 검색할 수 있습니다. (IT팀 Slack App 설정 필요)",
      },
      {
        title: "비밀번호를 잊었어요",
        body: "Google Workspace SSO로 로그인하거나, IT 관리자에게 비밀번호 재설정을 요청하세요.",
      },
    ],
  },
];

export const QUICK_START_PROMPTS: Record<UserRole, string[]> = {
  general: [
    "우리 회사 휴가 규정 알려줘",
    "재택근무 정책이 어떻게 돼?",
    "출장비 신청 절차 알려줘",
  ],
  manager: [
    "Q2 실적 보고서 요약해줘",
    "경비 정산 규정 알려줘",
    "AWS 청구서 관련 문서 찾아줘",
  ],
  admin: [
    "NDA 계약서 주요 조항 알려줘",
    "벤더 계약 관련 문서 찾아줘",
    "사내 보안 정책 요약해줘",
  ],
};

export const LOGIN_GUIDE_ITEMS = [
  {
    title: "로그인 방법",
    body: "사내 이메일(@novapay.kr)과 비밀번호로 로그인하거나, Google Workspace SSO를 사용하세요.",
  },
  {
    title: "데모 체험",
    body: "아래 데모 계정을 클릭하면 자동 입력됩니다. 비밀번호는 novapay2026입니다. 역할별로 볼 수 있는 문서가 다릅니다.",
  },
  {
    title: "로그인 후",
    body: "채팅 화면에서 사내 문서에 대해 자유롭게 질문하세요. 우측 상단 '도움말'에서 상세 매뉴얼을 볼 수 있습니다.",
  },
];

export function getSectionsForRole(role: UserRole): GuideSection[] {
  return GUIDE_SECTIONS.filter(
    (section) => !section.roles || section.roles.includes(role)
  );
}
