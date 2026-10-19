# Marcus Vance — Platform & Reliability Engineering Runbook

System design RFCs, disaster recovery drills, and distributed systems post-mortems.

## Guiding Engineering Principles
1. **Idempotence & Crash Safety**: Every state change must be safely replayable after unexpected node terminates or split-brain partitions.
2. **Observability as Code**: Metric definitions, SLO alerts, and dashboards are committed and reviewed alongside application logic.
3. **Defense in Depth**: Zero-trust pod networking via WireGuard tunnels, mutual TLS validation, and fine-grained IAM service accounts.

## Selected Architecture RFCs
- **RFC-042: Cross-Region Active-Active Postgres CDC Replication**: Detailed failure modes when streaming WAL records across WAN links with dynamic backpressure handling.
- **RFC-058: eBPF Network Tracing for Ingress Gateways**: Bypassing iptables overhead in Kubernetes clusters, reducing packet forwarding CPU cycles by 38%.

## Conference Talks & Articles
- "Operating Kubernetes at Scale Without Waking Up at 3 AM" — KubeCon North America 2024
- "Designing Zero-Data-Loss Change Data Capture with Postgres" — High Scalability Blog 2023
