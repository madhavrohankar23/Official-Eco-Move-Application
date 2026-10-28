export interface CommuterProfileData {
  occupation?: string | undefined;
  commuteDistance?: string | undefined;
  vehicleOwned?: string | undefined;
  vehicleModelYear?: string | undefined;
  transitFrequency?:
    | {
        metro?: string | undefined;
        bus?: string | undefined;
        auto?: string | undefined;
      }
    | undefined;
  frequentHubs?: string[] | undefined;
  dailyTravelTime?: string | undefined;
  commutePriority?: string | undefined;
  monthlyExpense?: string | undefined;
  completedAt?: string | undefined;
  isSkipped?: boolean | undefined;
  syncStatus?: "local" | "cloud" | undefined;
}
