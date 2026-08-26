export type A11yStatus = 'pass' | 'fail' | 'warning';

export interface A11yCheck {
  checkName: string;
  status: A11yStatus;
  element: string;
  recommendation: string;
}
