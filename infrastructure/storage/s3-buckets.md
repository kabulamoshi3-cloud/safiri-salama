# Safiri Haraka S3-Compatible Object Storage Configuration

All buckets are provisioned on **MinIO** for local development and on **AWS S3** (or an S3-compatible service such as Wasabi or Cloudflare R2) for production. The configuration below applies to both environments unless noted.

---

## Buckets

### 1. `safiriharaka-incident-media`

Stores photo, audio, and video attachments submitted with incident reports.

| Property | Value |
|----------|-------|
| **Purpose** | Incident report media attachments (Requirement 7.5, 20.6) |
| **Max object size** | 50 MB per report (enforced at application layer) |
| **Supported MIME types** | `image/jpeg`, `image/png`, `image/webp`, `audio/mp4`, `audio/mpeg`, `video/mp4`, `video/quicktime` |
| **Retention** | 7 years (regulatory / law enforcement requirement) |
| **Access** | Private — no public access |
| **Encryption** | SSE-S3 (AES-256) at rest; TLS 1.2+ in transit |
| **Versioning** | Enabled (prevents accidental deletion) |
| **Lifecycle rule** | Transition to Glacier/cold storage after 90 days; delete after 7 years |

**Object key pattern**:
```
incident-media/<incidentId>/<attachmentId>.<ext>
```

**Bucket policy** (deny all public access):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::safiriharaka-incident-media",
        "arn:aws:s3:::safiriharaka-incident-media/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "AllowSafetyModuleService",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/safiriharaka-safety-module-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::safiriharaka-incident-media",
        "arn:aws:s3:::safiriharaka-incident-media/*"
      ]
    },
    {
      "Sid": "AllowAdminPanelReadOnly",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/safiriharaka-admin-panel-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::safiriharaka-incident-media",
        "arn:aws:s3:::safiriharaka-incident-media/*"
      ]
    }
  ]
}
```

---

### 2. `safiriharaka-emergency-audio`

Stores discreet audio recordings captured when a passenger or driver activates the emergency button.

| Property | Value |
|----------|-------|
| **Purpose** | Emergency audio recordings (Requirement 7.3, 20.6) |
| **Max object size** | ~10 MB per recording (≤5 min at 128 kbps) |
| **Supported MIME types** | `audio/mp4`, `audio/mpeg`, `audio/ogg` |
| **Retention** | 7 years |
| **Access** | Private — no public access; accessible only to Safety Module and Admin Panel |
| **Encryption** | SSE-KMS (customer-managed key) at rest; TLS 1.2+ in transit |
| **Versioning** | Enabled |
| **Lifecycle rule** | Transition to Glacier after 30 days; delete after 7 years |

**Object key pattern**:
```
emergency-audio/<emergencyEventId>/<timestamp_iso8601>.m4a
```

**Encryption**: Uses a dedicated KMS key (`safiriharaka-emergency-audio-key`) with key rotation enabled annually. Access to the KMS key is restricted to the Safety Module IAM role and the Admin Panel IAM role.

**Bucket policy** (deny all public access, enforce TLS, enforce SSE-KMS):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonTLS",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::safiriharaka-emergency-audio",
        "arn:aws:s3:::safiriharaka-emergency-audio/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::safiriharaka-emergency-audio/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "AllowSafetyModuleWrite",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/safiriharaka-safety-module-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::safiriharaka-emergency-audio/*"
    },
    {
      "Sid": "AllowAdminPanelRead",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/safiriharaka-admin-panel-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::safiriharaka-emergency-audio",
        "arn:aws:s3:::safiriharaka-emergency-audio/*"
      ]
    }
  ]
}
```

---

### 3. `safiriharaka-driver-documents`

Stores driver license scans, background check documents, and vehicle compliance certificates uploaded during the operator onboarding workflow.

| Property | Value |
|----------|-------|
| **Purpose** | Driver and vehicle verification documents (Requirement 16.2, 19.3) |
| **Max object size** | 20 MB per document |
| **Supported MIME types** | `image/jpeg`, `image/png`, `application/pdf` |
| **Retention** | Duration of driver account + 3 years after deletion |
| **Access** | Private — accessible only to Admin Panel and Operator Dashboard |
| **Encryption** | SSE-S3 (AES-256) at rest; TLS 1.2+ in transit |
| **Versioning** | Enabled |

**Object key pattern**:
```
driver-documents/<driverId>/<documentType>/<uploadTimestamp>.<ext>
```

---

### 4. `safiriharaka-exports`

Stores generated CSV and PDF reports (earnings reports, expense reports, P&L statements).

| Property | Value |
|----------|-------|
| **Purpose** | Generated report files (Requirement 5.8, 15.5) |
| **Max object size** | 50 MB per file |
| **Supported MIME types** | `text/csv`, `application/pdf` |
| **Retention** | 90 days (reports are regenerated on demand) |
| **Access** | Private — pre-signed URLs issued per request (TTL: 15 minutes) |
| **Encryption** | SSE-S3 (AES-256) at rest; TLS 1.2+ in transit |
| **Versioning** | Disabled (reports are immutable once generated) |
| **Lifecycle rule** | Delete after 90 days |

**Object key pattern**:
```
exports/<userId>/<reportType>/<dateRange>/<generatedAt_iso8601>.<ext>
```

---

## CORS Configuration (all buckets)

CORS is disabled on all buckets. Files are served via pre-signed URLs or through the API Gateway, never directly from the browser to S3.

---

## MinIO Local Development Configuration

For local development, all four buckets are created automatically by the `docker-compose.yml` init container using the MinIO client (`mc`):

```bash
mc alias set local http://minio:9000 minioadmin minioadmin
mc mb local/safiriharaka-incident-media
mc mb local/safiriharaka-emergency-audio
mc mb local/safiriharaka-driver-documents
mc mb local/safiriharaka-exports
mc anonymous set none local/safiriharaka-incident-media
mc anonymous set none local/safiriharaka-emergency-audio
mc anonymous set none local/safiriharaka-driver-documents
mc anonymous set none local/safiriharaka-exports
```

MinIO console is available at `http://localhost:9001` (credentials: `minioadmin` / `minioadmin`).

---

## Environment Variables

```dotenv
# .env (never commit to source control)
S3_ENDPOINT=http://minio:9000          # MinIO local; use https://s3.amazonaws.com for AWS
S3_REGION=af-south-1                   # AWS Africa (Cape Town) — closest to Dar es Salaam
S3_ACCESS_KEY_ID=<your-access-key>
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_BUCKET_INCIDENT_MEDIA=safiriharaka-incident-media
S3_BUCKET_EMERGENCY_AUDIO=safiriharaka-emergency-audio
S3_BUCKET_DRIVER_DOCUMENTS=safiriharaka-driver-documents
S3_BUCKET_EXPORTS=safiriharaka-exports
```
