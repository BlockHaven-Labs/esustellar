# Mobile App Infrastructure Requirements

## OTA Updates (Expo EAS)
- Use Expo EAS Build for CI/CD pipelines.
- EAS Update hosts OTA JavaScript bundles; configure channel per environment (`testnet`, `staging`, `mainnet`).
- No additional Kubernetes resources needed — EAS is a managed service.

## Push Notifications
- Use Expo Push Notifications API (managed) or integrate Firebase Cloud Messaging (FCM) for advanced delivery.
- If self-hosting is required, deploy a push-notification relay service in the cluster:
  - Endpoint: `POST /api/notifications/send`
  - Reads device tokens from the database and forwards to FCM/APNs.

## Requirements Summary
| Service | Solution | In-cluster? |
|---------|----------|-------------|
| Build pipeline | Expo EAS | No |
| OTA updates | EAS Update | No |
| Push notifications | Expo Push API / FCM | Optional |
| Deep links | Native URL scheme + web Universal Links | No |
| API backend | esustellar-web | Yes |

## Security
- Mobile API keys are distributed at build time via EAS Secrets.
- Sensitive operations require biometric or PIN authentication on the device.
