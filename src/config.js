// app_token cua Base va table_id cua bang Lead, lay tu URL Base:
// https://eiveducation.sg.larksuite.com/base/<APP_TOKEN>?table=<TABLE_ID>&view=...
export const LARK_BASE_APP_TOKEN = process.env.LARK_BASE_APP_TOKEN || 'FfIXb8Tf2aEyX3seWEllZof9gtc';
export const LARK_LEAD_TABLE_ID = process.env.LARK_LEAD_TABLE_ID || 'tblckO9AXEQ4pLvP';

// chat_id cua nhom Lark se nhan thong bao lead moi / lead can xem thu cong.
// Lay bang cach them bot vao nhom roi goi GET /open-apis/im/v1/chats (xem
// scripts/list-chats.mjs), hoac xem README. Co the override bang bien moi
// truong LARK_NOTIFY_CHAT_ID (vi du khi doi sang nhom khac).
export const NOTIFY_CHAT_ID = process.env.LARK_NOTIFY_CHAT_ID || 'oc_22558fe11452f8afc13a6b33a41af823';

// Ten cot (field) trong bang Lead cua Lark Base - da doi chieu voi field
// that qua scripts/inspect-base.mjs (co the override tung field bang bien
// moi truong cung ten, vi du FIELD_DIA_CHI).
export const FIELD_NAMES = {
  diaChi: process.env.FIELD_DIA_CHI || 'Địa chỉ',
  tinhThanh: process.env.FIELD_TINH_THANH || 'Tỉnh/Thành phố',
  quanTam: process.env.FIELD_QUAN_TAM || 'Mô tả',
  nhomKH: process.env.FIELD_NHOM_KH || 'Nhóm KH',
  chiNhanh: process.env.FIELD_CHI_NHANH || 'CHI NHÁNH',
  nguoiPhuTrach: process.env.FIELD_NGUOI_PHU_TRACH || 'Người phụ trách',
  nguoiLienQuan: process.env.FIELD_NGUOI_LIEN_QUAN || 'Người Liên Quan',
  maKH: process.env.FIELD_MA_KH || 'Mã KH',
};

export const PENDING_GROUP_LABEL = process.env.PENDING_GROUP_LABEL || 'CHỜ PHÂN LOẠI';

// "Nhóm KH" trong bang Lead la field Link (type=18) tro toi bang rieng
// (lay qua scripts/inspect-base.mjs), cot hien thi ten la "Văn bản". Ghi
// gia tri cho field nay phai dung record_id cua bang lien ket, khong phai
// text (xem src/larkApi.js + scripts/poll-and-route.mjs).
export const NHOM_KH_LINK_TABLE_ID = process.env.LARK_NHOM_KH_TABLE_ID || 'tblSvgMsElhtbGol';
export const NHOM_KH_PRIMARY_FIELD = process.env.NHOM_KH_PRIMARY_FIELD || 'Văn bản';

// Tra chi nhanh truc tiep tu gia tri (da chuan hoa, khong dau, viet
// thuong) cua Single Select "Tỉnh/Thành phố" - dang tin cay hon nhieu so
// voi parse text tu do o "Địa chỉ". Danh sach nay lay day du 51 option
// thuc te cua field (qua inspect-base.mjs); "N/a" va "Đài Loan" co tinh
// chinh de lai khong khop (can xem thu cong).
export const PROVINCE_BRANCH_MAP = {
  'da nang': 'EIV_DN',
  'quang nam': 'EIV_DN',
  'quang ngai': 'EIV_DN',
  'quang tri': 'EIV_DN',
  'quang binh': 'EIV_DN',
  'khanh hoa': 'EIV_DN',
  'binh dinh': 'EIV_DN',
  'binh thuan': 'EIV_DN',
  'ninh thuan': 'EIV_DN',
  'dak lak': 'EIV_DN',
  'dak nong': 'EIV_DN',
  'lam dong': 'EIV_DN',
  'thanh hoa': 'EIV_DN',
  'nghe an': 'EIV_DN',
  'ha tinh': 'EIV_DN',
  'gia lai': 'EIV_DN',

  'ho chi minh': 'EIV_HCM',
  'ben tre': 'EIV_HCM',
  'long an': 'EIV_HCM',
  'dong nai': 'EIV_HCM',
  'kien giang': 'EIV_HCM',
  'an giang': 'EIV_HCM',
  'binh phuoc': 'EIV_HCM',
  'ba ria-vung tau': 'EIV_HCM',
  'can tho': 'EIV_HCM',
  'tay ninh': 'EIV_HCM',
  'vinh long': 'EIV_HCM',
  'ca mau': 'EIV_HCM',
  'soc trang': 'EIV_HCM',
  'tien giang': 'EIV_HCM',
  'binh duong': 'EIV_HCM',
  'long xuyen': 'EIV_HCM',

  'ha noi': 'EIV_HN',
  'nam dinh': 'EIV_HN',
  'bac giang': 'EIV_HN',
  'hai phong': 'EIV_HN',
  'phu tho': 'EIV_HN',
  'thai binh': 'EIV_HN',
  'lao cai': 'EIV_HN',
  'son la': 'EIV_HN',
  'lai chau': 'EIV_HN',
  'hung yen': 'EIV_HN',
  'hai duong': 'EIV_HN',
  'quang ninh': 'EIV_HN',
  'thai nguyen': 'EIV_HN',
  'ninh binh': 'EIV_HN',
  'vinh phuc': 'EIV_HN',
  'ha nam': 'EIV_HN',
  'bac ninh': 'EIV_HN',
  'cao bang': 'EIV_HN',
  'ha long': 'EIV_HN',
};

// Danh sach tinh/thanh (da bo dau, viet thuong) de nhan dien dia chi.
// Co the chinh sua/bo sung cho phu hop voi cach nhap dia chi thuc te.
export const BRANCHES = [
  {
    code: 'EIV_DN',
    label: 'EIV ĐN',
    maChiNhanh: '43',
    provinces: [
      'da nang',
      'quang nam',
      'quang ngai',
      'quang tri',
      'quang binh',
      'thua thien hue',
      'tp hue',
      'thanh pho hue',
      'binh dinh',
      'phu yen',
      'khanh hoa',
      'ninh thuan',
      'binh thuan',
      'kon tum',
      'gia lai',
      'dak lak',
      'daklak',
      'dak nong',
      'lam dong',
      'thanh hoa',
      'nghe an',
      'ha tinh',
    ],
    // email dung de tra ra open_id that qua Lark Contact API luc chay
    // (xem src/larkApi.js resolveOpenIdsByEmail). DIEN DUNG EMAIL LARK
    // cua tung nguoi truoc khi chay that.
    phuTrach: [{ email: 'linhlht@eiv.edu.vn', name: 'Lý Hoàng Thục Linh' }],
    lienQuan: [{ email: 'linhlht@eiv.edu.vn', name: 'Lý Hoàng Thục Linh' }],
  },
  {
    code: 'EIV_HCM',
    label: 'EIV HCM',
    maChiNhanh: '59',
    provinces: [
      'ho chi minh',
      'tp hcm',
      'tphcm',
      'hcm',
      'sai gon',
      'binh duong',
      'dong nai',
      'ba ria vung tau',
      'vung tau',
      'long an',
      'tay ninh',
      'tien giang',
      'ben tre',
      'vinh long',
      'tra vinh',
      'dong thap',
      'an giang',
      'kien giang',
      'can tho',
      'hau giang',
      'soc trang',
      'bac lieu',
      'ca mau',
    ],
    phuTrach: [
      { email: 'lead.hcm@eiv.edu.vn', name: 'Nguyễn Tuấn Khôi-Lead HCM' },
      { email: 'customerservice.hcm@eiv.edu.vn', name: 'Phan Thị Thùy Linh-SALE HCM' },
    ],
    lienQuan: [{ email: 'lead.hcm@eiv.edu.vn', name: 'Nguyễn Tuấn Khôi-Lead HCM' }],
  },
  {
    code: 'EIV_HN',
    label: 'EIV HN',
    maChiNhanh: '29',
    provinces: [
      'ha noi',
      'hai phong',
      'quang ninh',
      'bac ninh',
      'bac giang',
      'hai duong',
      'hung yen',
      'vinh phuc',
      'thai nguyen',
      'thai binh',
      'nam dinh',
      'ninh binh',
      'ha nam',
      'phu tho',
      'tuyen quang',
      'lao cai',
      'yen bai',
      'dien bien',
      'lai chau',
      'son la',
      'hoa binh',
      'cao bang',
      'bac kan',
      'lang son',
      'ha giang',
    ],
    phuTrach: [{ email: 'salehn3@eiv.edu.vn', name: 'Hoàng Hải Yến-Sale HN' }],
    lienQuan: [
      { email: 'salehn@eiv.edu.vn', name: 'Trịnh Thu Quỳnh-Lead KD HN' },
      { email: 'giangtt@eiv.edu.vn', name: 'Trần Thùy Giang' },
    ],
  },
];

// Thu tu uu tien khi phan loai Nhom KH tu noi dung "Quan tam"/mo ta.
// `label` phai khop CHINH XAC voi gia tri "Văn bản" cua tung dong trong
// bang lien ket cua field "Nhóm KH" (da doi chieu qua inspect-base.mjs).
export const GROUPS = [
  { code: 'TRUONG_HOC', label: 'TRƯỜNG HỌC', maNhom: 'TH' },
  { code: 'TTAN', label: 'TTAN', maNhom: 'TT' },
  { code: 'OTO_ONLINE', label: 'OTO-ONLINE', maNhom: 'OTO-ONL' },
  { code: 'OTO_OFFLINE', label: 'OTO-OFFLINE', maNhom: 'OTO-OFF' },
  { code: 'DOANH_NGHIEP', label: 'DOANH NGHIỆP', maNhom: 'DN' },
  { code: 'KIDS_ONL', label: 'KIDS-ONL', maNhom: 'KIDS-ONL' },
  { code: 'KIDS_OFF', label: 'KIDS-OFF', maNhom: 'KIDS-OFF' },
];
