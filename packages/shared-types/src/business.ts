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
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  images: {
    id: string;
    imageUrl: string;
    altText: string;
  }[];
  categories: BusinessCategory[];
  hours: {
    weekday: number;
    opensAt: string | null;
    closesAt: string | null;
    closed: boolean;
  }[];
};
