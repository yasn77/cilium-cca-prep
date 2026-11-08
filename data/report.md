# Corpus report

Generated 2026-11-08T02:09:52.772Z

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

**109 questions** in the shipped corpus, **30** quarantined.

| Domain | Weight | Questions | Floor | Status |
|---|---|---|---|---|
| Architecture | 20% | 25 | 100 | **short** |
| Network Policy | 18% | 21 | 90 | **short** |
| Service Mesh | 16% | 42 | 80 | **short** |
| Network Observability | 10% | 3 | 50 | **short** |
| Installation and Configuration | 10% | 9 | 50 | **short** |
| Cluster Mesh | 10% | 3 | 50 | **short** |
| eBPF | 10% | 3 | 50 | **short** |
| BGP and External Networking | 6% | 3 | 30 | **short** |

<details><summary>Coverage by competency</summary>

**Architecture**

- `unmapped` — 16
- `component-roles` — 5 _(thin)_
- `datapath-models` — 3 _(thin)_
- `ipam` — 1 _(thin)_

**BGP and External Networking**

- `egress-gateway` — 3 _(thin)_

**Cluster Mesh**

- `mesh-benefits` — 2 _(thin)_
- `unmapped` — 1

**eBPF**

- `unmapped` — 3

**Installation and Configuration**

- `unmapped` — 8
- `status-monitoring` — 1 _(thin)_

**Network Policy**

- `unmapped` — 12
- `policy-intent` — 4 _(thin)_
- `policy-rule-structure` — 3 _(thin)_
- `policy-enforcement-modes` — 2 _(thin)_

**Network Observability**

- `hubble-capabilities` — 3 _(thin)_

**Service Mesh**

- `unmapped` — 25
- `ingress` — 10 _(thin)_
- `encryption` — 4 _(thin)_
- `gateway-api` — 3 _(thin)_

</details>

| Yield source | Count |
|---|---|
| definition | 49 |
| scenario | 31 |
| attribute | 23 |
| contrast | 6 |

Scenario share: **28.4%** (floor 25%).

## Verification

A candidate ships only if all four gates pass:

1. **Anchor** — the citation section has an anchor verified against `docs.cilium.io`.
2. **Quote** — the quoted text appears verbatim in that section.
3. **Entailment** — the correct option's distinctive words appear in the cited section, and the distractors do not all appear there too.
4. **Judge** — SystemOne classified the item as `good_exam_item`.

Quarantine by gate:

| Gate | Rejected |
|---|---|
| entail | 22 |
| duplicate | 5 |
| quote | 3 |

## Known weak points

109 of 109 questions (100.0%) are flagged here as weaker than the rest: either they survived without a judge verdict, or the correct answer is a term short enough that the entailment check is close to a string match rather than a claim about meaning.

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
- `83bee3681df01869` — architecture — Which statement best describes Debug Client in Cilium?
- `8b579c5bef5c7cb7` — architecture — Which statement best describes CNI Plugin in Cilium?
- `921688d575427a71` — architecture — An engineer is migrating a kind cluster from cluster-pool to multi-pool IPAM mode. They ex
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
- `302f4e6633b513d3` — network-policy — Which statement best describes egress in Cilium?
- `3eb78e96d04b34ea` — network-policy — An engineer is reviewing the deployment progress of the demo application. The guide states
- `476080ae2c8545c9` — network-policy — Which statement best describes ingress in Cilium?
- `5e6fab343b239c46` — network-policy — A cluster administrator notices that `XfrmInNoStates` errors are increasing after a key ro
- `5e9a3730b3b63da9` — network-policy — A security audit reveals that an attacker could inject unencrypted pod traffic through a n
- `60521a40497cb192` — network-policy — An engineer observes that initial packets sent from a pod to a newly created remote pod ar
- `68a8ee997188b331` — network-policy — An engineer is configuring encryption strict mode egress for a cluster that uses IPv6 for 
- `6cbb37b38744525a` — network-policy — Which statement best describes endpointSelector / nodeSelector in Cilium?
- `7f8248f2864cfb1b` — network-policy — After deploying the demo application manifests, an engineer runs `kubectl get pods,svc` to
- `8442054483370b1c` — network-policy — Which statement best describes Packets in Cilium?
- `8515061745b44ef2` — network-policy — Which statement best describes always in Cilium?
- `947045d0b1b99d98` — network-policy — Which statement best describes never in Cilium?
- `afb0c3b2bf8ab307` — network-policy — Which of the following statements accurately describes the support status of encryption st
- `d4934fe7fe8e009a` — network-policy — An engineer is preparing to deploy the demo application for the first time. The guide note
- `de438a410bbaa07a` — network-policy — A cluster administrator wants to mitigate the risk of unencrypted egress traffic to not-ye
- `e9fa1722c8225547` — network-policy — Which statement best describes Path in Cilium?
- `f46c6e3be3792535` — network-policy — Which statement best describes XfrmInStateProtoError There in Cilium?
- `9fba67cd7b84ca06` — observability — An engineer runs `kubectl get configmap -n kube-system cilium-config -oyaml | grep hubble-
- `de59edcfe760cb58` — observability — An engineer configures a Hubble metric with `flow:destinationContext=dns|ip`. During a spe
- `e32e55570e19d4a4` — observability — An engineer uses `openssl s_client` to inspect the TLS handshake with the Hubble server. T
- `0d618480a2f4fc4c` — service-mesh — In the context of Cilium Ingress, how many logical Policy enforcement points are identifie
- `14ec0fdee917df24` — service-mesh — A cluster administrator notices that an external load balancer is failing to forward traff
- `1568707915dbc8f4` — service-mesh — An engineer is troubleshooting why traffic from an external client is being dropped by Cil
- `1e71d2049e63a860` — service-mesh — An engineer is configuring a LoadBalancer Service to expose the Envoy Daemonset for Cilium
- `1f96639073d6c183` — service-mesh — An engineer needs to configure weight-based routing for the `helloworld` Service. The exce
- `23072c6eb514a372` — service-mesh — An engineer is troubleshooting an HTTPRoute and runs `kubectl describe httproute <name>`. 
- `35f76615ec4fae24` — service-mesh — An engineer applies the `envoy-helloworld-v1-90-v2-10.yaml` file to a cluster running Cili
- `482efabce922471a` — service-mesh — In Cilium, how is the `ImplementationSpecific` path type interpreted?
- `4925de7dfd69771e` — service-mesh — Before enabling mutual authentication between `pod-worker` and `echo`, what prerequisite r
- `4bc441285fb96251` — service-mesh — A team is implementing a canary release strategy using Cilium. They apply a `CiliumEnvoyCo
- `4d4937c9f47784cf` — service-mesh — A cluster administrator requires the use of HTTPRoute Retry, a feature currently marked as
- `4e6a9145714dab90` — service-mesh — An application developer in a specific team needs to define application configuration and 
- `5a6cccfe561559f4` — service-mesh — Which command is used in the excerpt to retrieve the name of the Fortio pod and store it i
- `62d58f14b3dfd578` — service-mesh — A network engineer is verifying the behaviour of a network policy that restricts traffic t
- `69bf26dfb675f5e5` — service-mesh — A cluster administrator is configuring CiliumNetworkPolicy for a service exposed via Ingre
- `76998e2ed722dbd5` — service-mesh — In a cluster using `kube-proxy`, an engineer configures a standard LoadBalancer Service wi
- `7d84baf5caa64b64` — service-mesh — In the mutual authentication example, an engineer runs `curl http://echo:3000/headers-1` f
- `7ee5ffa97632d853` — service-mesh — In a Cilium cluster with host network mode enabled, how are the node addresses in the `Gat
- `8650dbf30f49504f` — service-mesh — An engineer is deploying Cilium 1.16 in a development environment where a LoadBalancer Ser
- `89ab4066a87c867e` — service-mesh — A platform team is migrating from Ingress to the Gateway API. They note that previously, t
- `8b7802f1ca889309` — service-mesh — Before applying the `CiliumEnvoyConfig` for weight-based routing, an engineer runs a loop 
- `8cbdf3736112ea28` — service-mesh — An engineer applies a `CiliumClusterwideNetworkPolicy` to deny all traffic by default. Whe
- `9875a4abd32f47cf` — service-mesh — The documentation suggests a specific approach for allowing ingress traffic to the `/detai
- `9b05a5d516134467` — service-mesh — An engineer is preparing to upgrade their Cilium installation to version 1.20. According t
- `a11a9f4d46c32b0c` — service-mesh — An engineer configures a `CiliumClusterwideNetworkPolicy` to deny all traffic by default. 
- `a283fb080e2f6e34` — service-mesh — A user runs `kubectl describe gateway <name>` and sees a condition with `Type: Programmed`
- `a48c7f3c9e265686` — service-mesh — In the scenario where the engineer increases the concurrent connections to 4 using the fla
- `a4a2f7ba25d319b7` — service-mesh — A cluster administrator configures a Gateway with a TCPRoute in an environment where Ciliu
- `a51bdbe420a0c6ae` — service-mesh — An engineer configures two `ImplementationSpecific` paths: `/impl` and `/impl.*`. What is 
- `a59d58c7c26160c2` — service-mesh — An engineer installs the required Gateway API CRDs but does not install the TCPRoute, UDPR
- `aa2e6c195755ca90` — service-mesh — Which of the following lists contains only CRDs that are explicitly stated as required for
- `aecf196dd665ef6d` — service-mesh — An engineer is configuring a network policy to enforce mutual authentication between a cli
- `b922f336f28cbd7c` — service-mesh — An engineer runs `kubectl get gateway -A` and observes that the `PROGRAMMED` column for a 
- …and 9 more

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
