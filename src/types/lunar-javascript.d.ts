declare module "lunar-javascript" {
  export const Solar: {
    fromDate(date: Date): {
      getLunar(): unknown;
    };
    fromYmd(year: number, month: number, day: number): {
      getLunar(): unknown;
    };
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): {
      getLunar(): unknown;
    };
  };

  export const Lunar: {
    fromDate(date: Date): unknown;
    fromYmd(year: number, month: number, day: number): unknown;
  };
}
