const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsApp(contentSid, contentVariables, prefisso, telefono) {
  console.log("Inizio chiamata Twilio client");

  const to = process.env.NODE_ENV === "production"
    ? `${prefisso}${telefono}`
    : process.env.CELLULARE_TEST;

  console.log("Invio messaggio WhatsApp a:", to);

  try {

    // 🚨 SIMULAZIONE ERRORE
  //  throw new Error("Finiti i soldi di twillo");

    const response = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      contentSid,
      contentVariables,
    });
    console.log("fine chiamata Twilio client con risposta:");

    console.log({
      sid: response.sid,
      status: response.status,
      to: response.to,
      from: response.from,
      body: response.body,
      dateCreated: response.dateCreated,
      dateSent: response.dateSent,
      dateUpdated: response.dateUpdated,
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
      messagingServiceSid: response.messagingServiceSid,
      price: response.price,
      priceUnit: response.priceUnit,
      numSegments: response.numSegments,
      direction: response.direction,
      apiVersion: response.apiVersion,
      uri: response.uri
    });
    console.log("Twilio client risposto correttamente con sid: ", response.sid);

    return response;

  } catch (err) {
    console.error("Errore invio WhatsApp:", err);
    console.log(err.message);
    throw err;
  }
}

module.exports = {
  sendWhatsApp
};
