export type Meal = "lunch" | "dinner";

export type SelectedSlot = {
  date: string;
  meal: Meal;
};

export type DayInfo = {
  date: string;
  month: number;
  day: number;
  weekdayIndex: number;
  weekdayName: string;
  shortLabel: string;
  isWeekend: boolean;
};

export type WeekInfo = {
  index: number;
  title: string;
  days: DayInfo[];
};

export type MySubmission = {
  displayName: string;
  slots: SelectedSlot[];
};

export type StatsSlot = SelectedSlot & {
  availableCount: number;
  participantNames: string[];
};

export type StatsResponse = {
  totalSubmissions: number;
  slots: StatsSlot[];
};

export type SubmitPayload = {
  participantToken: string;
  displayName: string;
  slots: SelectedSlot[];
};

export type AppApi = {
  getMySubmission: (participantToken: string) => Promise<MySubmission | null>;
  findSubmissionByName: (displayName: string) => Promise<MySubmission | null>;
  submitAvailability: (payload: SubmitPayload) => Promise<void>;
  getStats: () => Promise<StatsResponse>;
};
