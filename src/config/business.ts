export const businessConfig = {
  name: "Umugano Bar & Guest House",
  legalName: "UMUGANO BAR & GUEST HOUSE",
  shortName: "Umugano",
  slogan: "Murakaza Neza - Quality Hospitality",
  location: "Byumba, Rwanda",
  currency: {
    code: "RWF",
    locale: "en-RW",
  },
  receipt: {
    phone: "+250 78X XXX XXX",
    tin: "1XXXXXXXX",
    momoMerchantCode: "1XXXXXXXX",
    momoPhone: "+250 78X XXX XXX",
    footer: "Thank you for choosing Umugano",
  },
} as const;

export function formatRWF(amount: number): string {
  const formattedAmount = new Intl.NumberFormat(businessConfig.currency.locale, {
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formattedAmount} ${businessConfig.currency.code}`;
}
