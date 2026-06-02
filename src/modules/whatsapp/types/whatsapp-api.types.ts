export type WhatsappTextParameter = {
  type: 'text';
  text: string;
};

export type WhatsappTemplateBodyComponent = {
  type: 'body';
  parameters: WhatsappTextParameter[];
};

export type WhatsappTemplatePayload = {
  name: string;
  language: { code: string };
  components?: WhatsappTemplateBodyComponent[];
};

export type WhatsappSendTemplateRequest = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: WhatsappTemplatePayload;
};

export type WhatsappSendMessageResponse = {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string; message_status?: string }>;
};
