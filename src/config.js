// app_token cua Base va table_id cua bang Lead, lay tu URL Base:
// https://eiveducation.sg.larksuite.com/base/<APP_TOKEN>?table=<TABLE_ID>&view=...
export const LARK_BASE_APP_TOKEN = process.env.LARK_BASE_APP_TOKEN || 'FfIXb8Tf2aEyX3seWEllZof9gtc';
export const LARK_LEAD_TABLE_ID = process.env.LARK_LEAD_TABLE_ID || 'tblckO9AXEQ4pLvP';

// chat_id cua nhom Lark se nhan thong bao lead moi / lead can xem thu cong.
// Lay bang cach them bot vao nhom roi goi GET /open-apis/im/v1/chats (xem
// scripts/list-chats.mjs), hoac xem README. Co the override bang bien moi
// truong LARK_NOTIFY_CHAT_ID (vi du khi doi sang nhom khac).
export const NOTIFY_CHAT_ID = process.env.LARK_NOTIFY_CHAT_ID || 'oc_22558fe11452f8afc13a6b33a41af823';

// Ten cot (field) trong bang Lead cua Lark Base.
// QUAN TRONG: sua lai cho dung ten cot thuc te trong Base truoc khi dung
// (co the override tung field bang bien moi truong cung ten, vi du FIELD_DIA_CHI).
export const FIELD_NAMES = {
  diaChi: process.env.FIELD_DIA_CHI || 'Địa chỉ',
  quanTam: process.env.FIELD_QUAN_TAM || 'Quan tâm',
  nhomKH: process.env.FIELD_NHOM_KH || 'Nhóm KH',
  chiNhanh: process.env.FIELD_CHI_NHANH || 'Chi nhánh',
  nguoiPhuTrach: process.env.FIELD_NGUOI_PHU_TRACH || 'Người phụ trách',
  nguoiLienQuan: process.env.FIELD_NGUOI_LIEN_QUAN || 'Người liên quan',
  maKH: process.env.FIELD_MA_KH || 'Mã KH',
  // Field Text dung de bot ghi ly do khi khong phan loai duoc, kiem tra
  // truoc khi gui lai thong bao tranh spam nhieu lan cho cung 1 lead.
  ghiChuBot: process.env.FIELD_GHI_CHU_BOT || 'Ghi chú phân loại (bot)',
};

export const PENDING_GROUP_LABEL = process.env.PENDING_GROUP_LABEL || 'CHỜ PHÂN LOẠI';

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
    phuTrach: [{ email: 'customerservicedn@eiv.edu.vn', name: 'Phạm Thị Hồng Vân-CM ĐN' }],
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
// `label` phai khop CHINH XAC voi option da co trong truong Single Select
// "Nhom KH" cua Base (kiem tra lai truoc khi dung).
export const GROUPS = [
  { code: 'TRUONG_HOC', label: 'TRUONG HOC', maNhom: 'TH' },
  { code: 'TTAN', label: 'TTAN', maNhom: 'TT' },
  { code: 'OTO_ONLINE', label: 'OTO-ONLINE', maNhom: 'OTO-ONL' },
  { code: 'OTO_OFFLINE', label: 'OTO-OFFLINE', maNhom: 'OTO-OFF' },
  { code: 'DOANH_NGHIEP', label: 'DOANH NGHIEP', maNhom: 'DN' },
  { code: 'KIDS_ONL', label: 'KIDS-ONL', maNhom: 'KIDS-ONL' },
  { code: 'KIDS_OFF', label: 'KIDS-OFF', maNhom: 'KIDS-OFF' },
];
