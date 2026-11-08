# Corpus report

Generated 2026-11-08T03:12:07.718Z

## Source

| Item | Value |
|---|---|
| Repository | `cilium/cilium` |
| Ref | `v1.20.4` |
| Commit | `beb276d2f38d4aadfda14710acf8d14a0f1ba723` |
| Retrieval route | tarball |
| Files pulled | 186 |
| Bytes | 1650968 |
| Licence | CC BY 4.0 (documentation); Apache-2.0 (code) |

## Sections

Parsed **1140** sections from 186 files, 152367 words. Anchors verified against the live site: **1128**, unpublished pages: 12, unmatched: 0.

Dropped:

- `too_short`: 731
- `too_long`: 0
- `unmapped_domain`: 57
- `empty`: 112

## Corpus

**142 questions** in the shipped corpus, **42** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 27 | 100 | **short** |
| Network Policy | 18% | 30 | 90 | **short** |
| Service Mesh | 16% | 52 | 80 | **short** |
| Network Observability | 10% | 14 | 50 | **short** |
| Installation and Configuration | 10% | 9 | 50 | **short** |
| Cluster Mesh | 10% | 4 | 50 | **short** |
| eBPF | 10% | 3 | 50 | **short** |
| BGP and External Networking | 6% | 3 | 30 | **short** |

<details><summary>Coverage by competency</summary>

**Architecture**

- `unmapped` — 18
- `component-roles` — 5 _(thin)_
- `datapath-models` — 3 _(thin)_
- `ipam` — 1 _(thin)_

**BGP and External Networking**

- `egress-gateway` — 3 _(thin)_

**Cluster Mesh**

- `mesh-benefits` — 2 _(thin)_
- `global-services` — 1 _(thin)_
- `unmapped` — 1

**eBPF**

- `unmapped` — 3

**Installation and Configuration**

- `unmapped` — 8
- `status-monitoring` — 1 _(thin)_

**Network Policy**

- `unmapped` — 20
- `policy-intent` — 4 _(thin)_
- `policy-rule-structure` — 4 _(thin)_
- `policy-enforcement-modes` — 2 _(thin)_

**Network Observability**

- `hubble-capabilities` — 10 _(thin)_
- `hubble-cli` — 4 _(thin)_

**Service Mesh**

- `unmapped` — 30
- `ingress` — 13 _(thin)_
- `encryption` — 5 _(thin)_
- `gateway-api` — 4 _(thin)_

</details>

| Yield source | Count |
|---|---|
| scenario | 54 |
| definition | 49 |
| attribute | 27 |
| contrast | 12 |

Scenario share: **38.0%** (floor 25%).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| entail | 32 |
| quote | 5 |
| duplicate | 5 |

## Known weak points

142 of 142 questions (100.0%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

<details><summary>List</summary>

- `0f138c18557ce81d` — architecture — Which statement best describes Kubernetes CRDs in Cilium?
- `147e680e5a65b8fc` — architecture — An engineer wants to use a pool name other than `default` for the migration from cluster-p
- `18947b8895c26f8b` — architecture — Which statement best describes Load-balancing in Cilium?
- `1edf065165b76bf0` — architecture — During the migration process, after updating the CiliumPodIPPool to the new CIDR and resta
- `27bc2b63fecf59ee` — architecture — Which statement best describes Key-Value Store in Cilium?
- `394736af8657ab6e` — architecture — Why is it not possible to directly delete or update the CIDRs already in use within an exi
- `3bb2c674e502ebe3` — architecture — Which statement best describes Addressing in Cilium?
- `577abc361d6b43e9` — architecture — Which statement best describes Masquerading in Cilium?
- `653ac7121a014a09` — architecture — Which statement best describes IPs in Cilium?
- `786dd43b09ad1ea5` — architecture — An engineer is configuring a new Cilium cluster and wants to ensure that TCP workloads are
- `7c4f09238e32497b` — architecture — A cluster runs with `multi-pool` as its IPAM mode. Its `default` CiliumPodIPPool lists the
- `83bee3681df01869` — architecture — Which statement best describes Debug Client in Cilium?
- `8b579c5bef5c7cb7` — architecture — Which statement best describes CNI Plugin in Cilium?
- `921688d575427a71` — architecture — An engineer is migrating a kind cluster from cluster-pool to multi-pool IPAM mode. They ex
- `95c6142a755dd29b` — architecture — An engineer has an existing `CiliumPodIPPool` named `default` that pods on the cluster are
- `96aba39cf8cc3a75` — architecture — An engineer is configuring the bandwidth manager for a multi-node cluster. They need to ma
- `9b05f33ad6749f3e` — architecture — Which statement best describes Graphical UI in Cilium?
- `9b9262adf6663930` — architecture — Which statement best describes Weights in Cilium?
- `a20d03b654e568a3` — architecture — Which statement best describes Subscription in Cilium?
- `a8b82f6a61f7809a` — architecture — An engineer is configuring a new Cilium cluster and wants to enable the bandwidth manager 
- `b52ffd6ff289068d` — architecture — During the migration process, an engineer checks the status of a CiliumNode that has alrea
- `be54bab782346128` — architecture — An engineer is migrating a cluster from the 10.10.0.0/16 CIDR to 10.20.0.0/16. After updat
- `c043a320c68f9311` — architecture — Which statement best describes CiliumEndpointSlice in Cilium?
- `df900dc79cff2036` — architecture — An engineer wants to use a pool name other than `default` for the migration. According to 
- `f37b3b7757719126` — architecture — A cluster administrator is troubleshooting latency issues in a Cilium cluster where the ba
- `f66478ec599bab8b` — architecture — During a rolling migration, some Cilium agents are running in multi-pool mode while others
- `fdae965890409a35` — architecture — Which statement best describes Status in Cilium?
- `0dd2e09af6a07426` — bgp — When monitoring SNAT source port utilization for alerting and observability, which metric 
- `c4c546c48822e7ab` — bgp — An engineer is troubleshooting connectivity issues on a Cilium egress-gateway node. They o
- `f4b5f1eb64a2880e` — bgp — An engineer is reviewing the output of cilium-dbg shell -- db/show nat-stats. They notice 
- `427eb2306f2e8037` — cluster-mesh — Continuing with the same global Service, you now run `kubectl annotate service rebel-base 
- `55eb2f139895587a` — cluster-mesh — An engineer is preparing an EKS cluster for a Cilium Cluster Mesh deployment. They are abo
- `c196f9b9810f1f61` — cluster-mesh — An engineer is configuring the network infrastructure for an EKS cluster. They need to ens
- `cfa0685b991591c6` — cluster-mesh — Which statement best describes MCS-API in Cilium?
- `911430a3c97b9bb0` — ebpf — In the Cilium datapath, the Socket operations hook is attached to the root cgroup. What sp
- `b1a4efbc89b5284e` — ebpf — A security team is reviewing the L3 Encryption object in Cilium. They note that on ingress
- `e7c11bfef09be49b` — ebpf — An engineer is configuring the Prefilter object in Cilium to improve performance. The Pref
- `1c0ec6d6bedc6ab3` — installation — Which statement best describes KVStore in Cilium?
- `254aa3d5fafeae6b` — installation — Which statement best describes Request/Response Rate in Cilium?
- `38cdb07d7904eced` — installation — Which statement best describes Identities in Cilium?
- `4e55f6ae8ade72e3` — installation — Which statement best describes Connections Rate in Cilium?
- `a6854cc7d6bcaa03` — installation — During troubleshooting, an engineer runs `kubectl get cec cilium-ingress-default-basic-ing
- `c11e776b27cd8e3a` — installation — A user is configuring a `CiliumEnvoyConfig` resource manually. How is the proxy port for t
- `d07e35ee6b589dfc` — installation — An engineer is troubleshooting a 503 error from an Ingress resource. They SSH into a node 
- `d735e63113f452b6` — installation — Which statement best describes Below in Cilium?
- `e75bc028edf8d586` — installation — Which statement best describes Hubble Relay in Cilium?
- `0299bde8945b3542` — network-policy — A network engineer is verifying the services created by the demo application manifests. Ba
- `02e8c62e745e7dd5` — network-policy — Which statement best describes Host in Cilium?
- `10fe40605ba8ab82` — network-policy — Which statement best describes Headers in Cilium?
- `11c4e64a679246dd` — network-policy — Which statement best describes labels in Cilium?
- `1ea708f1de421f66` — network-policy — A platform team discovers that developers can freely exec into Cilium pods in a shared clu
- `2cc679370a7fe0d2` — network-policy — An engineer writes a CiliumNetworkPolicy rule that selects a set of endpoints with endpoin
- `302f4e6633b513d3` — network-policy — Which statement best describes egress in Cilium?
- `39abdb1146c062c7` — network-policy — A cluster is configured to use tunnel routing mode and also has WireGuard encryption enabl
- `3eb78e96d04b34ea` — network-policy — An engineer is reviewing the deployment progress of the demo application. The guide states
- `476080ae2c8545c9` — network-policy — Which statement best describes ingress in Cilium?
- `4e29c23120732cf5` — network-policy — A security reviewer asks whether the Cilium agent itself performs extra operations that co
- `5e6fab343b239c46` — network-policy — A cluster administrator notices that `XfrmInNoStates` errors are increasing after a key ro
- `5e9a3730b3b63da9` — network-policy — A security audit reveals that an attacker could inject unencrypted pod traffic through a n
- `60521a40497cb192` — network-policy — An engineer observes that initial packets sent from a pod to a newly created remote pod ar
- `64debc90e73ba032` — network-policy — Why does the Cilium agent need kernel interfaces that cannot be virtualized or namespaced?
- `65193ba15b3e5465` — network-policy — An auditor finds that a user who is not a cluster administrator can exec into a Cilium pod
- `68a8ee997188b331` — network-policy — An engineer is configuring encryption strict mode egress for a cluster that uses IPv6 for 
- `6cbb37b38744525a` — network-policy — Which statement best describes endpointSelector / nodeSelector in Cilium?
- `7f8248f2864cfb1b` — network-policy — After deploying the demo application manifests, an engineer runs `kubectl get pods,svc` to
- `8442054483370b1c` — network-policy — Which statement best describes Packets in Cilium?
- `8515061745b44ef2` — network-policy — Which statement best describes always in Cilium?
- `947045d0b1b99d98` — network-policy — Which statement best describes never in Cilium?
- `aa3bcbb23a132136` — network-policy — A platform team runs Cilium with WireGuard enabled on nodes that sit behind firewalls, and
- `afb0c3b2bf8ab307` — network-policy — Which of the following statements accurately describes the support status of encryption st
- `c32c1c922e2209e5` — network-policy — An engineer needs to retrieve the WireGuard public key that a particular cluster node has 
- `d4934fe7fe8e009a` — network-policy — An engineer is preparing to deploy the demo application for the first time. The guide note
- `de438a410bbaa07a` — network-policy — A cluster administrator wants to mitigate the risk of unencrypted egress traffic to not-ye
- `e9fa1722c8225547` — network-policy — Which statement best describes Path in Cilium?
- `efa47379922d5ee5` — network-policy — An engineer defines a Cilium Layer 7 HTTP policy rule that sets a Path regex but leaves th
- `f46c6e3be3792535` — network-policy — Which statement best describes XfrmInStateProtoError There in Cilium?
- `16b9d670c3a60895` — observability — After TLS has been enabled on the Hubble metrics API, a monitoring engineer finds that Pro
- `1dd3510c1ec6e35f` — observability — A caller issues a `GetFlows` request that supplies both an allow list and a deny list. A p
- `2bc8d99f9377e917` — observability — A Hubble instance has been running for a long time and its ring buffer has become full, wh
- `733f6a5a87ea82a8` — observability — You are validating a Hubble installation and run `kubectl get configmap -n kube-system cil
- `842c543460fa0c44` — observability — An engineer wants the Hubble metrics API to require clients to authenticate with certifica
- `8b0bea1216628c26` — observability — A platform team runs Cilium 1.16 with Hubble metrics already enabled. They want the Hubble
- `9b24a41e4095b73a` — observability — From the Hubble CLI pod you query the first peer with `hubble observe --server tls://${IP?
- `9fba67cd7b84ca06` — observability — An engineer runs `kubectl get configmap -n kube-system cilium-config -oyaml | grep hubble-
- `aae4a919de571079` — observability — An engineer is reasoning about how many events a Hubble ring buffer can hold, having read 
- `b81c28adf0b2eee2` — observability — How does enabling mTLS on the Hubble metrics API change what clients such as Prometheus mu
- `d0c551ec0b50a4ea` — observability — You have created the Hubble CLI pod in `kube-system` and run `hubble watch peers --server 
- `de59edcfe760cb58` — observability — An engineer configures a Hubble metric with `flow:destinationContext=dns|ip`. During a spe
- `e32e55570e19d4a4` — observability — An engineer uses `openssl s_client` to inspect the TLS handshake with the Hubble server. T
- `f9b72371c7056e4e` — observability — An engineer wants to narrow down Cilium datapath debug events by supplying allow and deny 
- `0d618480a2f4fc4c` — service-mesh — In the context of Cilium Ingress, how many logical Policy enforcement points are identifie
- `14ec0fdee917df24` — service-mesh — A cluster administrator notices that an external load balancer is failing to forward traff
- `1568707915dbc8f4` — service-mesh — An engineer is troubleshooting why traffic from an external client is being dropped by Cil
- `1e71d2049e63a860` — service-mesh — An engineer is configuring a LoadBalancer Service to expose the Envoy Daemonset for Cilium
- `1f96639073d6c183` — service-mesh — An engineer needs to configure weight-based routing for the `helloworld` Service. The exce
- `23072c6eb514a372` — service-mesh — An engineer is troubleshooting an HTTPRoute and runs `kubectl describe httproute <name>`. 
- `24f8f46dff67774d` — service-mesh — A platform engineer has created individual Services for each backend Deployment and applie
- `35f76615ec4fae24` — service-mesh — An engineer applies the `envoy-helloworld-v1-90-v2-10.yaml` file to a cluster running Cili
- `42e93b5966ff5b1c` — service-mesh — A platform team has installed the standard release channel CRDs for Cilium Gateway API and
- `44bb05b9863ee25e` — service-mesh — You apply a `CiliumClusterwideNetworkPolicy` that denies all traffic by default, then run 
- …and 42 more

</details>

## Blind evaluation set

102 questions held out from the practising corpus, sourced from the public CNCF practice-exam repository. Never shown in practice or exam simulation; used only for blind scoring.

## What this report does not claim

- That these questions resemble the real exam. They are anchored to the documentation the exam is written
  against, which is a weaker and checkable claim.
- That every shipped answer is correct. The gates prove the answer is supported by the cited passage; they
  do not prove the passage was read correctly by the generator.
- That coverage is exam-realistic across competencies. Domain floors are enforced; per-competency balance is
  reported only indirectly through the competency field on each question.
