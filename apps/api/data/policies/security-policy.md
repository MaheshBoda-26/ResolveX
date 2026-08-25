# Security Policy

## Overview
This policy defines authentication, authorization, and data handling requirements for all ResolveX systems.

## Authentication

### Customer Authentication
- **Primary**: Email + password with bcrypt (cost factor 12)
- **MFA**: TOTP (RFC 6238) required for admin accounts, optional for customers
- **Session**: JWT with 15-min access token, 30-day refresh token
- **Password Reset**: Time-limited (1 hour), single-use tokens via email

### Agent/Service Authentication
- **Service-to-Service**: mTLS with SPIFFE identities
- **API Keys**: Scoped, rotatable, audit-logged
- **Webhooks**: HMAC-SHA256 signatures with timestamp validation

### Admin Authentication
- **SSO**: SAML/OIDC via identity provider
- **MFA**: Mandatory (hardware key preferred)
- **Session**: 1-hour max, re-auth for sensitive actions
- **Access Review**: Quarterly access certification

## Authorization

### Role-Based Access Control (RBAC)
| Role | Customers | Billing | Subscriptions | Admin | Analytics |
|------|-----------|---------|---------------|-------|-----------|
| Customer | Own | Own | Own | None | None |
| Support Agent | Assigned | Assigned | Assigned | None | Team |
| Billing Specialist | Assigned | All | Read | None | Dept |
| Engineering | None | None | None | System | All |
| Admin | All | All | All | All | All |

### Attribute-Based Access Control (ABAC)
- **Resource Ownership**: Customer ID match required
- **Time-Based**: Business hours for sensitive ops
- **Location-Based**: IP allowlist for admin panel
- **Risk-Based**: Step-up auth for anomalous requests

## Data Handling

### Encryption
- **At Rest**: AES-256-GCM (database, object storage, backups)
- **In Transit**: TLS 1.3 minimum
- **Key Management**: Cloud KMS with automatic rotation (90 days)
- **Field-Level**: PII fields encrypted separately (email, phone, address)

### Data Classification
- **Public**: Marketing content, documentation
- **Internal**: Operational metrics, internal tools
- **Confidential**: Customer PII, billing records, contracts
- **Restricted**: Authentication secrets, encryption keys, audit logs

### Retention & Disposal
- **Customer Data**: 7 years post-account closure (legal hold exceptions)
- **Audit Logs**: 7 years immutable storage
- **Session Data**: 30 days
- **Backups**: 90 days (encrypted, tested quarterly)
- **Disposal**: Cryptographic erasure + certificate of destruction

### Data Subject Rights
- **Access**: Self-service portal + API (30-day SLA)
- **Rectification**: Self-service + support-assisted (7-day SLA)
- **Erasure**: "Right to be forgotten" (30-day SLA, legal exceptions)
- **Portability**: JSON/CSV export via portal (7-day SLA)
- **Restriction**: Processing limitation flags honored

## Incident Response
- **Detection**: SIEM alerts, anomaly detection, customer reports
- **Classification**: P1 (active breach) → P4 (low-risk finding)
- **Response**: 15-min P1 acknowledgment, 4-hour P1 containment
- **Notification**: 72-hour regulatory (GDPR), customer notification per severity
- **Post-Mortem**: Blameless, published within 5 business days

## Related Policies
- Privacy Policy (data retention, customer rights)
- Verification Policy (post-action checks)
- Agent Boundaries Policy (AI must not touch secrets)