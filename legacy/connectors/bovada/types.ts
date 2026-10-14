export type BovadaPrice = {
  id?: string;
  american?: string;
  decimal?: string;
  fractional?: string;
  handicap?: string;
};

export type BovadaOutcome = {
  id?: string;
  description?: string;
  status?: string;
  type?: string;
  competitorId?: string;
  price?: BovadaPrice;
};

export type BovadaMarket = {
  id?: string;
  description?: string;
  descriptionKey?: string;
  key?: string;
  marketTypeId?: string;
  status?: string;
  notes?: string;
  period?: { id?: string; description?: string; abbreviation?: string; live?: boolean; main?: boolean };
  outcomes?: BovadaOutcome[];
};

export type BovadaEvent = {
  id?: string;
  description?: string;
  type?: string;
  link?: string;
  status?: string;
  sport?: string;
  startTime?: number;
  live?: boolean;
  competitionId?: string;
  lastModified?: number;
  competitors?: Array<{ id?: string; name?: string; shortName?: string; home?: boolean }>;
  displayGroups?: Array<{ id?: string; description?: string; alternateType?: boolean; markets?: BovadaMarket[] }>;
};

export type BovadaCouponItem = {
  path?: Array<{ id?: string; link?: string; description?: string; type?: string; sportCode?: string }>;
  events?: BovadaEvent[];
};

