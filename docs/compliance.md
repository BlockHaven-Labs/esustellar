# Compliance & Legal Considerations

## Data Residency
- User data (group savings records, identity documents) must remain within the jurisdiction where the service is offered.
- Consider deploying per-region clusters with data-local storage to satisfy residency requirements.

## GDPR / NDPA (Nigeria Data Protection Act)
- **Lawful basis**: performance of a contract (group savings agreement) and legitimate interest (fraud prevention).
- **Data minimisation**: only collect data necessary for the savings-group operation.
- **Right to erasure**: implement account deletion workflows that remove on-chain and off-chain data where feasible.
- **Data Processing Agreement (DPA)**: required with any third-party sub-processors (e.g. cloud provider, Stellar RPC provider).

## Financial Services Regulations
- EsuStellar facilitates group savings; depending on jurisdiction this may constitute a regulated financial service.
- **KYC/AML**: if funds are convertible to fiat currency, KYC checks and AML monitoring may be required.
- **Record keeping**: transaction records must be retained for 5-7 years per most financial regulations.
- **Licensing**: consult local regulators to determine whether a money-services or fintech license is required.

## Recommendations
1. Engage legal counsel in each operating jurisdiction before launching.
2. Implement data-classification labels and access controls per `infra/k8s/base/network-policies.yaml`.
3. Use encryption at rest (KMS-backed etcd) and in transit (TLS) for all data paths.
