import { getCpayConfig } from "./config.js";

/**
 * cPay ReceiveEncodedMessage wrapper.
 * Live encryption can be completed when bank RSA keys are configured.
 */
export async function cpayRequest(operationType, innerPayload) {
  const cpay = getCpayConfig();
  if (!cpay.isLive) {
    return { mock: true, operationType, payload: innerPayload };
  }
  if (!cpay.isConfigured) {
    throw new Error("cPay live mode requires merchant credentials in environment variables.");
  }

  throw new Error(
    "cPay live encryption is stubbed. Add CPAY keys to .env and implement ReceiveEncodedMessage in api/lib/cpay/crypto.js."
  );
}

export async function initiatePayment(order, browserData) {
  const cpay = getCpayConfig();
  const inner = {
    SecurityToken: { Password: process.env.CPAY_MERCHANT_PASSWORD },
    CardData: {
      CardHolderName: `${order.first_name} ${order.last_name}`.slice(0, 64),
    },
    TransactionData: {
      Amount: order.total_amount_cpay,
      AmountCurrency: "MKD",
      Details1: order.details1,
      Details2: order.details2,
      FirstName: order.first_name,
      LastName: order.last_name,
      Telephone: order.telephone,
      Email: order.email,
      Zip: order.zip,
      Address: order.address,
      City: order.city,
      Country: order.country_code,
      TransactionType: "Normal",
    },
    MerchantData: {
      MerchantName: cpay.merchantName,
      MerchantTIN: cpay.merchantTin,
    },
    BrowserData: browserData,
  };

  return cpayRequest("InitiatePayment", inner);
}

export async function executePayment(paymentId) {
  return cpayRequest("ExecutePayment", {
    SecurityToken: { Password: process.env.CPAY_MERCHANT_PASSWORD },
    PaymentID: paymentId,
  });
}

export async function checkStatus({ paymentId, details2, cpayRefId }) {
  return cpayRequest("CheckStatus", {
    SecurityToken: { Password: process.env.CPAY_MERCHANT_PASSWORD },
    PaymentID: paymentId || undefined,
    ExternalPaymentID: details2 || undefined,
    cPayRefID: cpayRefId || undefined,
  });
}
