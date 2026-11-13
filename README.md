# 바다 밑에 남은 흔적 (해양저 확장설 웹앱)

- 학생 화면: `index.html`
- 교사 화면: `teacher.html`
- 사진: `*.jpg`, `*.png`. 선생님 PPT에서 가져온 그림이에요.

## 배포
GitHub에 새 저장소(예: `seafloor`)를 만들고 폴더 안 파일을 모두 올린 뒤, Pages를 켜면 됩니다.

- 학생 주소: `https://aurorajiwon-pixel.github.io/seafloor/`
- 교사 주소: `https://aurorajiwon-pixel.github.io/seafloor/teacher.html`

## Firebase
구름 앱과 같은 Firebase 프로젝트(`cloud-9e6ad`)를 쓰고, 컬렉션만 새로 씁니다.

- 학생 답: `seafloor/{학생 uid}`
- 단계 열기·설명 열기: `seafloor_ctrl/state`

Firestore 규칙에 아래 두 블록을 추가해 주세요. 구름 앱 규칙(`lcl1`, `lcl1_ctrl`)과 같은 모양이고, `TEACHER_EMAIL`만 선생님 교사 계정 이메일로 바꾸면 돼요.

```
match /seafloor/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  allow read: if request.auth != null && request.auth.token.email == 'TEACHER_EMAIL';
}
match /seafloor_ctrl/{doc} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.token.email == 'TEACHER_EMAIL';
}
```

교사 화면은 Firebase Authentication의 이메일/비밀번호 계정으로 로그인해요.

## 수업 진행
1. 교사 화면에서 단계 버튼을 누르면 학생 화면에 그 단계까지 열려요.
2. ④(자료 읽기·추론) 다음 ⑤(해양저 확장설 이론)는 학생들이 ④를 마친 뒤 열어 주세요.
3. 교사 화면 탭
   - 진행 현황: 수심 계산, 지형 고르기, 나이·퇴적물 규칙, 2억 년 문항, 100 km 나이, 열류량, 섭입·변환 정답 여부
   - 질문 모음
   - 생각 변화: 처음 생각, 나중 생각, 렌즈 답
   - 단계별 서술
