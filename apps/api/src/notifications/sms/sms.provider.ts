export abstract class SmsProvider {
  readonly available: boolean = true;

  abstract send(to: string, text: string): Promise<void>;
}
