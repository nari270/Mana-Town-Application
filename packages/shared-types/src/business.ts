export type BusinessCategory = {
  id: string;
  nameEnglish: string;
  nameTelugu: string;
  slug: string;
};

export type BusinessListItem = {
  id: string;
  name: string;
  description: string;
  address: string;
  locality: string;
  phone: string | null;
  whatsapp: string | null;
  categories: BusinessCategory[];
  hours: {
    weekday: number;
    opensAt: string | null;
    closesAt: string | null;
    closed: boolean;
  }[];
};
