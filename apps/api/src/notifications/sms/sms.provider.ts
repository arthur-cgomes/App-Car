export abstract class SmsProvider {
  abstract send(to: string, text: string): Promise<void>;
}
