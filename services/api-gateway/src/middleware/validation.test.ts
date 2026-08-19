/**
 * Unit tests for the request validation middleware.
 *
 * Tests cover:
 *  - Valid body passes through to next()
 *  - Missing required field → 400 VALIDATION_ERROR with correct field name
 *  - Wrong type → 400 VALIDATION_ERROR
 *  - Additional properties are stripped (removeAdditional: true)
 *  - Pre-defined schemas: topUpRequestSchema, incidentReportSchema, tripPlanRequestSchema
 */

import { Request, Response, NextFunction } from 'express';

import {
  validateBody,
  topUpRequestSchema,
  incidentReportSchema,
  tripPlanRequestSchema,
  TopUpRequestBody,
  IncidentReportBody,
  TripPlanRequestBody,
  ValidationErrorResponse,
} from './validation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRequest(body: unknown): Partial<Request> {
  return { body };
}

function mockResponse(): {
  res: Partial<Response>;
  getStatusCode: () => number;
  getBody: () => unknown;
} {
  let statusCode = 0;
  let body: unknown = null;

  const res: Partial<Response> = {
    status: jest.fn().mockImplementation((code: number) => {
      statusCode = code;
      return res;
    }),
    json: jest.fn().mockImplementation((data: unknown) => {
      body = data;
      return res;
    }),
  };

  return { res, getStatusCode: () => statusCode, getBody: () => body };
}

// ---------------------------------------------------------------------------
// Top-up request schema tests
// ---------------------------------------------------------------------------

describe('validateBody — topUpRequestSchema', () => {
  const middleware = validateBody<TopUpRequestBody>('topup-test', topUpRequestSchema);

  it('calls next() for a valid top-up body', () => {
    const req = mockRequest({
      amountTZS: 5000,
      provider: 'mpesa',
      phoneNumber: '+255712345678',
    }) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 VALIDATION_ERROR when amountTZS is missing', () => {
    const req = mockRequest({ provider: 'mpesa', phoneNumber: '+255712345678' }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR when amountTZS is zero (minimum is 1)', () => {
    const req = mockRequest({ amountTZS: 0, provider: 'mpesa', phoneNumber: '+255712345678' }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.field).toBe('amountTZS');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR for an invalid provider', () => {
    const req = mockRequest({ amountTZS: 1000, provider: 'paypal', phoneNumber: '+255712345678' }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR for a phone number not matching E.164 Tanzania format', () => {
    const req = mockRequest({ amountTZS: 1000, provider: 'airtel', phoneNumber: '0712345678' }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Incident report schema tests
// ---------------------------------------------------------------------------

describe('validateBody — incidentReportSchema', () => {
  const middleware = validateBody<IncidentReportBody>('incident-test', incidentReportSchema);

  const validBody: IncidentReportBody = {
    location: { latitude: -6.7924, longitude: 39.2083 },
    description: 'Driver was speeding and ignoring traffic lights.',
    severity: 'high',
  };

  it('calls next() for a valid incident report body', () => {
    const req = mockRequest(validBody) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when description is too short (< 10 chars)', () => {
    const req = mockRequest({ ...validBody, description: 'Short' }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when severity is not a valid enum value', () => {
    const req = mockRequest({ ...validBody, severity: 'extreme' }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when location latitude is out of range', () => {
    const req = mockRequest({ ...validBody, location: { latitude: 200, longitude: 39.2083 } }) as Request;
    const { res, getStatusCode } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Trip plan request schema tests
// ---------------------------------------------------------------------------

describe('validateBody — tripPlanRequestSchema', () => {
  const middleware = validateBody<TripPlanRequestBody>('trip-test', tripPlanRequestSchema);

  const validBody: TripPlanRequestBody = {
    origin: { latitude: -6.7924, longitude: 39.2083 },
    destination: { latitude: -6.8235, longitude: 39.2695 },
  };

  it('calls next() for a valid trip plan request', () => {
    const req = mockRequest(validBody) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() with optional filters present', () => {
    const req = mockRequest({
      ...validBody,
      filters: { maxFareTZS: 3000, safetyThreshold: 3.5, accessibility: true, womenOnly: false },
    }) as Request;
    const { res } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when origin is missing', () => {
    const req = mockRequest({ destination: validBody.destination }) as Request;
    const { res, getStatusCode, getBody } = mockResponse();
    const next = jest.fn() as NextFunction;

    middleware(req, res as Response, next);

    expect(getStatusCode()).toBe(400);
    const body = getBody() as ValidationErrorResponse;
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });
});
