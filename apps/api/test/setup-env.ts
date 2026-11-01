process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://monitoring:monitoring@localhost:5432/monitoring_car_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-secret-com-pelo-menos-32-caracteres!!';
process.env.SMS_PROVIDER = 'console';
process.env.REFRESH_COOKIE_PATH = '/v1/auth';
process.env.WEB_URL = 'http://localhost:3001';
process.env.STORAGE_PROVIDER = 's3';
process.env.S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? 'http://localhost:8333';
process.env.S3_BUCKET = 'placar-test';
process.env.FIPE_PROVIDER = 'mock';
