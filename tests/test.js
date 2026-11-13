const { JSDOM } = require('jsdom');
const fs = require('fs');
const assert = require('assert');
const DIR = require('path').join(__dirname, '..') + '/';
let pass = 0, fail = 0;
function t(name, fn){ try { fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message); } }

function stubCanvas(win){
  const noop = () => {};
  const ctx = new Proxy({}, { get: (o, k) => k === 'createLinearGradient' ? () => ({ addColorStop: noop }) : (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  win.HTMLCanvasElement.prototype.getContext = () => ctx;
  win.HTMLCanvasElement.prototype.setPointerCapture = noop;
}
function load(file){
  const html = fs.readFileSync(DIR + file, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.org/',
    beforeParse(win){ stubCanvas(win); win.fetch = () => Promise.reject(new Error('offline')); win.requestAnimationFrame = () => 0; win.scrollTo = () => {}; win.confirm = () => false; } });
  return dom.window;
}

console.log('학생 화면');
const w = load('index.html'); const SF = w.SF; const $ = id => w.document.getElementById(id);
SF.enterOffline();
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const type = (id, v) => { $(id).value = v; fire($(id), 'input'); };

t('음향 측심 수심 = 1500 × t ÷ 2', () => {
  assert.strictEqual(JSON.stringify(SF.SONAR.map(p => SF.depthOf(p.t))), '[300,4500,2400,7800]');
});
t('화면 단면의 해저 깊이가 측정값과 일치', () => {
  SF.SONAR.forEach(p => assert.ok(Math.abs(SF.floorAt(p.x) - SF.depthOf(p.t)) < 1, p.id + ' ' + SF.floorAt(p.x)));
});
t('C는 해령 꼭대기, D는 가장 깊은 해구', () => {
  const c = SF.floorAt(0.545), d = SF.floorAt(0.86);
  for (let x = 0.46; x < 0.64; x += 0.005) assert.ok(SF.floorAt(x) >= c - 0.001);
  for (let x = 0; x <= 1; x += 0.005) assert.ok(SF.floorAt(x) <= d + 0.001);
});
t('수심 채점: 맞은 개수', () => {
  type('d_A', '300'); type('d_B', '4500'); type('d_C', '2000');
  assert.strictEqual(SF.check2(), 2);
  type('d_C', '2400'); type('d_D', '7,800');
  assert.strictEqual(SF.check2(), 4);
});
t('1단계: 빈칸이면 잠기지 않고, 쓰면 잠김', () => {
  $('s1lock').click(); assert.strictEqual(SF.S.s1.locked, false);
  type('s1idea', '해령에 화산이 있을 것'); $('s1lock').click(); assert.strictEqual(SF.S.s1.locked, true);
  assert.ok($('s1idea').disabled);
});
t('2단계 잠금 → 진행 단계 3', () => {
  type('s2shape', '가운데가 솟아 있고 오른쪽 끝이 매우 깊다'); $('s2lock').click();
  assert.strictEqual(SF.S.s2.locked, true); assert.strictEqual(SF.maxStageReached(), 3);
});
t('4단계 자료: 해령에서 멀어질수록 나이 많고 퇴적물 두꺼움, 좌우 대칭', () => {
  const R = SF.D4.filter(p => p.x >= 0), L = SF.D4.filter(p => p.x <= 0).reverse();
  for (let i = 1; i < R.length; i++) { assert.ok(R[i].age > R[i - 1].age); assert.ok(R[i].sed > R[i - 1].sed); assert.ok(L[i].age > L[i - 1].age); assert.ok(L[i].sed > L[i - 1].sed); }
  const r = SF.D4.find(p => p.x === 0); assert.ok(r.age <= 1 && r.sed <= 30);
  assert.ok(Math.max(...SF.D4.map(p => p.age)) <= 120 && Math.max(...SF.D4.map(p => p.sed)) <= 500, '그래프 축 안');
});
t('4단계: 추론과 질문까지 써야 잠기고, 질문이 모임', () => {
  SF.STAGE = 9; SF.go(4);
  $('s4a').querySelectorAll('.chip')[0].click(); $('s4b').querySelectorAll('.chip')[0].click(); type('s4c', '대칭');
  $('s4lock').click(); assert.strictEqual(SF.S.s4.locked, false);
  type('s4d', '해령에서 새 지각이 생긴다'); type('s4q', '왜 해령이 젊을까?'); $('s4lock').click();
  assert.strictEqual(SF.S.s4.locked, true); assert.strictEqual(SF.S.qs.length, 1);
  assert.ok($('s4a').querySelectorAll('.chip')[0].classList.contains('ok'));
});
t('5단계: ④ 추론이 다시 보이고, 모두 답해야 잠김', () => {
  SF.go(5); assert.strictEqual($('s5mine').textContent, '해령에서 새 지각이 생긴다');
  type('s5a', '해령에서 생겨 밀려나니까'); type('s5b', '오래 쌓여서'); $('s5lock').click(); assert.strictEqual(SF.S.s5.locked, false);
  $('s5old').querySelectorAll('.chip')[1].click(); type('s5cmp', '비슷하다'); $('s5lock').click();
  assert.strictEqual(SF.S.s5.locked, true); assert.ok(/다시/.test($('s5fb').textContent));
  SF.SP5.t = 3.3; SF.SP5.draw(); SF.SP5.stop();
});
t('진행 단계: 1~5단계 잠금 → 6', () => {
  SF.S.s3.locked = true; assert.strictEqual(SF.maxStageReached(), 6);
});
t('6단계: 시뮬레이터가 예측 없이 바로 보임', () => {
  SF.go(6); assert.notStrictEqual($('s6rev').style.display, 'none'); assert.ok(!$('strips'));
});
t('9단계: 처음 생각이 다시 보임', () => {
  SF.STAGE = 9; SF.go(9); assert.strictEqual($('s9first').textContent, '해령에 화산이 있을 것');
});
t('교사가 연 단계보다 앞은 볼 수 없음', () => {
  SF.STAGE = 3; SF.go(5);
  assert.strictEqual($('waitMsg').style.display, 'block');
  assert.ok(![...w.document.querySelectorAll('.stage')].some(s => s.classList.contains('on')));
});
t('모든 단계 화면 전환 오류 없음', () => { SF.STAGE = 9; for (let i = 1; i <= 9; i++) SF.go(i); });

const PM = SF.PM;
function runTo(mode, rate){ PM.mode = mode; PM.rate = rate; PM.reset(); PM.step(PM.T); }
t('시뮬레이터: 실제 기록으로 끝까지 재생하면 현재는 정자극기', () => {
  runTo('real', 5); assert.strictEqual(PM.E, PM.T); assert.strictEqual(PM.cur, 'N');
});
t('시뮬레이터: 5 cm/년이면 500만 년 동안 한쪽 250 km 확장', () => {
  runTo('real', 5); assert.ok(Math.abs(PM.Scum - 250) < 0.01, PM.Scum);
});
t('시뮬레이터: 5 cm/년일 때 해령에서 100 km 지점은 약 200만 년', () => {
  runTo('real', 5); const c = PM.at(100); assert.ok(!c.pre); assert.ok(Math.abs(c.age - 2.0) < 0.03, c.age);
});
t('시뮬레이터: 기록된 자극이 실제 연표와 일치', () => {
  runTo('real', 5);
  [[20, 'N'], [44, 'R'], [51.5, 'N'], [70, 'R'], [92, 'N'], [140, 'N'], [164, 'R'], [185, 'R']].forEach(([d, pol]) => {
    const c = PM.at(d); assert.strictEqual(c.pol, pol, d + ' km: ' + c.pol + ' 나이 ' + c.age.toFixed(2));
    assert.strictEqual(PM.realPol(c.age), pol);
  });
});
t('시뮬레이터: 해령 양쪽 대칭', () => {
  runTo('random', 4); for (let d = 1; d < 200; d += 7) assert.strictEqual(JSON.stringify(PM.at(d)), JSON.stringify(PM.at(-d)));
});
t('시뮬레이터: 확장 속도가 2배면 줄무늬 폭도 2배 (나이는 같음)', () => {
  runTo('real', 3); const a = PM.at(60).age; runTo('real', 6); const b = PM.at(120).age;
  assert.ok(Math.abs(a - b) < 0.03, a + ' vs ' + b);
});
t('시뮬레이터: 관찰 시작 전 지각 구분', () => {
  runTo('real', 5); assert.ok(PM.at(260).pre); assert.ok(!PM.at(240).pre);
});
t('시뮬레이터: 지금 뒤집기 → 직접 모드, 그 뒤로는 자극 유지', () => {
  PM.mode = 'real'; PM.rate = 5; PM.reset(); PM.step(1.0);
  const before = PM.cur; $('pmFlip').click();
  assert.strictEqual(PM.mode, 'manual'); assert.notStrictEqual(PM.cur, before);
  const after = PM.cur; PM.step(1.5); assert.strictEqual(PM.cur, after);
  assert.strictEqual(PM.at(5).pol, after);
});
t('시뮬레이터: 지자기 이상 — 정자극기 위 +, 역자극기 위 −', () => {
  runTo('real', 5); assert.ok(PM.anomAt(15) > 0.5); assert.ok(PM.anomAt(-15) > 0.5); assert.ok(PM.anomAt(70) < -0.5);
});
t('시뮬레이터 그리기 (두 보기) 오류 없음', () => { PM.view = 'section'; PM.draw(); PM.view = 'oblique'; PM.pick = 80; PM.showPick(); PM.draw(); PM.drawGraph(); });
t('ⓒ 100 km 나이 채점 (200만 년)', () => {
  type('s6age', '20'); assert.strictEqual(SF.check6age(), false);
  type('s6age', '200'); assert.strictEqual(SF.check6age(), true);
});

console.log('교사 화면');
const tw = load('teacher.html'); const T = tw.TCH; const $t = id => tw.document.getElementById(id);
const doc = (uid, cls, numv, name, S, done) => ({ name: 'projects/x/databases/(default)/documents/seafloor/' + uid, fields: { name: { stringValue: name }, cls: { stringValue: cls }, num: { integerValue: String(numv) }, done: { integerValue: String(done) }, data: { stringValue: JSON.stringify(S) } } });
t('문서 해석', () => {
  const p = T.parse(doc('u1', '3', 7, '김바다', { s1: { idea: '화산' } }, 4));
  assert.strictEqual(p.cls, '3'); assert.strictEqual(p.num, 7); assert.strictEqual(p.S.s1.idea, '화산');
});
t('수심 채점', () => {
  assert.strictEqual(T.sonarOk({ s2: { d: { A: '300', B: '4500', C: '2400', D: '7000' } } }), 3);
});
t('표 그리기 (진행·질문·생각 변화)', () => {
  T.STU = [T.parse(doc('u1', '3', 7, '김바다', { s1: { idea: '처음<b>' }, s9: { now: '나중', r: '생성', t: '소멸' }, qs: [{ t: '왜?', tag: '왜?', src: 4, at: 1 }] }, 10)),
           T.parse(doc('u2', '3', 2, '이해령', {}, 1))];
  T.startOffline();
  const html = $t('p0').innerHTML + $t('p1').innerHTML + $t('p2').innerHTML;
  assert.ok(html.includes('김바다') && html.includes('이해령'));
  assert.ok(html.includes('처음&lt;b&gt;'), 'HTML 이스케이프');
  assert.ok($t('p0').innerHTML.indexOf('이해령') < $t('p0').innerHTML.indexOf('김바다'), '번호순 정렬');
  assert.ok(html.includes('9/9'));
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
