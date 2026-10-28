import { NextFunction, Request, Response } from 'express';
import { routeSchemas, schemas, validate } from '../../middleware/validation';

function runValidation(
  middleware: ReturnType<typeof validate>,
  property: 'body' | 'query' | 'params',
  value: unknown
) {
  const req = { [property]: value, path: '/unit-test' } as unknown as Request;
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as unknown as NextFunction;

  middleware(req, response, next);
  return { req, response, next };
}

describe('request validation middleware', () => {
  it('continues when a body matches its schema', () => {
    const result = runValidation(validate(schemas.coordinates), 'body', {
      lat: -6.8,
      lng: 39.2,
    });

    expect(result.next).toHaveBeenCalledTimes(1);
    expect(result.response.status).not.toHaveBeenCalled();
  });

  it('returns structured errors for missing and out-of-range coordinates', () => {
    const result = runValidation(validate(schemas.coordinates), 'body', {
      lat: 91,
    });

    expect(result.next).not.toHaveBeenCalled();
    expect(result.response.status).toHaveBeenCalledWith(400);
    expect(result.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'lng' }),
          expect.objectContaining({ field: 'lat' }),
        ]),
      })
    );
  });

  it('validates the selected request property and strips additional body fields', () => {
    const result = runValidation(validate(routeSchemas.login, 'body'), 'body', {
      phone: '+255712345678',
      otp: '123456',
      unexpected: 'removed',
    });

    expect(result.next).toHaveBeenCalledTimes(1);
    expect((result.req as any).body).toEqual({
      phone: '+255712345678',
      otp: '123456',
    });
  });

  it('rejects malformed phone numbers and OTPs', () => {
    const result = runValidation(validate(routeSchemas.login), 'body', {
      phone: '0712345678',
      otp: '12345',
    });

    expect(result.next).not.toHaveBeenCalled();
    expect(result.response.status).toHaveBeenCalledWith(400);
  });
});
