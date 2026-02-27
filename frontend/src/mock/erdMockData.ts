export const DOMAIN_COLORS: Record<string, string> = {
  R: '#bbdefb',
  ST_TR: '#ffccbc',
  SYS: '#c8e6c9',
  MAIL: '#ffe0b2',
  AUTH: '#e1bee7',
  PRJ: '#b2ebf2',
  CFG: '#f0f4c3',
  MD: '#f5f5f5',
  ERD: '#d1c4e9',
  ETC: '#eeeeee',
  // inferDomain 반환값
  ORDER:    '#fff9c4',
  USER:     '#c5cae9',
  PRODUCT:  '#dcedc8',
  PAYMENT:  '#fce4ec',
  SHIPPING: '#e0f2f1',
  SYSTEM:   '#c8e6c9',
  CODE:     '#f3e5f5',
}

export const INITIAL_POSITIONS: Record<string, { x: number; y: number }> = {
  r_indicatorgroup:  { x: 100,  y: 80   },
  r_indicatorinfo:   { x: 100,  y: 430  },
  r_indicatordata:   { x: -240, y: 780  },
  sys_codegroupinfo: { x: 700,  y: 80   },
  sys_code:          { x: 700,  y: 430  },
  st_tr_sales:       { x: 100,  y: 780  },
  st_tr_target:      { x: 460,  y: 780  },
  mail_sendhistory:  { x: 100,  y: 1080 },
}
