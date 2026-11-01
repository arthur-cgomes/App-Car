import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY_KEY = 'auth:apiKey';

export const ApiKeyAuth = () => SetMetadata(IS_API_KEY_KEY, true);
