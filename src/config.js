// Ten cot (field) trong bang Lead cua Lark Base.
// QUAN TRONG: sua lai cho dung ten cot thuc te trong Base truoc khi dung.
export const FIELD_NAMES = {
  diaChi: 'Địa chỉ',
  quanTam: 'Quan tâm',
  nhomKH: 'Nhóm KH',
  chiNhanh: 'Chi nhánh',
  nguoiPhuTrach: 'Người phụ trách',
  nguoiLienQuan: 'Người liên quan',
  maKH: 'Mã KH',
};

export const PENDING_GROUP_LABEL = 'CHỜ PHÂN LOẠI';

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
    // Nguoi phu trach / nguoi lien quan mac dinh chon truc tiep qua
    // people-picker cua Lark khi cau hinh action "Update record", khong
    // can dung id ben duoi. Id chi de tham khao / dung cho phuong an
    // goi API ngoai (xem README).
    phuTrach: [{ id: '42g8fg61', name: 'Phạm Thị Hồng Vân-CM ĐN' }],
    lienQuan: [{ id: '1b57762b', name: 'Lý Hoàng Thục Linh' }],
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
    // TODO: dien id Lark that (open_id) neu dung phuong an goi API ngoai.
    phuTrach: [
      { id: 'TODO_ID_NGUYEN_TUAN_KHOI', name: 'Nguyễn Tuấn Khôi' },
      { id: 'TODO_ID_PHAN_THI_THUY_LINH', name: 'Phan Thị Thùy Linh' },
    ],
    lienQuan: [{ id: 'TODO_ID_NGUYEN_TUAN_KHOI', name: 'Nguyễn Tuấn Khôi' }],
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
    phuTrach: [{ id: '62dfgc39', name: 'Hoàng Hải Yến-Sale HN' }],
    // TODO: dien id Lark that (open_id) neu dung phuong an goi API ngoai.
    lienQuan: [
      { id: 'TODO_ID_TRINH_THU_QUYNH', name: 'Trịnh Thu Quỳnh' },
      { id: 'TODO_ID_TRAN_THUY_GIANG', name: 'Trần Thùy Giang' },
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
