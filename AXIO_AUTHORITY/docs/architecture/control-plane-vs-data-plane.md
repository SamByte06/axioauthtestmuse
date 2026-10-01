# Control Plane vs Data Plane

This distinction is the central architectural rule of AxioVital Authority.
Violating it turns the Authority into a second clinical application — which
it must never become.

## Authority = control plane

Responsible for:

```
Partner · Tenant · Operator · Credential · Access · Policy
Provisioning · Security · Audit · Lifecycle · Integration
```

Questions the control plane answers:

- WHO is performing the action? (Authority administrator identity)
- WHAT organization does it belong to? (partner / tenant)
- WHAT resource is being changed?
- WHAT permission allows it?
- WHAT will happen? (consequence, stated before confirmation)
- WHAT audit event will be created?

## Native / hospital systems = data / operations plane

Responsible for:

```
Patient · Appointment · Encounter · Clinical record · Prescription
Medical history · Insurance · Billing · Reports · Documents
FHIR resources · Hospital workflows
```

## Hard boundaries

1. An Authority administrator **cannot** open a patient's clinical record by
   virtue of being a platform administrator.
2. Access to clinical information requires **separate authorization** and is
   **separately audited** — it is not part of the Authority permission set.
3. Authority screens contain no clinical data types, no clinical search, no
   clinical navigation. If a future explicitly-authorized workflow needs
   clinical visibility, it must be designed, approved, and audited as its own
   feature — never smuggled into partner/tenant/operator screens.
4. Credential *state* is visible in Authority; credential *values* (passwords,
   hashes, keys, tokens) are never visible anywhere in Authority.

## Why this matters

Hospitals trust AxioVital with patient data because the platform's own
administrators operate under least privilege with full auditability. The
control/data plane split is how that trust is implemented in software.
