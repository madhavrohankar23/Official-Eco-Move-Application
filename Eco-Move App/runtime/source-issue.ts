import {generateTicketId,saveIssuedTicket} from '@/lib/ticketing';
import {saveUserTicket as persistTicket} from '@/services/ticketService';
import {recordTripCo2Savings as persistSavings} from '@/services/ecoRewardsService';
import {sendTicketConfirmationEmail as deliverEmail} from '@/services/emailService';
export async function issueFromSource(input:any,auth:any){
const writes:Promise<any>[]=[];const saveUserTicket=(...args:any[])=>{const p=persistTicket(...args);writes.push(p);return p};const recordTripCo2Savings=(...args:any[])=>{const p=persistSavings(...args);writes.push(p);return p};
const {selectedCategory,legs,fareSummary,passengers,paymentMethod,txnRef,emailDelivery}=input;
const {user,profile}=auth;const userId=user.id;const totalPassengerCount=passengers.adult+passengers.student+passengers.senior;
let issued:any;const setIssuedTicket=(t:any)=>{issued=t};const setIsPaymentOpen=()=>{};const onTicketPurchased=undefined;
const sendTicketConfirmationEmail=(params:any)=>emailDelivery?deliverEmail(params):Promise.resolve({success:false,message:'Email not requested'});
const handlePaymentSuccess=(paymentMethod: any, txnRef: string) => {
    const now = new Date();
    // Metro tickets and Eco passes valid 24 Hours, Single Bus tickets valid 2 Hours
    const validityHours = selectedCategory === "standard_bus" && legs.length === 1 ? 2 : 24;
    const expiry = new Date(now.getTime() + validityHours * 60 * 60 * 1000);

    const firstLeg = legs[0]!;
    const lastLeg = legs[legs.length - 1]!;
    const sourceName = firstLeg.from;
    const destinationName = lastLeg.to;

    let routeDescription = "";
    if (legs.length === 1) {
      routeDescription =
        firstLeg.mode === "metro"
          ? `Maha Metro (${firstLeg.lineOrRoute})`
          : `Aapli Bus (Route ${firstLeg.lineOrRoute})`;
    } else {
      routeDescription = legs
        .map((l) => (l.mode === "metro" ? `Metro ${l.lineOrRoute}` : `Bus ${l.lineOrRoute}`))
        .join(" ➔ ");
    }

    const updatedLegsWithFares: TransitLegItem[] = legs.map((l, i) => ({
      ...l,
      fare: fareSummary.legFares[i] ?? l.fare,
    }));

    const ticket: IssuedTicket = {
      id: generateTicketId(),
      category: selectedCategory,
      mode: legs.some((l) => l.mode === "metro") && legs.some((l) => l.mode === "bus") ? "combo" : legs[0]?.mode || "combo",
      title:
        selectedCategory === "exclusive_eco"
          ? "Eco-Move Exclusive Pass"
          : legs[0]?.mode === "metro"
          ? "Maha Metro Smart Ticket"
          : "Aapli Bus Digital Ticket",
      source: sourceName,
      destination: destinationName,
      viaInterchange: legs.length > 1 ? "Sitabuldi Interchange" : undefined,
      lineOrRouteName: routeDescription,
      legs: updatedLegsWithFares,
      currentLegIndex: 0,
      currentLegStep: "not_started",
      bookingTime: now.toISOString(),
      validUntil: expiry.toISOString(),
      passengers: { ...passengers },
      totalPassengers: totalPassengerCount,
      standardBaseFare: fareSummary.standardTotal,
      discountAmount: fareSummary.totalDiscountAmount,
      discountPercent: selectedCategory === "exclusive_eco" ? 12 : 0,
      finalFare: fareSummary.finalTotalFare,
      co2SavedKg: fareSummary.co2SavedKg,
      greenPointsEarned: fareSummary.greenPointsEarned,
      paymentMethod,
      transactionRef: txnRef,
      qrPayload: `ECO_NAGPUR_PASS:${Date.now()}:${sourceName}->${destinationName}`,
      status: "active",
      gateScans: [],
    };

    saveIssuedTicket(ticket);
    void saveUserTicket(userId, ticket);

    if (ticket.co2SavedKg && ticket.co2SavedKg > 0) {
      void recordTripCo2Savings(userId, ticket.co2SavedKg);
    }

    // Automatically send confirmation email to user's registered email
    const registeredEmail = user?.email || profile?.email;
    const userName = profile?.fullName || (user?.user_metadata?.["full_name"] as string) || "Nagpur Commuter";
    if (registeredEmail) {
      void sendTicketConfirmationEmail({
        recipientEmail: registeredEmail,
        userName,
        ticket,
      });
    }

    setIssuedTicket(ticket);
    setIsPaymentOpen(false);
    if (onTicketPurchased) {
      onTicketPurchased(ticket);
    }
  };
handlePaymentSuccess(paymentMethod,txnRef);await Promise.all(writes);return issued;
}
