import { All, Body, Controller, Header, Headers, HttpCode, Post, Query } from "@nestjs/common";
import { Public } from "../auth/auth.guard";
import { PhoneService } from "./phone.service";

// Callbacks from the telephony providers. Public because they have no session;
// each request carries the per-call token issued when the call was placed.
@Public()
@Controller("telephony")
export class TelephonyController {
  constructor(private phone: PhoneService) {}

  @Post("twilio/status")
  @HttpCode(204)
  async twilioStatus(
    @Query("callId") callId: string,
    @Query("token") token: string,
    @Body() body: { CallStatus?: string },
  ) {
    await this.phone.statusChanged("twilio", callId ?? "", token ?? "", body?.CallStatus ?? "");
  }

  // Twilio fetches this when the person a call is being transferred to
  // answers, and reads it to them before connecting the caller.
  @Post("twilio/whisper")
  @HttpCode(200)
  @Header("Content-Type", "application/xml; charset=utf-8")
  twilioWhisper(@Query("callId") callId: string, @Query("token") token: string) {
    return this.phone.whisper(callId ?? "", token ?? "");
  }

  @Post("exotel/status")
  @HttpCode(204)
  async exotelStatus(@Query("callId") callId: string, @Query("token") token: string) {
    await this.phone.statusChanged("exotel", callId ?? "", token ?? "", "");
  }

  // The address an Exotel app's Voicebot step is pointed at. Exotel calls it
  // when a call is answered and connects the audio to the URL returned.
  @All("exotel/stream")
  @HttpCode(200)
  exotelStream(@Query("CallSid") callSid: string) {
    return this.phone.exotelStreamUrl(callSid ?? "");
  }

  // Vobiz asks this when a call is answered, and connects the call's audio to
  // the stream named in the XML it gets back.
  @All("vobiz/answer")
  @HttpCode(200)
  @Header("Content-Type", "application/xml; charset=utf-8")
  vobizAnswer(
    @Query("callId") callId: string,
    @Query("token") token: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.phone.vobizAnswer(callId ?? "", token ?? "", headers);
  }

  // Vobiz posts here once when a call ends, however it ended.
  @Post("vobiz/status")
  @HttpCode(204)
  async vobizStatus(
    @Query("callId") callId: string,
    @Query("token") token: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await this.phone.vobizEnded(callId ?? "", token ?? "", body ?? {}, headers);
  }
}
