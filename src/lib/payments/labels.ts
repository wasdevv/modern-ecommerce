// Shared by checkout and the order page, so a decline reads the same everywhere.
export const FAILURE_MESSAGES: Record<string, string> = {
  card_declined: 'Cartão recusado pelo banco. Tente outro cartão ou pague com Pix.',
  insufficient_funds: 'Saldo insuficiente. Tente outro cartão ou pague com Pix.',
  invalid_token: 'Os dados do cartão expiraram. Digite o cartão de novo.',
};

export const failureMessage = (reason: string | null) => (reason && FAILURE_MESSAGES[reason]) || 'Pagamento não aprovado. Tente novamente.';
