import { Request, Response, NextFunction } from 'express';
import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { createLogger } from '../utils/logger';

const logger = createLogger('validation');
const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);

export interface ValidationError {
  error: 'VALIDATION_ERROR';
  message: string;
  details: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export const validate = (schema: JSONSchemaType<unknown>, property: 'body' | 'query' | 'params' = 'body') => {
  const validator = ajv.compile(schema);
  
  return (req: Request, res: Response, next: NextFunction) => {
    const valid = validator(req[property]);
    
    if (!valid) {
      const errors = validator.errors?.map(err => ({
        field: err.instancePath.substring(1) || err.params?.missingProperty || 'unknown',
        message: err.message || 'Validation failed',
        value: err.data
      })) || [];
      
      logger.warn('Validation failed:', { errors, path: req.path });
      
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors
      } as ValidationError);
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Coordinates validation
  coordinates: {
    type: 'object',
    properties: {
      lat: { type: 'number', minimum: -90, maximum: 90 },
      lng: { type: 'number', minimum: -180, maximum: 180 }
    },
    required: ['lat', 'lng'],
    additionalProperties: false
  } as unknown as JSONSchemaType<{ lat: number; lng: number }>,
  
  // Phone number validation (E.164 format)
  phone: {
    type: 'string',
    pattern: '^\\+[1-9]\\d{6,14}$'
  },
  
  // UUID validation
  uuid: {
    type: 'string',
    format: 'uuid'
  },
  
  // Pagination
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
    },
    additionalProperties: true
  } as unknown as JSONSchemaType<{ page?: number; limit?: number }>,

  dateRange: {
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' }
    },
    required: ['startDate', 'endDate'],
    additionalProperties: false
  } as unknown as JSONSchemaType<{ startDate: string; endDate: string }>
};

// Route-specific schemas
export const routeSchemas = {
  // Trip estimation request
  tripEstimate: {
    type: 'object',
    properties: {
      originLat: { type: 'number', minimum: -90, maximum: 90 },
      originLng: { type: 'number', minimum: -180, maximum: 180 },
      destLat: { type: 'number', minimum: -90, maximum: 90 },
      destLng: { type: 'number', minimum: -180, maximum: 180 },
      modes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['daladala', 'brt', 'boda-boda', 'walk']
        },
        minItems: 1,
        uniqueItems: true
      }
    },
    required: ['originLat', 'originLng', 'destLat', 'destLng'],
    additionalProperties: false
  } as unknown as JSONSchemaType<{
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    modes?: Array<'daladala' | 'brt' | 'boda-boda' | 'walk'>;
  }>,

  userRegister: {
    type: 'object',
    properties: {
      phone: { type: 'string', pattern: '^\\+[1-9]\\d{6,14}$' },
      name: { type: 'string', minLength: 2, maxLength: 255 },
      type: {
        type: 'string',
        enum: ['passenger', 'driver', 'operator']
      },
      language: {
        type: 'string',
        enum: ['sw', 'en'],
        default: 'sw'
      }
    },
    required: ['phone', 'name', 'type'],
    additionalProperties: false
  } as unknown as JSONSchemaType<{
    phone: string;
    name: string;
    type: 'passenger' | 'driver' | 'operator';
    language?: 'sw' | 'en';
  }>,

  login: {
    type: 'object',
    properties: {
      phone: { type: 'string', pattern: '^\\+[1-9]\\d{6,14}$' },
      otp: { type: 'string', pattern: '^\\d{6}$' }
    },
    required: ['phone', 'otp'],
    additionalProperties: false
  } as unknown as JSONSchemaType<{
    phone: string;
    otp: string;
  }>
};
