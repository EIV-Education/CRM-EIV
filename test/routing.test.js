import test from 'node:test';
import assert from 'node:assert/strict';
import { matchBranch, matchGroup, buildMaKH, nextStt, classifyLead, routeLead } from '../src/routing.js';

test('matchBranch: Da Nang -> EIV_DN', () => {
  const b = matchBranch('123 Nguyen Van Linh, Q. Hai Chau, Da Nang');
  assert.equal(b.code, 'EIV_DN');
});

test('matchBranch: co dau tieng Viet van nhan dien dung', () => {
  const b = matchBranch('45 Trần Phú, Quận Hải Châu, Đà Nẵng');
  assert.equal(b.code, 'EIV_DN');
});

test('matchBranch: Ho Chi Minh -> EIV_HCM', () => {
  const b = matchBranch('12 Nguyen Hue, Quan 1, TP Ho Chi Minh');
  assert.equal(b.code, 'EIV_HCM');
});

test('matchBranch: Ha Noi -> EIV_HN', () => {
  const b = matchBranch('Cau Giay, Ha Noi');
  assert.equal(b.code, 'EIV_HN');
});

test('matchBranch: dia chi lan can mien Bac (Bac Ninh) -> EIV_HN', () => {
  const b = matchBranch('TP Bac Ninh, tinh Bac Ninh');
  assert.equal(b.code, 'EIV_HN');
});

test('matchBranch: khong nhan dien duoc tra ve null', () => {
  const b = matchBranch('Singapore');
  assert.equal(b, null);
});

test('matchBranch: uu tien Dia chi, Tinh/Thanh pho chi la du phong', () => {
  // Dia chi khong khop gi -> fallback dung Tinh/Thanh pho
  const b = matchBranch('Dia chi khong ro rang gi ca', 'ĐÀ NẴNG');
  assert.equal(b.code, 'EIV_DN');
});

test('matchBranch: Dia chi khop thi thang, khong can toi Tinh/Thanh pho', () => {
  // Dia chi noi Ha Noi nhung Tinh/Thanh pho (co the bi chon nham) lai la
  // HCM - Dia chi phai thang vi la nguon uu tien.
  const b = matchBranch('123 Kim Ma, Ha Noi', 'HỒ CHÍ MINH');
  assert.equal(b.code, 'EIV_HN');
});

test('matchBranch: Tinh/Thanh pho (du phong) khop dung tung mien', () => {
  assert.equal(matchBranch('', 'HỒ CHÍ MINH').code, 'EIV_HCM');
  assert.equal(matchBranch('', 'HÀ NỘI').code, 'EIV_HN');
  assert.equal(matchBranch('', 'BÀ RỊA-VŨNG TÀU').code, 'EIV_HCM');
  assert.equal(matchBranch('', 'HẠ LONG').code, 'EIV_HN');
});

test('matchBranch: Tinh/Thanh pho la gia tri la (N/a, Dai Loan) -> null', () => {
  assert.equal(matchBranch('', 'N/a'), null);
  assert.equal(matchBranch('', 'Đài Loan'), null);
});

test('matchBranch: Dia chi khop du Tinh/Thanh pho rong', () => {
  const b = matchBranch('123 Le Loi, Da Nang', '');
  assert.equal(b.code, 'EIV_DN');
});

test('matchGroup: truong hoc', () => {
  const g = matchGroup('Can giao vien tieng Anh cho truong hoc');
  assert.equal(g.code, 'TRUONG_HOC');
});

test('matchGroup: trung tam -> TTAN', () => {
  const g = matchGroup('Trung tam ngoai ngu can hop tac');
  assert.equal(g.code, 'TTAN');
});

test('matchGroup: 1 kem 1 online -> OTO_ONLINE', () => {
  const g = matchGroup('Muon hoc 1 kem 1 online voi giao vien nuoc ngoai');
  assert.equal(g.code, 'OTO_ONLINE');
});

test('matchGroup: one-to-one truc tiep -> OTO_OFFLINE', () => {
  const g = matchGroup('Quan tam khoa hoc one-to-one, muon hoc truc tiep tai nha');
  assert.equal(g.code, 'OTO_OFFLINE');
});

test('matchGroup: 1 kem 1 khong ro hinh thuc -> mac dinh OTO_OFFLINE', () => {
  const g = matchGroup('Quan tam khoa hoc 1 kem 1');
  assert.equal(g.code, 'OTO_OFFLINE');
});

test('matchGroup: doanh nghiep', () => {
  const g = matchGroup('Cong ty can dao tao tieng Anh doanh nghiep cho nhan vien');
  assert.equal(g.code, 'DOANH_NGHIEP');
  assert.equal(g.label, 'DOANH NGHIỆP');
});

test('matchGroup: truong hoc co label chinh xac co dau', () => {
  const g = matchGroup('Can giao vien tieng Anh cho truong hoc');
  assert.equal(g.label, 'TRƯỜNG HỌC');
});

test('matchGroup: be hoc online -> KIDS_ONL', () => {
  const g = matchGroup('Be nha minh muon hoc tieng Anh online');
  assert.equal(g.code, 'KIDS_ONL');
});

test('matchGroup: kid hoc tai nha -> KIDS_OFF', () => {
  const g = matchGroup('Tim gia su cho kid hoc tai nha');
  assert.equal(g.code, 'KIDS_OFF');
});

test('nextStt: chua co ma nao -> bat dau tu 1', () => {
  assert.equal(nextStt([], 'TT-43'), 1);
});

test('nextStt: noi tiep STT lon nhat theo dung prefix', () => {
  const existing = ['TT-430001', 'TT-430002', 'TT-590001', 'TH-430005'];
  assert.equal(nextStt(existing, 'TT-43'), 3);
});

test('buildMaKH: dinh dang dung <maNhom>-<maChiNhanh><STT 4 so>', () => {
  const group = { maNhom: 'TT' };
  const branch = { maChiNhanh: '43' };
  const code = buildMaKH(group, branch, ['TT-430001', 'TT-430002']);
  assert.equal(code, 'TT-430003');
});

test('classifyLead: tra ve day du thong tin khi khop', () => {
  const r = classifyLead({
    diaChi: 'Da Nang',
    quanTam: 'Trung tam ngoai ngu can hop tac',
  });
  assert.equal(r.matched, true);
  assert.equal(r.chiNhanhCode, 'EIV_DN');
  assert.equal(r.nhomKHCode, 'TTAN');
  assert.equal(r.prefix, 'TT-43');
});

test('classifyLead: khong khop tra ve matched=false va ly do', () => {
  const r = classifyLead({ diaChi: '', quanTam: '' });
  assert.equal(r.matched, false);
  assert.ok(r.reason.length > 0);
});

test('routeLead: end-to-end tra ve Ma KH + nguoi phu trach/lien quan', () => {
  const r = routeLead(
    { diaChi: 'Ha Noi', quanTam: 'Truong hoc can giao vien' },
    ['TH-290001'],
  );
  assert.equal(r.matched, true);
  assert.equal(r.chiNhanh, 'EIV HN');
  assert.equal(r.nhomKH, 'TRƯỜNG HỌC');
  assert.equal(r.maKH, 'TH-290002');
  assert.equal(r.nguoiPhuTrach.length, 1);
  assert.equal(r.nguoiLienQuan.length, 2);
});
