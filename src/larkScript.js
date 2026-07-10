// ============================================================================
// COPY TOAN BO NOI DUNG FILE NAY VAO action "Chay tap lenh" (Run script)
// trong luong Automation cua bang Lead tren Lark Base.
//
// File nay KHONG dung import/export (sandbox script cua Lark khong ho tro
// module) - toan bo logic duoc viet gon lai trong 1 file, dong bo voi
// src/routing.js + src/config.js (neu sua luat phan luong thi sua o CA HAI
// noi, hoac chi sua o day roi copy lai vao src/routing.js).
//
// INPUT (cau hinh trong UI khi tao action, dat dung 2 ten bien nay va gan
// gia tri tu truong cua ban ghi vua duoc tao/trigger):
//   params.diaChi   <- gia tri truong "Dia chi"
//   params.quanTam  <- gia tri truong "Quan tam" / mo ta nhu cau
//
// OUTPUT (Lark se tu doc cac field nay de dung lam bien cho cac action
// phia sau trong cung luong automation, vi du de re nhanh If/Else hoac
// dien vao action "Cap nhat ban ghi"):
//   matched          (boolean) - co xac dinh duoc ca chi nhanh lan nhom KH khong
//   chiNhanhCode     (text)    - 'EIV_DN' | 'EIV_HCM' | 'EIV_HN' | ''
//   chiNhanhLabel    (text)    - 'EIV ĐN' | 'EIV HCM' | 'EIV HN' | ''
//   maChiNhanh       (text)    - '43' | '59' | '29' | ''
//   nhomKHCode       (text)    - vi du 'TTAN'
//   nhomKHLabel      (text)    - nhan hien thi cua Nhom KH, PHAI khop dung
//                                 option da co trong truong Single Select
//                                 "Nhom KH" cua Base
//   maNhom           (text)    - vi du 'TT'
//   prefix           (text)    - vi du 'TT-43', dung de Find record trong
//                                 bang "STT Counters" (xem README)
//   reason           (text)    - ly do khong khop, de gui thong bao cho
//                                 nhan vien phan loai thu cong
//
// Neu sandbox script cua ban yeu cau dinh nghia ham main(params) va return
// ket qua thay vi dung bien params/return o top-level, hay bao toan bo code
// ben duoi vao trong 1 ham nhu vay - phan logic khong doi.
// ============================================================================

function normalizeVN(input) {
  if (!input) return '';
  return String(input)
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text, phrase) {
  var re = new RegExp('(^|[^a-z0-9])' + escapeRegExp(phrase) + '($|[^a-z0-9])');
  return re.test(text);
}

var BRANCHES = [
  {
    code: 'EIV_DN',
    label: 'EIV ĐN',
    maChiNhanh: '43',
    provinces: [
      'da nang', 'quang nam', 'quang ngai', 'quang tri', 'quang binh',
      'thua thien hue', 'tp hue', 'thanh pho hue', 'binh dinh', 'phu yen',
      'khanh hoa', 'ninh thuan', 'binh thuan', 'kon tum', 'gia lai',
      'dak lak', 'daklak', 'dak nong', 'lam dong', 'thanh hoa', 'nghe an',
      'ha tinh',
    ],
  },
  {
    code: 'EIV_HCM',
    label: 'EIV HCM',
    maChiNhanh: '59',
    provinces: [
      'ho chi minh', 'tp hcm', 'tphcm', 'hcm', 'sai gon', 'binh duong',
      'dong nai', 'ba ria vung tau', 'vung tau', 'long an', 'tay ninh',
      'tien giang', 'ben tre', 'vinh long', 'tra vinh', 'dong thap',
      'an giang', 'kien giang', 'can tho', 'hau giang', 'soc trang',
      'bac lieu', 'ca mau',
    ],
  },
  {
    code: 'EIV_HN',
    label: 'EIV HN',
    maChiNhanh: '29',
    provinces: [
      'ha noi', 'hai phong', 'quang ninh', 'bac ninh', 'bac giang',
      'hai duong', 'hung yen', 'vinh phuc', 'thai nguyen', 'thai binh',
      'nam dinh', 'ninh binh', 'ha nam', 'phu tho', 'tuyen quang',
      'lao cai', 'yen bai', 'dien bien', 'lai chau', 'son la', 'hoa binh',
      'cao bang', 'bac kan', 'lang son', 'ha giang',
    ],
  },
];

var GROUPS = [
  { code: 'TRUONG_HOC', label: 'TRUONG HOC', maNhom: 'TH' },
  { code: 'TTAN', label: 'TTAN', maNhom: 'TT' },
  { code: 'OTO_ONLINE', label: 'OTO-ONLINE', maNhom: 'OTO-ONL' },
  { code: 'OTO_OFFLINE', label: 'OTO-OFFLINE', maNhom: 'OTO-OFF' },
  { code: 'DOANH_NGHIEP', label: 'DOANH NGHIEP', maNhom: 'DN' },
  { code: 'KIDS_ONL', label: 'KIDS-ONL', maNhom: 'KIDS-ONL' },
  { code: 'KIDS_OFF', label: 'KIDS-OFF', maNhom: 'KIDS-OFF' },
];

function matchBranch(diaChi) {
  var t = normalizeVN(diaChi);
  if (!t) return null;
  for (var i = 0; i < BRANCHES.length; i++) {
    var branch = BRANCHES[i];
    for (var j = 0; j < branch.provinces.length; j++) {
      if (containsPhrase(t, branch.provinces[j])) return branch;
    }
  }
  return null;
}

var ONE_TO_ONE_RE = /(1\s*(kem|k|x)?\s*1|mot\s*kem\s*mot|one[\s-]?to[\s-]?one)/;
var ONLINE_RE = /\bonline\b|truc tuyen/;
var OFFLINE_RE = /\boffline\b|truc tiep/;
var KID_RE = /\b(kid|kids|be|tre em|thieu nhi)\b/;

function byCode(code) {
  for (var i = 0; i < GROUPS.length; i++) {
    if (GROUPS[i].code === code) return GROUPS[i];
  }
  return null;
}

function matchGroup(quanTam) {
  var t = normalizeVN(quanTam);
  if (!t) return null;

  var isSchool = containsPhrase(t, 'truong hoc') || t.indexOf('cung cap giao vien') !== -1;
  var isCenter = containsPhrase(t, 'trung tam');
  var isEnterprise = t.indexOf('doanh nghiep') !== -1;
  var isOneToOne = ONE_TO_ONE_RE.test(t);
  var isOnline = ONLINE_RE.test(t);
  var isOffline = OFFLINE_RE.test(t);
  var isKid = KID_RE.test(t);
  var isTaiNha = containsPhrase(t, 'tai nha');

  if (isSchool) return byCode('TRUONG_HOC');
  if (isCenter) return byCode('TTAN');
  if (isOneToOne && isOnline) return byCode('OTO_ONLINE');
  if (isOneToOne && isOffline) return byCode('OTO_OFFLINE');
  if (isEnterprise) return byCode('DOANH_NGHIEP');
  if (isKid && isOnline) return byCode('KIDS_ONL');
  if (isKid && isTaiNha) return byCode('KIDS_OFF');
  return null;
}

function classifyLead(diaChi, quanTam) {
  var branch = matchBranch(diaChi);
  var group = matchGroup(quanTam);
  var matched = Boolean(branch && group);

  var reason = '';
  if (!matched) {
    if (!branch && !group) reason = 'Khong xac dinh duoc chi nhanh va nhom KH';
    else if (!branch) reason = 'Khong xac dinh duoc chi nhanh tu dia chi';
    else reason = 'Khong xac dinh duoc nhom KH tu noi dung quan tam/mo ta';
  }

  return {
    matched: matched,
    chiNhanhCode: branch ? branch.code : '',
    chiNhanhLabel: branch ? branch.label : '',
    maChiNhanh: branch ? branch.maChiNhanh : '',
    nhomKHCode: group ? group.code : '',
    nhomKHLabel: group ? group.label : '',
    maNhom: group ? group.maNhom : '',
    prefix: branch && group ? group.maNhom + '-' + branch.maChiNhanh : '',
    reason: reason,
  };
}

// --- Diem vao: chinh lai cho khop voi quy uoc cua script editor ---
var result = classifyLead(params.diaChi, params.quanTam);
return result;
