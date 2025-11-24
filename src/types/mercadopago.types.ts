export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

export interface CreatePaymentDTO {
  trabajoId: string;
  payerEmail: string;
}

export interface WebhookPayload {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

export interface MPPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  application_fee?: number;
  external_reference?: string;
  payment_method_id: string;
  installments: number;
  date_approved?: string;
  date_created: string;
  payer: {
    email: string;
  };
}
