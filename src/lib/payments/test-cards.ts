// Sandbox test cards, shared by the gateway (which accepts only these) and the checkout helper.
export const TEST_CARDS: Record<string, { outcome: 'approved' | 'card_declined' | 'insufficient_funds'; label: string }> = {
  '4242424242424242': { outcome: 'approved', label: 'Aprovado' },
  '5555555555554444': { outcome: 'approved', label: 'Aprovado (Mastercard)' },
  '4000000000000002': { outcome: 'card_declined', label: 'Recusado pelo banco' },
  '4000000000009995': { outcome: 'insufficient_funds', label: 'Saldo insuficiente' },
};
