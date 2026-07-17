import { normalizeVN } from './text.js';
import { BRANCHES, GROUPS, PROVINCE_BRANCH_MAP } from './config.js';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// So khop theo tu/cum tu (word boundary) de tranh dinh vi nham, vi du
// tinh "Hue" khong duoc khop nham vao ten duong "Nguyen Hue".
function containsPhrase(text, phrase) {
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}($|[^a-z0-9])`);
  return re.test(text);
}

// Uu tien tra chi nhanh tu "Dia chi" (text tu do nhan vien/lead dien, theo
// thuc te la nguon dang tin cay hon) - chi khi khong co/khong khop moi
// fallback sang Single Select "Tinh/Thanh pho" (hay bi bo trong hoac chon
// sai trong du lieu thuc te).
export function matchBranch(diaChi, tinhThanh) {
  const t = normalizeVN(diaChi);
  if (t) {
    for (const branch of BRANCHES) {
      if (branch.provinces.some((p) => containsPhrase(t, p))) return branch;
    }
  }

  const tt = normalizeVN(tinhThanh);
  if (tt) {
    const code = PROVINCE_BRANCH_MAP[tt];
    if (code) return BRANCHES.find((b) => b.code === code) || null;
  }

  return null;
}

const ONE_TO_ONE_RE = /(1\s*(kem|k|x)?\s*1|mot\s*kem\s*mot|one[\s-]?to[\s-]?one)/;
const ONLINE_RE = /\bonline\b|truc tuyen/;
const OFFLINE_RE = /\boffline\b|truc tiep/;
const KID_RE = /\b(kid|kids|be|tre em|thieu nhi)\b/;

function byCode(code) {
  return GROUPS.find((g) => g.code === code) || null;
}

export function matchGroup(quanTam) {
  const t = normalizeVN(quanTam);
  if (!t) return null;

  const isSchool = containsPhrase(t, 'truong hoc') || t.includes('cung cap giao vien');
  const isCenter = containsPhrase(t, 'trung tam');
  const isEnterprise = t.includes('doanh nghiep');
  const isOneToOne = ONE_TO_ONE_RE.test(t);
  const isOnline = ONLINE_RE.test(t);
  const isOffline = OFFLINE_RE.test(t);
  const isKid = KID_RE.test(t);
  const isTaiNha = containsPhrase(t, 'tai nha');

  if (isSchool) return byCode('TRUONG_HOC');
  if (isCenter) return byCode('TTAN');
  if (isOneToOne && isOnline) return byCode('OTO_ONLINE');
  if (isOneToOne && isOffline) return byCode('OTO_OFFLINE');
  if (isEnterprise) return byCode('DOANH_NGHIEP');
  if (isKid && isOnline) return byCode('KIDS_ONL');
  if (isKid && isTaiNha) return byCode('KIDS_OFF');
  return null;
}

// Tim STT lon nhat da dung cho prefix "<maNhom>-<maChiNhanh>" trong danh
// sach Ma KH hien co, roi tra ve STT tiep theo (chua bao gio dung thi tra ve 1).
export function nextStt(existingMaKHList, prefix) {
  let max = 0;
  const re = new RegExp(`^${escapeRegExp(prefix)}(\\d{4,})$`);
  for (const code of existingMaKHList || []) {
    if (!code) continue;
    const m = String(code).trim().match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

export function buildMaKH(group, branch, existingMaKHList) {
  const prefix = `${group.maNhom}-${branch.maChiNhanh}`;
  const stt = nextStt(existingMaKHList, prefix);
  return `${prefix}${String(stt).padStart(4, '0')}`;
}

// Dung trong action "Run script" cua Automation: CHI phan loai chi nhanh +
// nhom KH tu 2 truong dau vao, khong dong cham toi toan bang (viec sinh
// Ma KH/STT va gan nguoi phu trach duoc lam bang cac action co san cua
// Lark - xem README).
export function classifyLead({ diaChi, quanTam, tinhThanh }) {
  const branch = matchBranch(diaChi, tinhThanh);
  const group = matchGroup(quanTam);
  const matched = Boolean(branch && group);

  return {
    matched,
    chiNhanhCode: branch ? branch.code : '',
    chiNhanhLabel: branch ? branch.label : '',
    maChiNhanh: branch ? branch.maChiNhanh : '',
    nhomKHCode: group ? group.code : '',
    nhomKHLabel: group ? group.label : '',
    maNhom: group ? group.maNhom : '',
    prefix: branch && group ? `${group.maNhom}-${branch.maChiNhanh}` : '',
    reason: matched
      ? ''
      : !branch && !group
      ? 'Khong xac dinh duoc chi nhanh va nhom KH'
      : !branch
      ? 'Khong xac dinh duoc chi nhanh tu dia chi'
      : 'Khong xac dinh duoc nhom KH tu noi dung quan tam/mo ta',
  };
}

// Ham tien ich dung khi test/seed local: phan loai day du + sinh Ma KH
// tu danh sach Ma KH hien co truyen vao.
export function routeLead({ diaChi, quanTam, tinhThanh }, existingMaKHList = []) {
  const branch = matchBranch(diaChi, tinhThanh);
  const group = matchGroup(quanTam);

  if (!branch || !group) {
    return {
      matched: false,
      branch,
      group,
      reason: !branch && !group
        ? 'Khong xac dinh duoc chi nhanh va nhom KH'
        : !branch
        ? 'Khong xac dinh duoc chi nhanh tu dia chi'
        : 'Khong xac dinh duoc nhom KH tu noi dung quan tam/mo ta',
    };
  }

  return {
    matched: true,
    maKH: buildMaKH(group, branch, existingMaKHList),
    chiNhanh: branch.label,
    nhomKH: group.label,
    nguoiPhuTrach: branch.phuTrach,
    nguoiLienQuan: branch.lienQuan,
  };
}
