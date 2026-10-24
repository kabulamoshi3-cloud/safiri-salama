/**
 * Shared Types for Safiri Haraka Platform
 * Used across all applications and services
 */

// ============================================================================
// PRIMITIVES
// ============================================================================

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  uploadedAt: Date;
}

export interface SavedPlace {
  id: string;
  name: string;
  label: 'home' | 'work' | 'other';
  location: GeoPoint;
  address: string;
}

export interface SavedRoute {
  id: string;
  name: string;
  origin: GeoPoint;
  destination: GeoPoint;
  favoriteCount: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum UserType {
  Passenger = 'passenger',
  Driver = 'driver',
  FleetOperator = 'fleet_operator',
  Admin = 'admin',
}

export enum UserStatus {
  Active = 'active',
  Suspended = 'suspended',
  Banned = 'banned',
  Pending = 'pending',
}

export enum VerificationStatus {
  Unverified = 'unverified',
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

export enum TrustTier {
  Bronze = 'bronze',
  Silver = 'silver',
  Gold = 'gold',
  Platinum = 'platinum',
}

export enum TransactionType {
  TopUp = 'topup',
  Payment = 'payment',
  Refund = 'refund',
  Withdrawal = 'withdrawal',
}

export enum TransactionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum MobileMoneyProvider {
  MPesa = 'mpesa',
  Airtel = 'airtel',
  Tigo = 'tigo',
}

export enum IncidentSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum IncidentStatus {
  Reported = 'reported',
  InProgress = 'in_progress',
  Resolved = 'resolved',
  Closed = 'closed',
}

export enum VehicleType {
  Daladala = 'daladala',
  BodaBoda = 'boda_boda',
  Taxi = 'taxi',
}

export enum VehicleStatus {
  Active = 'active',
  Maintenance = 'maintenance',
  Retired = 'retired',
  Inactive = 'inactive',
}

export enum TransportMode {
  Walking = 'walking',
  BodaBoda = 'boda_boda',
  Daladala = 'daladala',
  Taxi = 'taxi',
  Shared = 'shared',
}

export enum CrowdingLevel {
  Empty = 'empty',
  Quiet = 'quiet',
  Moderate = 'moderate',
  Crowded = 'crowded',
  PackedFull = 'packed_full',
}

export enum SupportedLanguage {
  English = 'en',
  Swahili = 'sw',
}

// ============================================================================
// USERS & PROFILES
// ============================================================================

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  userType: UserType;
  status: UserStatus;
  profilePicture?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PassengerProfile extends User {
  trustTier: TrustTier;
  rating: number;
  totalTrips: number;
  savedPlaces: SavedPlace[];
  savedRoutes: SavedRoute[];
  emergencyContacts: EmergencyContact[];
  preferredLanguage: SupportedLanguage;
}

export interface DriverProfile extends User {
  licenseNumber: string;
  licenseExpiry: Date;
  licenseVerification: VerificationStatus;
  vehicleVerification: VerificationStatus;
  backgroundCheckStatus: VerificationStatus;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  currentStatus: 'offline' | 'available' | 'on-trip' | 'break';
  isActive: boolean;
  documents: Attachment[];
}

// ============================================================================
// VEHICLES & FLEET
// ============================================================================

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: VehicleType;
  capacity: number;
  owner: string; // Driver or Fleet ID
  status: VehicleStatus;
  manufacturingYear: number;
  lastMaintenance: Date;
  nextMaintenance: Date;
  insuranceExpiry: Date;
  inspectionExpiry: Date;
  mileage: number;
  location?: GeoPoint;
  lastUpdated: Date;
}

export interface VehiclePosition {
  vehicleId: string;
  location: GeoPoint;
  speed: number;
  heading: number;
  timestamp: Date;
  accuracy: number;
}

export interface FleetAlert {
  id: string;
  fleetId: string;
  type: 'maintenance' | 'deviation' | 'geofence' | 'accident';
  vehicleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface DRTScoreBreakdown {
  efficiency: number;
  safety: number;
  compliance: number;
  customerService: number;
  overall: number;
}

// ============================================================================
// PAYMENTS & WALLET
// ============================================================================

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string; // TZS
  lastTransaction: Date;
  totalDeposited: number;
  totalSpent: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  provider?: MobileMoneyProvider;
  reference?: string;
  timestamp: Date;
  description: string;
  relatedTripId?: string;
}

export interface QRPaymentToken {
  id: string;
  code: string;
  driverId: string;
  vehicleId: string;
  amount: number;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  usedBy?: string;
}

export interface FareTable {
  id: string;
  transportMode: TransportMode;
  baseFare: number;
  costPerKm: number;
  costPerMinute: number;
  minimumFare: number;
  peakHourMultiplier: number;
  validFrom: Date;
  validTo?: Date;
}

// ============================================================================
// ROUTES & TRIPS
// ============================================================================

export interface Stop {
  id: string;
  name: string;
  location: GeoPoint;
  sequence: number;
  routeId: string;
}

export interface Route {
  id: string;
  name: string;
  transportMode: TransportMode;
  stops: Stop[];
  totalDistance: number;
  estimatedDuration: number;
  operatorId?: string;
}

export interface TripSegment {
  id: string;
  mode: TransportMode;
  startStop: Stop;
  endStop: Stop;
  startTime: Date;
  endTime: Date;
  duration: number;
  distance: number;
  cost: number;
  route?: Route;
  vehicle?: Vehicle;
}

export interface TripOption {
  id: string;
  segments: TripSegment[];
  totalDuration: number;
  totalCost: number;
  walkingDistance?: number;
  crowdingLevel: CrowdingLevel;
}

export interface TripPlan {
  id: string;
  passengerId: string;
  origin: GeoPoint;
  destination: GeoPoint;
  departureTime: Date;
  options: TripOption[];
  selectedOption?: TripOption;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  actualCost?: number;
  actualDuration?: number;
  completedAt?: Date;
}

export interface RecurringTripSchedule {
  id: string;
  passengerId: string;
  tripTemplate: TripPlan;
  frequency: 'daily' | 'weekly' | 'monthly';
  days: number[]; // 0-6 for weekly, 1-28 for monthly
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

// ============================================================================
// SAFETY & INCIDENTS
// ============================================================================

export interface IncidentReport {
  id: string;
  reporterId: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  location: GeoPoint;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  attachments: Attachment[];
  witnesses?: string[];
  reportedAt: Date;
  resolvedAt?: Date;
  notes?: string;
}

export interface EmergencyEvent {
  id: string;
  userId: string;
  type: 'medical' | 'accident' | 'crime' | 'harassment' | 'other';
  location: GeoPoint;
  tripId?: string;
  message?: string;
  emergencyContacts: EmergencyContact[];
  notifiedAt: Date;
  respondedAt?: Date;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface NotificationRequest {
  id: string;
  userId: string;
  type: 'trip' | 'payment' | 'safety' | 'offer' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  sentAt: Date;
  readAt?: Date;
}

// ============================================================================
// ADMIN & MANAGEMENT
// ============================================================================

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetAudience: UserType[];
  priority: 'low' | 'medium' | 'high';
  publishedAt: Date;
  expiresAt?: Date;
  attachments?: Attachment[];
}

export interface SafetyTip {
  id: string;
  title: string;
  content: string;
  category: 'passenger' | 'driver' | 'general';
  order: number;
  active: boolean;
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  active: boolean;
}

export type SupportedLanguageCode = keyof typeof SupportedLanguage;
