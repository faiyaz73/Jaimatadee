// Shared Paytm CheckoutJS loader + invoker, used by both ticket checkout
// (js/checkout.js) and pass purchase (js/passes.js) - same order shape
// (mid, order_id, txn_token, amount) for both, per the backend's own
// "reuse your existing Paytm code unchanged" guidance.
const paytmScriptPromises = {};
function loadPaytmCheckoutScript(mid) {
  if (paytmScriptPromises[mid]) return paytmScriptPromises[mid];
  paytmScriptPromises[mid] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://secure.paytmpayments.com/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(mid)}.js`;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = () => {
      delete paytmScriptPromises[mid];
      reject(new Error('Could not load the payment gateway. Please try again.'));
    };
    document.head.appendChild(script);
  });
  return paytmScriptPromises[mid];
}

function invokePaytmCheckout(order, onAppClosed, onTxnStatus) {
  return new Promise((resolve, reject) => {
    loadPaytmCheckoutScript(order.mid).then(() => {
      window.Paytm.CheckoutJS.onLoad(() => {
        window.Paytm.CheckoutJS.init({
          flow: 'DEFAULT',
          data: {
            orderId: order.order_id,
            token: order.txn_token,
            tokenType: 'TXN_TOKEN',
            amount: order.amount
          },
          merchant: { mid: order.mid, redirect: false },
          handler: {
            // Mandatory per Paytm CheckoutJS — fires on widget-side events
            // (e.g. APP_CLOSED when the passenger closes the widget without
            // paying). We don't trust it as proof of anything either way —
            // /status polling is still the source of truth — but Paytm
            // requires the callback to be present in the handler object.
            notifyMerchant: (eventName, data) => {
              if (eventName === 'APP_CLOSED' && typeof onAppClosed === 'function') {
                onAppClosed();
              }
            },
            // Fast-path hint only — /status polling stays the source of
            // truth for confirming the booking either way.
            transactionStatus: (paymentStatus) => {
              if (typeof onTxnStatus === 'function') {
                onTxnStatus(paymentStatus);
              }
            }
          }
        }).then(() => {
          window.Paytm.CheckoutJS.invoke();
          resolve();
        }).catch(reject);
      });
    }).catch(reject);
  });
}

// Dismiss the Paytm widget overlay once we know payment finished. Ticket
// checkout never needed this - it navigates to payment-success.html on
// settlement, which tears the widget down along with the page - but pass
// purchase shows its next step (OTP entry) in-page with no navigation, so
// without an explicit close() the Paytm overlay is left stacked on top of
// that step, fully covering it.
function closePaytmCheckout() {
  if (window.Paytm && window.Paytm.CheckoutJS && typeof window.Paytm.CheckoutJS.close === 'function') {
    window.Paytm.CheckoutJS.close();
  }
}

window.loadPaytmCheckoutScript = loadPaytmCheckoutScript;
window.invokePaytmCheckout = invokePaytmCheckout;
window.closePaytmCheckout = closePaytmCheckout;
